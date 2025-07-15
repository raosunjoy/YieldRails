const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("NobleStrategy", function () {
    // Test fixture for deployment
    async function deployNobleStrategyFixture() {
        const [owner, user1, user2, manager, harvester, nobleProtocol] = await ethers.getSigners();

        // Deploy MockERC20 token (USDC)
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);

        // Deploy NobleStrategy
        const NobleStrategy = await ethers.getContractFactory("NobleStrategy");
        const strategy = await NobleStrategy.deploy(
            await usdc.getAddress(),
            nobleProtocol.address
        );

        // Grant roles
        const MANAGER_ROLE = await strategy.MANAGER_ROLE();
        const HARVESTER_ROLE = await strategy.HARVESTER_ROLE();
        
        await strategy.grantRole(MANAGER_ROLE, manager.address);
        await strategy.grantRole(HARVESTER_ROLE, harvester.address);

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
            nobleProtocol,
            mintAmount
        };
    }

    describe("Deployment", function () {
        it("Should deploy with correct parameters", async function () {
            const { strategy, usdc, nobleProtocol } = await loadFixture(deployNobleStrategyFixture);

            expect(await strategy.asset()).to.equal(await usdc.getAddress());
            expect(await strategy.nobleProtocol()).to.equal(nobleProtocol.address);
            expect(await strategy.getRiskScore()).to.equal(2);
            expect(await strategy.getCurrentAPY()).to.equal(450); // 4.5%
        });

        it("Should revert with invalid addresses", async function () {
            const NobleStrategy = await ethers.getContractFactory("NobleStrategy");
            
            await expect(
                NobleStrategy.deploy(ethers.ZeroAddress, ethers.ZeroAddress)
            ).to.be.revertedWithCustomError(NobleStrategy, "InvalidAddress");
        });

        it("Should set correct strategy info", async function () {
            const { strategy } = await loadFixture(deployNobleStrategyFixture);
            
            const info = await strategy.getStrategyInfo();
            expect(info.name).to.equal("Noble T-Bill Strategy");
            expect(info.riskScore).to.equal(2);
            expect(info.active).to.be.true;
        });
    });

    describe("Deposit Functionality", function () {
        it("Should deposit successfully", async function () {
            const { strategy, usdc, user1 } = await loadFixture(deployNobleStrategyFixture);
            
            const depositAmount = ethers.parseUnits("10000", 6); // 10,000 USDC
            
            // Approve and deposit
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            
            await expect(strategy.connect(user1).deposit(depositAmount))
                .to.emit(strategy, "Deposit")
                .withArgs(user1.address, depositAmount, depositAmount);
            
            expect(await strategy.balanceOf(user1.address)).to.equal(depositAmount);
            expect(await strategy.totalAssets()).to.equal(depositAmount);
        });

        it("Should revert with insufficient amount", async function () {
            const { strategy, user1 } = await loadFixture(deployNobleStrategyFixture);
            
            await expect(strategy.connect(user1).deposit(0))
                .to.be.revertedWithCustomError(strategy, "InsufficientAmount");
        });

        it("Should revert below minimum deposit", async function () {
            const { strategy, usdc, user1 } = await loadFixture(deployNobleStrategyFixture);
            
            const smallAmount = ethers.parseUnits("100", 6); // 100 USDC (below 1000 minimum)
            
            await usdc.connect(user1).approve(await strategy.getAddress(), smallAmount);
            
            await expect(strategy.connect(user1).deposit(smallAmount))
                .to.be.revertedWithCustomError(strategy, "BelowMinimumDeposit");
        });

        it("Should revert when exceeding max capacity", async function () {
            const { strategy, usdc, user1 } = await loadFixture(deployNobleStrategyFixture);
            
            const maxAmount = ethers.parseUnits("100000001", 6); // 100M + 1 USDC
            
            await usdc.mint(user1.address, maxAmount);
            await usdc.connect(user1).approve(await strategy.getAddress(), maxAmount);
            
            await expect(strategy.connect(user1).deposit(maxAmount))
                .to.be.revertedWithCustomError(strategy, "ExceedsMaxCapacity");
        });

        it("Should handle multiple deposits correctly", async function () {
            const { strategy, usdc, user1, user2 } = await loadFixture(deployNobleStrategyFixture);
            
            const deposit1 = ethers.parseUnits("10000", 6);
            const deposit2 = ethers.parseUnits("20000", 6);
            
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
            const { strategy, usdc, user1 } = await loadFixture(deployNobleStrategyFixture);
            
            const depositAmount = ethers.parseUnits("10000", 6);
            
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
            const { strategy, user1 } = await loadFixture(deployNobleStrategyFixture);
            
            await expect(strategy.connect(user1).withdraw(0))
                .to.be.revertedWithCustomError(strategy, "InsufficientShares");
        });

        it("Should revert with insufficient balance", async function () {
            const { strategy, user1 } = await loadFixture(deployNobleStrategyFixture);
            
            const shares = ethers.parseUnits("1000", 6);
            
            await expect(strategy.connect(user1).withdraw(shares))
                .to.be.revertedWithCustomError(strategy, "InsufficientBalance");
        });

        it("Should handle partial withdrawals", async function () {
            const { strategy, usdc, user1 } = await loadFixture(deployNobleStrategyFixture);
            
            const depositAmount = ethers.parseUnits("10000", 6);
            
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

    describe("Emergency Withdrawal", function () {
        it("Should allow manager to emergency withdraw", async function () {
            const { strategy, usdc, user1, manager } = await loadFixture(deployNobleStrategyFixture);
            
            const depositAmount = ethers.parseUnits("10000", 6);
            
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
            const { strategy, user1, user2 } = await loadFixture(deployNobleStrategyFixture);
            
            await expect(strategy.connect(user2).emergencyWithdraw(user1.address))
                .to.be.reverted;
        });

        it("Should return 0 for user with no balance", async function () {
            const { strategy, user1, manager } = await loadFixture(deployNobleStrategyFixture);
            
            const result = await strategy.connect(manager).emergencyWithdraw(user1.address);
            expect(result).to.not.be.reverted;
        });
    });

    describe("Yield Calculation", function () {
        it("Should calculate user yield correctly", async function () {
            const { strategy, usdc, user1 } = await loadFixture(deployNobleStrategyFixture);
            
            const depositAmount = ethers.parseUnits("10000", 6);
            
            // Deposit
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            await strategy.connect(user1).deposit(depositAmount);
            
            // Fast forward time (1 year)
            await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine");
            
            const userYield = await strategy.calculateUserYield(user1.address);
            
            // Expected yield: 10,000 * 4.5% = 450 USDC
            const expectedYield = (depositAmount * 450n) / 10000n;
            
            // Allow for small rounding differences
            expect(userYield).to.be.closeTo(expectedYield, ethers.parseUnits("1", 6));
        });

        it("Should return 0 yield for user with no balance", async function () {
            const { strategy, user1 } = await loadFixture(deployNobleStrategyFixture);
            
            const userYield = await strategy.calculateUserYield(user1.address);
            expect(userYield).to.equal(0);
        });

        it("Should calculate proportional yield for multiple users", async function () {
            const { strategy, usdc, user1, user2 } = await loadFixture(deployNobleStrategyFixture);
            
            const deposit1 = ethers.parseUnits("10000", 6);
            const deposit2 = ethers.parseUnits("20000", 6);
            
            // Deposits
            await usdc.connect(user1).approve(await strategy.getAddress(), deposit1);
            await strategy.connect(user1).deposit(deposit1);
            
            await usdc.connect(user2).approve(await strategy.getAddress(), deposit2);
            await strategy.connect(user2).deposit(deposit2);
            
            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [365 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine");
            
            const yield1 = await strategy.calculateUserYield(user1.address);
            const yield2 = await strategy.calculateUserYield(user2.address);
            
            // User2 should have approximately 2x the yield of user1
            expect(yield2).to.be.closeTo(yield1 * 2n, ethers.parseUnits("1", 6));
        });
    });

    describe("Yield Harvesting", function () {
        it("Should allow harvester to harvest yield", async function () {
            const { strategy, usdc, user1, harvester } = await loadFixture(deployNobleStrategyFixture);
            
            const depositAmount = ethers.parseUnits("10000", 6);
            
            // Deposit
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            await strategy.connect(user1).deposit(depositAmount);
            
            // Fast forward time
            await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]); // 30 days
            await ethers.provider.send("evm_mine");
            
            await expect(strategy.connect(harvester).harvestYield())
                .to.emit(strategy, "YieldHarvested");
        });

        it("Should revert if not harvester", async function () {
            const { strategy, user1 } = await loadFixture(deployNobleStrategyFixture);
            
            await expect(strategy.connect(user1).harvestYield())
                .to.be.reverted;
        });

        it("Should update total yield generated", async function () {
            const { strategy, usdc, user1, harvester } = await loadFixture(deployNobleStrategyFixture);
            
            const depositAmount = ethers.parseUnits("10000", 6);
            
            // Deposit
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            await strategy.connect(user1).deposit(depositAmount);
            
            const initialTotalYield = await strategy.getTotalYieldGenerated();
            
            // Fast forward and harvest
            await ethers.provider.send("evm_increaseTime", [30 * 24 * 60 * 60]);
            await ethers.provider.send("evm_mine");
            
            await strategy.connect(harvester).harvestYield();
            
            const finalTotalYield = await strategy.getTotalYieldGenerated();
            expect(finalTotalYield).to.be.greaterThan(initialTotalYield);
        });
    });

    describe("Share Conversion", function () {
        it("Should convert assets to shares correctly", async function () {
            const { strategy } = await loadFixture(deployNobleStrategyFixture);
            
            const assets = ethers.parseUnits("1000", 6);
            const shares = await strategy.convertToShares(assets);
            
            // Initially, 1:1 ratio
            expect(shares).to.equal(assets);
        });

        it("Should convert shares to assets correctly", async function () {
            const { strategy } = await loadFixture(deployNobleStrategyFixture);
            
            const shares = ethers.parseUnits("1000", 6);
            const assets = await strategy.convertToAssets(shares);
            
            // Initially, 1:1 ratio
            expect(assets).to.equal(shares);
        });

        it("Should handle conversion after yield accrual", async function () {
            const { strategy, usdc, user1, harvester } = await loadFixture(deployNobleStrategyFixture);
            
            const depositAmount = ethers.parseUnits("10000", 6);
            
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

    describe("Admin Functions", function () {
        it("Should allow manager to update APY", async function () {
            const { strategy, manager } = await loadFixture(deployNobleStrategyFixture);
            
            const newAPY = 500; // 5%
            
            await expect(strategy.connect(manager).updateAPY(newAPY))
                .to.emit(strategy, "APYUpdated")
                .withArgs(450, newAPY);
            
            expect(await strategy.getCurrentAPY()).to.equal(newAPY);
        });

        it("Should revert APY update if too high", async function () {
            const { strategy, manager } = await loadFixture(deployNobleStrategyFixture);
            
            const tooHighAPY = 2100; // 21%
            
            await expect(strategy.connect(manager).updateAPY(tooHighAPY))
                .to.be.revertedWith("APY too high");
        });

        it("Should allow manager to pause/unpause", async function () {
            const { strategy, manager } = await loadFixture(deployNobleStrategyFixture);
            
            await strategy.connect(manager).pause();
            
            const info = await strategy.getStrategyInfo();
            expect(info.active).to.be.false;
            
            await strategy.connect(manager).unpause();
            
            const infoAfter = await strategy.getStrategyInfo();
            expect(infoAfter.active).to.be.true;
        });

        it("Should revert operations when paused", async function () {
            const { strategy, usdc, user1, manager } = await loadFixture(deployNobleStrategyFixture);
            
            await strategy.connect(manager).pause();
            
            const depositAmount = ethers.parseUnits("10000", 6);
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            
            await expect(strategy.connect(user1).deposit(depositAmount))
                .to.be.revertedWith("Pausable: paused");
        });
    });

    describe("Performance and Capacity", function () {
        it("Should report correct performance data", async function () {
            const { strategy } = await loadFixture(deployNobleStrategyFixture);
            
            const performance = await strategy.getPerformanceData(365 * 24 * 60 * 60);
            expect(performance).to.equal(450); // Current APY
        });

        it("Should report profitability correctly", async function () {
            const { strategy } = await loadFixture(deployNobleStrategyFixture);
            
            expect(await strategy.isProfitable()).to.be.true;
        });

        it("Should report max capacity", async function () {
            const { strategy } = await loadFixture(deployNobleStrategyFixture);
            
            const maxCap = await strategy.maxCapacity();
            expect(maxCap).to.equal(ethers.parseUnits("100000000", 6)); // 100M USDC
        });

        it("Should calculate utilization rate correctly", async function () {
            const { strategy, usdc, user1 } = await loadFixture(deployNobleStrategyFixture);
            
            const depositAmount = ethers.parseUnits("1000000", 6); // 1M USDC
            
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            await strategy.connect(user1).deposit(depositAmount);
            
            const utilization = await strategy.utilizationRate();
            expect(utilization).to.equal(100); // 1% utilization (1M / 100M * 10000)
        });
    });

    describe("Gas Optimization", function () {
        it("Should use reasonable gas for deposit", async function () {
            const { strategy, usdc, user1 } = await loadFixture(deployNobleStrategyFixture);
            
            const depositAmount = ethers.parseUnits("10000", 6);
            
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            
            const tx = await strategy.connect(user1).deposit(depositAmount);
            const receipt = await tx.wait();
            
            // Should use less than 220k gas
            expect(receipt.gasUsed).to.be.lessThan(220000);
        });

        it("Should use reasonable gas for withdrawal", async function () {
            const { strategy, usdc, user1 } = await loadFixture(deployNobleStrategyFixture);
            
            const depositAmount = ethers.parseUnits("10000", 6);
            
            // Deposit first
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            await strategy.connect(user1).deposit(depositAmount);
            
            const userShares = await strategy.balanceOf(user1.address);
            
            const tx = await strategy.connect(user1).withdraw(userShares);
            const receipt = await tx.wait();
            
            // Should use less than 150k gas
            expect(receipt.gasUsed).to.be.lessThan(150000);
        });
    });

    describe("Edge Cases and Error Handling", function () {
        it("Should handle zero total assets correctly", async function () {
            const { strategy } = await loadFixture(deployNobleStrategyFixture);
            
            const shares = await strategy.convertToShares(1000);
            expect(shares).to.equal(1000);
        });

        it("Should handle zero total shares correctly", async function () {
            const { strategy } = await loadFixture(deployNobleStrategyFixture);
            
            const assets = await strategy.convertToAssets(1000);
            expect(assets).to.equal(1000);
        });

        it("Should emit Noble protocol interaction events", async function () {
            const { strategy, usdc, user1 } = await loadFixture(deployNobleStrategyFixture);
            
            const depositAmount = ethers.parseUnits("10000", 6);
            
            await usdc.connect(user1).approve(await strategy.getAddress(), depositAmount);
            
            await expect(strategy.connect(user1).deposit(depositAmount))
                .to.emit(strategy, "NobleProtocolInteraction")
                .withArgs("deposit", depositAmount, true);
        });
    });
});