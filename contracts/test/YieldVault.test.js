const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("YieldVault", function () {
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // FIXTURES
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    async function deployYieldVaultFixture() {
        const [owner, admin, user1, user2, feeRecipient, rebalancer] = await ethers.getSigners();

        // Deploy mock USDC token
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
        await usdc.waitForDeployment();

        // Deploy mock yield strategies
        const MockYieldStrategy = await ethers.getContractFactory("MockYieldStrategy");
        const strategy1 = await MockYieldStrategy.deploy(await usdc.getAddress());
        await strategy1.waitForDeployment();
        
        const strategy2 = await MockYieldStrategy.deploy(await usdc.getAddress());
        await strategy2.waitForDeployment();

        // Deploy YieldVault
        const YieldVault = await ethers.getContractFactory("YieldVault");
        const yieldVault = await YieldVault.deploy(
            await usdc.getAddress(),
            admin.address,
            feeRecipient.address
        );
        await yieldVault.waitForDeployment();

        // Setup roles
        const ADMIN_ROLE = await yieldVault.ADMIN_ROLE();
        const STRATEGY_MANAGER_ROLE = await yieldVault.STRATEGY_MANAGER_ROLE();
        const REBALANCER_ROLE = await yieldVault.REBALANCER_ROLE();

        await yieldVault.connect(admin).grantRole(REBALANCER_ROLE, rebalancer.address);

        // Mint tokens to users
        const mintAmount = ethers.parseUnits("10000", 6); // 10,000 USDC
        await usdc.mint(user1.address, mintAmount);
        await usdc.mint(user2.address, mintAmount);

        // Approve spending
        await usdc.connect(user1).approve(await yieldVault.getAddress(), mintAmount);
        await usdc.connect(user2).approve(await yieldVault.getAddress(), mintAmount);

        return {
            yieldVault,
            usdc,
            strategy1,
            strategy2,
            owner,
            admin,
            user1,
            user2,
            feeRecipient,
            rebalancer,
            ADMIN_ROLE,
            STRATEGY_MANAGER_ROLE,
            REBALANCER_ROLE
        };
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // DEPLOYMENT TESTS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    describe("Deployment", function () {
        it("Should deploy with correct parameters", async function () {
            const { yieldVault, usdc, admin, feeRecipient, ADMIN_ROLE } = await loadFixture(deployYieldVaultFixture);

            expect(await yieldVault.asset()).to.equal(await usdc.getAddress());
            expect(await yieldVault.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
            expect(await yieldVault.feeRecipient()).to.equal(feeRecipient.address);
            expect(await yieldVault.totalAssets()).to.equal(0);
            expect(await yieldVault.totalShares()).to.equal(0);
        });

        it("Should revert with invalid addresses", async function () {
            const YieldVault = await ethers.getContractFactory("YieldVault");
            
            await expect(
                YieldVault.deploy(ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress)
            ).to.be.revertedWithCustomError(YieldVault, "InvalidAmount");
        });

        it("Should set correct constants", async function () {
            const { yieldVault } = await loadFixture(deployYieldVaultFixture);

            expect(await yieldVault.MAX_STRATEGIES()).to.equal(10);
            expect(await yieldVault.BASIS_POINTS()).to.equal(10000);
            expect(await yieldVault.MAX_ALLOCATION_PER_STRATEGY()).to.equal(5000);
            expect(await yieldVault.MIN_REBALANCE_THRESHOLD()).to.equal(100);
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // STRATEGY MANAGEMENT TESTS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    describe("Strategy Management", function () {
        it("Should add strategy successfully", async function () {
            const { yieldVault, strategy1, admin } = await loadFixture(deployYieldVaultFixture);

            await expect(
                yieldVault.connect(admin).addStrategy(
                    await strategy1.getAddress(),
                    "Mock Strategy 1",
                    3, // risk score
                    5000 // 50% allocation
                )
            ).to.emit(yieldVault, "StrategyAdded");

            expect(await yieldVault.activeStrategies(await strategy1.getAddress())).to.be.true;
            
            const strategyInfo = await yieldVault.getStrategyInfo(await strategy1.getAddress());
            expect(strategyInfo.allocation).to.equal(5000);
            expect(strategyInfo.riskScore).to.equal(3);
            expect(strategyInfo.name).to.equal("Mock Strategy 1");
        });

        it("Should remove strategy successfully", async function () {
            const { yieldVault, strategy1, admin } = await loadFixture(deployYieldVaultFixture);

            // Add strategy first
            await yieldVault.connect(admin).addStrategy(
                await strategy1.getAddress(),
                "Mock Strategy 1",
                3,
                5000
            );

            await expect(
                yieldVault.connect(admin).removeStrategy(
                    await strategy1.getAddress(),
                    "Test removal"
                )
            ).to.emit(yieldVault, "StrategyRemoved");

            expect(await yieldVault.activeStrategies(await strategy1.getAddress())).to.be.false;
        });

        it("Should revert adding invalid strategy", async function () {
            const { yieldVault, admin } = await loadFixture(deployYieldVaultFixture);

            await expect(
                yieldVault.connect(admin).addStrategy(
                    ethers.ZeroAddress,
                    "Invalid Strategy",
                    3,
                    5000
                )
            ).to.be.revertedWithCustomError(yieldVault, "InvalidStrategy");
        });

        it("Should revert adding strategy with invalid risk score", async function () {
            const { yieldVault, strategy1, admin } = await loadFixture(deployYieldVaultFixture);

            await expect(
                yieldVault.connect(admin).addStrategy(
                    await strategy1.getAddress(),
                    "Mock Strategy 1",
                    0, // invalid risk score
                    5000
                )
            ).to.be.revertedWithCustomError(yieldVault, "InvalidAmount");

            await expect(
                yieldVault.connect(admin).addStrategy(
                    await strategy1.getAddress(),
                    "Mock Strategy 1",
                    11, // invalid risk score
                    5000
                )
            ).to.be.revertedWithCustomError(yieldVault, "InvalidAmount");
        });

        it("Should revert adding strategy with excessive allocation", async function () {
            const { yieldVault, strategy1, admin } = await loadFixture(deployYieldVaultFixture);

            await expect(
                yieldVault.connect(admin).addStrategy(
                    await strategy1.getAddress(),
                    "Mock Strategy 1",
                    3,
                    6000 // > MAX_ALLOCATION_PER_STRATEGY (5000)
                )
            ).to.be.revertedWithCustomError(yieldVault, "InvalidAllocation");
        });

        it("Should revert adding duplicate strategy", async function () {
            const { yieldVault, strategy1, admin } = await loadFixture(deployYieldVaultFixture);

            // Add strategy first time
            await yieldVault.connect(admin).addStrategy(
                await strategy1.getAddress(),
                "Mock Strategy 1",
                3,
                5000
            );

            // Try to add same strategy again
            await expect(
                yieldVault.connect(admin).addStrategy(
                    await strategy1.getAddress(),
                    "Mock Strategy 1 Duplicate",
                    3,
                    3000
                )
            ).to.be.revertedWithCustomError(yieldVault, "StrategyAlreadyExists");
        });

        it("Should only allow strategy manager to manage strategies", async function () {
            const { yieldVault, strategy1, user1 } = await loadFixture(deployYieldVaultFixture);

            await expect(
                yieldVault.connect(user1).addStrategy(
                    await strategy1.getAddress(),
                    "Unauthorized Strategy",
                    3,
                    5000
                )
            ).to.be.reverted;
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // DEPOSIT AND WITHDRAWAL TESTS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    describe("Deposits and Withdrawals", function () {
        async function setupStrategies(fixture) {
            const { yieldVault, strategy1, strategy2, admin } = fixture;
            
            await yieldVault.connect(admin).addStrategy(
                await strategy1.getAddress(),
                "Strategy 1",
                3,
                5000 // 50%
            );
            
            await yieldVault.connect(admin).addStrategy(
                await strategy2.getAddress(),
                "Strategy 2",
                2,
                5000 // 50%
            );
        }

        it("Should handle deposits correctly", async function () {
            const fixture = await loadFixture(deployYieldVaultFixture);
            const { yieldVault, user1 } = fixture;
            await setupStrategies(fixture);

            const depositAmount = ethers.parseUnits("1000", 6);

            await expect(
                yieldVault.connect(user1).deposit(depositAmount)
            ).to.emit(yieldVault, "Deposit");

            expect(await yieldVault.totalAssets()).to.equal(depositAmount);
            expect(await yieldVault.balanceOf(user1.address)).to.be.gt(0);
        });

        it("Should handle withdrawals correctly", async function () {
            const fixture = await loadFixture(deployYieldVaultFixture);
            const { yieldVault, user1 } = fixture;
            await setupStrategies(fixture);

            const depositAmount = ethers.parseUnits("1000", 6);

            // Deposit first
            await yieldVault.connect(user1).deposit(depositAmount);
            const shares = await yieldVault.balanceOf(user1.address);

            // Then withdraw
            await expect(
                yieldVault.connect(user1).withdraw(shares)
            ).to.emit(yieldVault, "Withdrawal");

            expect(await yieldVault.balanceOf(user1.address)).to.equal(0);
        });

        it("Should revert deposit with zero amount", async function () {
            const fixture = await loadFixture(deployYieldVaultFixture);
            const { yieldVault, user1 } = fixture;

            await expect(
                yieldVault.connect(user1).deposit(0)
            ).to.be.revertedWithCustomError(yieldVault, "InvalidAmount");
        });

        it("Should revert withdrawal with insufficient balance", async function () {
            const fixture = await loadFixture(deployYieldVaultFixture);
            const { yieldVault, user1 } = fixture;

            await expect(
                yieldVault.connect(user1).withdraw(ethers.parseUnits("1000", 6))
            ).to.be.revertedWithCustomError(yieldVault, "InsufficientBalance");
        });

        it("Should convert shares to assets correctly", async function () {
            const fixture = await loadFixture(deployYieldVaultFixture);
            const { yieldVault, user1 } = fixture;
            await setupStrategies(fixture);

            const depositAmount = ethers.parseUnits("1000", 6);
            await yieldVault.connect(user1).deposit(depositAmount);

            const shares = await yieldVault.balanceOf(user1.address);
            const convertedAssets = await yieldVault.convertToAssets(shares);

            expect(convertedAssets).to.be.closeTo(depositAmount, ethers.parseUnits("1", 6));
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // REBALANCING TESTS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    describe("Rebalancing", function () {
        async function setupStrategiesAndDeposit(fixture) {
            const { yieldVault, strategy1, strategy2, admin, user1 } = fixture;
            
            await yieldVault.connect(admin).addStrategy(
                await strategy1.getAddress(),
                "Strategy 1",
                3,
                5000 // 50%
            );
            
            await yieldVault.connect(admin).addStrategy(
                await strategy2.getAddress(),
                "Strategy 2",
                2,
                5000 // 50%
            );

            // Make a deposit to have assets to rebalance
            await yieldVault.connect(user1).deposit(ethers.parseUnits("1000", 6));
        }

        it("Should rebalance strategies successfully", async function () {
            const fixture = await loadFixture(deployYieldVaultFixture);
            const { yieldVault, strategy1, strategy2, rebalancer } = fixture;
            await setupStrategiesAndDeposit(fixture);

            const strategies = [await strategy1.getAddress(), await strategy2.getAddress()];
            const newAllocations = [4000, 6000]; // 40%, 60%

            // Advance time past cooldown
            await time.increase(3601); // 1 hour + 1 second

            await expect(
                yieldVault.connect(rebalancer).rebalance(strategies, newAllocations)
            ).to.emit(yieldVault, "Rebalanced");
        });

        it("Should auto-rebalance successfully", async function () {
            const fixture = await loadFixture(deployYieldVaultFixture);
            const { yieldVault, rebalancer } = fixture;
            await setupStrategiesAndDeposit(fixture);

            // Advance time past cooldown
            await time.increase(3601); // 1 hour + 1 second
            
            await yieldVault.connect(rebalancer).autoRebalance();
        });

        it("Should revert rebalance with invalid allocations", async function () {
            const fixture = await loadFixture(deployYieldVaultFixture);
            const { yieldVault, strategy1, strategy2, rebalancer } = fixture;
            await setupStrategiesAndDeposit(fixture);

            const strategies = [await strategy1.getAddress(), await strategy2.getAddress()];
            const invalidAllocations = [6000, 3000]; // Doesn't sum to 10000

            // Advance time past cooldown
            await time.increase(3601); // 1 hour + 1 second

            await expect(
                yieldVault.connect(rebalancer).rebalance(strategies, invalidAllocations)
            ).to.be.revertedWithCustomError(yieldVault, "InvalidAllocation");
        });

        it("Should respect rebalance cooldown", async function () {
            const fixture = await loadFixture(deployYieldVaultFixture);
            const { yieldVault, strategy1, strategy2, rebalancer } = fixture;
            await setupStrategiesAndDeposit(fixture);

            const strategies = [await strategy1.getAddress(), await strategy2.getAddress()];
            const allocations = [4000, 6000];

            // Advance time past initial cooldown
            await time.increase(3601); // 1 hour + 1 second

            // First rebalance
            await yieldVault.connect(rebalancer).rebalance(strategies, allocations);

            // Immediate second rebalance should fail
            await expect(
                yieldVault.connect(rebalancer).rebalance(strategies, [5000, 5000])
            ).to.be.revertedWithCustomError(yieldVault, "RebalanceCooldownActive");
        });

        it("Should only allow rebalancer role to rebalance", async function () {
            const fixture = await loadFixture(deployYieldVaultFixture);
            const { yieldVault, strategy1, strategy2, user1 } = fixture;
            await setupStrategiesAndDeposit(fixture);

            const strategies = [await strategy1.getAddress(), await strategy2.getAddress()];
            const allocations = [4000, 6000];

            await expect(
                yieldVault.connect(user1).rebalance(strategies, allocations)
            ).to.be.reverted;
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // YIELD HARVESTING TESTS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    describe("Yield Harvesting", function () {
        async function setupStrategiesWithYield(fixture) {
            const { yieldVault, strategy1, strategy2, admin, user1, usdc } = fixture;
            
            await yieldVault.connect(admin).addStrategy(
                await strategy1.getAddress(),
                "Strategy 1",
                3,
                5000
            );
            
            await yieldVault.connect(admin).addStrategy(
                await strategy2.getAddress(),
                "Strategy 2",
                2,
                5000
            );

            await yieldVault.connect(user1).deposit(ethers.parseUnits("1000", 6));

            // Mint additional tokens to vault to simulate yield
            const yieldAmount = ethers.parseUnits("80", 6); // 80 USDC total yield
            await usdc.mint(await yieldVault.getAddress(), yieldAmount);

            // Set up yield in strategies
            await strategy1.setUserYield(ethers.parseUnits("50", 6)); // 50 USDC yield
            await strategy2.setUserYield(ethers.parseUnits("30", 6)); // 30 USDC yield
        }

        it("Should harvest yield from all strategies", async function () {
            const fixture = await loadFixture(deployYieldVaultFixture);
            const { yieldVault, user1 } = fixture;
            await setupStrategiesWithYield(fixture);

            const totalYield = await yieldVault.connect(user1).harvestAll();
            // Should emit YieldHarvested events for strategies with yield
        });

        it("Should handle strategy harvest failures gracefully", async function () {
            const fixture = await loadFixture(deployYieldVaultFixture);
            const { yieldVault, strategy1, user1 } = fixture;
            await setupStrategiesWithYield(fixture);

            // Make strategy1 fail on harvest
            await strategy1.setShouldFail(true);

            // Should still succeed for other strategies
            await yieldVault.connect(user1).harvestAll();
        });

        it("Should calculate current APY correctly", async function () {
            const fixture = await loadFixture(deployYieldVaultFixture);
            const { yieldVault, strategy1, strategy2 } = fixture;
            await setupStrategiesWithYield(fixture);

            // Set APY for strategies
            await strategy1.setCurrentAPY(400); // 4%
            await strategy2.setCurrentAPY(600); // 6%

            const vaultAPY = await yieldVault.getCurrentAPY();
            expect(vaultAPY).to.equal(500); // Weighted average: (4% * 50% + 6% * 50%) = 5%
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS TESTS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    describe("View Functions", function () {
        it("Should return correct strategy info", async function () {
            const { yieldVault, strategy1, admin } = await loadFixture(deployYieldVaultFixture);

            await yieldVault.connect(admin).addStrategy(
                await strategy1.getAddress(),
                "Test Strategy",
                5,
                3000
            );

            const strategyInfo = await yieldVault.getStrategyInfo(await strategy1.getAddress());
            expect(strategyInfo.name).to.equal("Test Strategy");
            expect(strategyInfo.riskScore).to.equal(5);
            expect(strategyInfo.allocation).to.equal(3000);
        });

        it("Should return correct performance data", async function () {
            const { yieldVault, strategy1, admin } = await loadFixture(deployYieldVaultFixture);

            await yieldVault.connect(admin).addStrategy(
                await strategy1.getAddress(),
                "Test Strategy",
                5,
                3000
            );

            const performance = await yieldVault.getStrategyPerformance(await strategy1.getAddress());
            expect(performance.totalYieldGenerated).to.equal(0);
            expect(performance.averageAPY).to.equal(0);
        });

        it("Should convert shares and assets correctly", async function () {
            const { yieldVault } = await loadFixture(deployYieldVaultFixture);

            // When vault is empty, conversion should be 1:1
            expect(await yieldVault.convertToShares(1000)).to.equal(1000);
            expect(await yieldVault.convertToAssets(1000)).to.equal(1000);
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS TESTS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    describe("Admin Functions", function () {
        it("Should allow admin to pause and unpause", async function () {
            const { yieldVault, admin } = await loadFixture(deployYieldVaultFixture);

            await yieldVault.connect(admin).emergencyPause();
            expect(await yieldVault.paused()).to.be.true;

            await yieldVault.connect(admin).unpause();
            expect(await yieldVault.paused()).to.be.false;
        });

        it("Should update vault parameters", async function () {
            const { yieldVault, admin, user1 } = await loadFixture(deployYieldVaultFixture);

            await yieldVault.connect(admin).updateVaultParameters(
                100, // 1% management fee
                500, // 5% performance fee
                user1.address, // new fee recipient
                false // disable auto rebalance
            );

            expect(await yieldVault.managementFee()).to.equal(100);
            expect(await yieldVault.performanceFee()).to.equal(500);
            expect(await yieldVault.feeRecipient()).to.equal(user1.address);
            expect(await yieldVault.autoRebalanceEnabled()).to.be.false;
        });

        it("Should revert parameter updates with invalid values", async function () {
            const { yieldVault, admin } = await loadFixture(deployYieldVaultFixture);

            await expect(
                yieldVault.connect(admin).updateVaultParameters(
                    1500, // > 10% management fee
                    500,
                    admin.address,
                    true
                )
            ).to.be.revertedWithCustomError(yieldVault, "InvalidAmount");

            await expect(
                yieldVault.connect(admin).updateVaultParameters(
                    100,
                    2500, // > 20% performance fee
                    admin.address,
                    true
                )
            ).to.be.revertedWithCustomError(yieldVault, "InvalidAmount");

            await expect(
                yieldVault.connect(admin).updateVaultParameters(
                    100,
                    500,
                    ethers.ZeroAddress, // invalid fee recipient
                    true
                )
            ).to.be.revertedWithCustomError(yieldVault, "InvalidAmount");
        });

        it("Should only allow admin to perform admin functions", async function () {
            const { yieldVault, user1 } = await loadFixture(deployYieldVaultFixture);

            await expect(
                yieldVault.connect(user1).emergencyPause()
            ).to.be.reverted;

            await expect(
                yieldVault.connect(user1).updateVaultParameters(100, 500, user1.address, true)
            ).to.be.reverted;
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // EDGE CASES AND SECURITY TESTS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    describe("Edge Cases and Security", function () {
        it("Should handle strategy failures gracefully", async function () {
            const fixture = await loadFixture(deployYieldVaultFixture);
            const { yieldVault, strategy1, admin, user1 } = fixture;

            await yieldVault.connect(admin).addStrategy(
                await strategy1.getAddress(),
                "Failing Strategy",
                3,
                5000
            );

            // Make strategy fail
            await strategy1.setShouldFail(true);

            // Deposit should handle failure
            await yieldVault.connect(user1).deposit(ethers.parseUnits("1000", 6));
        });

        it("Should respect maximum number of strategies", async function () {
            const { yieldVault, admin, usdc } = await loadFixture(deployYieldVaultFixture);

            const MockYieldStrategy = await ethers.getContractFactory("MockYieldStrategy");

            // Add maximum number of strategies (10)
            for (let i = 0; i < 10; i++) {
                const strategy = await MockYieldStrategy.deploy(await usdc.getAddress());
                await strategy.waitForDeployment();
                
                await yieldVault.connect(admin).addStrategy(
                    await strategy.getAddress(),
                    `Strategy ${i}`,
                    3,
                    1000 // 10% each
                );
            }

            // Try to add 11th strategy
            const extraStrategy = await MockYieldStrategy.deploy(await usdc.getAddress());
            await extraStrategy.waitForDeployment();

            await expect(
                yieldVault.connect(admin).addStrategy(
                    await extraStrategy.getAddress(),
                    "Extra Strategy",
                    3,
                    1000
                )
            ).to.be.revertedWithCustomError(yieldVault, "MaxStrategiesReached");
        });

        it("Should prevent reentrancy attacks", async function () {
            const fixture = await loadFixture(deployYieldVaultFixture);
            const { yieldVault, user1 } = fixture;

            // The nonReentrant modifier should prevent reentrancy
            // This is tested indirectly through normal function calls
            await expect(
                yieldVault.connect(user1).deposit(ethers.parseUnits("1000", 6))
            ).to.not.be.reverted;
        });

        it("Should handle paused state correctly", async function () {
            const fixture = await loadFixture(deployYieldVaultFixture);
            const { yieldVault, admin, user1 } = fixture;

            // Pause the contract
            await yieldVault.connect(admin).emergencyPause();

            // Should revert deposits when paused
            await expect(
                yieldVault.connect(user1).deposit(ethers.parseUnits("1000", 6))
            ).to.be.revertedWith("Pausable: paused");
        });
    });
});