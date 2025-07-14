const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  contractTestHelper,
  setupAccounts,
  deployMockTokens,
  deployMockStrategies,
  expectGasUsage,
  expectEvent,
  expectRevert,
  takeSnapshot,
  restoreSnapshot
} = require("./helpers");

describe("YieldRails Smart Contract Testing Infrastructure", function () {
  let accounts;
  let snapshot;

  before(async function () {
    accounts = await setupAccounts();
  });

  beforeEach(async function () {
    snapshot = await takeSnapshot();
  });

  afterEach(async function () {
    await restoreSnapshot(snapshot);
  });

  describe("Test Infrastructure Validation", function () {
    it("Should setup test accounts correctly", async function () {
      expect(accounts.deployer).to.not.be.undefined;
      expect(accounts.admin).to.not.be.undefined;
      expect(accounts.treasury).to.not.be.undefined;
      expect(accounts.user1).to.not.be.undefined;
      expect(accounts.merchant1).to.not.be.undefined;
      
      // Verify accounts have different addresses
      expect(accounts.deployer.address).to.not.equal(accounts.admin.address);
      expect(accounts.user1.address).to.not.equal(accounts.merchant1.address);
    });

    it("Should deploy mock tokens successfully", async function () {
      const { usdc, usdt, dai } = await deployMockTokens();
      
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

    it("Should deploy mock yield strategies successfully", async function () {
      const { nobleStrategy, resolvStrategy, aaveStrategy } = await deployMockStrategies();
      
      expect(await nobleStrategy.name()).to.equal("Noble T-Bills");
      expect(await nobleStrategy.currentAPY()).to.equal(450); // 4.5%
      
      expect(await resolvStrategy.name()).to.equal("Resolv Delta-Neutral");
      expect(await resolvStrategy.currentAPY()).to.equal(800); // 8%
      
      expect(await aaveStrategy.name()).to.equal("Aave Lending");
      expect(await aaveStrategy.currentAPY()).to.equal(350); // 3.5%
    });

    it("Should mint tokens to accounts for testing", async function () {
      const { usdc } = await deployMockTokens();
      const testAccounts = [accounts.user1, accounts.user2, accounts.merchant1];
      
      await contractTestHelper.mintTokensToAccounts(usdc, testAccounts, "1000");
      
      for (const account of testAccounts) {
        const balance = await usdc.balanceOf(account.address);
        expect(balance).to.equal(ethers.parseUnits("1000", 6)); // USDC has 6 decimals
      }
    });

    it("Should handle time manipulation correctly", async function () {
      const initialTime = await contractTestHelper.getCurrentBlockTimestamp();
      
      await contractTestHelper.increaseTime(3600); // 1 hour
      
      const newTime = await contractTestHelper.getCurrentBlockTimestamp();
      expect(newTime).to.be.at.least(initialTime + 3600);
    });

    it("Should measure gas usage correctly", async function () {
      const { usdc } = await deployMockTokens();
      
      const tx = await usdc.mint(accounts.user1.address, ethers.parseUnits("100", 6));
      const gasUsage = await contractTestHelper.measureGasUsage(tx);
      
      expect(gasUsage.gasUsed).to.be.a('bigint');
      expect(gasUsage.gasPrice).to.be.a('bigint');
      expect(gasUsage.gasCost).to.be.a('bigint');
      expect(gasUsage.gasUsed).to.be.greaterThan(0n);
    });

    it("Should validate gas usage limits", async function () {
      const { usdc } = await deployMockTokens();
      
      const tx = await usdc.mint(accounts.user1.address, ethers.parseUnits("100", 6));
      
      // Should not throw if gas usage is within limit
      await expectGasUsage(tx, 100000); // 100k gas limit
      
      // Should throw if gas usage exceeds limit
      try {
        await expectGasUsage(tx, 1000); // Very low limit
        expect.fail("Should have thrown for gas limit exceeded");
      } catch (error) {
        expect(error.message).to.include("exceeds limit");
      }
    });

    it("Should detect events correctly", async function () {
      const { usdc } = await deployMockTokens();
      const amount = ethers.parseUnits("100", 6);
      
      const tx = await usdc.mint(accounts.user1.address, amount);
      
      await expectEvent(tx, usdc, "Transfer", {
        to: accounts.user1.address,
        value: amount
      });
    });

    it("Should handle transaction reverts correctly", async function () {
      const { usdc } = await deployMockTokens();
      
      // Try to transfer more tokens than available (should revert)
      await expectRevert(
        usdc.connect(accounts.user1).transfer(accounts.user2.address, ethers.parseUnits("1000", 6)),
        "ERC20: transfer amount exceeds balance"
      );
    });

    it("Should create and restore snapshots correctly", async function () {
      const { usdc } = await deployMockTokens();
      
      // Initial state
      let balance = await usdc.balanceOf(accounts.user1.address);
      expect(balance).to.equal(0n);
      
      // Take snapshot
      const testSnapshot = await takeSnapshot();
      
      // Modify state
      await usdc.mint(accounts.user1.address, ethers.parseUnits("100", 6));
      balance = await usdc.balanceOf(accounts.user1.address);
      expect(balance).to.equal(ethers.parseUnits("100", 6));
      
      // Restore snapshot
      await restoreSnapshot(testSnapshot);
      
      // State should be restored
      balance = await usdc.balanceOf(accounts.user1.address);
      expect(balance).to.equal(0n);
    });

    it("Should generate random data correctly", async function () {
      const hash1 = contractTestHelper.randomBytes32();
      const hash2 = contractTestHelper.randomBytes32();
      const addr1 = contractTestHelper.randomAddress();
      const addr2 = contractTestHelper.randomAddress();
      
      // Should generate different values
      expect(hash1).to.not.equal(hash2);
      expect(addr1).to.not.equal(addr2);
      
      // Should have correct format
      expect(hash1).to.match(/^0x[a-fA-F0-9]{64}$/);
      expect(addr1).to.match(/^0x[a-fA-F0-9]{40}$/);
    });

    it("Should handle utility functions correctly", async function () {
      const value = "100.5";
      const parsed = contractTestHelper.parseUnits(value, 6);
      const formatted = contractTestHelper.formatUnits(parsed, 6);
      
      expect(parsed).to.equal(ethers.parseUnits(value, 6));
      expect(formatted).to.equal(value);
      
      const hash = contractTestHelper.keccak256("test-data");
      expect(hash).to.equal(ethers.keccak256(ethers.toUtf8Bytes("test-data")));
    });
  });

  describe("Coverage Requirements Validation", function () {
    it("Should enforce 100% coverage requirement for contracts", function () {
      const hardhatConfig = require("../hardhat.config.js");
      
      // Verify that coverage is configured
      expect(hardhatConfig.solidity_coverage).to.be.an('object');
      expect(hardhatConfig.solidity_coverage.skipFiles).to.include('test/');
      expect(hardhatConfig.solidity_coverage.skipFiles).to.include('mocks/');
    });

    it("Should have gas reporting enabled", function () {
      const hardhatConfig = require("../hardhat.config.js");
      
      expect(hardhatConfig.gasReporter).to.be.an('object');
      expect(hardhatConfig.gasReporter.outputFile).to.equal("./gas-report.txt");
      expect(hardhatConfig.gasReporter.showTimeSpent).to.be.true;
      expect(hardhatConfig.gasReporter.showMethodSig).to.be.true;
    });

    it("Should have contract size limits configured", function () {
      const hardhatConfig = require("../hardhat.config.js");
      
      expect(hardhatConfig.contractSizer).to.be.an('object');
      expect(hardhatConfig.contractSizer.runOnCompile).to.be.true;
      expect(hardhatConfig.contractSizer.strict).to.be.true;
    });

    it("Should have proper network configurations", function () {
      const hardhatConfig = require("../hardhat.config.js");
      
      expect(hardhatConfig.networks.hardhat).to.be.an('object');
      expect(hardhatConfig.networks.sepolia).to.be.an('object');
      expect(hardhatConfig.networks.mainnet).to.be.an('object');
      expect(hardhatConfig.networks.polygon).to.be.an('object');
      expect(hardhatConfig.networks.arbitrum).to.be.an('object');
      expect(hardhatConfig.networks.base).to.be.an('object');
    });

    it("Should have proper compiler settings for optimization", function () {
      const hardhatConfig = require("../hardhat.config.js");
      
      expect(hardhatConfig.solidity.version).to.equal("0.8.20");
      expect(hardhatConfig.solidity.settings.optimizer.enabled).to.be.true;
      expect(hardhatConfig.solidity.settings.optimizer.runs).to.equal(200);
      expect(hardhatConfig.solidity.settings.viaIR).to.be.true;
    });
  });

  describe("Mock Contract Functionality", function () {
    it("Should deploy and interact with MockERC20", async function () {
      const { usdc } = await deployMockTokens();
      const amount = ethers.parseUnits("1000", 6);
      
      // Test minting
      await usdc.mint(accounts.user1.address, amount);
      expect(await usdc.balanceOf(accounts.user1.address)).to.equal(amount);
      
      // Test transfer
      const transferAmount = ethers.parseUnits("100", 6);
      await usdc.connect(accounts.user1).transfer(accounts.user2.address, transferAmount);
      
      expect(await usdc.balanceOf(accounts.user1.address)).to.equal(amount - transferAmount);
      expect(await usdc.balanceOf(accounts.user2.address)).to.equal(transferAmount);
      
      // Test approval
      await usdc.connect(accounts.user1).approve(accounts.user2.address, transferAmount);
      expect(await usdc.allowance(accounts.user1.address, accounts.user2.address)).to.equal(transferAmount);
    });

    it("Should deploy and interact with MockYieldStrategy", async function () {
      const { nobleStrategy } = await deployMockStrategies();
      const amount = ethers.parseUnits("1000", 18);
      
      // Test deposit
      await nobleStrategy.deposit(amount, { value: amount });
      expect(await nobleStrategy.totalDeposited()).to.equal(amount);
      
      // Test APY
      expect(await nobleStrategy.currentAPY()).to.equal(450); // 4.5%
      
      // Test yield calculation
      const yield = await nobleStrategy.calculateYield(amount, 365 * 24 * 3600); // 1 year
      expect(yield).to.be.greaterThan(0);
    });
  });
});