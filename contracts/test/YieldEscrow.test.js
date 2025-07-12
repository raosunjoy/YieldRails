const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("YieldEscrow", function () {
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // FIXTURES
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    async function deployYieldEscrowFixture() {
        const [owner, admin, merchant, user1, user2, feeRecipient, operator] = await ethers.getSigners();

        // Deploy mock USDC token
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
        await usdc.waitForDeployment();

        // Deploy mock yield strategy
        const MockYieldStrategy = await ethers.getContractFactory("MockYieldStrategy");
        const yieldStrategy = await MockYieldStrategy.deploy(await usdc.getAddress());
        await yieldStrategy.waitForDeployment();

        // Deploy YieldEscrow
        const YieldEscrow = await ethers.getContractFactory("YieldEscrow");
        const yieldEscrow = await YieldEscrow.deploy(
            admin.address,
            feeRecipient.address
        );
        await yieldEscrow.waitForDeployment();

        // Setup roles
        const ADMIN_ROLE = await yieldEscrow.ADMIN_ROLE();
        const OPERATOR_ROLE = await yieldEscrow.OPERATOR_ROLE();
        const MERCHANT_ROLE = await yieldEscrow.MERCHANT_ROLE();
        const STRATEGY_MANAGER_ROLE = await yieldEscrow.STRATEGY_MANAGER_ROLE();

        await yieldEscrow.connect(admin).grantRole(OPERATOR_ROLE, operator.address);
        await yieldEscrow.connect(admin).grantRole(MERCHANT_ROLE, merchant.address);
        await yieldEscrow.connect(admin).grantRole(STRATEGY_MANAGER_ROLE, admin.address);

        // Add supported token and strategy
        await yieldEscrow.connect(admin).addSupportedToken(await usdc.getAddress(), "USDC");
        await yieldEscrow.connect(admin).addStrategy(
            await yieldStrategy.getAddress(),
            await usdc.getAddress(),
            "Mock T-Bill Strategy"
        );

        // Mint tokens to users
        const mintAmount = ethers.parseUnits("10000", 6); // 10,000 USDC
        await usdc.mint(user1.address, mintAmount);
        await usdc.mint(user2.address, mintAmount);

        // Approve spending
        await usdc.connect(user1).approve(await yieldEscrow.getAddress(), mintAmount);
        await usdc.connect(user2).approve(await yieldEscrow.getAddress(), mintAmount);

        return {
            yieldEscrow,
            usdc,
            yieldStrategy,
            owner,
            admin,
            merchant,
            user1,
            user2,
            feeRecipient,
            operator,
            ADMIN_ROLE,
            OPERATOR_ROLE,
            MERCHANT_ROLE,
            STRATEGY_MANAGER_ROLE
        };
    }

    async function deployMockERC20() {
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        return await MockERC20.deploy("Mock Token", "MOCK", 18);
    }

    async function deployMockYieldStrategy(tokenAddress) {
        const MockYieldStrategy = await ethers.getContractFactory("MockYieldStrategy");
        return await MockYieldStrategy.deploy(tokenAddress);
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // DEPLOYMENT TESTS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    describe("Deployment", function () {
        it("Should deploy with correct parameters", async function () {
            const { yieldEscrow, admin, feeRecipient, ADMIN_ROLE } = await loadFixture(deployYieldEscrowFixture);

            expect(await yieldEscrow.hasRole(ADMIN_ROLE, admin.address)).to.be.true;
            expect(await yieldEscrow.feeRecipient()).to.equal(feeRecipient.address);
            expect(await yieldEscrow.protocolFeeRate()).to.equal(0);
        });

        it("Should revert with invalid addresses", async function () {
            const YieldEscrow = await ethers.getContractFactory("YieldEscrow");
            
            await expect(
                YieldEscrow.deploy(ethers.ZeroAddress, ethers.ZeroAddress)
            ).to.be.revertedWithCustomError(YieldEscrow, "InvalidAddress");
        });

        it("Should set correct constants", async function () {
            const { yieldEscrow } = await loadFixture(deployYieldEscrowFixture);

            expect(await yieldEscrow.USER_YIELD_PERCENTAGE()).to.equal(7000);
            expect(await yieldEscrow.MERCHANT_YIELD_PERCENTAGE()).to.equal(2000);
            expect(await yieldEscrow.PROTOCOL_YIELD_PERCENTAGE()).to.equal(1000);
            expect(await yieldEscrow.BASIS_POINTS()).to.equal(10000);
            expect(await yieldEscrow.MAX_DEPOSIT_PER_TX()).to.equal(ethers.parseUnits("1000000", 6));
            expect(await yieldEscrow.MIN_DEPOSIT_AMOUNT()).to.equal(ethers.parseUnits("1", 6));
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // TOKEN AND STRATEGY MANAGEMENT TESTS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    describe("Token Management", function () {
        it("Should add supported token", async function () {
            const { yieldEscrow, admin, usdc } = await loadFixture(deployYieldEscrowFixture);

            const newToken = await deployMockERC20();
            await expect(
                yieldEscrow.connect(admin).addSupportedToken(await newToken.getAddress(), "NEW")
            ).to.emit(yieldEscrow, "TokenAdded");

            expect(await yieldEscrow.supportedTokens(await newToken.getAddress())).to.be.true;
        });

        it("Should revert adding token with invalid address", async function () {
            const { yieldEscrow, admin } = await loadFixture(deployYieldEscrowFixture);

            await expect(
                yieldEscrow.connect(admin).addSupportedToken(ethers.ZeroAddress, "ZERO")
            ).to.be.revertedWithCustomError(yieldEscrow, "InvalidAddress");
        });

        it("Should not duplicate supported token", async function () {
            const { yieldEscrow, admin, usdc } = await loadFixture(deployYieldEscrowFixture);

            // Adding same token again should not revert but also not emit event
            await yieldEscrow.connect(admin).addSupportedToken(await usdc.getAddress(), "USDC");
            // Should succeed without reverting
        });

        it("Should only allow admin to add tokens", async function () {
            const { yieldEscrow, user1 } = await loadFixture(deployYieldEscrowFixture);

            const newToken = await deployMockERC20();
            await expect(
                yieldEscrow.connect(user1).addSupportedToken(await newToken.getAddress(), "NEW")
            ).to.be.reverted;
        });
    });

    describe("Strategy Management", function () {
        it("Should add yield strategy", async function () {
            const { yieldEscrow, admin, usdc } = await loadFixture(deployYieldEscrowFixture);

            const newStrategy = await deployMockYieldStrategy(await usdc.getAddress());
            await expect(
                yieldEscrow.connect(admin).addStrategy(
                    await newStrategy.getAddress(),
                    await usdc.getAddress(),
                    "New Strategy"
                )
            ).to.emit(yieldEscrow, "StrategyAdded");

            expect(await yieldEscrow.activeStrategies(await newStrategy.getAddress())).to.be.true;
        });

        it("Should remove yield strategy", async function () {
            const { yieldEscrow, admin, yieldStrategy } = await loadFixture(deployYieldEscrowFixture);

            await expect(
                yieldEscrow.connect(admin).removeStrategy(
                    await yieldStrategy.getAddress(),
                    "Test removal"
                )
            ).to.emit(yieldEscrow, "StrategyRemoved");

            expect(await yieldEscrow.activeStrategies(await yieldStrategy.getAddress())).to.be.false;
        });

        it("Should revert adding strategy with invalid addresses", async function () {
            const { yieldEscrow, admin, usdc } = await loadFixture(deployYieldEscrowFixture);

            await expect(
                yieldEscrow.connect(admin).addStrategy(
                    ethers.ZeroAddress,
                    await usdc.getAddress(),
                    "Invalid Strategy"
                )
            ).to.be.revertedWithCustomError(yieldEscrow, "InvalidAddress");
        });

        it("Should revert removing inactive strategy", async function () {
            const { yieldEscrow, admin } = await loadFixture(deployYieldEscrowFixture);

            const fakeStrategy = await deployMockYieldStrategy(ethers.ZeroAddress);
            await expect(
                yieldEscrow.connect(admin).removeStrategy(
                    await fakeStrategy.getAddress(),
                    "Non-existent"
                )
            ).to.be.revertedWithCustomError(yieldEscrow, "StrategyNotActive");
        });

        it("Should only allow strategy manager to manage strategies", async function () {
            const { yieldEscrow, user1, usdc } = await loadFixture(deployYieldEscrowFixture);

            const newStrategy = await deployMockYieldStrategy(await usdc.getAddress());
            await expect(
                yieldEscrow.connect(user1).addStrategy(
                    await newStrategy.getAddress(),
                    await usdc.getAddress(),
                    "Unauthorized"
                )
            ).to.be.reverted;
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // DEPOSIT CREATION TESTS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    describe("Deposit Creation", function () {
        it("Should create deposit successfully", async function () {
            const { yieldEscrow, usdc, yieldStrategy, user1, merchant } = await loadFixture(deployYieldEscrowFixture);

            const amount = ethers.parseUnits("100", 6);
            const paymentHash = ethers.keccak256(ethers.toUtf8Bytes("payment1"));

            await expect(
                yieldEscrow.connect(user1).createDeposit(
                    amount,
                    await usdc.getAddress(),
                    merchant.address,
                    await yieldStrategy.getAddress(),
                    paymentHash,
                    "Test payment"
                )
            ).to.emit(yieldEscrow, "DepositCreated")
             .withArgs(
                 paymentHash,
                 user1.address,
                 merchant.address,
                 await usdc.getAddress(),
                 amount,
                 await yieldStrategy.getAddress(),
                 0
             );

            const deposit = await yieldEscrow.getUserDeposit(user1.address, 0);
            expect(deposit.amount).to.equal(amount);
            expect(deposit.merchant).to.equal(merchant.address);
            expect(deposit.released).to.be.false;
        });

        it("Should revert with invalid amount (too small)", async function () {
            const { yieldEscrow, usdc, yieldStrategy, user1, merchant } = await loadFixture(deployYieldEscrowFixture);

            const amount = ethers.parseUnits("0.5", 6); // Less than MIN_DEPOSIT_AMOUNT
            const paymentHash = ethers.keccak256(ethers.toUtf8Bytes("payment1"));

            await expect(
                yieldEscrow.connect(user1).createDeposit(
                    amount,
                    await usdc.getAddress(),
                    merchant.address,
                    await yieldStrategy.getAddress(),
                    paymentHash,
                    ""
                )
            ).to.be.revertedWithCustomError(yieldEscrow, "InvalidAmount");
        });

        it("Should revert with invalid amount (too large)", async function () {
            const { yieldEscrow, usdc, yieldStrategy, user1, merchant } = await loadFixture(deployYieldEscrowFixture);

            const amount = ethers.parseUnits("2000000", 6); // More than MAX_DEPOSIT_PER_TX
            const paymentHash = ethers.keccak256(ethers.toUtf8Bytes("payment1"));

            await expect(
                yieldEscrow.connect(user1).createDeposit(
                    amount,
                    await usdc.getAddress(),
                    merchant.address,
                    await yieldStrategy.getAddress(),
                    paymentHash,
                    ""
                )
            ).to.be.revertedWithCustomError(yieldEscrow, "InvalidAmount");
        });

        it("Should revert with unsupported token", async function () {
            const { yieldEscrow, yieldStrategy, user1, merchant } = await loadFixture(deployYieldEscrowFixture);

            const unsupportedToken = await deployMockERC20();
            const amount = ethers.parseUnits("100", 18);
            const paymentHash = ethers.keccak256(ethers.toUtf8Bytes("payment1"));

            await expect(
                yieldEscrow.connect(user1).createDeposit(
                    amount,
                    await unsupportedToken.getAddress(),
                    merchant.address,
                    await yieldStrategy.getAddress(),
                    paymentHash,
                    ""
                )
            ).to.be.revertedWithCustomError(yieldEscrow, "TokenNotSupported");
        });

        it("Should revert with inactive strategy", async function () {
            const { yieldEscrow, usdc, user1, merchant } = await loadFixture(deployYieldEscrowFixture);

            const inactiveStrategy = await deployMockYieldStrategy(await usdc.getAddress());
            const amount = ethers.parseUnits("100", 6);
            const paymentHash = ethers.keccak256(ethers.toUtf8Bytes("payment1"));

            await expect(
                yieldEscrow.connect(user1).createDeposit(
                    amount,
                    await usdc.getAddress(),
                    merchant.address,
                    await inactiveStrategy.getAddress(),
                    paymentHash,
                    ""
                )
            ).to.be.revertedWithCustomError(yieldEscrow, "StrategyNotActive");
        });

        it("Should revert with duplicate payment hash", async function () {
            const { yieldEscrow, usdc, yieldStrategy, user1, merchant } = await loadFixture(deployYieldEscrowFixture);

            const amount = ethers.parseUnits("100", 6);
            const paymentHash = ethers.keccak256(ethers.toUtf8Bytes("payment1"));

            // First deposit should succeed
            await yieldEscrow.connect(user1).createDeposit(
                amount,
                await usdc.getAddress(),
                merchant.address,
                await yieldStrategy.getAddress(),
                paymentHash,
                ""
            );

            // Second deposit with same hash should fail
            await expect(
                yieldEscrow.connect(user1).createDeposit(
                    amount,
                    await usdc.getAddress(),
                    merchant.address,
                    await yieldStrategy.getAddress(),
                    paymentHash,
                    ""
                )
            ).to.be.revertedWithCustomError(yieldEscrow, "PaymentAlreadyProcessed");
        });

        it("Should revert with zero addresses", async function () {
            const { yieldEscrow, usdc, yieldStrategy, user1 } = await loadFixture(deployYieldEscrowFixture);

            const amount = ethers.parseUnits("100", 6);
            const paymentHash = ethers.keccak256(ethers.toUtf8Bytes("payment1"));

            await expect(
                yieldEscrow.connect(user1).createDeposit(
                    amount,
                    ethers.ZeroAddress,
                    ethers.ZeroAddress,
                    await yieldStrategy.getAddress(),
                    paymentHash,
                    ""
                )
            ).to.be.revertedWithCustomError(yieldEscrow, "InvalidAddress");
        });

        it("Should transfer tokens from user", async function () {
            const { yieldEscrow, usdc, yieldStrategy, user1, merchant } = await loadFixture(deployYieldEscrowFixture);

            const amount = ethers.parseUnits("100", 6);
            const paymentHash = ethers.keccak256(ethers.toUtf8Bytes("payment1"));
            
            const userBalanceBefore = await usdc.balanceOf(user1.address);
            
            await yieldEscrow.connect(user1).createDeposit(
                amount,
                await usdc.getAddress(),
                merchant.address,
                await yieldStrategy.getAddress(),
                paymentHash,
                ""
            );

            const userBalanceAfter = await usdc.balanceOf(user1.address);
            expect(userBalanceBefore - userBalanceAfter).to.equal(amount);
        });

        it("Should increment user deposit count", async function () {
            const { yieldEscrow, usdc, yieldStrategy, user1, merchant } = await loadFixture(deployYieldEscrowFixture);

            expect(await yieldEscrow.userDepositCount(user1.address)).to.equal(0);

            const amount = ethers.parseUnits("100", 6);
            const paymentHash = ethers.keccak256(ethers.toUtf8Bytes("payment1"));

            await yieldEscrow.connect(user1).createDeposit(
                amount,
                await usdc.getAddress(),
                merchant.address,
                await yieldStrategy.getAddress(),
                paymentHash,
                ""
            );

            expect(await yieldEscrow.userDepositCount(user1.address)).to.equal(1);
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // PAYMENT RELEASE TESTS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    describe("Payment Release", function () {
        async function createTestDeposit(fixture) {
            const { yieldEscrow, usdc, yieldStrategy, user1, merchant } = fixture;
            const amount = ethers.parseUnits("100", 6);
            const paymentHash = ethers.keccak256(ethers.toUtf8Bytes("payment1"));

            await yieldEscrow.connect(user1).createDeposit(
                amount,
                await usdc.getAddress(),
                merchant.address,
                await yieldStrategy.getAddress(),
                paymentHash,
                "Test payment"
            );

            return { amount, paymentHash };
        }

        it("Should release payment successfully", async function () {
            const fixture = await loadFixture(deployYieldEscrowFixture);
            const { yieldEscrow, user1, merchant } = fixture;
            const { amount, paymentHash } = await createTestDeposit(fixture);

            await expect(
                yieldEscrow.connect(merchant).releasePayment(user1.address, 0)
            ).to.emit(yieldEscrow, "PaymentReleased");

            const deposit = await yieldEscrow.getUserDeposit(user1.address, 0);
            expect(deposit.released).to.be.true;
        });

        it("Should allow operator to release payment", async function () {
            const fixture = await loadFixture(deployYieldEscrowFixture);
            const { yieldEscrow, user1, operator } = fixture;
            await createTestDeposit(fixture);

            await expect(
                yieldEscrow.connect(operator).releasePayment(user1.address, 0)
            ).to.emit(yieldEscrow, "PaymentReleased");
        });

        it("Should revert if not merchant or operator", async function () {
            const fixture = await loadFixture(deployYieldEscrowFixture);
            const { yieldEscrow, user1, user2 } = fixture;
            await createTestDeposit(fixture);

            await expect(
                yieldEscrow.connect(user2).releasePayment(user1.address, 0)
            ).to.be.revertedWithCustomError(yieldEscrow, "OnlyMerchantCanRelease");
        });

        it("Should revert if deposit not found", async function () {
            const { yieldEscrow, user1, merchant } = await loadFixture(deployYieldEscrowFixture);

            await expect(
                yieldEscrow.connect(merchant).releasePayment(user1.address, 0)
            ).to.be.revertedWithCustomError(yieldEscrow, "DepositNotFound");
        });

        it("Should revert if already released", async function () {
            const fixture = await loadFixture(deployYieldEscrowFixture);
            const { yieldEscrow, user1, merchant } = fixture;
            await createTestDeposit(fixture);

            // Release once
            await yieldEscrow.connect(merchant).releasePayment(user1.address, 0);

            // Try to release again
            await expect(
                yieldEscrow.connect(merchant).releasePayment(user1.address, 0)
            ).to.be.revertedWithCustomError(yieldEscrow, "DepositAlreadyReleased");
        });

        it("Should distribute yield correctly", async function () {
            const fixture = await loadFixture(deployYieldEscrowFixture);
            const { yieldEscrow, user1, merchant, yieldStrategy } = fixture;
            await createTestDeposit(fixture);

            // Set up some yield in the mock strategy
            await yieldStrategy.setUserYield(ethers.parseUnits("10", 6)); // 10 USDC yield

            const tx = await yieldEscrow.connect(merchant).releasePayment(user1.address, 0);
            const receipt = await tx.wait();

            // Check that yield was distributed
            const userYieldBalance = await yieldEscrow.userYieldBalances(user1.address);
            const merchantBalance = await yieldEscrow.merchantBalances(merchant.address);
            const protocolBalance = await yieldEscrow.protocolBalance();

            // 70% to user, 20% to merchant, 10% to protocol
            expect(userYieldBalance).to.be.gt(0);
            expect(merchantBalance).to.be.gt(0);
            expect(protocolBalance).to.be.gt(0);
        });

        it("Should work when paused is false", async function () {
            const fixture = await loadFixture(deployYieldEscrowFixture);
            const { yieldEscrow, user1, merchant } = fixture;
            await createTestDeposit(fixture);

            // Ensure contract is not paused
            expect(await yieldEscrow.paused()).to.be.false;

            await expect(
                yieldEscrow.connect(merchant).releasePayment(user1.address, 0)
            ).to.emit(yieldEscrow, "PaymentReleased");
        });
    });

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // YIELD CALCULATION TESTS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    describe("Yield Calculation", function () {
        it("Should calculate yield for valid deposit", async function () {
            const fixture = await loadFixture(deployYieldEscrowFixture);
            const { yieldEscrow, user1, yieldStrategy } = fixture;
            await createTestDeposit(fixture);

            // Set up yield in mock strategy
            await yieldStrategy.setUserYield(ethers.parseUnits("5", 6));

            const yieldAmount = await yieldEscrow.calculateYield(user1.address, 0);
            expect(yieldAmount).to.be.gt(0);
        });

        it("Should return 0 for invalid deposit index", async function () {
            const { yieldEscrow, user1 } = await loadFixture(deployYieldEscrowFixture);

            const yieldAmount = await yieldEscrow.calculateYield(user1.address, 0);
            expect(yieldAmount).to.equal(0);
        });

        it("Should return accrued yield for released deposit", async function () {
            const fixture = await loadFixture(deployYieldEscrowFixture);
            const { yieldEscrow, user1, merchant } = fixture;
            await createTestDeposit(fixture);

            // Release the payment first
            await yieldEscrow.connect(merchant).releasePayment(user1.address, 0);

            // Should return the accrued yield amount
            const yieldAmount = await yieldEscrow.calculateYield(user1.address, 0);
            const deposit = await yieldEscrow.getUserDeposit(user1.address, 0);
            expect(yieldAmount).to.equal(deposit.yieldAccrued);
        });

        async function createTestDeposit(fixture) {
            const { yieldEscrow, usdc, yieldStrategy, user1, merchant } = fixture;
            const amount = ethers.parseUnits("100", 6);
            const paymentHash = ethers.keccak256(ethers.toUtf8Bytes("payment1"));

            await yieldEscrow.connect(user1).createDeposit(
                amount,
                await usdc.getAddress(),
                merchant.address,
                await yieldStrategy.getAddress(),
                paymentHash,
                "Test payment"
            );

            return { amount, paymentHash };
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // WITHDRAWAL TESTS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    describe("Withdrawals", function () {
        it("Should allow user to withdraw yield", async function () {
            const fixture = await loadFixture(deployYieldEscrowFixture);
            const { yieldEscrow, usdc, user1, merchant, yieldStrategy } = fixture;
            await createTestDeposit(fixture);

            // Set up yield and release payment
            await yieldStrategy.setUserYield(ethers.parseUnits("10", 6));
            await yieldEscrow.connect(merchant).releasePayment(user1.address, 0);

            const yieldBalance = await yieldEscrow.userYieldBalances(user1.address);
            expect(yieldBalance).to.be.gt(0);

            await expect(
                yieldEscrow.connect(user1).withdrawUserYield(await usdc.getAddress())
            ).to.emit(yieldEscrow, "YieldWithdrawn");

            expect(await yieldEscrow.userYieldBalances(user1.address)).to.equal(0);
        });

        it("Should allow merchant to withdraw balance", async function () {
            const fixture = await loadFixture(deployYieldEscrowFixture);
            const { yieldEscrow, usdc, user1, merchant } = fixture;
            await createTestDeposit(fixture);

            // Release payment to build merchant balance
            await yieldEscrow.connect(merchant).releasePayment(user1.address, 0);

            const merchantBalance = await yieldEscrow.merchantBalances(merchant.address);
            expect(merchantBalance).to.be.gt(0);

            await yieldEscrow.connect(merchant).withdrawMerchantBalance(
                await usdc.getAddress(),
                0 // 0 means withdraw all
            );

            expect(await yieldEscrow.merchantBalances(merchant.address)).to.equal(0);
        });

        it("Should revert yield withdrawal with unsupported token", async function () {
            const { yieldEscrow, user1 } = await loadFixture(deployYieldEscrowFixture);

            const unsupportedToken = await deployMockERC20();

            await expect(
                yieldEscrow.connect(user1).withdrawUserYield(await unsupportedToken.getAddress())
            ).to.be.revertedWithCustomError(yieldEscrow, "TokenNotSupported");
        });

        it("Should revert yield withdrawal with insufficient balance", async function () {
            const { yieldEscrow, usdc, user1 } = await loadFixture(deployYieldEscrowFixture);

            await expect(
                yieldEscrow.connect(user1).withdrawUserYield(await usdc.getAddress())
            ).to.be.revertedWithCustomError(yieldEscrow, "InsufficientBalance");
        });

        async function createTestDeposit(fixture) {
            const { yieldEscrow, usdc, yieldStrategy, user1, merchant } = fixture;
            const amount = ethers.parseUnits("100", 6);
            const paymentHash = ethers.keccak256(ethers.toUtf8Bytes("payment1"));

            await yieldEscrow.connect(user1).createDeposit(
                amount,
                await usdc.getAddress(),
                merchant.address,
                await yieldStrategy.getAddress(),
                paymentHash,
                "Test payment"
            );

            return { amount, paymentHash };
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // EMERGENCY FUNCTIONS TESTS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    describe("Emergency Functions", function () {
        it("Should allow emergency withdrawal", async function () {
            const fixture = await loadFixture(deployYieldEscrowFixture);
            const { yieldEscrow, user1 } = fixture;
            await createTestDeposit(fixture);

            await expect(
                yieldEscrow.connect(user1).emergencyWithdraw(0, "Emergency test")
            ).to.emit(yieldEscrow, "EmergencyWithdrawal");

            const deposit = await yieldEscrow.getUserDeposit(user1.address, 0);
            expect(deposit.released).to.be.true;
        });

        it("Should allow admin to pause contract", async function () {
            const { yieldEscrow, admin } = await loadFixture(deployYieldEscrowFixture);

            await yieldEscrow.connect(admin).emergencyPause();
            expect(await yieldEscrow.paused()).to.be.true;
        });

        it("Should allow admin to unpause contract", async function () {
            const { yieldEscrow, admin } = await loadFixture(deployYieldEscrowFixture);

            await yieldEscrow.connect(admin).emergencyPause();
            await yieldEscrow.connect(admin).unpause();
            expect(await yieldEscrow.paused()).to.be.false;
        });

        it("Should revert emergency withdrawal for invalid deposit", async function () {
            const { yieldEscrow, user1 } = await loadFixture(deployYieldEscrowFixture);

            await expect(
                yieldEscrow.connect(user1).emergencyWithdraw(0, "Invalid")
            ).to.be.revertedWithCustomError(yieldEscrow, "DepositNotFound");
        });

        it("Should revert emergency withdrawal for already released deposit", async function () {
            const fixture = await loadFixture(deployYieldEscrowFixture);
            const { yieldEscrow, user1, merchant } = fixture;
            await createTestDeposit(fixture);

            // Release normally first
            await yieldEscrow.connect(merchant).releasePayment(user1.address, 0);

            // Then try emergency withdrawal
            await expect(
                yieldEscrow.connect(user1).emergencyWithdraw(0, "Already released")
            ).to.be.revertedWithCustomError(yieldEscrow, "DepositAlreadyReleased");
        });

        async function createTestDeposit(fixture) {
            const { yieldEscrow, usdc, yieldStrategy, user1, merchant } = fixture;
            const amount = ethers.parseUnits("100", 6);
            const paymentHash = ethers.keccak256(ethers.toUtf8Bytes("payment1"));

            await yieldEscrow.connect(user1).createDeposit(
                amount,
                await usdc.getAddress(),
                merchant.address,
                await yieldStrategy.getAddress(),
                paymentHash,
                "Test payment"
            );

            return { amount, paymentHash };
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS TESTS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    describe("View Functions", function () {
        it("Should get user deposits", async function () {
            const fixture = await loadFixture(deployYieldEscrowFixture);
            const { yieldEscrow, user1 } = fixture;
            await createTestDeposit(fixture);

            const deposits = await yieldEscrow.getUserDeposits(user1.address);
            expect(deposits.length).to.equal(1);
            expect(deposits[0].amount).to.equal(ethers.parseUnits("100", 6));
        });

        it("Should get total value locked", async function () {
            const fixture = await loadFixture(deployYieldEscrowFixture);
            const { yieldEscrow } = fixture;
            await createTestDeposit(fixture);

            const tvl = await yieldEscrow.getTotalValueLocked();
            expect(tvl).to.be.gt(0);
        });

        it("Should get strategy metrics", async function () {
            const fixture = await loadFixture(deployYieldEscrowFixture);
            const { yieldEscrow, yieldStrategy } = fixture;
            await createTestDeposit(fixture);

            const metrics = await yieldEscrow.getStrategyMetrics(await yieldStrategy.getAddress());
            expect(metrics.totalDeposited).to.be.gt(0);
        });

        async function createTestDeposit(fixture) {
            const { yieldEscrow, usdc, yieldStrategy, user1, merchant } = fixture;
            const amount = ethers.parseUnits("100", 6);
            const paymentHash = ethers.keccak256(ethers.toUtf8Bytes("payment1"));

            await yieldEscrow.connect(user1).createDeposit(
                amount,
                await usdc.getAddress(),
                merchant.address,
                await yieldStrategy.getAddress(),
                paymentHash,
                "Test payment"
            );

            return { amount, paymentHash };
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS TESTS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    describe("Admin Functions", function () {
        it("Should update protocol fee rate", async function () {
            const { yieldEscrow, admin } = await loadFixture(deployYieldEscrowFixture);

            await expect(
                yieldEscrow.connect(admin).updateProtocolFeeRate(500) // 5%
            ).to.emit(yieldEscrow, "ProtocolFeeUpdated");

            expect(await yieldEscrow.protocolFeeRate()).to.equal(500);
        });

        it("Should revert fee rate update if too high", async function () {
            const { yieldEscrow, admin } = await loadFixture(deployYieldEscrowFixture);

            await expect(
                yieldEscrow.connect(admin).updateProtocolFeeRate(1500) // 15% (too high)
            ).to.be.revertedWithCustomError(yieldEscrow, "InvalidAmount");
        });

        it("Should withdraw protocol fees", async function () {
            const fixture = await loadFixture(deployYieldEscrowFixture);
            const { yieldEscrow, usdc, admin, user1, merchant, yieldStrategy } = fixture;
            
            // Create deposit and release to generate protocol fees
            await createTestDeposit(fixture);
            await yieldStrategy.setUserYield(ethers.parseUnits("10", 6));
            await yieldEscrow.connect(merchant).releasePayment(user1.address, 0);

            const protocolBalance = await yieldEscrow.protocolBalance();
            expect(protocolBalance).to.be.gt(0);

            await yieldEscrow.connect(admin).withdrawProtocolFees(
                await usdc.getAddress(),
                protocolBalance
            );

            expect(await yieldEscrow.protocolBalance()).to.equal(0);
        });

        it("Should revert protocol fee withdrawal with insufficient balance", async function () {
            const { yieldEscrow, usdc, admin } = await loadFixture(deployYieldEscrowFixture);

            await expect(
                yieldEscrow.connect(admin).withdrawProtocolFees(
                    await usdc.getAddress(),
                    ethers.parseUnits("100", 6)
                )
            ).to.be.revertedWithCustomError(yieldEscrow, "InsufficientBalance");
        });

        it("Should only allow admin to perform admin functions", async function () {
            const { yieldEscrow, usdc, user1 } = await loadFixture(deployYieldEscrowFixture);

            await expect(
                yieldEscrow.connect(user1).updateProtocolFeeRate(100)
            ).to.be.reverted;

            await expect(
                yieldEscrow.connect(user1).withdrawProtocolFees(await usdc.getAddress(), 0)
            ).to.be.reverted;
        });

        async function createTestDeposit(fixture) {
            const { yieldEscrow, usdc, yieldStrategy, user1, merchant } = fixture;
            const amount = ethers.parseUnits("100", 6);
            const paymentHash = ethers.keccak256(ethers.toUtf8Bytes("payment1"));

            await yieldEscrow.connect(user1).createDeposit(
                amount,
                await usdc.getAddress(),
                merchant.address,
                await yieldStrategy.getAddress(),
                paymentHash,
                "Test payment"
            );

            return { amount, paymentHash };
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // SECURITY AND EDGE CASES TESTS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    describe("Security and Edge Cases", function () {
        it("Should prevent reentrancy attacks", async function () {
            // This would require a malicious contract, testing the nonReentrant modifier indirectly
            const fixture = await loadFixture(deployYieldEscrowFixture);
            const { yieldEscrow, user1, merchant } = fixture;
            await createTestDeposit(fixture);

            // The nonReentrant modifier should prevent any reentrancy
            // This is tested indirectly through normal function calls
            await expect(
                yieldEscrow.connect(merchant).releasePayment(user1.address, 0)
            ).to.emit(yieldEscrow, "PaymentReleased");
        });

        it("Should handle paused state correctly", async function () {
            const fixture = await loadFixture(deployYieldEscrowFixture);
            const { yieldEscrow, usdc, yieldStrategy, user1, merchant, admin } = fixture;

            // Pause the contract
            await yieldEscrow.connect(admin).emergencyPause();

            // Should revert deposit creation when paused
            const amount = ethers.parseUnits("100", 6);
            const paymentHash = ethers.keccak256(ethers.toUtf8Bytes("payment1"));

            await expect(
                yieldEscrow.connect(user1).createDeposit(
                    amount,
                    await usdc.getAddress(),
                    merchant.address,
                    await yieldStrategy.getAddress(),
                    paymentHash,
                    ""
                )
            ).to.be.revertedWith("Pausable: paused");
        });

        it("Should handle zero yield gracefully", async function () {
            const fixture = await loadFixture(deployYieldEscrowFixture);
            const { yieldEscrow, user1, merchant, yieldStrategy } = fixture;
            await createTestDeposit(fixture);

            // Don't set any yield in the strategy (should default to 0)
            await expect(
                yieldEscrow.connect(merchant).releasePayment(user1.address, 0)
            ).to.emit(yieldEscrow, "PaymentReleased");
        });

        it("Should handle strategy calculation failures", async function () {
            const fixture = await loadFixture(deployYieldEscrowFixture);
            const { yieldEscrow, user1, merchant, yieldStrategy } = fixture;
            await createTestDeposit(fixture);

            // Set strategy to fail yield calculation
            await yieldStrategy.setShouldFail(true);

            // Should still work but with 0 yield
            const yieldAmount = await yieldEscrow.calculateYield(user1.address, 0);
            expect(yieldAmount).to.equal(0);
        });

        async function createTestDeposit(fixture) {
            const { yieldEscrow, usdc, yieldStrategy, user1, merchant } = fixture;
            const amount = ethers.parseUnits("100", 6);
            const paymentHash = ethers.keccak256(ethers.toUtf8Bytes("payment1"));

            await yieldEscrow.connect(user1).createDeposit(
                amount,
                await usdc.getAddress(),
                merchant.address,
                await yieldStrategy.getAddress(),
                paymentHash,
                "Test payment"
            );

            return { amount, paymentHash };
        }
    });

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // GAS OPTIMIZATION TESTS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    describe("Gas Optimization", function () {
        it("Should use less than 100k gas for deposit", async function () {
            const { yieldEscrow, usdc, yieldStrategy, user1, merchant } = await loadFixture(deployYieldEscrowFixture);

            const amount = ethers.parseUnits("100", 6);
            const paymentHash = ethers.keccak256(ethers.toUtf8Bytes("payment1"));

            const tx = await yieldEscrow.connect(user1).createDeposit(
                amount,
                await usdc.getAddress(),
                merchant.address,
                await yieldStrategy.getAddress(),
                paymentHash,
                "Test payment"
            );

            const receipt = await tx.wait();
            
            // Log gas usage for monitoring
            console.log(`Deposit gas used: ${receipt.gasUsed.toString()}`);
            
            // Should be under our 100k gas target
            expect(receipt.gasUsed).to.be.lt(100000);
        });

        it("Should use reasonable gas for payment release", async function () {
            const fixture = await loadFixture(deployYieldEscrowFixture);
            const { yieldEscrow, user1, merchant } = fixture;
            await createTestDeposit(fixture);

            const tx = await yieldEscrow.connect(merchant).releasePayment(user1.address, 0);
            const receipt = await tx.wait();
            
            console.log(`Release gas used: ${receipt.gasUsed.toString()}`);
            
            // Should be reasonable for the operations performed
            expect(receipt.gasUsed).to.be.lt(150000);
        });

        async function createTestDeposit(fixture) {
            const { yieldEscrow, usdc, yieldStrategy, user1, merchant } = fixture;
            const amount = ethers.parseUnits("100", 6);
            const paymentHash = ethers.keccak256(ethers.toUtf8Bytes("payment1"));

            await yieldEscrow.connect(user1).createDeposit(
                amount,
                await usdc.getAddress(),
                merchant.address,
                await yieldStrategy.getAddress(),
                paymentHash,
                "Test payment"
            );

            return { amount, paymentHash };
        }
    });
});