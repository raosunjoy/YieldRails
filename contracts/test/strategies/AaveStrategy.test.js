const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("AaveStrategy", function () {
    // Test fixture for deployment
    async function deployAaveStrategyFixture() {
        const [owner, user1, user2, manager, harvester, liquidator, aavePool, incentivesController] = await ethers.getSigners();

        // Deploy MockERC20 token (USDC)
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
        
        // Deploy aToken (mock)
        const aToken = await MockERC20.deploy("Aave USDC", "aUSDC", 6);

        // Deploy AaveStrategy
        const AaveStrategy = await ethers.getContractFactory("AaveStrategy");
        const strategy = await AaveStrategy.deploy(
            await usdc.getAddress(),
            aavePool.address,
            await aToken.getAddress(),
            incentivesController.address
        );

        // Grant roles
        const MANAGER_ROLE = await strategy.MANAGER_ROLE();
        const HARVESTER_ROLE = await strategy.HARVESTER_ROLE();
        const LIQUIDATOR_ROLE = await strategy.LIQUIDATOR_ROLE();
        
        await strategy.grantRole(MANAGER_ROLE, manager.address);
        await strategy.grantRole(HARVESTER_ROLE, harvester.address);
        await strategy.grantRole(LIQUIDATOR_ROLE, liquidator.address);

        // Mint tokens to users and strategy (for aToken simulation)
        const mintAmount = ethers.parseUnits("1000000", 6); // 1M USDC
        await usdc.mint(user1.address, mintAmount);
        await usdc.mint(user2.address, mintAmount);
        await aToken.mint(await strategy.getAddress(), 0); // Start with 0 aTokens

        return {
            strategy,
            usdc,
            aToken,
            owner,
            user1,
            user2,
            manager,
            harvester,
            liquidator,
            aavePool,
            incentivesController,
            mintAmount
        };
    }

    describe("Deployment", function () {
        it("Should deploy with correct parameters", async function () {
            const { strategy, usdc, aToken, aavePool, incentivesController } = await loadFixture(deployAaveStrategyFixture);

            expect(await strategy.asset()).to.equal(await usdc.getAddress());
            expect(await strategy.aavePool()).to.equal(aavePool.address);
            expect(await strategy.aToken()).to.equal(await aToken.getAddress());
            expect(await strategy.incentivesController()).to.equal(incentivesController.address);
            expect(await strategy.getRiskScore()).to.equal(3);
            expect(await strategy.getCurrentAPY()).to.equal(300); // 3%
        });

        it("Should revert with invalid addresses", async function () {
            const AaveStrategy = await ethers.getContractFactory("AaveStrategy");
            
            await expect(
                AaveStrategy.deploy(ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress, ethers.ZeroAddress)
            ).to.be.revertedWithCustomError(AaveStrategy, "InvalidAddress");
        });

        it("Should set correct strategy info", async function () {
            const { strategy } = await loadFixture(deployAaveStrategyFixture);
            
            const info = await strategy.getStrategyInfo();
            expect(info.name).to.equal("Aave Lending Strategy");
            expect(info.riskScore).to.equal(3);
            expect(info.active).to.be.true;
        });
    });

    describe("Deposit Functionality", function () {
        it("Should deposit successfully", async function () {
            const { strategy, usdc, user1 } = await loadFixture(deployAaveStrategyFixture);
            
            const depositAmount = ethers.parseUnits("1000", 6); // 1,000 USDC
            
            // Approve and deposit
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            
            await expect(strategy.connect(user1).deposit(depositAmount))
                .to.emit(strategy, "Deposit")
                .withArgs(user1.address, depositAmount, depositAmount);
            
            expect(await strategy.balanceOf(user1.address)).to.equal(depositAmount);
            expect(await strategy.totalAssets()).to.equal(depositAmount);
        });

        it("Should revert with insufficient amount", async function () {
            const { strategy, user1 } = await loadFixture(deployAaveStrategyFixture);
            
            await expect(strategy.connect(user1).deposit(0))
                .to.be.revertedWithCustomError(strategy, "InsufficientAmount");
        });

        it("Should revert below minimum deposit", async function () {
            const { strategy, usdc, user1 } = await loadFixture(deployAaveStrategyFixture);
            
            const smallAmount = ethers.parseUnits("50", 6); // 50 USDC (below 100 minimum)
            
            await usdc.connect(user1).approve(await strategy.getAddress(), smallAmount);
            
            await expect(strategy.connect(user1).deposit(smallAmount))
                .to.be.revertedWithCustomError(strategy, "BelowMinimumDeposit");
        });

        it("Should revert when exceeding max capacity", async function () {
            const { strategy, usdc, user1 } = await loadFixture(deployAaveStrategyFixture);
            
            const maxAmount = ethers.parseUnits("200000001", 6); // 200M + 1 USDC
            
            await usdc.mint(user1.address, maxAmount);
            await usdc.connect(user1).approve(await strategy.getAddress(), maxAmount);
            
            await expect(strategy.connect(user1).deposit(maxAmount))
                .to.be.revertedWithCustomError(strategy, "ExceedsMaxCapacity");
        });

        it("Should emit Aave protocol interaction", async function () {
            const { strategy, usdc, user1 } = await loadFixture(deployAaveStrategyFixture);
            
            const depositAmount = ethers.parseUnits("1000", 6);
            
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            
            await expect(strategy.connect(user1).deposit(depositAmount))
                .to.emit(strategy, "AaveProtocolInteraction")
                .withArgs("supply", depositAmount, true);
        });

        it("Should handle multiple deposits correctly", async function () {
            const { strategy, usdc, user1, user2 } = await loadFixture(deployAaveStrategyFixture);
            
            const deposit1 = ethers.parseUnits("1000", 6);
            const deposit2 = ethers.parseUnits("2000", 6);
            
            // First deposit
            await usdc.connect(user1).approve(await strategy.getAddress(), deposit1);
            await strategy.connect(user1).deposit(deposit1);
            
            // Second deposit
            await usdc.connect(user2).approve(await strategy.getAddress(), deposit2);
            await strategy.connect(user2).deposit(deposit2);
            
            expect(await strategy.balanceOf(user1.address)).to.equal(deposit1);
            expect(await strategy.balanceOf(user2.address)).to.equal(deposit2);
            expect(await strategy.totalAssets()).to.equal(deposit1 + deposit2);
        });
    });

    describe("Withdrawal Functionality", function () {
        it("Should withdraw successfully", async function () {
            const { strategy, usdc, user1 } = await loadFixture(deployAaveStrategyFixture);
            
            const depositAmount = ethers.parseUnits("1000", 6);
            
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
            const { strategy, user1 } = await loadFixture(deployAaveStrategyFixture);
            
            await expect(strategy.connect(user1).withdraw(0))
                .to.be.revertedWithCustomError(strategy, "InsufficientShares");
        });

        it("Should revert with insufficient balance", async function () {
            const { strategy, user1 } = await loadFixture(deployAaveStrategyFixture);
            
            const shares = ethers.parseUnits("1000", 6);
            
            await expect(strategy.connect(user1).withdraw(shares))
                .to.be.revertedWithCustomError(strategy, "InsufficientBalance");
        });

        it("Should handle partial withdrawals", async function () {
            const { strategy, usdc, user1 } = await loadFixture(deployAaveStrategyFixture);
            
            const depositAmount = ethers.parseUnits("1000", 6);
            
            // Deposit
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            await strategy.connect(user1).deposit(depositAmount);
            
            const userShares = await strategy.balanceOf(user1.address);
            const partialShares = userShares / 2n;
            
            // Partial withdrawal
            await strategy.connect(user1).withdraw(partialShares);
            
            expect(await strategy.balanceOf(user1.address)).to.equal(userShares - partialShares);
        });
    });

    describe("Aave-Specific Functions", function () {
        it("Should update utilization rate", async function () {
            const { strategy, usdc, user1 } = await loadFixture(deployAaveStrategyFixture);
            
            const depositAmount = ethers.parseUnits("1000", 6);
            
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            await strategy.connect(user1).deposit(depositAmount);
            
            // The utilization update should not revert
            await expect(strategy.updateUtilization()).to.not.be.reverted;
        });

        it("Should get Aave utilization", async function () {
            const { strategy, usdc, user1 } = await loadFixture(deployAaveStrategyFixture);
            
            const depositAmount = ethers.parseUnits("1000", 6);
            
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            await strategy.connect(user1).deposit(depositAmount);
            
            const utilization = await strategy.getAaveUtilization();
            expect(utilization).to.be.a("bigint");
        });

        it("Should allow manager to set emergency mode", async function () {
            const { strategy, manager } = await loadFixture(deployAaveStrategyFixture);
            
            await expect(strategy.connect(manager).setEmergencyMode(true))
                .to.emit(strategy, "EmergencyModeToggled")
                .withArgs(true);
        });

        it("Should revert deposits in emergency mode", async function () {
            const { strategy, usdc, user1, manager } = await loadFixture(deployAaveStrategyFixture);
            
            // Set emergency mode
            await strategy.connect(manager).setEmergencyMode(true);
            
            const depositAmount = ethers.parseUnits("1000", 6);
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            
            await expect(strategy.connect(user1).deposit(depositAmount))
                .to.be.revertedWithCustomError(strategy, "EmergencyModeActive");
        });

        it("Should allow users to claim their incentives", async function () {
            const { strategy, usdc, user1 } = await loadFixture(deployAaveStrategyFixture);
            
            const depositAmount = ethers.parseUnits("1000", 6);
            
            // Deposit
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            await strategy.connect(user1).deposit(depositAmount);
            
            // Fast forward time to accrue incentives
            await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]); // 30 days
            await ethers.provider.send("evm_mine");
            
            const incentives = await strategy.connect(user1).claimUserIncentives(user1.address);
            expect(incentives).to.not.be.reverted;
        });
    });

    describe("Yield Calculation", function () {
        it("Should calculate user yield correctly", async function () {
            const { strategy, usdc, user1 } = await loadFixture(deployAaveStrategyFixture);
            
            const depositAmount = ethers.parseUnits("10000", 6);
            
            // Deposit
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            await strategy.connect(user1).deposit(depositAmount);
            
            // Fast forward time (1 year)
            await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine");
            
            const userYield = await strategy.calculateUserYield(user1.address);
            
            // Expected yield: 10,000 * 3% = 300 USDC
            const expectedYield = (depositAmount * 300n) / 10000n;
            
            // Allow for small rounding differences
            expect(userYield).to.be.closeTo(expectedYield, ethers.parseUnits("1", 6));
        });

        it("Should return 0 yield for user with no balance", async function () {
            const { strategy, user1 } = await loadFixture(deployAaveStrategyFixture);
            
            const userYield = await strategy.calculateUserYield(user1.address);
            expect(userYield).to.equal(0);
        });

        it("Should include accrued incentives in yield calculation", async function () {
            const { strategy, usdc, user1 } = await loadFixture(deployAaveStrategyFixture);
            
            const depositAmount = ethers.parseUnits("10000", 6);
            
            // Deposit
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            await strategy.connect(user1).deposit(depositAmount);
            
            // Fast forward time to accrue incentives
            await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine");
            
            const userYield = await strategy.calculateUserYield(user1.address);
            
            // Should include both lending yield and incentives
            expect(userYield).to.be.greaterThan(0);
        });
    });

    describe("Yield Harvesting", function () {
        it("Should allow harvester to harvest yield", async function () {
            const { strategy, usdc, aToken, user1, harvester } = await loadFixture(deployAaveStrategyFixture);
            
            const depositAmount = ethers.parseUnits("10000", 6);
            
            // Deposit
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            await strategy.connect(user1).deposit(depositAmount);
            
            // Simulate aToken balance increase (yield accrual)
            const yieldAmount = ethers.parseUnits("100", 6); // 100 USDC yield
            await aToken.mint(await strategy.getAddress(), yieldAmount);
            
            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]); // 30 days
            await ethers.provider.send("evm_mine");
            
            await expect(strategy.connect(harvester).harvestYield())
                .to.emit(strategy, "YieldHarvested");
        });

        it("Should claim protocol incentives during harvest", async function () {
            const { strategy, usdc, user1, harvester } = await loadFixture(deployAaveStrategyFixture);
            
            const depositAmount = ethers.parseUnits("10000", 6);
            
            // Deposit
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            await strategy.connect(user1).deposit(depositAmount);
            
            // Fast forward and harvest
            await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine");
            
            await expect(strategy.connect(harvester).harvestYield())
                .to.emit(strategy, "AaveProtocolInteraction")
                .withArgs("claimIncentives", ethers.parseUnits("50", 6), true); // Mock 0.5% of 10k = 50 USDC
        });

        it("Should revert if not harvester", async function () {
            const { strategy, user1 } = await loadFixture(deployAaveStrategyFixture);
            
            await expect(strategy.connect(user1).harvestYield())
                .to.be.reverted;
        });

        it("Should update total yield generated", async function () {
            const { strategy, usdc, aToken, user1, harvester } = await loadFixture(deployAaveStrategyFixture);
            
            const depositAmount = ethers.parseUnits("10000", 6);
            
            // Deposit
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            await strategy.connect(user1).deposit(depositAmount);
            
            const initialTotalYield = await strategy.getTotalYieldGenerated();
            
            // Simulate yield and harvest
            const yieldAmount = ethers.parseUnits("100", 6);
            await aToken.mint(await strategy.getAddress(), yieldAmount);
            
            await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine");
            
            await strategy.connect(harvester).harvestYield();
            
            const finalTotalYield = await strategy.getTotalYieldGenerated();
            expect(finalTotalYield).to.be.greaterThan(initialTotalYield);
        });
    });

    describe("Emergency Withdrawal", function () {
        it("Should allow manager to emergency withdraw", async function () {
            const { strategy, usdc, user1, manager } = await loadFixture(deployAaveStrategyFixture);
            
            const depositAmount = ethers.parseUnits("1000", 6);
            
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
            const { strategy, user1, user2 } = await loadFixture(deployAaveStrategyFixture);
            
            await expect(strategy.connect(user2).emergencyWithdraw(user1.address))
                .to.be.reverted;
        });

        it("Should return 0 for user with no balance", async function () {
            const { strategy, user1, manager } = await loadFixture(deployAaveStrategyFixture);
            
            const result = await strategy.connect(manager).emergencyWithdraw(user1.address);
            expect(result).to.not.be.reverted;
        });
    });

    describe("Admin Functions", function () {
        it("Should allow manager to update APY", async function () {
            const { strategy, manager } = await loadFixture(deployAaveStrategyFixture);
            
            const newAPY = 400; // 4%
            
            await expect(strategy.connect(manager).updateAPY(newAPY))
                .to.emit(strategy, "APYUpdated")
                .withArgs(300, newAPY);
            
            expect(await strategy.getCurrentAPY()).to.equal(newAPY);
        });

        it("Should revert APY update if too high", async function () {
            const { strategy, manager } = await loadFixture(deployAaveStrategyFixture);
            
            const tooHighAPY = 1600; // 16%
            
            await expect(strategy.connect(manager).updateAPY(tooHighAPY))
                .to.be.revertedWith("APY too high");
        });

        it("Should allow manager to pause/unpause", async function () {
            const { strategy, manager } = await loadFixture(deployAaveStrategyFixture);
            
            await strategy.connect(manager).pause();
            
            const info = await strategy.getStrategyInfo();
            expect(info.active).to.be.false;
            
            await strategy.connect(manager).unpause();
            
            const infoAfter = await strategy.getStrategyInfo();
            expect(infoAfter.active).to.be.true;
        });

        it("Should revert operations when paused", async function () {
            const { strategy, usdc, user1, manager } = await loadFixture(deployAaveStrategyFixture);
            
            await strategy.connect(manager).pause();
            
            const depositAmount = ethers.parseUnits("1000", 6);
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            
            await expect(strategy.connect(user1).deposit(depositAmount))
                .to.be.revertedWith("Pausable: paused");
        });
    });

    describe("Performance Functions", function () {
        it("Should report performance data adjusted for utilization", async function () {
            const { strategy, usdc, user1 } = await loadFixture(deployAaveStrategyFixture);
            
            const depositAmount = ethers.parseUnits("100000", 6); // Large deposit to affect utilization
            
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            await strategy.connect(user1).deposit(depositAmount);
            
            const performance = await strategy.getPerformanceData(365 * 24 * 60 * 60);
            expect(performance).to.be.a("bigint");
        });

        it("Should report profitability based on conditions", async function () {
            const { strategy, usdc, user1 } = await loadFixture(deployAaveStrategyFixture);
            
            const depositAmount = ethers.parseUnits("1000", 6);
            
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            await strategy.connect(user1).deposit(depositAmount);
            
            expect(await strategy.isProfitable()).to.be.true;
        });

        it("Should report max capacity", async function () {
            const { strategy } = await loadFixture(deployAaveStrategyFixture);
            
            const maxCap = await strategy.maxCapacity();
            expect(maxCap).to.equal(ethers.parseUnits("200000000", 6)); // 200M USDC
        });

        it("Should calculate utilization rate correctly", async function () {
            const { strategy, usdc, user1 } = await loadFixture(deployAaveStrategyFixture);
            
            const depositAmount = ethers.parseUnits("2000000", 6); // 2M USDC
            
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            await strategy.connect(user1).deposit(depositAmount);
            
            const utilization = await strategy.utilizationRate();
            expect(utilization).to.equal(100); // 1% utilization (2M / 200M * 10000)
        });
    });

    describe("Share Conversion", function () {
        it("Should convert assets to shares correctly", async function () {
            const { strategy } = await loadFixture(deployAaveStrategyFixture);
            
            const assets = ethers.parseUnits("1000", 6);
            const shares = await strategy.convertToShares(assets);
            
            // Initially, 1:1 ratio
            expect(shares).to.equal(assets);
        });

        it("Should convert shares to assets correctly", async function () {
            const { strategy } = await loadFixture(deployAaveStrategyFixture);
            
            const shares = ethers.parseUnits("1000", 6);
            const assets = await strategy.convertToAssets(shares);
            
            // Initially, 1:1 ratio
            expect(assets).to.equal(shares);
        });

        it("Should handle conversion after yield accrual", async function () {
            const { strategy, usdc, aToken, user1, harvester } = await loadFixture(deployAaveStrategyFixture);
            
            const depositAmount = ethers.parseUnits("10000", 6);
            
            // Deposit
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            await strategy.connect(user1).deposit(depositAmount);
            
            const initialShares = await strategy.balanceOf(user1.address);
            
            // Simulate yield and harvest
            const yieldAmount = ethers.parseUnits("300", 6); // 3% yield
            await aToken.mint(await strategy.getAddress(), yieldAmount);
            
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
            const { strategy, usdc, user1 } = await loadFixture(deployAaveStrategyFixture);
            
            const depositAmount = ethers.parseUnits("1000", 6);
            
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            
            const tx = await strategy.connect(user1).deposit(depositAmount);
            const receipt = await tx.wait();
            
            // Should use less than 250k gas
            expect(receipt.gasUsed).to.be.lessThan(250000);
        });

        it("Should use reasonable gas for withdrawal", async function () {
            const { strategy, usdc, user1 } = await loadFixture(deployAaveStrategyFixture);
            
            const depositAmount = ethers.parseUnits("1000", 6);
            
            // Deposit first
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            await strategy.connect(user1).deposit(depositAmount);
            
            const userShares = await strategy.balanceOf(user1.address);
            
            const tx = await strategy.connect(user1).withdraw(userShares);
            const receipt = await tx.wait();
            
            // Should use less than 180k gas
            expect(receipt.gasUsed).to.be.lessThan(180000);
        });
    });

    describe("Edge Cases and Error Handling", function () {
        it("Should handle zero total assets correctly", async function () {
            const { strategy } = await loadFixture(deployAaveStrategyFixture);
            
            const shares = await strategy.convertToShares(1000);
            expect(shares).to.equal(1000);
        });

        it("Should handle zero total shares correctly", async function () {
            const { strategy } = await loadFixture(deployAaveStrategyFixture);
            
            const assets = await strategy.convertToAssets(1000);
            expect(assets).to.equal(1000);
        });

        it("Should emit Aave protocol interaction events", async function () {
            const { strategy, usdc, user1 } = await loadFixture(deployAaveStrategyFixture);
            
            const depositAmount = ethers.parseUnits("1000", 6);
            
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            
            await expect(strategy.connect(user1).deposit(depositAmount))
                .to.emit(strategy, "AaveProtocolInteraction")
                .withArgs("supply", depositAmount, true);
        });

        it("Should handle high utilization scenarios", async function () {
            const { strategy, usdc, user1, manager } = await loadFixture(deployAaveStrategyFixture);
            
            // Simulate high utilization by depositing large amount
            const largeDeposit = ethers.parseUnits("180000000", 6); // 180M USDC (90% of capacity)
            
            await usdc.mint(user1.address, largeDeposit);
            await usdc.connect(user1).approve(await strategy.getAddress(), largeDeposit);
            
            // This should work but trigger utilization warnings
            await strategy.connect(user1).deposit(largeDeposit);
            
            // Check that utilization is tracked
            const utilization = await strategy.getAaveUtilization();
            expect(utilization).to.be.greaterThan(0);
        });

        it("Should handle emergency mode correctly", async function () {
            const { strategy, usdc, user1, manager } = await loadFixture(deployAaveStrategyFixture);
            
            // First deposit normally
            const depositAmount = ethers.parseUnits("1000", 6);
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            await strategy.connect(user1).deposit(depositAmount);
            
            // Enable emergency mode
            await strategy.connect(manager).setEmergencyMode(true);
            
            // New deposits should fail
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            await expect(strategy.connect(user1).deposit(depositAmount))
                .to.be.revertedWithCustomError(strategy, "EmergencyModeActive");
            
            // But withdrawals should still work
            const userShares = await strategy.balanceOf(user1.address);
            await expect(strategy.connect(user1).withdraw(userShares))
                .to.not.be.reverted;
        });
    });
});