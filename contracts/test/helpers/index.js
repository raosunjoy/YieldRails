const { ethers } = require("hardhat");
const { expect } = require("chai");

// Test helper utilities for smart contracts

class ContractTestHelper {
  constructor() {
    this.accounts = [];
    this.contracts = {};
    this.snapshots = [];
  }

  // Setup test accounts
  async setupAccounts() {
    this.accounts = await ethers.getSigners();
    return {
      deployer: this.accounts[0],
      admin: this.accounts[1],
      treasury: this.accounts[2],
      user1: this.accounts[3],
      user2: this.accounts[4],
      merchant1: this.accounts[5],
      merchant2: this.accounts[6],
      validator1: this.accounts[7],
      validator2: this.accounts[8],
      validator3: this.accounts[9]
    };
  }

  // Deploy mock tokens for testing
  async deployMockTokens() {
    const MockERC20 = await ethers.getContractFactory("MockERC20");
    
    const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
    await usdc.waitForDeployment();
    
    const usdt = await MockERC20.deploy("Tether USD", "USDT", 6);
    await usdt.waitForDeployment();
    
    const dai = await MockERC20.deploy("Dai Stablecoin", "DAI", 18);
    await dai.waitForDeployment();

    this.contracts.usdc = usdc;
    this.contracts.usdt = usdt;
    this.contracts.dai = dai;

    return { usdc, usdt, dai };
  }

  // Deploy mock yield strategies
  async deployMockStrategies() {
    const MockYieldStrategy = await ethers.getContractFactory("MockYieldStrategy");
    
    const nobleStrategy = await MockYieldStrategy.deploy("Noble T-Bills", 450); // 4.5% APY
    await nobleStrategy.waitForDeployment();
    
    const resolvStrategy = await MockYieldStrategy.deploy("Resolv Delta-Neutral", 800); // 8% APY
    await resolvStrategy.waitForDeployment();
    
    const aaveStrategy = await MockYieldStrategy.deploy("Aave Lending", 350); // 3.5% APY
    await aaveStrategy.waitForDeployment();

    this.contracts.nobleStrategy = nobleStrategy;
    this.contracts.resolvStrategy = resolvStrategy;
    this.contracts.aaveStrategy = aaveStrategy;

    return { nobleStrategy, resolvStrategy, aaveStrategy };
  }

  // Deploy core YieldRails contracts
  async deployYieldRailsContracts() {
    const accounts = await this.setupAccounts();
    const { usdc } = await this.deployMockTokens();
    const { nobleStrategy, resolvStrategy, aaveStrategy } = await this.deployMockStrategies();

    // Deploy YieldVault
    const YieldVault = await ethers.getContractFactory("YieldVault");
    const yieldVault = await YieldVault.deploy(
      accounts.admin.address,
      accounts.treasury.address
    );
    await yieldVault.waitForDeployment();

    // Deploy YieldEscrow
    const YieldEscrow = await ethers.getContractFactory("YieldEscrow");
    const yieldEscrow = await YieldEscrow.deploy(
      await yieldVault.getAddress(),
      accounts.admin.address,
      accounts.treasury.address
    );
    await yieldEscrow.waitForDeployment();

    // Deploy CrossChainBridge
    const CrossChainBridge = await ethers.getContractFactory("CrossChainBridge");
    const crossChainBridge = await CrossChainBridge.deploy(
      await yieldEscrow.getAddress(),
      accounts.admin.address
    );
    await crossChainBridge.waitForDeployment();

    // Add strategies to vault
    await yieldVault.connect(accounts.admin).addStrategy(
      await nobleStrategy.getAddress(),
      "Noble T-Bills",
      1, // Low risk
      3000 // 30% allocation
    );

    await yieldVault.connect(accounts.admin).addStrategy(
      await resolvStrategy.getAddress(),
      "Resolv Delta-Neutral",
      2, // Medium risk
      5000 // 50% allocation
    );

    await yieldVault.connect(accounts.admin).addStrategy(
      await aaveStrategy.getAddress(),
      "Aave Lending",
      1, // Low risk
      2000 // 20% allocation
    );

    this.contracts.yieldVault = yieldVault;
    this.contracts.yieldEscrow = yieldEscrow;
    this.contracts.crossChainBridge = crossChainBridge;

    return {
      yieldVault,
      yieldEscrow,
      crossChainBridge,
      usdc,
      nobleStrategy,
      resolvStrategy,
      aaveStrategy,
      accounts
    };
  }

  // Mint tokens to accounts for testing
  async mintTokensToAccounts(token, accounts, amount = "1000000") {
    const decimals = await token.decimals();
    const mintAmount = ethers.parseUnits(amount, decimals);

    for (const account of accounts) {
      await token.mint(account.address, mintAmount);
    }
  }

  // Create test deposit
  async createTestDeposit(escrow, token, user, merchant, amount = "100") {
    const decimals = await token.decimals();
    const depositAmount = ethers.parseUnits(amount, decimals);
    
    // Approve token transfer
    await token.connect(user).approve(await escrow.getAddress(), depositAmount);
    
    // Create deposit
    const tx = await escrow.connect(user).createDeposit(
      depositAmount,
      await token.getAddress(),
      merchant.address,
      0, // Strategy index
      ethers.keccak256(ethers.toUtf8Bytes("test-payment-hash")),
      ethers.toUtf8Bytes("test-metadata")
    );

    const receipt = await tx.wait();
    const event = receipt.logs.find(log => {
      try {
        return escrow.interface.parseLog(log).name === 'DepositCreated';
      } catch {
        return false;
      }
    });

    if (event) {
      const parsedEvent = escrow.interface.parseLog(event);
      return {
        depositIndex: parsedEvent.args.depositIndex,
        amount: parsedEvent.args.amount,
        user: parsedEvent.args.user,
        merchant: parsedEvent.args.merchant
      };
    }

    throw new Error("DepositCreated event not found");
  }

  // Time manipulation helpers
  async increaseTime(seconds) {
    await ethers.provider.send("evm_increaseTime", [seconds]);
    await ethers.provider.send("evm_mine");
  }

  async setNextBlockTimestamp(timestamp) {
    await ethers.provider.send("evm_setNextBlockTimestamp", [timestamp]);
    await ethers.provider.send("evm_mine");
  }

  async getCurrentBlockTimestamp() {
    const block = await ethers.provider.getBlock("latest");
    return block.timestamp;
  }

  // Snapshot helpers for test isolation
  async takeSnapshot() {
    const snapshot = await ethers.provider.send("evm_snapshot");
    this.snapshots.push(snapshot);
    return snapshot;
  }

  async restoreSnapshot(snapshot) {
    await ethers.provider.send("evm_revert", [snapshot]);
    // Remove the snapshot from our tracking
    const index = this.snapshots.indexOf(snapshot);
    if (index > -1) {
      this.snapshots.splice(index, 1);
    }
  }

  async restoreLatestSnapshot() {
    if (this.snapshots.length > 0) {
      const snapshot = this.snapshots.pop();
      await ethers.provider.send("evm_revert", [snapshot]);
    }
  }

  // Gas usage helpers
  async measureGasUsage(tx) {
    const receipt = await tx.wait();
    return {
      gasUsed: receipt.gasUsed,
      gasPrice: receipt.gasPrice || receipt.effectiveGasPrice,
      gasCost: receipt.gasUsed * (receipt.gasPrice || receipt.effectiveGasPrice)
    };
  }

  async expectGasUsage(tx, maxGas) {
    const { gasUsed } = await this.measureGasUsage(tx);
    expect(gasUsed).to.be.lte(maxGas, `Gas usage ${gasUsed} exceeds limit ${maxGas}`);
    return gasUsed;
  }

  // Event helpers
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
      const parsedEvent = contract.interface.parseLog(event);
      for (const [key, value] of Object.entries(expectedArgs)) {
        expect(parsedEvent.args[key]).to.equal(value);
      }
    }

    return event;
  }

  // Balance helpers
  async getTokenBalance(token, account) {
    return await token.balanceOf(account.address);
  }

  async getEthBalance(account) {
    return await ethers.provider.getBalance(account.address);
  }

  // Error helpers
  async expectRevert(promise, expectedError) {
    try {
      await promise;
      expect.fail("Expected transaction to revert");
    } catch (error) {
      if (expectedError) {
        expect(error.message).to.include(expectedError);
      }
    }
  }

  // Utility functions
  parseUnits(value, decimals = 18) {
    return ethers.parseUnits(value.toString(), decimals);
  }

  formatUnits(value, decimals = 18) {
    return ethers.formatUnits(value, decimals);
  }

  keccak256(data) {
    return ethers.keccak256(ethers.toUtf8Bytes(data));
  }

  randomBytes32() {
    return ethers.hexlify(ethers.randomBytes(32));
  }

  randomAddress() {
    return ethers.Wallet.createRandom().address;
  }

  // Cleanup
  async cleanup() {
    // Restore all snapshots
    while (this.snapshots.length > 0) {
      await this.restoreLatestSnapshot();
    }
    
    // Reset contracts
    this.contracts = {};
    this.accounts = [];
  }
}

// Export singleton instance
const contractTestHelper = new ContractTestHelper();

module.exports = {
  ContractTestHelper,
  contractTestHelper,
  
  // Export commonly used functions
  setupAccounts: () => contractTestHelper.setupAccounts(),
  deployMockTokens: () => contractTestHelper.deployMockTokens(),
  deployMockStrategies: () => contractTestHelper.deployMockStrategies(),
  deployYieldRailsContracts: () => contractTestHelper.deployYieldRailsContracts(),
  mintTokensToAccounts: (token, accounts, amount) => contractTestHelper.mintTokensToAccounts(token, accounts, amount),
  createTestDeposit: (escrow, token, user, merchant, amount) => contractTestHelper.createTestDeposit(escrow, token, user, merchant, amount),
  increaseTime: (seconds) => contractTestHelper.increaseTime(seconds),
  takeSnapshot: () => contractTestHelper.takeSnapshot(),
  restoreSnapshot: (snapshot) => contractTestHelper.restoreSnapshot(snapshot),
  expectGasUsage: (tx, maxGas) => contractTestHelper.expectGasUsage(tx, maxGas),
  expectEvent: (tx, contract, eventName, expectedArgs) => contractTestHelper.expectEvent(tx, contract, eventName, expectedArgs),
  expectRevert: (promise, expectedError) => contractTestHelper.expectRevert(promise, expectedError)
};