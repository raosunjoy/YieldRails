const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

describe("CrossChainBridge", function () {
    // Chain IDs
    const ETHEREUM_CHAIN_ID = 1;
    const POLYGON_CHAIN_ID = 137;
    const ARBITRUM_CHAIN_ID = 42161;
    
    async function deployBridgeFixture() {
        const [owner, user, validator, operator, feeCollector, recipient] = await ethers.getSigners();
        
        // Deploy mock USDC
        const MockERC20 = await ethers.getContractFactory("MockERC20");
        const usdc = await MockERC20.deploy("USD Coin", "USDC", 6);
        await usdc.waitForDeployment();
        
        // Deploy YieldEscrow
        const YieldEscrow = await ethers.getContractFactory("YieldEscrow");
        const yieldEscrow = await YieldEscrow.deploy(
            owner.address,
            feeCollector.address
        );
        await yieldEscrow.waitForDeployment();
        
        // Deploy YieldVault
        const YieldVault = await ethers.getContractFactory("YieldVault");
        const yieldVault = await YieldVault.deploy(
            await usdc.getAddress(),
            owner.address,
            feeCollector.address
        );
        await yieldVault.waitForDeployment();
        
        // Deploy CrossChainBridge
        const CrossChainBridge = await ethers.getContractFactory("CrossChainBridge");
        const bridge = await CrossChainBridge.deploy(
            await yieldEscrow.getAddress(),
            await yieldVault.getAddress(),
            feeCollector.address
        );
        await bridge.waitForDeployment();
        
        // Get role constants from contract
        const BRIDGE_OPERATOR_ROLE = await bridge.BRIDGE_OPERATOR_ROLE();
        const VALIDATOR_ROLE = await bridge.VALIDATOR_ROLE();
        
        // Setup roles
        await bridge.grantRole(VALIDATOR_ROLE, validator.address);
        await bridge.grantRole(BRIDGE_OPERATOR_ROLE, operator.address);
        
        // Add supported token
        await bridge.addSupportedToken(await usdc.getAddress());
        
        // Mint tokens
        const amount = ethers.parseUnits("10000", 6);
        await usdc.mint(user.address, amount);
        await usdc.mint(await bridge.getAddress(), amount); // For yield payments
        
        return { bridge, usdc, yieldEscrow, yieldVault, owner, user, validator, operator, feeCollector, recipient };
    }

    describe("Deployment", function () {
        it("Should set correct initial parameters", async function () {
            const { bridge, yieldEscrow, yieldVault, feeCollector } = await loadFixture(deployBridgeFixture);
            
            expect(await bridge.yieldEscrow()).to.equal(await yieldEscrow.getAddress());
            expect(await bridge.yieldVault()).to.equal(await yieldVault.getAddress());
            expect(await bridge.feeCollector()).to.equal(feeCollector.address);
        });
        
        it("Should initialize supported chains", async function () {
            const { bridge } = await loadFixture(deployBridgeFixture);
            
            expect(await bridge.isChainSupported(ETHEREUM_CHAIN_ID)).to.be.true;
            expect(await bridge.isChainSupported(POLYGON_CHAIN_ID)).to.be.true;
            expect(await bridge.isChainSupported(ARBITRUM_CHAIN_ID)).to.be.true;
        });
    });

    describe("Bridge Initiation", function () {
        it("Should successfully initiate bridge transaction", async function () {
            const { bridge, usdc, user, recipient } = await loadFixture(deployBridgeFixture);
            
            const amount = ethers.parseUnits("1000", 6);
            await usdc.connect(user).approve(await bridge.getAddress(), amount);
            
            await expect(
                bridge.connect(user).initiateBridge(
                    recipient.address,
                    amount,
                    await usdc.getAddress(),
                    POLYGON_CHAIN_ID
                )
            ).to.emit(bridge, "BridgeInitiated");
        });
        
        it("Should deduct bridge fee correctly", async function () {
            const { bridge, usdc, user, feeCollector, recipient } = await loadFixture(deployBridgeFixture);
            
            const amount = ethers.parseUnits("1000", 6);
            await usdc.connect(user).approve(await bridge.getAddress(), amount);
            
            const feeCollectorBalanceBefore = await usdc.balanceOf(feeCollector.address);
            
            await bridge.connect(user).initiateBridge(
                recipient.address,
                amount,
                await usdc.getAddress(),
                POLYGON_CHAIN_ID
            );
            
            const feeCollectorBalanceAfter = await usdc.balanceOf(feeCollector.address);
            const bridgeFee = await bridge.bridgeFee();
            const expectedFee = (amount * bridgeFee) / 10000n;
            
            expect(feeCollectorBalanceAfter - feeCollectorBalanceBefore).to.equal(expectedFee);
        });
        
        it("Should revert with unsupported chain", async function () {
            const { bridge, usdc, user, recipient } = await loadFixture(deployBridgeFixture);
            
            const amount = ethers.parseUnits("1000", 6);
            await usdc.connect(user).approve(await bridge.getAddress(), amount);
            
            await expect(
                bridge.connect(user).initiateBridge(
                    recipient.address,
                    amount,
                    await usdc.getAddress(),
                    999 // Unsupported chain
                )
            ).to.be.revertedWithCustomError(bridge, "UnsupportedChain");
        });
        
        it("Should revert with unsupported token", async function () {
            const { bridge, user, recipient } = await loadFixture(deployBridgeFixture);
            
            const MockERC20 = await ethers.getContractFactory("MockERC20");
            const unsupportedToken = await MockERC20.deploy("Unsupported", "UNS", 18);
            await unsupportedToken.waitForDeployment();
            
            const amount = ethers.parseUnits("1000", 18);
            
            await expect(
                bridge.connect(user).initiateBridge(
                    recipient.address,
                    amount,
                    await unsupportedToken.getAddress(),
                    POLYGON_CHAIN_ID
                )
            ).to.be.revertedWithCustomError(bridge, "UnsupportedToken");
        });
        
        it("Should revert with zero amount", async function () {
            const { bridge, usdc, user, recipient } = await loadFixture(deployBridgeFixture);
            
            await expect(
                bridge.connect(user).initiateBridge(
                    recipient.address,
                    0,
                    await usdc.getAddress(),
                    POLYGON_CHAIN_ID
                )
            ).to.be.revertedWithCustomError(bridge, "InvalidAmount");
        });
        
        it("Should revert with zero recipient", async function () {
            const { bridge, usdc, user } = await loadFixture(deployBridgeFixture);
            
            const amount = ethers.parseUnits("1000", 6);
            
            await expect(
                bridge.connect(user).initiateBridge(
                    ethers.ZeroAddress,
                    amount,
                    await usdc.getAddress(),
                    POLYGON_CHAIN_ID
                )
            ).to.be.revertedWithCustomError(bridge, "InvalidRecipient");
        });
    });

    async function initiatedBridgeFixture() {
            const base = await deployBridgeFixture();
            const { bridge, usdc, user, recipient } = base;
            
            const amount = ethers.parseUnits("1000", 6);
            await usdc.connect(user).approve(await bridge.getAddress(), amount);
            
            const tx = await bridge.connect(user).initiateBridge(
                recipient.address,
                amount,
                await usdc.getAddress(),
                POLYGON_CHAIN_ID
            );
            
            // Get transaction ID from event
            const receipt = await tx.wait();
            const bridgeInterface = bridge.interface;
            const log = receipt.logs.find(
                log => log.address === bridge.target && 
                log.topics[0] === bridgeInterface.getEvent('BridgeInitiated').topicHash
            );
            const parsedLog = bridgeInterface.parseLog(log);
            const transactionId = parsedLog.args.transactionId;
            
            return { ...base, transactionId };
        }

    async function validatedBridgeFixture() {
        const base = await initiatedBridgeFixture();
        const { bridge, validator, transactionId } = base;
        
        await bridge.connect(validator).validateBridgeTransaction(transactionId);
        
        return base;
    }

    describe("Bridge Validation", function () {
        it("Should allow validator to validate transaction", async function () {
            const { bridge, validator, transactionId } = await loadFixture(initiatedBridgeFixture);
            
            await expect(
                bridge.connect(validator).validateBridgeTransaction(transactionId)
            ).to.emit(bridge, "BridgeValidated")
                .withArgs(transactionId, validator.address, await time.latest() + 1);
            
            const txn = await bridge.getBridgeTransaction(transactionId);
            expect(txn.status).to.equal(1); // Validated status
        });
        
        it("Should revert if non-validator tries to validate", async function () {
            const { bridge, user, transactionId } = await loadFixture(initiatedBridgeFixture);
            
            await expect(
                bridge.connect(user).validateBridgeTransaction(transactionId)
            ).to.be.revertedWith(/AccessControl/);
        });
        
        it("Should revert if transaction already validated", async function () {
            const { bridge, validator, transactionId } = await loadFixture(initiatedBridgeFixture);
            
            await bridge.connect(validator).validateBridgeTransaction(transactionId);
            
            await expect(
                bridge.connect(validator).validateBridgeTransaction(transactionId)
            ).to.be.revertedWithCustomError(bridge, "InvalidStatus");
        });
    });

    describe("Bridge Completion", function () {
        
        it("Should complete bridge with yield", async function () {
            const { bridge, usdc, operator, recipient, transactionId } = await loadFixture(validatedBridgeFixture);
            
            const recipientBalanceBefore = await usdc.balanceOf(recipient.address);
            
            // Simulate time passing for yield accrual
            await time.increase(86400); // 1 day
            
            const proof = ethers.randomBytes(32); // Simplified proof
            
            await expect(
                bridge.connect(operator).completeBridge(transactionId, proof)
            ).to.emit(bridge, "BridgeCompleted");
            
            const recipientBalanceAfter = await usdc.balanceOf(recipient.address);
            const received = recipientBalanceAfter - recipientBalanceBefore;
            
            // Should receive at least the net amount (after fee)
            const amount = ethers.parseUnits("1000", 6);
            const bridgeFee = await bridge.bridgeFee();
            const netAmount = amount - (amount * bridgeFee) / 10000n;
            expect(received).to.be.gte(netAmount);
        });
        
        it("Should revert if non-operator tries to complete", async function () {
            const { bridge, user, transactionId } = await loadFixture(validatedBridgeFixture);
            
            const proof = ethers.randomBytes(32);
            
            await expect(
                bridge.connect(user).completeBridge(transactionId, proof)
            ).to.be.revertedWith(/AccessControl/);
        });
        
        it("Should revert if transaction not validated", async function () {
            const { bridge, operator, transactionId } = await loadFixture(initiatedBridgeFixture);
            
            const proof = ethers.randomBytes(32);
            
            await expect(
                bridge.connect(operator).completeBridge(transactionId, proof)
            ).to.be.revertedWithCustomError(bridge, "InvalidStatus");
        });
        
        it("Should revert if transaction already processed", async function () {
            const { bridge, operator, transactionId } = await loadFixture(validatedBridgeFixture);
            
            const proof = ethers.randomBytes(32);
            
            await bridge.connect(operator).completeBridge(transactionId, proof);
            
            await expect(
                bridge.connect(operator).completeBridge(transactionId, proof)
            ).to.be.revertedWithCustomError(bridge, "TransactionAlreadyProcessed");
        });
    });

    describe("Refunds", function () {
        it("Should refund failed bridge transaction", async function () {
            const { bridge, usdc, user, operator, transactionId } = await loadFixture(initiatedBridgeFixture);
            
            const userBalanceBefore = await usdc.balanceOf(user.address);
            
            const reason = "Destination chain validation failed";
            
            await expect(
                bridge.connect(operator).refundBridge(transactionId, reason)
            ).to.emit(bridge, "BridgeFailed")
                .withArgs(transactionId, reason);
            
            const userBalanceAfter = await usdc.balanceOf(user.address);
            const amount = ethers.parseUnits("1000", 6);
            const bridgeFee = await bridge.bridgeFee();
            const netAmount = amount - (amount * bridgeFee) / 10000n;
            
            expect(userBalanceAfter - userBalanceBefore).to.equal(netAmount);
        });
        
        it("Should not refund completed transaction", async function () {
            const { bridge, operator, transactionId } = await loadFixture(validatedBridgeFixture);
            
            const proof = ethers.randomBytes(32);
            await bridge.connect(operator).completeBridge(transactionId, proof);
            
            await expect(
                bridge.connect(operator).refundBridge(transactionId, "Test")
            ).to.be.revertedWithCustomError(bridge, "InvalidStatus");
        });
    });

    describe("Admin Functions", function () {
        it("Should add and remove supported chains", async function () {
            const { bridge } = await loadFixture(deployBridgeFixture);
            
            const newChainId = 9999;
            
            await expect(bridge.addSupportedChain(newChainId))
                .to.emit(bridge, "ChainAdded")
                .withArgs(newChainId);
            
            expect(await bridge.isChainSupported(newChainId)).to.be.true;
            
            await expect(bridge.removeSupportedChain(newChainId))
                .to.emit(bridge, "ChainRemoved")
                .withArgs(newChainId);
            
            expect(await bridge.isChainSupported(newChainId)).to.be.false;
        });
        
        it("Should add and remove supported tokens", async function () {
            const { bridge } = await loadFixture(deployBridgeFixture);
            
            const MockERC20 = await ethers.getContractFactory("MockERC20");
            const newToken = await MockERC20.deploy("New Token", "NEW", 18);
            await newToken.waitForDeployment();
            
            await expect(bridge.addSupportedToken(await newToken.getAddress()))
                .to.emit(bridge, "TokenAdded")
                .withArgs(await newToken.getAddress());
            
            expect(await bridge.isTokenSupported(await newToken.getAddress())).to.be.true;
            
            await expect(bridge.removeSupportedToken(await newToken.getAddress()))
                .to.emit(bridge, "TokenRemoved")
                .withArgs(await newToken.getAddress());
            
            expect(await bridge.isTokenSupported(await newToken.getAddress())).to.be.false;
        });
        
        it("Should update bridge fee", async function () {
            const { bridge } = await loadFixture(deployBridgeFixture);
            
            const newFee = 50; // 0.5%
            
            await expect(bridge.updateBridgeFee(newFee))
                .to.emit(bridge, "FeeUpdated")
                .withArgs(newFee);
            
            expect(await bridge.bridgeFee()).to.equal(newFee);
        });
        
        it("Should revert on excessive fee", async function () {
            const { bridge } = await loadFixture(deployBridgeFixture);
            
            await expect(
                bridge.updateBridgeFee(1001) // >10%
            ).to.be.revertedWithCustomError(bridge, "InvalidFee");
        });
        
        it("Should update fee collector", async function () {
            const { bridge, user } = await loadFixture(deployBridgeFixture);
            
            await expect(bridge.updateFeeCollector(user.address))
                .to.emit(bridge, "FeeCollectorUpdated")
                .withArgs(user.address);
            
            expect(await bridge.feeCollector()).to.equal(user.address);
        });
        
        it("Should only allow admin to perform admin functions", async function () {
            const { bridge, user } = await loadFixture(deployBridgeFixture);
            
            await expect(
                bridge.connect(user).addSupportedChain(9999)
            ).to.be.revertedWith(/AccessControl/);
            
            await expect(
                bridge.connect(user).updateBridgeFee(50)
            ).to.be.revertedWith(/AccessControl/);
        });
    });

    describe("Pausable", function () {
        it("Should pause and unpause bridge", async function () {
            const { bridge, usdc, user, recipient } = await loadFixture(deployBridgeFixture);
            
            await bridge.pause();
            
            const amount = ethers.parseUnits("1000", 6);
            await usdc.connect(user).approve(await bridge.getAddress(), amount);
            
            await expect(
                bridge.connect(user).initiateBridge(
                    recipient.address,
                    amount,
                    await usdc.getAddress(),
                    POLYGON_CHAIN_ID
                )
            ).to.be.revertedWith("Pausable: paused");
            
            await bridge.unpause();
            
            await expect(
                bridge.connect(user).initiateBridge(
                    recipient.address,
                    amount,
                    await usdc.getAddress(),
                    POLYGON_CHAIN_ID
                )
            ).to.emit(bridge, "BridgeInitiated");
        });
    });

    describe("View Functions", function () {
        it("Should calculate bridge yield correctly", async function () {
            const { bridge, yieldVault, usdc, owner } = await loadFixture(deployBridgeFixture);
            
            const amount = ethers.parseUnits("1000", 6);
            const timeElapsed = 86400; // 1 day
            
            // Deploy mock strategy and add it to vault to set APY
            const MockYieldStrategy = await ethers.getContractFactory("MockYieldStrategy");
            const mockStrategy = await MockYieldStrategy.deploy(await usdc.getAddress());
            await mockStrategy.waitForDeployment();
            
            // Set APY on mock strategy (4% = 400 basis points)
            await mockStrategy.setCurrentAPY(400);
            
            // Add strategy to vault
            await yieldVault.connect(owner).addStrategy(
                await mockStrategy.getAddress(),
                "Mock Strategy",
                5000, // 50% allocation
                1     // Risk score of 1
            );
            
            const yieldAmount = await bridge.calculateBridgeYield(amount, timeElapsed);
            
            // Expected: 1000 * 0.04 / 365 = ~0.1096 USDC per day
            const expectedDaily = (amount * 400n) / 365n / 10000n;
            
            expect(yieldAmount).to.be.closeTo(expectedDaily, ethers.parseUnits("0.01", 6));
        });
        
        it("Should estimate bridge fee correctly", async function () {
            const { bridge } = await loadFixture(deployBridgeFixture);
            
            const amount = ethers.parseUnits("1000", 6);
            const bridgeFee = await bridge.bridgeFee(); // 10 basis points = 0.1%
            
            const estimatedFee = await bridge.estimateBridgeFee(amount);
            const expectedFee = (amount * bridgeFee) / 10000n;
            
            expect(estimatedFee).to.equal(expectedFee);
        });
    });

    describe("Gas Optimization", function () {
        it("Should use reasonable gas for bridge initiation", async function () {
            const { bridge, usdc, user, recipient } = await loadFixture(deployBridgeFixture);
            
            const amount = ethers.parseUnits("1000", 6);
            await usdc.connect(user).approve(await bridge.getAddress(), amount);
            
            const tx = await bridge.connect(user).initiateBridge(
                recipient.address,
                amount,
                await usdc.getAddress(),
                POLYGON_CHAIN_ID
            );
            
            const receipt = await tx.wait();
            expect(receipt.gasUsed).to.be.lt(200000); // Target: <200k gas
        });
    });

    describe("Edge Cases", function () {
        it("Should handle multiple bridges from same user", async function () {
            const { bridge, usdc, user, recipient } = await loadFixture(deployBridgeFixture);
            
            const amount = ethers.parseUnits("3000", 6);
            await usdc.connect(user).approve(await bridge.getAddress(), amount);
            
            const txIds = [];
            
            for (let i = 0; i < 3; i++) {
                const tx = await bridge.connect(user).initiateBridge(
                    recipient.address,
                    ethers.parseUnits("1000", 6),
                    await usdc.getAddress(),
                    POLYGON_CHAIN_ID
                );
                
                const receipt = await tx.wait();
                const bridgeInterface = bridge.interface;
                const log = receipt.logs.find(
                    log => log.address === bridge.target && 
                    log.topics[0] === bridgeInterface.getEvent('BridgeInitiated').topicHash
                );
                const parsedLog = bridgeInterface.parseLog(log);
                txIds.push(parsedLog.args.transactionId);
            }
            
            // Verify all transaction IDs are unique
            const uniqueTxIds = [...new Set(txIds)];
            expect(uniqueTxIds.length).to.equal(3);
        });
        
        it("Should handle concurrent bridges to different chains", async function () {
            const { bridge, usdc, user, recipient } = await loadFixture(deployBridgeFixture);
            
            const amount = ethers.parseUnits("2000", 6);
            await usdc.connect(user).approve(await bridge.getAddress(), amount);
            
            await expect(
                bridge.connect(user).initiateBridge(
                    recipient.address,
                    ethers.parseUnits("1000", 6),
                    await usdc.getAddress(),
                    POLYGON_CHAIN_ID
                )
            ).to.emit(bridge, "BridgeInitiated");
            
            await expect(
                bridge.connect(user).initiateBridge(
                    recipient.address,
                    ethers.parseUnits("1000", 6),
                    await usdc.getAddress(),
                    ARBITRUM_CHAIN_ID
                )
            ).to.emit(bridge, "BridgeInitiated");
        });
    });
});