const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("ResolvStrategy", function () {
    // Test fixture for deployment
    async function deployResolvStrategyFixture() {
        const [owner, user1, user2, manager, harvester, rebalancer, resolvProtocol, resolvVault] = await ethers.getSigners();

        // Deploy MockERC20 token (USDC)
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);

        // Deploy ResolvStrategy
        const ResolvStrategy = await ethers.getContractFactory("ResolvStrategy");
        const strategy = await ResolvStrategy.deploy(
            await usdc.getAddress(),
            resolvProtocol.address,
            resolvVault.address
        );

        // Grant roles
        const MANAGER_ROLE = await strategy.MANAGER_ROLE();
        const HARVESTER_ROLE = await strategy.HARVESTER_ROLE();
        const REBALANCER_ROLE = await strategy.REBALANCER_ROLE();
        
        await strategy.grantRole(MANAGER_ROLE, manager.address);
        await strategy.grantRole(HARVESTER_ROLE, harvester.address);
        await strategy.grantRole(REBALANCER_ROLE, rebalancer.address);

        // Mint tokens to users
        const mintAmount = ethers.parseUnits("1000000", 6); // 1M USDC
        await usdc.mint(user1.address, mintAmount);
        await usdc.mint(user2.address, mintAmount);

        return {
            strategy,
            usdc,
            owner,
            user1,
            user2,
            manager,
            harvester,
            rebalancer,
            resolvProtocol,
            resolvVault,
            mintAmount
        };
    }

    describe("Deployment", function () {
        it("Should deploy with correct parameters", async function () {
            const { strategy, usdc, resolvProtocol, resolvVault } = await loadFixture(deployResolvStrategyFixture);

            expect(await strategy.asset()).to.equal(await usdc.getAddress());
            expect(await strategy.resolvProtocol()).to.equal(resolvProtocol.address);
            expect(await strategy.resolvVault()).to.equal(resolvVault.address);
            expect(await strategy.getRiskScore()).to.equal(4);
            expect(await strategy.getCurrentAPY()).to.equal(800); // 8%
        });

        it("Should revert with invalid addresses", async function () {
            const ResolvStrategy = await ethers.getContractFactory("ResolvStrategy");
            
            await expect(
                ResolvStrategy.deploy(ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress)
            ).to.be.revertedWithCustomError(ResolvStrategy, "InvalidAddress");
        });

        it("Should set correct strategy info", async function () {
            const { strategy } = await loadFixture(deployResolvStrategyFixture);
            
            const info = await strategy.getStrategyInfo();
            expect(info.name).to.equal("Resolv Delta-Neutral Strategy");
            expect(info.riskScore).to.equal(4);
            expect(info.active).to.be.true;
        });
    });

    describe("Deposit Functionality", function () {
        it("Should deposit successfully", async function () {
            const { strategy, usdc, user1 } = await loadFixture(deployResolvStrategyFixture);
            
            const depositAmount = ethers.parseUnits("50000", 6); // 50,000 USDC
            
            // Approve and deposit
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            
            await expect(strategy.connect(user1).deposit(depositAmount))
                .to.emit(strategy, "Deposit")
                .withArgs(user1.address, depositAmount, depositAmount);
            
            expect(await strategy.balanceOf(user1.address)).to.equal(depositAmount);
            expect(await strategy.totalAssets()).to.equal(depositAmount);
        });

        it("Should revert with insufficient amount", async function () {
            const { strategy, user1 } = await loadFixture(deployResolvStrategyFixture);
            
            await expect(strategy.connect(user1).deposit(0))
                .to.be.revertedWithCustomError(strategy, "InsufficientAmount");
        });

        it("Should revert below minimum deposit", async function () {
            const { strategy, usdc, user1 } = await loadFixture(deployResolvStrategyFixture);
            
            const smallAmount = ethers.parseUnits("1000", 6); // 1,000 USDC (below 10,000 minimum)
            
            await usdc.connect(user1).approve(await strategy.getAddress(), smallAmount);
            
            await expect(strategy.connect(user1).deposit(smallAmount))
                .to.be.revertedWithCustomError(strategy, "BelowMinimumDeposit");
        });

        it("Should revert when exceeding max capacity", async function () {
            const { strategy, usdc, user1 } = await loadFixture(deployResolvStrategyFixture);
            
            const maxAmount = ethers.parseUnits("50000001", 6); // 50M + 1 USDC
            
            await usdc.mint(user1.address, maxAmount);
            await usdc.connect(user1).approve(await strategy.getAddress(), maxAmount);
            
            await expect(strategy.connect(user1).deposit(maxAmount))
                .to.be.revertedWithCustomError(strategy, "ExceedsMaxCapacity");
        });

        it("Should emit Resolv protocol interaction", async function () {
            const { strategy, usdc, user1 } = await loadFixture(deployResolvStrategyFixture);
            
            const depositAmount = ethers.parseUnits("50000", 6);
            
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            
            await expect(strategy.connect(user1).deposit(depositAmount))
                .to.emit(strategy, "ResolvProtocolInteraction")
                .withArgs("deploy", depositAmount, true);
        });
    });

    describe("Withdrawal Functionality", function () {
        it("Should withdraw successfully", async function () {
            const { strategy, usdc, user1 } = await loadFixture(deployResolvStrategyFixture);
            
            const depositAmount = ethers.parseUnits("50000", 6);
            
            // Deposit first
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            await strategy.connect(user1).deposit(depositAmount);
            
            const userShares = await strategy.balanceOf(user1.address);
            const initialBalance = await usdc.balanceOf(user1.address);
            
            // Withdraw
            await expect(strategy.connect(user1).withdraw(userShares))
                .to.emit(strategy, "Withdrawal")
                .withArgs(user1.address, depositAmount, userShares);
            
            expect(await strategy.balanceOf(user1.address)).to.equal(0);
            expect(await usdc.balanceOf(user1.address)).to.equal(initialBalance + depositAmount);
        });

        it("Should revert with insufficient shares", async function () {
            const { strategy, user1 } = await loadFixture(deployResolvStrategyFixture);
            
            await expect(strategy.connect(user1).withdraw(0))
                .to.be.revertedWithCustomError(strategy, "InsufficientShares");
        });

        it("Should revert with insufficient balance", async function () {
            const { strategy, user1 } = await loadFixture(deployResolvStrategyFixture);
            
            const shares = ethers.parseUnits("1000", 6);
            
            await expect(strategy.connect(user1).withdraw(shares))
                .to.be.revertedWithCustomError(strategy, "InsufficientBalance");
        });
    });

    describe("Delta-Neutral Management", function () {
        it("Should allow rebalancer to rebalance position", async function () {
            const { strategy, usdc, user1, rebalancer } = await loadFixture(deployResolvStrategyFixture);
            
            const depositAmount = ethers.parseUnits("50000", 6);
            
            // Deposit first
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            await strategy.connect(user1).deposit(depositAmount);
            
            await expect(strategy.connect(rebalancer).rebalancePosition())
                .to.emit(strategy, "PositionRebalanced");
        });

        it("Should check if rebalance is needed", async function () {
            const { strategy, usdc, user1 } = await loadFixture(deployResolvStrategyFixture);
            
            const depositAmount = ethers.parseUnits("50000", 6);
            
            // Deposit first
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            await strategy.connect(user1).deposit(depositAmount);
            
            const isNeeded = await strategy.isRebalanceNeeded();
            expect(typeof isNeeded).to.equal("boolean");
        });

        it("Should get delta deviation", async function () {
            const { strategy, usdc, user1 } = await loadFixture(deployResolvStrategyFixture);
            
            const depositAmount = ethers.parseUnits("50000", 6);
            
            // Deposit first
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            await strategy.connect(user1).deposit(depositAmount);
            
            const deviation = await strategy.getDeltaDeviation();
            expect(deviation).to.be.a("bigint");
        });

        it("Should revert rebalance if not rebalancer", async function () {
            const { strategy, user1 } = await loadFixture(deployResolvStrategyFixture);
            
            await expect(strategy.connect(user1).rebalancePosition())
                .to.be.reverted;
        });
    });

    describe("Yield Calculation with Performance Buffer", function () {
        it("Should calculate user yield with performance buffer", async function () {
            const { strategy, usdc, user1 } = await loadFixture(deployResolvStrategyFixture);
            
            const depositAmount = ethers.parseUnits("50000", 6);
            
            // Deposit
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            await strategy.connect(user1).deposit(depositAmount);
            
            // Fast forward time (1 year)
            await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine");
            
            const userYield = await strategy.calculateUserYield(user1.address);
            
            // Expected yield: 50,000 * 8% = 4,000 USDC (plus potential performance buffer)
            const expectedYield = (depositAmount * 800n) / 10000n;
            
            // Should be at least the base expected yield
            expect(userYield).to.be.greaterThanOrEqual(expectedYield - ethers.parseUnits("10", 6));
        });

        it("Should return 0 yield for user with no balance", async function () {
            const { strategy, user1 } = await loadFixture(deployResolvStrategyFixture);
            
            const userYield = await strategy.calculateUserYield(user1.address);
            expect(userYield).to.equal(0);
        });
    });

    describe("Yield Harvesting", function () {
        it("Should allow harvester to harvest yield", async function () {
            const { strategy, usdc, user1, harvester } = await loadFixture(deployResolvStrategyFixture);
            
            const depositAmount = ethers.parseUnits("50000", 6);
            
            // Deposit
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            await strategy.connect(user1).deposit(depositAmount);
            
            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]); // 30 days
            await ethers.provider.send("evm_mine");
            
            await expect(strategy.connect(harvester).harvestYield())
                .to.emit(strategy, "YieldHarvested");
        });

        it("Should update performance buffer after harvest", async function () {
            const { strategy, usdc, user1, harvester } = await loadFixture(deployResolvStrategyFixture);
            
            const depositAmount = ethers.parseUnits("50000", 6);
            
            // Deposit
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            await strategy.connect(user1).deposit(depositAmount);
            
            // Fast forward and harvest
            await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine");
            
            await expect(strategy.connect(harvester).harvestYield())
                .to.emit(strategy, "PerformanceBufferUpdated");
        });

        it("Should revert if not harvester", async function () {
            const { strategy, user1 } = await loadFixture(deployResolvStrategyFixture);
            
            await expect(strategy.connect(user1).harvestYield())
                .to.be.reverted;
        });
    });

    describe("Emergency Withdrawal", function () {
        it("Should allow manager to emergency withdraw", async function () {
            const { strategy, usdc, user1, manager } = await loadFixture(deployResolvStrategyFixture);
            
            const depositAmount = ethers.parseUnits("50000", 6);
            
            // Deposit
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            await strategy.connect(user1).deposit(depositAmount);
            
            const initialBalance = await usdc.balanceOf(user1.address);
            
            // Emergency withdraw
            await expect(strategy.connect(manager).emergencyWithdraw(user1.address))
                .to.emit(strategy, "EmergencyWithdrawalExecuted")
                .withArgs(user1.address, depositAmount);
            
            expect(await strategy.balanceOf(user1.address)).to.equal(0);
            expect(await usdc.balanceOf(user1.address)).to.equal(initialBalance + depositAmount);
        });

        it("Should revert if not manager", async function () {
            const { strategy, user1, user2 } = await loadFixture(deployResolvStrategyFixture);
            
            await expect(strategy.connect(user2).emergencyWithdraw(user1.address))
                .to.be.reverted;
        });
    });

    describe("Admin Functions", function () {
        it("Should allow manager to update APY", async function () {
            const { strategy, manager } = await loadFixture(deployResolvStrategyFixture);
            
            const newAPY = 900; // 9%
            
            await expect(strategy.connect(manager).updateAPY(newAPY))
                .to.emit(strategy, "APYUpdated")
                .withArgs(800, newAPY);
            
            expect(await strategy.getCurrentAPY()).to.equal(newAPY);
        });

        it("Should allow manager to update hedge ratio", async function () {
            const { strategy, manager } = await loadFixture(deployResolvStrategyFixture);
            
            const newHedgeRatio = 9500; // 95%
            
            await expect(strategy.connect(manager).updateHedgeRatio(newHedgeRatio))
                .to.emit(strategy, "StrategyUpdated")
                .withArgs("HedgeRatio", 10000, newHedgeRatio);
        });

        it("Should revert invalid hedge ratio", async function () {
            const { strategy, manager } = await loadFixture(deployResolvStrategyFixture);
            
            const invalidRatio = 7000; // 70% (below 80% minimum)
            
            await expect(strategy.connect(manager).updateHedgeRatio(invalidRatio))
                .to.be.revertedWith("Invalid hedge ratio");
        });

        it("Should allow manager to pause/unpause", async function () {
            const { strategy, manager } = await loadFixture(deployResolvStrategyFixture);
            
            await strategy.connect(manager).pause();
            
            const info = await strategy.getStrategyInfo();
            expect(info.active).to.be.false;
            
            await strategy.connect(manager).unpause();
            
            const infoAfter = await strategy.getStrategyInfo();
            expect(infoAfter.active).to.be.true;
        });
    });

    describe("Performance Functions", function () {
        it("Should report performance data with buffer", async function () {
            const { strategy, usdc, user1, harvester } = await loadFixture(deployResolvStrategyFixture);
            
            const depositAmount = ethers.parseUnits("50000", 6);
            
            // Deposit and harvest to establish performance buffer
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            await strategy.connect(user1).deposit(depositAmount);
            
            await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine");
            
            await strategy.connect(harvester).harvestYield();
            
            const performance = await strategy.getPerformanceData(365 * 24 * 60 * 60);
            expect(performance).to.be.greaterThanOrEqual(800); // At least base APY
        });

        it("Should report profitability based on delta deviation", async function () {
            const { strategy, usdc, user1 } = await loadFixture(deployResolvStrategyFixture);
            
            const depositAmount = ethers.parseUnits("50000", 6);
            
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            await strategy.connect(user1).deposit(depositAmount);
            
            expect(await strategy.isProfitable()).to.be.true;
        });

        it("Should report max capacity", async function () {
            const { strategy } = await loadFixture(deployResolvStrategyFixture);
            
            const maxCap = await strategy.maxCapacity();
            expect(maxCap).to.equal(ethers.parseUnits("50000000", 6)); // 50M USDC
        });

        it("Should calculate utilization rate correctly", async function () {
            const { strategy, usdc, user1 } = await loadFixture(deployResolvStrategyFixture);
            
            const depositAmount = ethers.parseUnits("1000000", 6); // 1M USDC
            
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            await strategy.connect(user1).deposit(depositAmount);
            
            const utilization = await strategy.utilizationRate();
            expect(utilization).to.equal(200); // 2% utilization (1M / 50M * 10000)
        });
    });

    describe("Share Conversion", function () {
        it("Should convert assets to shares correctly", async function () {
            const { strategy } = await loadFixture(deployResolvStrategyFixture);
            
            const assets = ethers.parseUnits("1000", 6);
            const shares = await strategy.convertToShares(assets);
            
            // Initially, 1:1 ratio
            expect(shares).to.equal(assets);
        });

        it("Should convert shares to assets correctly", async function () {
            const { strategy } = await loadFixture(deployResolvStrategyFixture);
            
            const shares = ethers.parseUnits("1000", 6);
            const assets = await strategy.convertToAssets(shares);
            
            // Initially, 1:1 ratio
            expect(assets).to.equal(shares);
        });

        it("Should handle conversion after yield accrual", async function () {
            const { strategy, usdc, user1, harvester } = await loadFixture(deployResolvStrategyFixture);
            
            const depositAmount = ethers.parseUnits("50000", 6);
            
            // Deposit
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            await strategy.connect(user1).deposit(depositAmount);
            
            const initialShares = await strategy.balanceOf(user1.address);
            
            // Fast forward and harvest
            await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine");
            
            await strategy.connect(harvester).harvestYield();
            
            // Shares should now be worth more assets
            const assetsAfterYield = await strategy.convertToAssets(initialShares);
            expect(assetsAfterYield).to.be.greaterThan(depositAmount);
        });
    });

    describe("Gas Optimization", function () {
        it("Should use reasonable gas for deposit", async function () {
            const { strategy, usdc, user1 } = await loadFixture(deployResolvStrategyFixture);
            
            const depositAmount = ethers.parseUnits("50000", 6);
            
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            
            const tx = await strategy.connect(user1).deposit(depositAmount);
            const receipt = await tx.wait();
            
            // Should use less than 270k gas (more complex than Noble due to delta-neutral logic)
            expect(receipt.gasUsed).to.be.lessThan(270000);
        });

        it("Should use reasonable gas for withdrawal", async function () {
            const { strategy, usdc, user1 } = await loadFixture(deployResolvStrategyFixture);
            
            const depositAmount = ethers.parseUnits("50000", 6);
            
            // Deposit first
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            await strategy.connect(user1).deposit(depositAmount);
            
            const userShares = await strategy.balanceOf(user1.address);
            
            const tx = await strategy.connect(user1).withdraw(userShares);
            const receipt = await tx.wait();
            
            // Should use less than 200k gas
            expect(receipt.gasUsed).to.be.lessThan(200000);
        });
    });

    describe("Edge Cases and Error Handling", function () {
        it("Should handle zero total assets correctly", async function () {
            const { strategy } = await loadFixture(deployResolvStrategyFixture);
            
            const shares = await strategy.convertToShares(1000);
            expect(shares).to.equal(1000);
        });

        it("Should handle zero total shares correctly", async function () {
            const { strategy } = await loadFixture(deployResolvStrategyFixture);
            
            const assets = await strategy.convertToAssets(1000);
            expect(assets).to.equal(1000);
        });

        it("Should emit Resolv protocol interaction events", async function () {
            const { strategy, usdc, user1 } = await loadFixture(deployResolvStrategyFixture);
            
            const depositAmount = ethers.parseUnits("50000", 6);
            
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            
            await expect(strategy.connect(user1).deposit(depositAmount))
                .to.emit(strategy, "ResolvProtocolInteraction")
                .withArgs("deploy", depositAmount, true);
        });

        it("Should handle rebalance during operations", async function () {
            const { strategy, usdc, user1, rebalancer } = await loadFixture(deployResolvStrategyFixture);
            
            const depositAmount = ethers.parseUnits("50000", 6);
            
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            await strategy.connect(user1).deposit(depositAmount);
            
            // Start rebalance in another transaction to test rebalance state
            const rebalanceTx = strategy.connect(rebalancer).rebalancePosition();
            await expect(rebalanceTx).to.not.be.reverted;
        });
    });
});