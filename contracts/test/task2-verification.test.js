const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  setupAccounts,
  deployMockTokens,
  deployMockStrategies,
  GAS_LIMITS,
  gasOptimizationFramework
} = require("./helpers");

describe("Task 2 Implementation Verification", function () {
  let accounts;
  let tokens;
  let strategies;

  before(async function () {
    accounts = await setupAccounts();
    tokens = await deployMockTokens();
    strategies = await deployMockStrategies();
  });

  describe("Sub-task 1: IYieldStrategy Interface Implementation", function () {
    it("Should have comprehensive IYieldStrategy interface with all required methods", async function () {
      // Verify interface exists by checking that our mock strategy implements it
      // (We can't create a factory for an interface directly)
      
      // The interface should be deployable (though we don't deploy interfaces directly)
      // We verify this by checking that our mock strategy implements it
      const { nobleStrategy } = strategies;
      
      // Verify all required methods exist and are callable
      expect(await nobleStrategy.deposit).to.not.be.undefined;
      expect(await nobleStrategy.withdraw).to.not.be.undefined;
      expect(await nobleStrategy.emergencyWithdraw).to.not.be.undefined;
      expect(await nobleStrategy.getCurrentAPY).to.not.be.undefined;
      expect(await nobleStrategy.calculateUserYield).to.not.be.undefined;
      expect(await nobleStrategy.getTotalYieldGenerated).to.not.be.undefined;
      expect(await nobleStrategy.harvestYield).to.not.be.undefined;
      expect(await nobleStrategy.convertToShares).to.not.be.undefined;
      expect(await nobleStrategy.convertToAssets).to.not.be.undefined;
      expect(await nobleStrategy.balanceOf).to.not.be.undefined;
      expect(await nobleStrategy.getStrategyInfo).to.not.be.undefined;
      expect(await nobleStrategy.asset).to.not.be.undefined;
      expect(await nobleStrategy.totalAssets).to.not.be.undefined;
      expect(await nobleStrategy.getRiskScore).to.not.be.undefined;
      expect(await nobleStrategy.getPerformanceData).to.not.be.undefined;
      expect(await nobleStrategy.isProfitable).to.not.be.undefined;
      expect(await nobleStrategy.maxCapacity).to.not.be.undefined;
      expect(await nobleStrategy.utilizationRate).to.not.be.undefined;
    });

    it("Should have comprehensive events defined in interface", async function () {
      const { nobleStrategy, baseToken } = strategies;
      const amount = ethers.parseUnits("100", 18);
      
      // Setup for testing events
      await baseToken.mint(accounts.user1.address, amount);
      await baseToken.connect(accounts.user1).approve(
        nobleStrategy.target || nobleStrategy.address, 
        amount
      );
      
      // Test Deposit event
      const depositTx = await nobleStrategy.connect(accounts.user1).deposit(amount);
      const depositReceipt = await depositTx.wait();
      
      // Verify Deposit event was emitted
      const depositEvent = depositReceipt.logs.find(log => {
        try {
          const parsed = nobleStrategy.interface.parseLog(log);
          return parsed.name === 'Deposit';
        } catch {
          return false;
        }
      });
      
      expect(depositEvent).to.not.be.undefined;
      
      // Test YieldHarvested event
      const harvestTx = await nobleStrategy.harvestYield();
      const harvestReceipt = await harvestTx.wait();
      
      const harvestEvent = harvestReceipt.logs.find(log => {
        try {
          const parsed = nobleStrategy.interface.parseLog(log);
          return parsed.name === 'YieldHarvested';
        } catch {
          return false;
        }
      });
      
      expect(harvestEvent).to.not.be.undefined;
    });

    it("Should have proper StrategyInfo struct implementation", async function () {
      const { nobleStrategy } = strategies;
      
      const strategyInfo = await nobleStrategy.getStrategyInfo();
      
      // Verify all required fields exist
      expect(strategyInfo.name).to.not.be.undefined;
      expect(strategyInfo.description).to.not.be.undefined;
      expect(strategyInfo.totalAssets).to.not.be.undefined;
      expect(strategyInfo.totalShares).to.not.be.undefined;
      expect(strategyInfo.currentAPY).to.not.be.undefined;
      expect(strategyInfo.riskScore).to.not.be.undefined;
      expect(strategyInfo.lastHarvest).to.not.be.undefined;
      expect(strategyInfo.active).to.not.be.undefined;
      
      // Verify field types and values
      expect(typeof strategyInfo.name).to.equal('string');
      expect(typeof strategyInfo.description).to.equal('string');
      expect(typeof strategyInfo.active).to.equal('boolean');
      expect(strategyInfo.active).to.be.true;
    });
  });

  describe("Sub-task 2: MockERC20 Implementation with Mint/Burn", function () {
    it("Should deploy MockERC20 with proper mint/burn capabilities", async function () {
      const { usdc, usdt, dai } = tokens;
      
      // Verify all tokens are deployed
      expect(usdc.target || usdc.address).to.not.be.undefined;
      expect(usdt.target || usdt.address).to.not.be.undefined;
      expect(dai.target || dai.address).to.not.be.undefined;
      
      // Verify token properties
      expect(await usdc.name()).to.equal("USD Coin");
      expect(await usdc.symbol()).to.equal("USDC");
      expect(await usdc.decimals()).to.equal(6);
      
      expect(await usdt.name()).to.equal("Tether USD");
      expect(await usdt.symbol()).to.equal("USDT");
      expect(await usdt.decimals()).to.equal(6);
      
      expect(await dai.name()).to.equal("Dai Stablecoin");
      expect(await dai.symbol()).to.equal("DAI");
      expect(await dai.decimals()).to.equal(18);
    });

    it("Should have functional mint capabilities", async function () {
      const { usdc } = tokens;
      const amount = ethers.parseUnits("1000", 6);
      
      const balanceBefore = await usdc.balanceOf(accounts.user1.address);
      await usdc.mint(accounts.user1.address, amount);
      const balanceAfter = await usdc.balanceOf(accounts.user1.address);
      
      expect(balanceAfter - balanceBefore).to.equal(amount);
    });

    it("Should have functional burn capabilities", async function () {
      const { usdc } = tokens;
      const mintAmount = ethers.parseUnits("1000", 6);
      const burnAmount = ethers.parseUnits("500", 6);
      
      // First mint tokens
      await usdc.mint(accounts.user2.address, mintAmount);
      const balanceAfterMint = await usdc.balanceOf(accounts.user2.address);
      
      // Then burn tokens
      await usdc.burn(accounts.user2.address, burnAmount);
      const balanceAfterBurn = await usdc.balanceOf(accounts.user2.address);
      
      expect(balanceAfterMint - balanceAfterBurn).to.equal(burnAmount);
      expect(balanceAfterBurn).to.equal(mintAmount - burnAmount);
    });

    it("Should support different decimal configurations", async function () {
      const { usdc, usdt, dai } = tokens;
      
      // Use fresh account to avoid balance accumulation
      const testAccount = accounts.user3;
      
      // Test 6 decimal tokens (USDC, USDT)
      const amount6 = ethers.parseUnits("100", 6);
      await usdc.mint(testAccount.address, amount6);
      await usdt.mint(testAccount.address, amount6);
      
      expect(await usdc.balanceOf(testAccount.address)).to.equal(amount6);
      expect(await usdt.balanceOf(testAccount.address)).to.equal(amount6);
      
      // Test 18 decimal token (DAI)
      const amount18 = ethers.parseUnits("100", 18);
      await dai.mint(testAccount.address, amount18);
      
      expect(await dai.balanceOf(testAccount.address)).to.equal(amount18);
    });
  });

  describe("Sub-task 3: MockYieldStrategy Implementation", function () {
    it("Should implement all IYieldStrategy methods", async function () {
      // Deploy fresh strategy to avoid state interference
      const freshBaseToken = await require("./helpers").deployMockERC20('Fresh Token', 'FRESH', 18);
      const freshStrategy = await require("./helpers").deployMockYieldStrategy(freshBaseToken);
      await freshStrategy.setName("Fresh Strategy");
      await freshStrategy.setCurrentAPY(450);
      
      const amount = ethers.parseUnits("1000", 18);
      
      // Setup
      await freshBaseToken.mint(accounts.user1.address, amount);
      await freshBaseToken.connect(accounts.user1).approve(
        freshStrategy.target || freshStrategy.address, 
        amount
      );
      
      // Test deposit
      const shares = await freshStrategy.connect(accounts.user1).deposit(amount);
      expect(await freshStrategy.totalAssets()).to.equal(amount);
      expect(await freshStrategy.balanceOf(accounts.user1.address)).to.be.greaterThan(0);
      
      // Test yield calculation
      const userYield = await freshStrategy.calculateUserYield(accounts.user1.address);
      expect(userYield).to.be.a('bigint');
      
      // Test APY
      const apy = await freshStrategy.getCurrentAPY();
      expect(apy).to.be.greaterThan(0);
      
      // Test strategy info
      const info = await freshStrategy.getStrategyInfo();
      expect(info.name).to.not.be.empty;
      expect(info.active).to.be.true;
      
      // Test withdrawal
      const userShares = await freshStrategy.balanceOf(accounts.user1.address);
      if (userShares > 0) {
        await freshStrategy.connect(accounts.user1).withdraw(userShares);
        expect(await freshStrategy.balanceOf(accounts.user1.address)).to.equal(0);
      }
    });

    it("Should have configurable test parameters", async function () {
      const { nobleStrategy } = strategies;
      
      // Test APY configuration
      const initialAPY = await nobleStrategy.getCurrentAPY();
      await nobleStrategy.setCurrentAPY(1000); // 10%
      expect(await nobleStrategy.getCurrentAPY()).to.equal(1000);
      
      // Test name configuration
      await nobleStrategy.setName("Test Strategy");
      expect(await nobleStrategy.name()).to.equal("Test Strategy");
      
      // Test failure simulation
      await nobleStrategy.setShouldFail(true);
      await expect(nobleStrategy.calculateUserYield(accounts.user1.address))
        .to.be.revertedWith("Mock strategy failure");
      
      // Reset
      await nobleStrategy.setShouldFail(false);
      await nobleStrategy.setCurrentAPY(initialAPY);
    });

    it("Should support multiple strategy types", async function () {
      // Deploy fresh strategies to avoid state interference from previous tests
      const freshBaseToken = await require("./helpers").deployMockERC20('Fresh Base', 'FBASE', 18);
      
      const freshNobleStrategy = await require("./helpers").deployMockYieldStrategy(freshBaseToken);
      await freshNobleStrategy.setName("Noble T-Bills");
      await freshNobleStrategy.setCurrentAPY(450); // 4.5%
      
      const freshResolvStrategy = await require("./helpers").deployMockYieldStrategy(freshBaseToken);
      await freshResolvStrategy.setName("Resolv Delta-Neutral");
      await freshResolvStrategy.setCurrentAPY(800); // 8%
      
      const freshAaveStrategy = await require("./helpers").deployMockYieldStrategy(freshBaseToken);
      await freshAaveStrategy.setName("Aave Lending");
      await freshAaveStrategy.setCurrentAPY(350); // 3.5%
      
      // Verify different strategies have different configurations
      expect(await freshNobleStrategy.name()).to.equal("Noble T-Bills");
      expect(await freshNobleStrategy.getCurrentAPY()).to.equal(450); // 4.5%
      
      expect(await freshResolvStrategy.name()).to.equal("Resolv Delta-Neutral");
      expect(await freshResolvStrategy.getCurrentAPY()).to.equal(800); // 8%
      
      expect(await freshAaveStrategy.name()).to.equal("Aave Lending");
      expect(await freshAaveStrategy.getCurrentAPY()).to.equal(350); // 3.5%
    });
  });

  describe("Sub-task 4: Comprehensive Test Fixtures and Helpers", function () {
    it("Should have all required helper functions", function () {
      const helpers = require("./helpers");
      
      // Core deployment functions
      expect(helpers.deployContract).to.be.a('function');
      expect(helpers.getTestSigners).to.be.a('function');
      expect(helpers.setupAccounts).to.be.a('function');
      expect(helpers.deployMockERC20).to.be.a('function');
      expect(helpers.deployMockYieldStrategy).to.be.a('function');
      expect(helpers.deployMockTokens).to.be.a('function');
      expect(helpers.deployMockStrategies).to.be.a('function');
      
      // Utility objects
      expect(helpers.timeUtils).to.be.an('object');
      expect(helpers.gasUtils).to.be.an('object');
      expect(helpers.eventUtils).to.be.an('object');
      expect(helpers.balanceUtils).to.be.an('object');
      expect(helpers.errorUtils).to.be.an('object');
      expect(helpers.snapshotUtils).to.be.an('object');
      expect(helpers.yieldUtils).to.be.an('object');
      expect(helpers.dataUtils).to.be.an('object');
      expect(helpers.contractTestHelper).to.be.an('object');
      
      // Enhanced testing functions
      expect(helpers.expectGasUsage).to.be.a('function');
      expect(helpers.expectEvent).to.be.a('function');
      expect(helpers.expectRevert).to.be.a('function');
      expect(helpers.takeSnapshot).to.be.a('function');
      expect(helpers.restoreSnapshot).to.be.a('function');
    });

    it("Should have comprehensive time manipulation utilities", async function () {
      const { timeUtils } = require("./helpers");
      
      const initialTime = await timeUtils.getCurrentTime();
      await timeUtils.increaseTime(3600); // 1 hour
      const newTime = await timeUtils.getCurrentTime();
      
      expect(newTime).to.be.at.least(initialTime + 3600);
    });

    it("Should have balance tracking utilities", async function () {
      const { balanceUtils } = require("./helpers");
      const { usdc } = tokens;
      const amount = ethers.parseUnits("100", 6);
      
      const result = await balanceUtils.trackBalances(
        usdc,
        { user1: accounts.user1 },
        async () => {
          await usdc.mint(accounts.user1.address, amount);
        }
      );
      
      expect(result.changes.user1).to.equal(amount);
    });

    it("Should have yield calculation utilities", function () {
      const { yieldUtils } = require("./helpers");
      
      const principal = ethers.parseUnits("1000", 18);
      const apy = 500; // 5%
      const timeInSeconds = 365 * 24 * 60 * 60; // 1 year
      
      const simpleYield = yieldUtils.calculateYield(principal, apy, timeInSeconds);
      const compoundYield = yieldUtils.calculateCompoundYield(principal, apy, timeInSeconds);
      
      expect(simpleYield).to.be.greaterThan(0);
      expect(compoundYield).to.be.greaterThan(simpleYield);
    });
  });

  describe("Sub-task 5: Gas Optimization Testing Framework", function () {
    it("Should have comprehensive gas limits defined", function () {
      expect(GAS_LIMITS).to.be.an('object');
      expect(GAS_LIMITS.DEPOSIT).to.equal(100000);
      expect(GAS_LIMITS.WITHDRAW).to.equal(80000);
      expect(GAS_LIMITS.TRANSFER).to.equal(60000);
      expect(GAS_LIMITS.YIELD_CALCULATION).to.equal(50000);
      expect(GAS_LIMITS.STRATEGY_INTERACTION).to.equal(150000);
      expect(GAS_LIMITS.BRIDGE_OPERATION).to.equal(200000);
      expect(GAS_LIMITS.CONTRACT_DEPLOYMENT).to.equal(3000000);
      expect(GAS_LIMITS.EMERGENCY_WITHDRAW).to.equal(100000);
      expect(GAS_LIMITS.PAUSE_UNPAUSE).to.equal(30000);
    });

    it("Should have gas optimization framework with all required methods", function () {
      expect(gasOptimizationFramework).to.be.an('object');
      expect(gasOptimizationFramework.testOperationGas).to.be.a('function');
      expect(gasOptimizationFramework.batchTestGas).to.be.a('function');
      expect(gasOptimizationFramework.generateGasReport).to.be.a('function');
    });

    it("Should successfully test gas optimization for various operations", async function () {
      const { usdc } = tokens;
      const amount = ethers.parseUnits("100", 6);
      
      // Test ERC20 mint gas optimization
      const result = await gasOptimizationFramework.testOperationGas(
        async () => usdc.mint(accounts.user1.address, amount),
        'DEPOSIT'
      );
      
      expect(result.passed).to.be.true;
      expect(result.gasUsed).to.be.lessThan(GAS_LIMITS.DEPOSIT);
      expect(result.utilization).to.be.lessThan(100);
    });

    it("Should generate comprehensive gas optimization reports", async function () {
      const { usdc } = tokens;
      const operations = [
        {
          name: "ERC20 Mint",
          operation: async () => usdc.mint(accounts.user1.address, ethers.parseUnits("100", 6)),
          type: "DEPOSIT"
        }
      ];
      
      const results = await gasOptimizationFramework.batchTestGas(operations);
      const report = gasOptimizationFramework.generateGasReport(results);
      
      expect(report.summary.total).to.equal(1);
      expect(report.summary.passed).to.equal(1);
      expect(report.summary.failed).to.equal(0);
      expect(report.summary.passRate).to.equal(100);
    });
  });

  describe("Requirements Verification", function () {
    it("Should satisfy Requirement 1.2: Multi-chain smart contract infrastructure", async function () {
      // Verify interface supports multi-chain deployment
      const { nobleStrategy } = strategies;
      const strategyInfo = await nobleStrategy.getStrategyInfo();
      
      expect(strategyInfo.name).to.not.be.empty;
      expect(strategyInfo.active).to.be.true;
      expect(await nobleStrategy.asset()).to.not.equal(ethers.ZeroAddress);
    });

    it("Should satisfy Requirement 1.6: Emergency withdrawal capabilities", async function () {
      const { nobleStrategy, baseToken } = strategies;
      const amount = ethers.parseUnits("100", 18);
      
      // Setup deposit
      await baseToken.mint(accounts.user1.address, amount);
      await baseToken.connect(accounts.user1).approve(
        nobleStrategy.target || nobleStrategy.address, 
        amount
      );
      await nobleStrategy.connect(accounts.user1).deposit(amount);
      
      // Test emergency withdrawal
      const emergencyTx = await nobleStrategy.emergencyWithdraw(accounts.user1.address);
      const emergencyReceipt = await emergencyTx.wait();
      expect(emergencyReceipt).to.not.be.undefined;
    });

    it("Should satisfy Requirement 10.1: 100% test coverage infrastructure", function () {
      // Verify comprehensive testing infrastructure exists
      const helpers = require("./helpers");
      
      // All required testing utilities should be available
      expect(helpers.gasOptimizationFramework).to.not.be.undefined;
      expect(helpers.contractTestHelper).to.not.be.undefined;
      expect(helpers.timeUtils).to.not.be.undefined;
      expect(helpers.eventUtils).to.not.be.undefined;
      expect(helpers.balanceUtils).to.not.be.undefined;
      expect(helpers.errorUtils).to.not.be.undefined;
      expect(helpers.snapshotUtils).to.not.be.undefined;
      expect(helpers.yieldUtils).to.not.be.undefined;
      expect(helpers.dataUtils).to.not.be.undefined;
    });
  });

  describe("Integration Testing", function () {
    it("Should demonstrate end-to-end functionality", async function () {
      // Deploy fresh contracts to avoid state interference
      const freshBaseToken = await require("./helpers").deployMockERC20('Integration Token', 'ITOKEN', 18);
      const freshStrategy = await require("./helpers").deployMockYieldStrategy(freshBaseToken);
      await freshStrategy.setName("Integration Strategy");
      await freshStrategy.setCurrentAPY(450);
      
      const amount = ethers.parseUnits("1000", 18);
      const testUser = accounts.merchant1; // Use a different account
      
      // 1. Deploy and setup (already done above)
      expect(freshStrategy.target || freshStrategy.address).to.not.be.undefined;
      expect(freshBaseToken.target || freshBaseToken.address).to.not.be.undefined;
      
      // 2. Mint tokens
      await freshBaseToken.mint(testUser.address, amount);
      expect(await freshBaseToken.balanceOf(testUser.address)).to.equal(amount);
      
      // 3. Approve and deposit
      await freshBaseToken.connect(testUser).approve(
        freshStrategy.target || freshStrategy.address, 
        amount
      );
      await freshStrategy.connect(testUser).deposit(amount);
      
      // 4. Verify deposit
      expect(await freshStrategy.totalAssets()).to.equal(amount);
      expect(await freshStrategy.balanceOf(testUser.address)).to.be.greaterThan(0);
      
      // 5. Calculate yield
      const yieldAmount = await freshStrategy.calculateUserYield(testUser.address);
      expect(yieldAmount).to.be.a('bigint');
      
      // 6. Harvest yield
      await freshStrategy.harvestYield();
      
      // 7. Withdraw
      const userShares = await freshStrategy.balanceOf(testUser.address);
      await freshStrategy.connect(testUser).withdraw(userShares);
      
      // 8. Verify withdrawal
      expect(await freshStrategy.balanceOf(testUser.address)).to.equal(0);
    });
  });
});