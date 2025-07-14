const { ethers } = require('hardhat');
const { expect } = require('chai');

/**
 * Contract testing utilities and helpers
 */

/**
 * Deploy a contract with given arguments
 */
async function deployContract(contractName, ...args) {
  const ContractFactory = await ethers.getContractFactory(contractName);
  const contract = await ContractFactory.deploy(...args);
  await contract.waitForDeployment();
  return contract;
}

/**
 * Get signers for testing
 */
async function getTestSigners() {
  const [deployer, admin, treasury, user1, user2, user3, merchant1, merchant2] = 
    await ethers.getSigners();
  
  return {
    deployer,
    admin,
    treasury,
    user1,
    user2,
    user3,
    merchant1,
    merchant2,
  };
}

/**
 * Setup test accounts with proper roles and initial state
 */
async function setupAccounts() {
  return await getTestSigners();
}

/**
 * Deploy mock ERC20 token for testing
 */
async function deployMockERC20(name = 'MockToken', symbol = 'MOCK', decimals = 18) {
  const MockERC20 = await ethers.getContractFactory('MockERC20');
  const token = await MockERC20.deploy(name, symbol, decimals);
  await token.waitForDeployment();
  return token;
}

/**
 * Deploy mock yield strategy for testing
 */
async function deployMockYieldStrategy(token, apy = 500) { // 5% APY
  const MockYieldStrategy = await ethers.getContractFactory('MockYieldStrategy');
  const strategy = await MockYieldStrategy.deploy(token.target || token.address);
  await strategy.waitForDeployment();
  return strategy;
}

/**
 * Deploy multiple mock tokens for comprehensive testing
 */
async function deployMockTokens() {
  const usdc = await deployMockERC20('USD Coin', 'USDC', 6);
  const usdt = await deployMockERC20('Tether USD', 'USDT', 6);
  const dai = await deployMockERC20('Dai Stablecoin', 'DAI', 18);
  
  return { usdc, usdt, dai };
}

/**
 * Deploy multiple mock yield strategies for testing
 */
async function deployMockStrategies() {
  // Deploy a base token for strategies
  const baseToken = await deployMockERC20('Base Token', 'BASE', 18);
  
  const nobleStrategy = await deployMockYieldStrategy(baseToken);
  await nobleStrategy.setName('Noble T-Bills');
  await nobleStrategy.setCurrentAPY(450); // 4.5% APY
  
  const resolvStrategy = await deployMockYieldStrategy(baseToken);
  await resolvStrategy.setName('Resolv Delta-Neutral');
  await resolvStrategy.setCurrentAPY(800); // 8% APY
  
  const aaveStrategy = await deployMockYieldStrategy(baseToken);
  await aaveStrategy.setName('Aave Lending');
  await aaveStrategy.setCurrentAPY(350); // 3.5% APY
  
  return { nobleStrategy, resolvStrategy, aaveStrategy, baseToken };
}

/**
 * Time manipulation utilities
 */
const timeUtils = {
  /**
   * Increase blockchain time by specified seconds
   */
  async increaseTime(seconds) {
    await ethers.provider.send('evm_increaseTime', [seconds]);
    await ethers.provider.send('evm_mine');
  },

  /**
   * Set blockchain time to specific timestamp
   */
  async setTime(timestamp) {
    await ethers.provider.send('evm_setNextBlockTimestamp', [timestamp]);
    await ethers.provider.send('evm_mine');
  },

  /**
   * Get current blockchain timestamp
   */
  async getCurrentTime() {
    const block = await ethers.provider.getBlock('latest');
    return block.timestamp;
  },

  /**
   * Mine blocks
   */
  async mineBlocks(count) {
    for (let i = 0; i < count; i++) {
      await ethers.provider.send('evm_mine');
    }
  }
};

/**
 * Gas testing utilities
 */
const gasUtils = {
  /**
   * Measure gas used by a transaction
   */
  async measureGas(txPromise) {
    const tx = await txPromise;
    const receipt = await tx.wait();
    return receipt.gasUsed;
  },

  /**
   * Assert gas usage is below limit
   */
  async expectGasBelow(txPromise, gasLimit) {
    const gasUsed = await this.measureGas(txPromise);
    expect(gasUsed).to.be.below(gasLimit, `Gas used (${gasUsed}) exceeds limit (${gasLimit})`);
    return gasUsed;
  },

  /**
   * Compare gas usage between two transactions
   */
  async compareGas(tx1Promise, tx2Promise) {
    const [gas1, gas2] = await Promise.all([
      this.measureGas(tx1Promise),
      this.measureGas(tx2Promise)
    ]);
    
    return {
      tx1Gas: gas1,
      tx2Gas: gas2,
      difference: gas2 - gas1,
      percentDifference: ((gas2 - gas1) / gas1) * 100
    };
  }
};

/**
 * Event testing utilities
 */
const eventUtils = {
  /**
   * Expect specific event to be emitted
   */
  async expectEvent(tx, contract, eventName, expectedArgs = {}) {
    const receipt = await tx.wait();
    const event = receipt.logs.find(log => {
      try {
        const parsed = contract.interface.parseLog(log);
        return parsed.name === eventName;
      } catch {
        return false;
      }
    });

    expect(event).to.not.be.undefined;
    
    if (Object.keys(expectedArgs).length > 0) {
      const parsed = contract.interface.parseLog(event);
      for (const [key, value] of Object.entries(expectedArgs)) {
        expect(parsed.args[key]).to.equal(value);
      }
    }
    
    return event;
  },

  /**
   * Get all events of a specific type from transaction
   */
  async getEvents(tx, contract, eventName) {
    const receipt = await tx.wait();
    return receipt.logs
      .map(log => {
        try {
          return contract.interface.parseLog(log);
        } catch {
          return null;
        }
      })
      .filter(event => event && event.name === eventName);
  }
};

/**
 * Balance tracking utilities
 */
const balanceUtils = {
  /**
   * Track balance changes for multiple accounts
   */
  async trackBalances(token, accounts, operation) {
    const beforeBalances = {};
    
    // Get balances before operation
    for (const [name, account] of Object.entries(accounts)) {
      beforeBalances[name] = await token.balanceOf(account.address);
    }
    
    // Execute operation
    const result = await operation();
    
    // Get balances after operation
    const afterBalances = {};
    const changes = {};
    
    for (const [name, account] of Object.entries(accounts)) {
      afterBalances[name] = await token.balanceOf(account.address);
      changes[name] = afterBalances[name] - beforeBalances[name];
    }
    
    return {
      before: beforeBalances,
      after: afterBalances,
      changes,
      result
    };
  },

  /**
   * Expect balance change for specific account
   */
  async expectBalanceChange(token, account, expectedChange, operation) {
    const balanceBefore = await token.balanceOf(account.address);
    await operation();
    const balanceAfter = await token.balanceOf(account.address);
    const actualChange = balanceAfter - balanceBefore;
    
    expect(actualChange).to.equal(expectedChange);
    return actualChange;
  }
};

/**
 * Error testing utilities
 */
const errorUtils = {
  /**
   * Expect transaction to revert with specific reason
   */
  async expectRevert(txPromise, reason) {
    await expect(txPromise).to.be.revertedWith(reason);
  },

  /**
   * Expect transaction to revert with custom error
   */
  async expectCustomError(txPromise, contract, errorName, args = []) {
    await expect(txPromise)
      .to.be.revertedWithCustomError(contract, errorName)
      .withArgs(...args);
  }
};

/**
 * Snapshot utilities for test isolation
 */
const snapshotUtils = {
  /**
   * Take a snapshot of current blockchain state
   */
  async takeSnapshot() {
    return await ethers.provider.send('evm_snapshot');
  },

  /**
   * Restore blockchain state to snapshot
   */
  async restoreSnapshot(snapshotId) {
    await ethers.provider.send('evm_revert', [snapshotId]);
  }
};

/**
 * Yield calculation utilities
 */
const yieldUtils = {
  /**
   * Calculate expected yield for given parameters
   */
  calculateYield(principal, apy, timeInSeconds) {
    const principalNum = typeof principal === 'bigint' ? Number(principal) : principal;
    const annualYield = (principalNum * apy) / 10000; // APY in basis points
    const secondsInYear = 365 * 24 * 60 * 60;
    return Math.floor((annualYield * timeInSeconds) / secondsInYear);
  },

  /**
   * Calculate compound yield
   */
  calculateCompoundYield(principal, apy, timeInSeconds, compoundingFrequency = 365) {
    const principalNum = typeof principal === 'bigint' ? Number(principal) : principal;
    const rate = apy / 10000; // Convert basis points to decimal
    const periodsPerYear = compoundingFrequency;
    const years = timeInSeconds / (365 * 24 * 60 * 60);
    
    return Math.floor(principalNum * Math.pow(1 + rate / periodsPerYear, periodsPerYear * years) - principalNum);
  }
};

/**
 * Test data generators
 */
const dataUtils = {
  /**
   * Generate random address
   */
  randomAddress() {
    return ethers.Wallet.createRandom().address;
  },

  /**
   * Generate random amount within range
   */
  randomAmount(min = 1, max = 1000) {
    return ethers.parseEther((Math.random() * (max - min) + min).toString());
  },

  /**
   * Generate test payment data
   */
  generatePaymentData(overrides = {}) {
    return {
      amount: ethers.parseEther('100'),
      recipient: this.randomAddress(),
      deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      ...overrides
    };
  }
};

/**
 * Comprehensive contract test helper with all testing utilities
 */
const contractTestHelper = {
  /**
   * Mint tokens to multiple accounts for testing
   */
  async mintTokensToAccounts(token, accounts, amount) {
    const decimals = await token.decimals();
    const mintAmount = ethers.parseUnits(amount, decimals);
    
    for (const account of accounts) {
      await token.mint(account.address, mintAmount);
    }
  },

  /**
   * Get current block timestamp
   */
  async getCurrentBlockTimestamp() {
    const block = await ethers.provider.getBlock('latest');
    return block.timestamp;
  },

  /**
   * Increase blockchain time
   */
  async increaseTime(seconds) {
    await ethers.provider.send('evm_increaseTime', [seconds]);
    await ethers.provider.send('evm_mine');
  },

  /**
   * Measure gas usage with detailed metrics
   */
  async measureGasUsage(tx) {
    const receipt = await tx.wait();
    const gasPrice = tx.gasPrice || ethers.parseUnits('20', 'gwei'); // Default gas price
    
    return {
      gasUsed: receipt.gasUsed,
      gasPrice: gasPrice,
      gasCost: receipt.gasUsed * gasPrice
    };
  },

  /**
   * Generate random bytes32
   */
  randomBytes32() {
    return ethers.hexlify(ethers.randomBytes(32));
  },

  /**
   * Generate random address
   */
  randomAddress() {
    return ethers.Wallet.createRandom().address;
  },

  /**
   * Parse units utility
   */
  parseUnits(value, decimals) {
    return ethers.parseUnits(value, decimals);
  },

  /**
   * Format units utility
   */
  formatUnits(value, decimals) {
    return ethers.formatUnits(value, decimals);
  },

  /**
   * Keccak256 hash utility
   */
  keccak256(data) {
    return ethers.keccak256(ethers.toUtf8Bytes(data));
  }
};

/**
 * Gas optimization testing framework
 */
async function expectGasUsage(tx, gasLimit) {
  const receipt = await tx.wait();
  const gasUsed = receipt.gasUsed;
  
  if (gasUsed > gasLimit) {
    throw new Error(`Gas usage (${gasUsed}) exceeds limit (${gasLimit})`);
  }
  
  return gasUsed;
}

/**
 * Enhanced event expectation utility
 */
async function expectEvent(tx, contract, eventName, expectedArgs = {}) {
  return await eventUtils.expectEvent(tx, contract, eventName, expectedArgs);
}

/**
 * Enhanced revert expectation utility
 */
async function expectRevert(txPromise, reason) {
  return await errorUtils.expectRevert(txPromise, reason);
}

/**
 * Enhanced snapshot utilities
 */
async function takeSnapshot() {
  return await snapshotUtils.takeSnapshot();
}

async function restoreSnapshot(snapshotId) {
  return await snapshotUtils.restoreSnapshot(snapshotId);
}

/**
 * Gas optimization constants and limits
 */
const GAS_LIMITS = {
  // Maximum gas limits per function type (as per requirements)
  DEPOSIT: 100000,           // 100k gas for deposit operations
  WITHDRAW: 80000,           // 80k gas for withdrawal operations
  TRANSFER: 60000,           // 60k gas for transfer operations
  YIELD_CALCULATION: 50000,  // 50k gas for yield calculations
  STRATEGY_INTERACTION: 150000, // 150k gas for strategy interactions (increased)
  BRIDGE_OPERATION: 200000,  // 200k gas for cross-chain operations
  
  // Contract deployment limits
  CONTRACT_DEPLOYMENT: 3000000, // 3M gas for contract deployment
  
  // Emergency operations
  EMERGENCY_WITHDRAW: 100000,   // 100k gas for emergency operations
  PAUSE_UNPAUSE: 30000         // 30k gas for pause/unpause operations
};

/**
 * Gas optimization testing framework
 */
const gasOptimizationFramework = {
  /**
   * Test gas usage for specific operation type
   */
  async testOperationGas(operation, operationType, ...args) {
    const gasLimit = GAS_LIMITS[operationType.toUpperCase()];
    if (!gasLimit) {
      throw new Error(`Unknown operation type: ${operationType}`);
    }
    
    const tx = await operation(...args);
    const gasUsed = await expectGasUsage(tx, gasLimit);
    
    console.log(`✓ ${operationType} gas usage: ${gasUsed}/${gasLimit} (${((Number(gasUsed) / gasLimit) * 100).toFixed(2)}%)`);
    
    return {
      gasUsed,
      gasLimit,
      utilization: (Number(gasUsed) / gasLimit) * 100,
      passed: Number(gasUsed) <= gasLimit
    };
  },

  /**
   * Batch test multiple operations for gas optimization
   */
  async batchTestGas(operations) {
    const results = [];
    
    for (const { name, operation, type, args = [] } of operations) {
      try {
        const result = await this.testOperationGas(operation, type, ...args);
        results.push({ name, ...result });
      } catch (error) {
        results.push({ 
          name, 
          error: error.message, 
          passed: false 
        });
      }
    }
    
    return results;
  },

  /**
   * Generate gas optimization report
   */
  generateGasReport(results) {
    const totalOperations = results.length;
    const passedOperations = results.filter(r => r.passed).length;
    const failedOperations = results.filter(r => !r.passed);
    
    const report = {
      summary: {
        total: totalOperations,
        passed: passedOperations,
        failed: totalOperations - passedOperations,
        passRate: (passedOperations / totalOperations) * 100
      },
      details: results,
      failedOperations: failedOperations.map(op => ({
        name: op.name,
        reason: op.error || `Gas usage exceeded limit: ${op.gasUsed}/${op.gasLimit}`
      }))
    };
    
    return report;
  }
};

module.exports = {
  // Core deployment functions
  deployContract,
  getTestSigners,
  setupAccounts,
  deployMockERC20,
  deployMockYieldStrategy,
  deployMockTokens,
  deployMockStrategies,
  
  // Utility objects
  timeUtils,
  gasUtils,
  eventUtils,
  balanceUtils,
  errorUtils,
  snapshotUtils,
  yieldUtils,
  dataUtils,
  contractTestHelper,
  
  // Enhanced testing functions
  expectGasUsage,
  expectEvent,
  expectRevert,
  takeSnapshot,
  restoreSnapshot,
  
  // Gas optimization framework
  GAS_LIMITS,
  gasOptimizationFramework
};