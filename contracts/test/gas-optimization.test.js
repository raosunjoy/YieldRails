const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  setupAccounts,
  deployMockTokens,
  deployMockStrategies,
  GAS_LIMITS,
  gasOptimizationFramework,
  expectGasUsage
} = require("./helpers");

describe("Gas Optimization Testing Framework", function () {
  let accounts;
  let tokens;
  let strategies;

  before(async function () {
    accounts = await setupAccounts();
    tokens = await deployMockTokens();
    strategies = await deployMockStrategies();
  });

  describe("Gas Limit Constants Validation", function () {
    it("Should have all required gas limits defined", function () {
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

    it("Should have reasonable gas limits for each operation type", function () {
      // Verify limits are reasonable for their operation types
      expect(GAS_LIMITS.TRANSFER).to.be.lessThan(GAS_LIMITS.DEPOSIT);
      expect(GAS_LIMITS.DEPOSIT).to.be.lessThan(GAS_LIMITS.STRATEGY_INTERACTION);
      expect(GAS_LIMITS.STRATEGY_INTERACTION).to.be.lessThan(GAS_LIMITS.BRIDGE_OPERATION);
      expect(GAS_LIMITS.BRIDGE_OPERATION).to.be.lessThan(GAS_LIMITS.CONTRACT_DEPLOYMENT);
    });
  });

  describe("Individual Gas Optimization Tests", function () {
    it("Should test ERC20 transfer gas usage", async function () {
      const { usdc } = tokens;
      const amount = ethers.parseUnits("100", 6);
      
      // Mint tokens first
      await usdc.mint(accounts.user1.address, amount);
      
      // Test transfer gas usage
      const result = await gasOptimizationFramework.testOperationGas(
        async () => usdc.connect(accounts.user1).transfer(accounts.user2.address, amount),
        'TRANSFER'
      );
      
      expect(result.passed).to.be.true;
      expect(result.gasUsed).to.be.lessThan(GAS_LIMITS.TRANSFER);
      expect(result.utilization).to.be.lessThan(100);
    });

    it("Should test ERC20 mint gas usage", async function () {
      const { usdc } = tokens;
      const amount = ethers.parseUnits("1000", 6);
      
      const result = await gasOptimizationFramework.testOperationGas(
        async () => usdc.mint(accounts.user1.address, amount),
        'DEPOSIT' // Using deposit limit for mint operations
      );
      
      expect(result.passed).to.be.true;
      expect(result.gasUsed).to.be.lessThan(GAS_LIMITS.DEPOSIT);
    });

    it("Should test yield strategy deposit gas usage", async function () {
      const { nobleStrategy, baseToken } = strategies;
      const amount = ethers.parseUnits("1000", 18);
      
      // Setup tokens
      await baseToken.mint(accounts.user1.address, amount);
      await baseToken.connect(accounts.user1).approve(
        nobleStrategy.target || nobleStrategy.address, 
        amount
      );
      
      const result = await gasOptimizationFramework.testOperationGas(
        async () => nobleStrategy.connect(accounts.user1).deposit(amount),
        'STRATEGY_INTERACTION'
      );
      
      expect(result.passed).to.be.true;
      expect(result.gasUsed).to.be.lessThan(GAS_LIMITS.STRATEGY_INTERACTION);
    });

    it("Should test yield strategy withdrawal gas usage", async function () {
      const { nobleStrategy, baseToken } = strategies;
      const amount = ethers.parseUnits("500", 18);
      
      // Setup: deposit first
      await baseToken.mint(accounts.user2.address, amount);
      await baseToken.connect(accounts.user2).approve(
        nobleStrategy.target || nobleStrategy.address, 
        amount
      );
      const shares = await nobleStrategy.connect(accounts.user2).deposit(amount);
      
      // Test withdrawal
      const userShares = await nobleStrategy.balanceOf(accounts.user2.address);
      
      const result = await gasOptimizationFramework.testOperationGas(
        async () => nobleStrategy.connect(accounts.user2).withdraw(userShares),
        'WITHDRAW'
      );
      
      expect(result.passed).to.be.true;
      expect(result.gasUsed).to.be.lessThan(GAS_LIMITS.WITHDRAW);
    });

    it("Should test yield calculation gas usage", async function () {
      const { nobleStrategy } = strategies;
      const amount = ethers.parseUnits("1000", 18);
      const timeInSeconds = 365 * 24 * 60 * 60; // 1 year
      
      // For view functions, we estimate gas usage
      const gasEstimate = await nobleStrategy.calculateYield.estimateGas(amount, timeInSeconds);
      
      expect(gasEstimate).to.be.lessThan(GAS_LIMITS.YIELD_CALCULATION);
      console.log(`✓ YIELD_CALCULATION gas estimate: ${gasEstimate}/${GAS_LIMITS.YIELD_CALCULATION} (${((Number(gasEstimate) / GAS_LIMITS.YIELD_CALCULATION) * 100).toFixed(2)}%)`);
    });
  });

  describe("Batch Gas Optimization Testing", function () {
    it("Should run batch gas optimization tests", async function () {
      const { usdc } = tokens;
      const { nobleStrategy, baseToken } = strategies;
      const amount = ethers.parseUnits("100", 18);
      
      // Setup tokens for batch testing
      await baseToken.mint(accounts.user3.address, amount * 5n);
      await baseToken.connect(accounts.user3).approve(
        nobleStrategy.target || nobleStrategy.address, 
        amount * 5n
      );
      
      const operations = [
        {
          name: "ERC20 Mint",
          operation: async () => usdc.mint(accounts.user3.address, ethers.parseUnits("100", 6)),
          type: "DEPOSIT"
        },
        {
          name: "Strategy Deposit",
          operation: async () => nobleStrategy.connect(accounts.user3).deposit(amount),
          type: "STRATEGY_INTERACTION"
        }
      ];
      
      const results = await gasOptimizationFramework.batchTestGas(operations);
      
      // Verify all operations passed
      const passedCount = results.filter(r => r.passed).length;
      expect(passedCount).to.equal(operations.length);
      
      // Generate and validate report
      const report = gasOptimizationFramework.generateGasReport(results);
      expect(report.summary.total).to.equal(operations.length);
      expect(report.summary.passed).to.equal(operations.length);
      expect(report.summary.failed).to.equal(0);
      expect(report.summary.passRate).to.equal(100);
    });

    it("Should handle failed gas optimization tests", async function () {
      const operations = [
        {
          name: "Invalid Operation",
          operation: async () => {
            // This will use more gas than allowed
            const tx = await tokens.usdc.mint(accounts.user1.address, ethers.parseUnits("1", 6));
            return tx;
          },
          type: "TRANSFER", // Very low limit to force failure
          args: []
        }
      ];
      
      const results = await gasOptimizationFramework.batchTestGas(operations);
      const report = gasOptimizationFramework.generateGasReport(results);
      
      // Should have some results (might pass or fail depending on actual gas usage)
      expect(report.summary.total).to.equal(1);
      expect(report.details).to.have.length(1);
    });
  });

  describe("Gas Optimization Report Generation", function () {
    it("Should generate comprehensive gas optimization report", async function () {
      const { usdc } = tokens;
      const operations = [
        {
          name: "ERC20 Transfer",
          operation: async () => {
            await usdc.mint(accounts.user1.address, ethers.parseUnits("100", 6));
            return usdc.connect(accounts.user1).transfer(accounts.user2.address, ethers.parseUnits("50", 6));
          },
          type: "TRANSFER"
        },
        {
          name: "ERC20 Approve",
          operation: async () => usdc.connect(accounts.user1).approve(accounts.user2.address, ethers.parseUnits("100", 6)),
          type: "TRANSFER"
        }
      ];
      
      const results = await gasOptimizationFramework.batchTestGas(operations);
      const report = gasOptimizationFramework.generateGasReport(results);
      
      // Validate report structure
      expect(report).to.have.property('summary');
      expect(report).to.have.property('details');
      expect(report).to.have.property('failedOperations');
      
      expect(report.summary).to.have.property('total');
      expect(report.summary).to.have.property('passed');
      expect(report.summary).to.have.property('failed');
      expect(report.summary).to.have.property('passRate');
      
      expect(report.details).to.be.an('array');
      expect(report.failedOperations).to.be.an('array');
      
      // Validate calculations
      expect(report.summary.total).to.equal(operations.length);
      expect(report.summary.passed + report.summary.failed).to.equal(report.summary.total);
      expect(report.summary.passRate).to.equal((report.summary.passed / report.summary.total) * 100);
    });
  });

  describe("Gas Optimization Edge Cases", function () {
    it("Should handle unknown operation types", async function () {
      try {
        await gasOptimizationFramework.testOperationGas(
          async () => tokens.usdc.mint(accounts.user1.address, ethers.parseUnits("1", 6)),
          'UNKNOWN_OPERATION'
        );
        expect.fail("Should have thrown for unknown operation type");
      } catch (error) {
        expect(error.message).to.include("Unknown operation type");
      }
    });

    it("Should handle operations that throw errors", async function () {
      const operations = [
        {
          name: "Failing Operation",
          operation: async () => {
            throw new Error("Intentional test error");
          },
          type: "TRANSFER"
        }
      ];
      
      const results = await gasOptimizationFramework.batchTestGas(operations);
      
      expect(results).to.have.length(1);
      expect(results[0].passed).to.be.false;
      expect(results[0].error).to.include("Intentional test error");
    });

    it("Should validate gas limits are enforced correctly", async function () {
      const { usdc } = tokens;
      const amount = ethers.parseUnits("1", 6);
      
      // Test with very low gas limit to ensure enforcement
      const tx = await usdc.mint(accounts.user1.address, amount);
      
      try {
        await expectGasUsage(tx, 1000); // Very low limit
        expect.fail("Should have thrown for gas limit exceeded");
      } catch (error) {
        expect(error.message).to.include("exceeds limit");
      }
    });
  });

  describe("Performance Benchmarking", function () {
    it("Should benchmark multiple operations for performance comparison", async function () {
      const { usdc, usdt } = tokens;
      const amount6 = ethers.parseUnits("100", 6);
      
      // Benchmark USDC vs USDT operations
      const usdcMintTx = await usdc.mint(accounts.user1.address, amount6);
      const usdtMintTx = await usdt.mint(accounts.user1.address, amount6);
      
      const usdcGas = await expectGasUsage(usdcMintTx, GAS_LIMITS.DEPOSIT);
      const usdtGas = await expectGasUsage(usdtMintTx, GAS_LIMITS.DEPOSIT);
      
      // Both should be within limits
      expect(usdcGas).to.be.lessThan(GAS_LIMITS.DEPOSIT);
      expect(usdtGas).to.be.lessThan(GAS_LIMITS.DEPOSIT);
      
      // Log performance comparison
      console.log(`USDC mint gas: ${usdcGas}, USDT mint gas: ${usdtGas}`);
    });

    it("Should measure gas efficiency improvements", async function () {
      const { nobleStrategy, baseToken } = strategies;
      const amount = ethers.parseUnits("1000", 18);
      
      // Setup
      await baseToken.mint(accounts.user1.address, amount * 2n);
      await baseToken.connect(accounts.user1).approve(
        nobleStrategy.target || nobleStrategy.address, 
        amount * 2n
      );
      
      // Measure first deposit
      const firstDepositResult = await gasOptimizationFramework.testOperationGas(
        async () => nobleStrategy.connect(accounts.user1).deposit(amount),
        'STRATEGY_INTERACTION'
      );
      
      // Measure second deposit (should be more efficient due to storage being initialized)
      const secondDepositResult = await gasOptimizationFramework.testOperationGas(
        async () => nobleStrategy.connect(accounts.user1).deposit(amount),
        'STRATEGY_INTERACTION'
      );
      
      expect(firstDepositResult.passed).to.be.true;
      expect(secondDepositResult.passed).to.be.true;
      
      // Second deposit might be more efficient
      console.log(`First deposit gas: ${firstDepositResult.gasUsed}, Second deposit gas: ${secondDepositResult.gasUsed}`);
    });
  });
});