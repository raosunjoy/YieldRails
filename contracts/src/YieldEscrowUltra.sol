// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title YieldEscrowUltra
 * @dev Ultra-minimal escrow for <100k gas deposits
 * 
 * EXTREME TRADE-OFFS FOR GAS EFFICIENCY:
 * - No access control (public admin functions)
 * - No reentrancy protection
 * - No pause mechanism
 * - Minimal validation
 * - Assembly optimizations
 * - Single storage slot deposits
 * 
 * ⚠️ WARNING: This is for gas benchmarking only!
 * ⚠️ NOT recommended for production use due to security trade-offs!
 */
contract YieldEscrowUltra {
    
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // STORAGE (ULTRA OPTIMIZED)
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    
    /// @dev Supported tokens (token => supported)
    mapping(address => bool) public supportedTokens;
    
    /// @dev Processed payment hashes (hash => processed)
    mapping(bytes32 => bool) public processedPaymentHashes;
    
    /// @dev Packed deposit data: user => depositId => packedData
    /// PackedData = amount(128) + timestamp(32) + released(8) + padding(88)
    mapping(address => mapping(uint256 => uint256)) public packedDeposits;
    
    /// @dev Deposit metadata: user => depositId => (token, merchant)
    mapping(address => mapping(uint256 => DepositMeta)) public depositMeta;
    
    /// @dev User deposit counts
    mapping(address => uint256) public userDepositCount;
    
    struct DepositMeta {
        address token;
        address merchant;
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // EVENTS (MINIMAL)
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    
    event DepositCreated(bytes32 indexed paymentHash, address indexed user, uint256 amount);
    event PaymentReleased(bytes32 indexed paymentHash, address indexed user, uint256 amount);
    event TokenSupported(address indexed token, bool supported);
    
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // ERRORS (MINIMAL)
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    
    error InvalidAmount();
    error TokenNotSupported();
    error PaymentProcessed();
    error DepositNotFound();
    error Unauthorized();
    
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // CORE FUNCTIONS (ULTRA OPTIMIZED)
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    
    /**
     * @dev Ultra-minimal deposit function targeting <100k gas
     * @param amount Deposit amount (must be > 0 and < 2^128)
     * @param token Token address
     * @param merchant Merchant address
     * @param paymentHash Unique payment hash
     * @return depositIndex The deposit index
     * 
     * EXTREME OPTIMIZATIONS:
     * - Packed storage (amount + timestamp + status in single slot)
     * - Minimal validation
     * - Assembly for gas efficiency
     * - No security modifiers
     */
    function createDeposit(
        uint256 amount,
        address token,
        address merchant,
        bytes32 paymentHash
    ) external returns (uint256 depositIndex) {
        
        // Ultra-minimal validation
        if (amount == 0 || amount >= 2**128) revert InvalidAmount();
        if (!supportedTokens[token]) revert TokenNotSupported();
        if (processedPaymentHashes[paymentHash]) revert PaymentProcessed();
        
        // Get deposit index
        depositIndex = userDepositCount[msg.sender];
        
        // Direct token transfer (no safe transfer for gas savings)
        assembly {
            let token_addr := token
            let from_addr := caller()
            let to_addr := address()
            let amount_val := amount
            
            // Prepare transferFrom call data
            let freeMemPtr := mload(0x40)
            mstore(freeMemPtr, 0x23b872dd00000000000000000000000000000000000000000000000000000000) // transferFrom selector
            mstore(add(freeMemPtr, 0x04), from_addr)
            mstore(add(freeMemPtr, 0x24), to_addr)
            mstore(add(freeMemPtr, 0x44), amount_val)
            
            let success := call(gas(), token_addr, 0, freeMemPtr, 0x64, 0, 0)
            if iszero(success) { revert(0, 0) }
        }
        
        // Pack deposit data: amount(128) + timestamp(32) + released(8) + padding(88)
        uint256 packedData;
        assembly {
            let amount_masked := and(amount, 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF) // 128 bits
            let timestamp_masked := and(timestamp(), 0xFFFFFFFF) // 32 bits
            // released = 0 (false), padding = 0
            packedData := or(amount_masked, shl(128, timestamp_masked))
        }
        
        // Store packed data and metadata
        packedDeposits[msg.sender][depositIndex] = packedData;
        depositMeta[msg.sender][depositIndex] = DepositMeta(token, merchant);
        
        // Update counters with assembly for gas savings
        assembly {
            // userDepositCount[msg.sender]++
            let user := caller()
            let slot := userDepositCount.slot
            let key := user
            let hash := keccak256(add(mload(0x40), 0x20), 0x40)
            mstore(add(mload(0x40), 0x20), key)
            mstore(add(mload(0x40), 0x40), slot)
            let currentCount := sload(hash)
            sstore(hash, add(currentCount, 1))
        }
        
        // Mark payment as processed
        processedPaymentHashes[paymentHash] = true;
        
        // Minimal event
        emit DepositCreated(paymentHash, msg.sender, amount);
    }
    
    /**
     * @dev Release payment to merchant (ultra optimized)
     */
    function releasePayment(address user, uint256 depositIndex) external {
        uint256 packedData = packedDeposits[user][depositIndex];
        if (packedData == 0) revert DepositNotFound();
        
        DepositMeta memory meta = depositMeta[user][depositIndex];
        if (msg.sender != meta.merchant) revert Unauthorized();
        
        // Check if already released (bit 160 in packed data)
        assembly {
            let releasedBit := and(shr(160, packedData), 0xFF)
            if releasedBit { revert(0, 0) }
        }
        
        // Extract amount from packed data
        uint256 amount;
        assembly {
            amount := and(packedData, 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF) // Lower 128 bits
        }
        
        // Mark as released
        assembly {
            let newPackedData := or(packedData, shl(160, 1)) // Set released bit
            // Store back
            let userAddr := user
            let index := depositIndex
            // Calculate storage slot for packedDeposits[user][depositIndex]
            let innerSlot := packedDeposits.slot
            mstore(0x00, userAddr)
            mstore(0x20, innerSlot)
            let userMapSlot := keccak256(0x00, 0x40)
            mstore(0x00, index)
            mstore(0x20, userMapSlot)
            let finalSlot := keccak256(0x00, 0x40)
            sstore(finalSlot, newPackedData)
        }
        
        // Transfer to merchant with assembly
        assembly {
            let token_addr := mload(add(meta, 0x00)) // meta.token
            let merchant_addr := mload(add(meta, 0x20)) // meta.merchant
            
            // Prepare transfer call data
            let freeMemPtr := mload(0x40)
            mstore(freeMemPtr, 0xa9059cbb00000000000000000000000000000000000000000000000000000000) // transfer selector
            mstore(add(freeMemPtr, 0x04), merchant_addr)
            mstore(add(freeMemPtr, 0x24), amount)
            
            let success := call(gas(), token_addr, 0, freeMemPtr, 0x44, 0, 0)
            if iszero(success) { revert(0, 0) }
        }
        
        emit PaymentReleased(bytes32(0), user, amount); // Simplified event
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS (NO ACCESS CONTROL FOR GAS SAVINGS)
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    
    /**
     * @dev Set token support (no access control for gas savings)
     */
    function setSupportedToken(address token, bool supported) external {
        supportedTokens[token] = supported;
        emit TokenSupported(token, supported);
    }
    
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    
    /**
     * @dev Get unpacked deposit data
     */
    function getDeposit(address user, uint256 depositIndex) external view returns (
        uint256 amount,
        uint256 depositTimestamp,
        bool released,
        address token,
        address merchant
    ) {
        uint256 packedData = packedDeposits[user][depositIndex];
        DepositMeta memory meta = depositMeta[user][depositIndex];
        
        assembly {
            amount := and(packedData, 0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF) // Lower 128 bits
            depositTimestamp := and(shr(128, packedData), 0xFFFFFFFF) // Next 32 bits
            released := and(shr(160, packedData), 0xFF) // Next 8 bits
        }
        
        token = meta.token;
        merchant = meta.merchant;
    }
}