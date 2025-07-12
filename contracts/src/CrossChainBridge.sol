// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./interfaces/IYieldStrategy.sol";
import "./YieldEscrow.sol";
import "./YieldVault.sol";

/**
 * @title CrossChainBridge
 * @dev Manages cross-chain payment transfers with yield preservation
 * @notice Supports Ethereum, XRPL, Solana, Polygon, Arbitrum, and Base
 */
contract CrossChainBridge is ReentrancyGuard, AccessControl, Pausable {
    using SafeERC20 for IERC20;

    bytes32 public constant BRIDGE_OPERATOR_ROLE = keccak256("BRIDGE_OPERATOR_ROLE");
    bytes32 public constant VALIDATOR_ROLE = keccak256("VALIDATOR_ROLE");

    YieldEscrow public immutable yieldEscrow;
    YieldVault public immutable yieldVault;

    // Chain identifiers
    uint256 public constant ETHEREUM_CHAIN_ID = 1;
    uint256 public constant XRPL_CHAIN_ID = 2;
    uint256 public constant SOLANA_CHAIN_ID = 3;
    uint256 public constant POLYGON_CHAIN_ID = 137;
    uint256 public constant ARBITRUM_CHAIN_ID = 42161;
    uint256 public constant BASE_CHAIN_ID = 8453;

    // Bridge transaction structure
    struct BridgeTransaction {
        address sender;
        address recipient;
        uint256 amount;
        address token;
        uint256 sourceChainId;
        uint256 destinationChainId;
        uint256 timestamp;
        uint256 accruedYield;
        bytes32 transactionHash;
        BridgeStatus status;
    }

    enum BridgeStatus {
        Initiated,
        Validated,
        Completed,
        Failed,
        Refunded
    }

    // Storage
    mapping(bytes32 => BridgeTransaction) public bridgeTransactions;
    mapping(uint256 => bool) public supportedChains;
    mapping(address => bool) public supportedTokens;
    mapping(bytes32 => bool) public processedTransactions;
    mapping(uint256 => address) public chainValidators;
    
    // Nonce for unique transaction IDs
    uint256 private transactionNonce;
    
    // Fee structure
    uint256 public bridgeFee = 10; // 0.1% fee in basis points
    uint256 public constant BASIS_POINTS = 10000;
    address public feeCollector;
    
    // Events
    event BridgeInitiated(
        bytes32 indexed transactionId,
        address indexed sender,
        uint256 amount,
        uint256 sourceChainId,
        uint256 destinationChainId
    );
    
    event BridgeValidated(
        bytes32 indexed transactionId,
        address indexed validator,
        uint256 timestamp
    );
    
    event BridgeCompleted(
        bytes32 indexed transactionId,
        address indexed recipient,
        uint256 amount,
        uint256 yield
    );
    
    event BridgeFailed(
        bytes32 indexed transactionId,
        string reason
    );
    
    event ChainAdded(uint256 indexed chainId);
    event ChainRemoved(uint256 indexed chainId);
    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);
    event FeeUpdated(uint256 newFee);
    event FeeCollectorUpdated(address newCollector);

    // Custom errors
    error UnsupportedChain(uint256 chainId);
    error UnsupportedToken(address token);
    error InvalidAmount();
    error InvalidRecipient();
    error TransactionAlreadyProcessed(bytes32 transactionId);
    error InvalidStatus(BridgeStatus current, BridgeStatus expected);
    error InsufficientValidations();
    error InvalidFee();
    error UnauthorizedValidator();

    constructor(
        address _yieldEscrow,
        address _yieldVault,
        address _feeCollector
    ) {
        require(_yieldEscrow != address(0), "Invalid escrow address");
        require(_yieldVault != address(0), "Invalid vault address");
        require(_feeCollector != address(0), "Invalid fee collector");

        yieldEscrow = YieldEscrow(_yieldEscrow);
        yieldVault = YieldVault(_yieldVault);
        feeCollector = _feeCollector;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(BRIDGE_OPERATOR_ROLE, msg.sender);

        // Initialize supported chains
        supportedChains[ETHEREUM_CHAIN_ID] = true;
        supportedChains[XRPL_CHAIN_ID] = true;
        supportedChains[SOLANA_CHAIN_ID] = true;
        supportedChains[POLYGON_CHAIN_ID] = true;
        supportedChains[ARBITRUM_CHAIN_ID] = true;
        supportedChains[BASE_CHAIN_ID] = true;
    }

    /**
     * @dev Initiates a cross-chain bridge transaction
     * @param recipient Address on destination chain
     * @param amount Amount to bridge
     * @param token Token address
     * @param destinationChainId Target chain ID
     * @return transactionId Unique bridge transaction identifier
     */
    function initiateBridge(
        address recipient,
        uint256 amount,
        address token,
        uint256 destinationChainId
    ) external nonReentrant whenNotPaused returns (bytes32 transactionId) {
        if (!supportedChains[destinationChainId]) revert UnsupportedChain(destinationChainId);
        if (!supportedTokens[token]) revert UnsupportedToken(token);
        if (amount == 0) revert InvalidAmount();
        if (recipient == address(0)) revert InvalidRecipient();

        // Calculate fee
        uint256 fee = (amount * bridgeFee) / BASIS_POINTS;
        uint256 netAmount = amount - fee;

        // Transfer tokens from sender
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        
        // Transfer fee to collector
        if (fee > 0) {
            IERC20(token).safeTransfer(feeCollector, fee);
        }

        // Generate unique transaction ID
        transactionId = keccak256(
            abi.encodePacked(
                msg.sender,
                recipient,
                amount,
                token,
                block.chainid,
                destinationChainId,
                transactionNonce++
            )
        );

        // Store transaction details
        bridgeTransactions[transactionId] = BridgeTransaction({
            sender: msg.sender,
            recipient: recipient,
            amount: netAmount,
            token: token,
            sourceChainId: block.chainid,
            destinationChainId: destinationChainId,
            timestamp: block.timestamp,
            accruedYield: 0,
            transactionHash: transactionId,
            status: BridgeStatus.Initiated
        });

        emit BridgeInitiated(
            transactionId,
            msg.sender,
            netAmount,
            block.chainid,
            destinationChainId
        );

        return transactionId;
    }

    /**
     * @dev Validates a bridge transaction (called by validators)
     * @param transactionId Transaction to validate
     */
    function validateBridgeTransaction(
        bytes32 transactionId
    ) external onlyRole(VALIDATOR_ROLE) {
        BridgeTransaction storage txn = bridgeTransactions[transactionId];
        
        if (txn.status != BridgeStatus.Initiated) {
            revert InvalidStatus(txn.status, BridgeStatus.Initiated);
        }

        txn.status = BridgeStatus.Validated;
        
        emit BridgeValidated(transactionId, msg.sender, block.timestamp);
    }

    /**
     * @dev Completes a bridge transaction on destination chain
     * @param transactionId Transaction to complete
     * @param sourceChainProof Proof from source chain (simplified for now)
     */
    function completeBridge(
        bytes32 transactionId,
        bytes calldata sourceChainProof
    ) external nonReentrant onlyRole(BRIDGE_OPERATOR_ROLE) {
        BridgeTransaction storage txn = bridgeTransactions[transactionId];
        
        if (processedTransactions[transactionId]) {
            revert TransactionAlreadyProcessed(transactionId);
        }
        
        if (txn.status != BridgeStatus.Validated) {
            revert InvalidStatus(txn.status, BridgeStatus.Validated);
        }

        // Calculate yield accrued during bridge time
        uint256 timeElapsed = block.timestamp - txn.timestamp;
        uint256 yield = calculateBridgeYield(txn.amount, timeElapsed);
        
        // Mark as processed
        processedTransactions[transactionId] = true;
        txn.status = BridgeStatus.Completed;
        txn.accruedYield = yield;

        // Transfer tokens to recipient with yield
        uint256 totalAmount = txn.amount + yield;
        IERC20(txn.token).safeTransfer(txn.recipient, totalAmount);

        emit BridgeCompleted(
            transactionId,
            txn.recipient,
            txn.amount,
            yield
        );
    }

    /**
     * @dev Refunds a failed bridge transaction
     * @param transactionId Transaction to refund
     * @param reason Failure reason
     */
    function refundBridge(
        bytes32 transactionId,
        string calldata reason
    ) external onlyRole(BRIDGE_OPERATOR_ROLE) {
        BridgeTransaction storage txn = bridgeTransactions[transactionId];
        
        if (txn.status == BridgeStatus.Completed || txn.status == BridgeStatus.Refunded) {
            revert InvalidStatus(txn.status, BridgeStatus.Initiated);
        }

        txn.status = BridgeStatus.Refunded;
        
        // Refund to original sender
        IERC20(txn.token).safeTransfer(txn.sender, txn.amount);

        emit BridgeFailed(transactionId, reason);
    }

    /**
     * @dev Calculates yield accrued during bridge transit
     * @param amount Principal amount
     * @param timeElapsed Time in seconds
     * @return yield Calculated yield amount
     */
    function calculateBridgeYield(
        uint256 amount,
        uint256 timeElapsed
    ) public view returns (uint256) {
        // Get current APY from yield vault
        uint256 currentAPY = yieldVault.getCurrentAPY();
        
        // Simple yield calculation (can be made more sophisticated)
        // yield = principal * APY * time / (365 days * BASIS_POINTS)
        uint256 yield = (amount * currentAPY * timeElapsed) / (365 days * BASIS_POINTS);
        
        return yield;
    }

    // Admin functions

    /**
     * @dev Adds support for a new chain
     * @param chainId Chain ID to add
     */
    function addSupportedChain(uint256 chainId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        supportedChains[chainId] = true;
        emit ChainAdded(chainId);
    }

    /**
     * @dev Removes support for a chain
     * @param chainId Chain ID to remove
     */
    function removeSupportedChain(uint256 chainId) external onlyRole(DEFAULT_ADMIN_ROLE) {
        supportedChains[chainId] = false;
        emit ChainRemoved(chainId);
    }

    /**
     * @dev Adds support for a new token
     * @param token Token address to add
     */
    function addSupportedToken(address token) external onlyRole(DEFAULT_ADMIN_ROLE) {
        supportedTokens[token] = true;
        emit TokenAdded(token);
    }

    /**
     * @dev Removes support for a token
     * @param token Token address to remove
     */
    function removeSupportedToken(address token) external onlyRole(DEFAULT_ADMIN_ROLE) {
        supportedTokens[token] = false;
        emit TokenRemoved(token);
    }

    /**
     * @dev Updates bridge fee
     * @param newFee New fee in basis points
     */
    function updateBridgeFee(uint256 newFee) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (newFee > 1000) revert InvalidFee(); // Max 10%
        bridgeFee = newFee;
        emit FeeUpdated(newFee);
    }

    /**
     * @dev Updates fee collector address
     * @param newCollector New fee collector address
     */
    function updateFeeCollector(address newCollector) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(newCollector != address(0), "Invalid collector address");
        feeCollector = newCollector;
        emit FeeCollectorUpdated(newCollector);
    }

    /**
     * @dev Emergency pause
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Resume from pause
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // View functions

    /**
     * @dev Gets bridge transaction details
     * @param transactionId Transaction ID
     * @return Transaction details
     */
    function getBridgeTransaction(
        bytes32 transactionId
    ) external view returns (BridgeTransaction memory) {
        return bridgeTransactions[transactionId];
    }

    /**
     * @dev Checks if a chain is supported
     * @param chainId Chain ID to check
     * @return supported Whether the chain is supported
     */
    function isChainSupported(uint256 chainId) external view returns (bool) {
        return supportedChains[chainId];
    }

    /**
     * @dev Checks if a token is supported
     * @param token Token address to check
     * @return supported Whether the token is supported
     */
    function isTokenSupported(address token) external view returns (bool) {
        return supportedTokens[token];
    }

    /**
     * @dev Estimates bridge fee for an amount
     * @param amount Amount to bridge
     * @return fee Estimated fee
     */
    function estimateBridgeFee(uint256 amount) external view returns (uint256) {
        return (amount * bridgeFee) / BASIS_POINTS;
    }
}