const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Gas Optimization Tests", function () {
    // Deploy contracts fixture
    async function deployOptimizedContracts() {
        const [admin, user, merchant, feeRecipient] = await ethers.getSigners();

        // Deploy Mock USDC
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
        await usdc.waitForDeployment();

        // Deploy Optimized YieldEscrow
        const YieldEscrowOptimized = await ethers.getContractFactory("YieldEscrowOptimized");
        const escrowOptimized = await YieldEscrowOptimized.deploy(
            admin.address,
            feeRecipient.address
        );
        await escrowOptimized.waitForDeployment();

        // Deploy Original YieldEscrow for comparison
        const YieldEscrow = await ethers.getContractFactory("YieldEscrow");
        const escrowOriginal = await YieldEscrow.deploy(
            admin.address,
            feeRecipient.address
        );
        await escrowOriginal.waitForDeployment();

        // Setup: Add USDC as supported token for both contracts
        await escrowOptimized.connect(admin).setSupportedToken(await usdc.getAddress(), true);
        await escrowOriginal.connect(admin).addSupportedToken(await usdc.getAddress(), "USDC");

        // Mint USDC to user
        const depositAmount = ethers.parseUnits("100", 6); // 100 USDC
        await usdc.mint(user.address, depositAmount * 10n);

        // Approve both contracts
        await usdc.connect(user).approve(await escrowOptimized.getAddress(), depositAmount * 5n);
        await usdc.connect(user).approve(await escrowOriginal.getAddress(), depositAmount * 5n);

        return {
            escrowOptimized,
            escrowOriginal,
            usdc,
            admin,
            user,
            merchant,
            feeRecipient,
            depositAmount
        };
    }

    describe("Gas Comparison: Optimized vs Original", function () {
        it("Optimized deposit should use <100k gas", async function () {
            const { escrowOptimized, usdc, user, merchant, depositAmount } = await loadFixture(deployOptimizedContracts);

            const paymentHash = ethers.keccak256(ethers.toUtf8Bytes("test-payment-1"));

            // Test optimized version
            const txOptimized = await escrowOptimized.connect(user).createDeposit(
                depositAmount,
                await usdc.getAddress(),
                merchant.address,
                paymentHash
            );

            const receiptOptimized = await txOptimized.wait();
            const gasUsedOptimized = receiptOptimized.gasUsed;

            console.log(`Optimized deposit gas used: ${gasUsedOptimized}`);
            
            // TARGET: <100k gas
            expect(gasUsedOptimized).to.be.below(100000);
        });

        it("Should compare gas usage: Optimized vs Original", async function () {
            const { escrowOptimized, escrowOriginal, usdc, user, merchant, depositAmount, admin } = await loadFixture(deployOptimizedContracts);

            // Add a mock yield strategy for original contract
            const MockYieldStrategy = await ethers.getContractFactory("MockYieldStrategy");
            const mockStrategy = await MockYieldStrategy.deploy(await usdc.getAddress());
            await mockStrategy.waitForDeployment();
            
            await escrowOriginal.connect(admin).addStrategy(
                await mockStrategy.getAddress(),
                "Mock Strategy",
                1, // Risk score
                5000 // 50% allocation
            );

            const paymentHashOptimized = ethers.keccak256(ethers.toUtf8Bytes("test-payment-optimized"));
            const paymentHashOriginal = ethers.keccak256(ethers.toUtf8Bytes("test-payment-original"));

            // Test optimized version
            const txOptimized = await escrowOptimized.connect(user).createDeposit(
                depositAmount,
                await usdc.getAddress(),
                merchant.address,
                paymentHashOptimized
            );
            const receiptOptimized = await txOptimized.wait();
            const gasUsedOptimized = receiptOptimized.gasUsed;

            // Test original version
            const txOriginal = await escrowOriginal.connect(user).createDeposit(
                depositAmount,
                await usdc.getAddress(),
                merchant.address,
                await mockStrategy.getAddress(),
                paymentHashOriginal,
                "test metadata"
            );
            const receiptOriginal = await txOriginal.wait();
            const gasUsedOriginal = receiptOriginal.gasUsed;

            console.log(`Optimized deposit gas used: ${gasUsedOptimized}`);
            console.log(`Original deposit gas used: ${gasUsedOriginal}`);
            console.log(`Gas savings: ${gasUsedOriginal - gasUsedOptimized} (${((Number(gasUsedOriginal - gasUsedOptimized) / Number(gasUsedOriginal)) * 100).toFixed(1)}%)`);

            // Optimized should use significantly less gas
            expect(gasUsedOptimized).to.be.below(gasUsedOriginal);
            
            // Target: At least 70% gas reduction
            const gasReduction = Number(gasUsedOriginal - gasUsedOptimized) / Number(gasUsedOriginal);
            expect(gasReduction).to.be.above(0.7);
        });

        it("Optimized release should use reasonable gas", async function () {
            const { escrowOptimized, usdc, user, merchant, depositAmount } = await loadFixture(deployOptimizedContracts);

            const paymentHash = ethers.keccak256(ethers.toUtf8Bytes("test-payment-release"));

            // Create deposit first
            await escrowOptimized.connect(user).createDeposit(
                depositAmount,
                await usdc.getAddress(),
                merchant.address,
                paymentHash
            );

            // Test release
            const txRelease = await escrowOptimized.connect(merchant).releasePayment(user.address, 0);
            const receiptRelease = await txRelease.wait();
            const gasUsedRelease = receiptRelease.gasUsed;

            console.log(`Optimized release gas used: ${gasUsedRelease}`);
            
            // Should be under 100k gas for release too
            expect(gasUsedRelease).to.be.below(100000);
        });
    });

    describe("Functionality Verification", function () {
        it("Should maintain core functionality despite optimizations", async function () {
            const { escrowOptimized, usdc, user, merchant, depositAmount } = await loadFixture(deployOptimizedContracts);

            const paymentHash = ethers.keccak256(ethers.toUtf8Bytes("test-payment-functionality"));

            // Check initial state
            expect(await escrowOptimized.getUserDepositCount(user.address)).to.equal(0);
            expect(await escrowOptimized.isPaymentProcessed(paymentHash)).to.be.false;

            // Create deposit
            const tx = await escrowOptimized.connect(user).createDeposit(
                depositAmount,
                await usdc.getAddress(),
                merchant.address,
                paymentHash
            );

            // Verify deposit created
            expect(await escrowOptimized.getUserDepositCount(user.address)).to.equal(1);
            expect(await escrowOptimized.isPaymentProcessed(paymentHash)).to.be.true;

            // Check deposit details
            const deposit = await escrowOptimized.getDeposit(user.address, 0);
            expect(deposit.amount).to.equal(depositAmount);
            expect(deposit.token).to.equal(await usdc.getAddress());
            expect(deposit.merchant).to.equal(merchant.address);
            expect(deposit.released).to.be.false;
            expect(deposit.paymentHash).to.equal(paymentHash);

            // Check event emission
            await expect(tx)
                .to.emit(escrowOptimized, "DepositCreated")
                .withArgs(
                    paymentHash,
                    user.address,
                    merchant.address,
                    await usdc.getAddress(),
                    depositAmount,
                    0
                );

            // Verify token transfer
            expect(await usdc.balanceOf(await escrowOptimized.getAddress())).to.equal(depositAmount);
        });

        it("Should prevent duplicate payments", async function () {
            const { escrowOptimized, usdc, user, merchant, depositAmount } = await loadFixture(deployOptimizedContracts);

            const paymentHash = ethers.keccak256(ethers.toUtf8Bytes("test-duplicate"));

            // Create first deposit
            await escrowOptimized.connect(user).createDeposit(
                depositAmount,
                await usdc.getAddress(),
                merchant.address,
                paymentHash
            );

            // Attempt duplicate should fail
            await expect(
                escrowOptimized.connect(user).createDeposit(
                    depositAmount,
                    await usdc.getAddress(),
                    merchant.address,
                    paymentHash
                )
            ).to.be.revertedWithCustomError(escrowOptimized, "PaymentAlreadyProcessed");
        });

        it("Should validate amount limits", async function () {
            const { escrowOptimized, usdc, user, merchant } = await loadFixture(deployOptimizedContracts);

            const paymentHash = ethers.keccak256(ethers.toUtf8Bytes("test-limits"));

            // Test minimum amount validation
            await expect(
                escrowOptimized.connect(user).createDeposit(
                    ethers.parseUnits("0.5", 6), // Below minimum
                    await usdc.getAddress(),
                    merchant.address,
                    paymentHash
                )
            ).to.be.revertedWithCustomError(escrowOptimized, "InvalidAmount");

            // Test maximum amount validation  
            const paymentHash2 = ethers.keccak256(ethers.toUtf8Bytes("test-limits-2"));
            await expect(
                escrowOptimized.connect(user).createDeposit(
                    ethers.parseUnits("2000000", 6), // Above maximum
                    await usdc.getAddress(),
                    merchant.address,
                    paymentHash2
                )
            ).to.be.revertedWithCustomError(escrowOptimized, "InvalidAmount");
        });
    });

    describe("Gas Efficiency Breakdown", function () {
        it("Should analyze gas usage by operation", async function () {
            const { escrowOptimized, usdc, user, merchant, depositAmount, admin } = await loadFixture(deployOptimizedContracts);

            console.log("\n=== GAS USAGE BREAKDOWN ===");

            // 1. Token support setup (one-time admin cost)
            const txSetupToken = await escrowOptimized.connect(admin).setSupportedToken(await usdc.getAddress(), true);
            const receiptSetupToken = await txSetupToken.wait();
            console.log(`Token setup gas: ${receiptSetupToken.gasUsed}`);

            // 2. User approval (external to our contract)
            const txApproval = await usdc.connect(user).approve(await escrowOptimized.getAddress(), depositAmount);
            const receiptApproval = await txApproval.wait();
            console.log(`User approval gas: ${receiptApproval.gasUsed}`);

            // 3. Actual deposit (our optimization target)
            const paymentHash = ethers.keccak256(ethers.toUtf8Bytes("test-breakdown"));
            const txDeposit = await escrowOptimized.connect(user).createDeposit(
                depositAmount,
                await usdc.getAddress(),
                merchant.address,
                paymentHash
            );
            const receiptDeposit = await txDeposit.wait();
            console.log(`Optimized deposit gas: ${receiptDeposit.gasUsed}`);

            // 4. Payment release
            const txRelease = await escrowOptimized.connect(merchant).releasePayment(user.address, 0);
            const receiptRelease = await txRelease.wait();
            console.log(`Payment release gas: ${receiptRelease.gasUsed}`);

            console.log("===============================\n");

            // Verify our main target
            expect(receiptDeposit.gasUsed).to.be.below(100000);
        });
    });
});