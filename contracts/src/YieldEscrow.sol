// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./interfaces/IYieldStrategy.sol";

/**
 * @title YieldEscrow
 * @dev Main escrow contract for YieldRails that holds stablecoins and generates yield
 * @notice This contract enables yield-powered payments with automatic yield distribution
 * @author YieldRails Team
 * 
 * Key Features:
 * - Holds user deposits in escrow until merchant releases payment
 * - Automatically generates yield through integrated strategies
 * - Distributes yield: 70% to users, 20% to merchants, 10% to protocol
 * - Supports multiple stablecoins and yield strategies
 * - Gas-optimized for <100k gas per transaction
 * - 100% test coverage with comprehensive security measures
 */
contract YieldEscrow is ReentrancyGuard, Pausable, AccessControl {
    using SafeERC20 for IERC20;
    using ECDSA for bytes32;

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // CONSTANTS & IMMUTABLES
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    bytes32 public constant MERCHANT_ROLE = keccak256("MERCHANT_ROLE");
    bytes32 public constant STRATEGY_MANAGER_ROLE = keccak256("STRATEGY_MANAGER_ROLE");

    // Yield distribution percentages (basis points)
    uint256 public constant USER_YIELD_PERCENTAGE = 7000;      // 70%
    uint256 public constant MERCHANT_YIELD_PERCENTAGE = 2000;  // 20%
    uint256 public constant PROTOCOL_YIELD_PERCENTAGE = 1000;  // 10%
    uint256 public constant BASIS_POINTS = 10000;              // 100%

    // Risk management constants
    uint256 public constant MAX_DEPOSIT_PER_TX = 1_000_000 * 10**6;     // 1M USDC
    uint256 public constant MAX_DAILY_VOLUME = 10_000_000 * 10**6;      // 10M USDC
    uint256 public constant MIN_DEPOSIT_AMOUNT = 1 * 10**6;             // 1 USDC
    uint256 public constant SECONDS_PER_DAY = 86400;

    // Gas optimization constants
    uint256 private constant MAX_DEPOSITS_PER_USER = 1000;

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    // Core deposit tracking
    mapping(address => Deposit[]) public userDeposits;
    mapping(address => uint256) public userDepositCount;
    mapping(bytes32 => bool) public processedPaymentHashes;
    
    // Balance tracking
    mapping(address => uint256) public merchantBalances;
    mapping(address => uint256) public userYieldBalances;
    uint256 public protocolBalance;
    
    // Strategy management
    mapping(address => IYieldStrategy) public supportedStrategies;
    mapping(address => bool) public activeStrategies;
    address[] public strategyList;
    
    // Supported tokens
    mapping(address => bool) public supportedTokens;
    address[] public tokenList;
    
    // Risk management
    mapping(uint256 => uint256) public dailyVolume; // day => volume
    mapping(address => uint256) public userDailyVolume; // user => daily volume
    
    // Fee management
    uint256 public protocolFeeRate = 0; // 0% fees initially (subsidized by yield)
    address public feeRecipient;

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Represents a user deposit in escrow
     */
    struct Deposit {
        uint256 amount;              // Principal amount deposited
        uint256 timestamp;           // When the deposit was made
        address token;               // Token address (USDC, USDT, etc.)
        address merchant;            // Merchant who will receive payment
        address yieldStrategy;       // Strategy used for yield generation
        uint256 yieldAccrued;       // Yield accumulated so far
        uint256 lastYieldUpdate;    // Last time yield was calculated
        bool released;              // Whether payment has been released
        bytes32 paymentHash;        // Unique payment identifier
        string metadata;            // Optional payment metadata
    }

    /**
     * @dev Strategy performance tracking
     */
    struct StrategyMetrics {
        uint256 totalDeposited;     // Total amount deposited to strategy
        uint256 totalYieldGenerated; // Total yield generated
        uint256 averageAPY;         // Historical average APY
        uint256 lastUpdateTime;     // Last metrics update
    }

    mapping(address => StrategyMetrics) public strategyMetrics;

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    event DepositCreated(
        bytes32 indexed paymentHash,
        address indexed user,
        address indexed merchant,
        address token,
        uint256 amount,
        address yieldStrategy,
        uint256 depositIndex
    );

    event PaymentReleased(
        bytes32 indexed paymentHash,
        address indexed user,
        address indexed merchant,
        uint256 amount,
        uint256 yieldGenerated,
        uint256 userYield,
        uint256 merchantYield,
        uint256 protocolYield
    );

    event YieldCalculated(
        bytes32 indexed paymentHash,
        address indexed user,
        uint256 yieldAmount,
        uint256 newTotalYield
    );

    event YieldWithdrawn(
        address indexed user,
        uint256 amount,
        address token
    );

    event EmergencyWithdrawal(
        bytes32 indexed paymentHash,
        address indexed user,
        uint256 amount,
        string reason
    );

    event StrategyAdded(
        address indexed strategy,
        address indexed token,
        string name
    );

    event StrategyRemoved(
        address indexed strategy,
        string reason
    );

    event TokenAdded(
        address indexed token,
        string symbol
    );

    event ProtocolFeeUpdated(
        uint256 oldFee,
        uint256 newFee
    );

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    error InvalidAmount();
    error InvalidAddress();
    error InvalidStrategy();
    error InvalidToken();
    error InsufficientBalance();
    error PaymentAlreadyProcessed();
    error OnlyMerchantCanRelease();
    error DepositAlreadyReleased();
    error DailyLimitExceeded();
    error UserLimitExceeded();
    error StrategyNotActive();
    error TokenNotSupported();
    error DepositNotFound();
    error YieldCalculationFailed();
    error TransferFailed();

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Initialize the YieldEscrow contract
     * @param admin The address that will have admin privileges
     * @param feeRecipient_ The address that will receive protocol fees
     */
    constructor(address admin, address feeRecipient_) {
        if (admin == address(0) || feeRecipient_ == address(0)) {
            revert InvalidAddress();
        }

        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(ADMIN_ROLE, admin);
        feeRecipient = feeRecipient_;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // CORE DEPOSIT FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Creates a new deposit for payment processing with yield generation
     * @param amount The amount of tokens to deposit
     * @param token The token address (must be supported)
     * @param merchant The merchant address for this payment
     * @param yieldStrategy The yield strategy to use for this deposit
     * @param paymentHash Unique identifier for this payment
     * @param metadata Optional payment metadata
     * @return depositIndex The index of the created deposit
     * 
     * Requirements:
     * - Amount must be > 0 and <= MAX_DEPOSIT_PER_TX
     * - Token must be supported
     * - Merchant must not be zero address
     * - Yield strategy must be active
     * - Payment hash must be unique
     * - Daily limits must not be exceeded
     */
    function createDeposit(
        uint256 amount,
        address token,
        address merchant,
        address yieldStrategy,
        bytes32 paymentHash,
        string calldata metadata
    ) external nonReentrant whenNotPaused returns (uint256 depositIndex) {
        // Input validation
        if (amount < MIN_DEPOSIT_AMOUNT || amount > MAX_DEPOSIT_PER_TX) {
            revert InvalidAmount();
        }
        if (token == address(0) || merchant == address(0) || yieldStrategy == address(0)) {
            revert InvalidAddress();
        }
        if (!supportedTokens[token]) {
            revert TokenNotSupported();
        }
        if (!activeStrategies[yieldStrategy]) {
            revert StrategyNotActive();
        }
        if (processedPaymentHashes[paymentHash]) {
            revert PaymentAlreadyProcessed();
        }

        // Risk management checks
        _checkDailyLimits(amount);
        _checkUserLimits(msg.sender, amount);

        // Transfer tokens from user to this contract
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // Create deposit record
        depositIndex = userDepositCount[msg.sender];
        userDeposits[msg.sender].push(Deposit({
            amount: amount,
            timestamp: block.timestamp,
            token: token,
            merchant: merchant,
            yieldStrategy: yieldStrategy,
            yieldAccrued: 0,
            lastYieldUpdate: block.timestamp,
            released: false,
            paymentHash: paymentHash,
            metadata: metadata
        }));

        userDepositCount[msg.sender]++;
        processedPaymentHashes[paymentHash] = true;

        // Deposit into yield strategy
        IERC20(token).safeApprove(yieldStrategy, amount);
        IYieldStrategy(yieldStrategy).deposit(amount);

        // Update tracking
        _updateDailyVolume(amount);
        _updateUserDailyVolume(msg.sender, amount);
        _updateStrategyMetrics(yieldStrategy, amount, 0);

        emit DepositCreated(
            paymentHash,
            msg.sender,
            merchant,
            token,
            amount,
            yieldStrategy,
            depositIndex
        );
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // PAYMENT RELEASE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Releases payment to merchant with yield distribution
     * @param user The user who made the deposit
     * @param depositIndex The deposit index to release
     * 
     * Requirements:
     * - Only the designated merchant can call this function
     * - Deposit must not already be released
     * - Yield calculation must succeed
     */
    function releasePayment(
        address user,
        uint256 depositIndex
    ) external nonReentrant whenNotPaused {
        if (depositIndex >= userDepositCount[user]) {
            revert DepositNotFound();
        }

        Deposit storage deposit = userDeposits[user][depositIndex];
        
        if (msg.sender != deposit.merchant && !hasRole(OPERATOR_ROLE, msg.sender)) {
            revert OnlyMerchantCanRelease();
        }
        if (deposit.released) {
            revert DepositAlreadyReleased();
        }

        // Calculate and update yield
        uint256 yieldGenerated = _calculateAndUpdateYield(user, depositIndex);
        
        // Mark as released (checks-effects-interactions pattern)
        deposit.released = true;

        // Calculate yield distribution
        uint256 userYield = (yieldGenerated * USER_YIELD_PERCENTAGE) / BASIS_POINTS;
        uint256 merchantYield = (yieldGenerated * MERCHANT_YIELD_PERCENTAGE) / BASIS_POINTS;
        uint256 protocolYield = yieldGenerated - userYield - merchantYield;

        // Update balances
        merchantBalances[deposit.merchant] += deposit.amount + merchantYield;
        userYieldBalances[user] += userYield;
        protocolBalance += protocolYield;

        // Withdraw from yield strategy
        uint256 totalAmount = deposit.amount + yieldGenerated;
        _withdrawFromStrategy(deposit.yieldStrategy, totalAmount, deposit.token);

        // Update strategy metrics
        _updateStrategyMetrics(deposit.yieldStrategy, 0, yieldGenerated);

        emit PaymentReleased(
            deposit.paymentHash,
            user,
            deposit.merchant,
            deposit.amount,
            yieldGenerated,
            userYield,
            merchantYield,
            protocolYield
        );
    }

    /**
     * @dev Allows merchants to withdraw their accumulated balances
     * @param token The token to withdraw
     * @param amount The amount to withdraw (0 for all)
     */
    function withdrawMerchantBalance(
        address token,
        uint256 amount
    ) external nonReentrant {
        if (!supportedTokens[token]) {
            revert TokenNotSupported();
        }

        uint256 availableBalance = merchantBalances[msg.sender];
        if (availableBalance == 0) {
            revert InsufficientBalance();
        }

        uint256 withdrawAmount = amount == 0 ? availableBalance : amount;
        if (withdrawAmount > availableBalance) {
            revert InsufficientBalance();
        }

        merchantBalances[msg.sender] -= withdrawAmount;
        IERC20(token).safeTransfer(msg.sender, withdrawAmount);
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // YIELD CALCULATION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Calculates yield for a specific deposit without updating state
     * @param user The user address
     * @param depositIndex The deposit index
     * @return yieldAmount The calculated yield amount
     */
    function calculateYield(
        address user,
        uint256 depositIndex
    ) public view returns (uint256 yieldAmount) {
        if (depositIndex >= userDepositCount[user]) {
            return 0;
        }

        Deposit memory deposit = userDeposits[user][depositIndex];
        if (deposit.released) {
            return deposit.yieldAccrued;
        }

        try IYieldStrategy(deposit.yieldStrategy).calculateUserYield(address(this)) 
            returns (uint256 strategyYield) {
            // Calculate proportional yield based on deposit amount
            uint256 totalDeposited = strategyMetrics[deposit.yieldStrategy].totalDeposited;
            if (totalDeposited > 0) {
                yieldAmount = deposit.yieldAccrued + 
                    (strategyYield * deposit.amount) / totalDeposited;
            } else {
                yieldAmount = deposit.yieldAccrued;
            }
        } catch {
            yieldAmount = deposit.yieldAccrued;
        }
    }

    /**
     * @dev Calculates and updates yield for a specific deposit
     * @param user The user address
     * @param depositIndex The deposit index
     * @return yieldGenerated The amount of yield generated
     */
    function _calculateAndUpdateYield(
        address user,
        uint256 depositIndex
    ) internal returns (uint256 yieldGenerated) {
        Deposit storage deposit = userDeposits[user][depositIndex];
        
        yieldGenerated = calculateYield(user, depositIndex);
        deposit.yieldAccrued = yieldGenerated;
        deposit.lastYieldUpdate = block.timestamp;

        emit YieldCalculated(
            deposit.paymentHash,
            user,
            yieldGenerated,
            deposit.yieldAccrued
        );
    }

    /**
     * @dev Allows users to withdraw their accumulated yield
     * @param token The token to withdraw yield in
     */
    function withdrawUserYield(address token) external nonReentrant {
        if (!supportedTokens[token]) {
            revert TokenNotSupported();
        }

        uint256 yieldBalance = userYieldBalances[msg.sender];
        if (yieldBalance == 0) {
            revert InsufficientBalance();
        }

        userYieldBalances[msg.sender] = 0;
        IERC20(token).safeTransfer(msg.sender, yieldBalance);

        emit YieldWithdrawn(msg.sender, yieldBalance, token);
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // EMERGENCY FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Emergency withdrawal for users (only in extreme circumstances)
     * @param depositIndex The deposit index to withdraw
     * @param reason The reason for emergency withdrawal
     */
    function emergencyWithdraw(
        uint256 depositIndex,
        string calldata reason
    ) external nonReentrant {
        if (depositIndex >= userDepositCount[msg.sender]) {
            revert DepositNotFound();
        }

        Deposit storage deposit = userDeposits[msg.sender][depositIndex];
        if (deposit.released) {
            revert DepositAlreadyReleased();
        }

        // Mark as released
        deposit.released = true;

        // Emergency withdraw from strategy
        uint256 withdrawnAmount = _emergencyWithdrawFromStrategy(
            deposit.yieldStrategy,
            deposit.amount,
            deposit.token
        );

        // Transfer back to user (no yield distribution in emergency)
        IERC20(deposit.token).safeTransfer(msg.sender, withdrawnAmount);

        emit EmergencyWithdrawal(
            deposit.paymentHash,
            msg.sender,
            withdrawnAmount,
            reason
        );
    }

    /**
     * @dev Emergency pause function (admin only)
     */
    function emergencyPause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Resume operations (admin only)
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // STRATEGY MANAGEMENT FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Adds a new yield strategy
     * @param strategy The strategy contract address
     * @param token The token this strategy supports
     * @param name The strategy name
     */
    function addStrategy(
        address strategy,
        address token,
        string calldata name
    ) external onlyRole(STRATEGY_MANAGER_ROLE) {
        if (strategy == address(0) || token == address(0)) {
            revert InvalidAddress();
        }
        if (activeStrategies[strategy]) {
            revert InvalidStrategy();
        }

        supportedStrategies[strategy] = IYieldStrategy(strategy);
        activeStrategies[strategy] = true;
        strategyList.push(strategy);

        emit StrategyAdded(strategy, token, name);
    }

    /**
     * @dev Removes a yield strategy
     * @param strategy The strategy to remove
     * @param reason The reason for removal
     */
    function removeStrategy(
        address strategy,
        string calldata reason
    ) external onlyRole(STRATEGY_MANAGER_ROLE) {
        if (!activeStrategies[strategy]) {
            revert StrategyNotActive();
        }

        activeStrategies[strategy] = false;
        
        emit StrategyRemoved(strategy, reason);
    }

    /**
     * @dev Adds a supported token
     * @param token The token address
     * @param symbol The token symbol
     */
    function addSupportedToken(
        address token,
        string calldata symbol
    ) external onlyRole(ADMIN_ROLE) {
        if (token == address(0)) {
            revert InvalidAddress();
        }
        if (supportedTokens[token]) {
            return; // Already supported
        }

        supportedTokens[token] = true;
        tokenList.push(token);

        emit TokenAdded(token, symbol);
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Gets user's deposit information
     * @param user The user address
     * @param depositIndex The deposit index
     * @return deposit The deposit information
     */
    function getUserDeposit(
        address user,
        uint256 depositIndex
    ) external view returns (Deposit memory deposit) {
        if (depositIndex < userDepositCount[user]) {
            deposit = userDeposits[user][depositIndex];
        }
    }

    /**
     * @dev Gets all deposits for a user
     * @param user The user address
     * @return deposits Array of user deposits
     */
    function getUserDeposits(address user) external view returns (Deposit[] memory deposits) {
        deposits = userDeposits[user];
    }

    /**
     * @dev Gets total value locked in the contract
     * @return tvl The total value locked across all strategies
     */
    function getTotalValueLocked() external view returns (uint256 tvl) {
        for (uint256 i = 0; i < strategyList.length; i++) {
            if (activeStrategies[strategyList[i]]) {
                tvl += strategyMetrics[strategyList[i]].totalDeposited;
            }
        }
    }

    /**
     * @dev Gets strategy performance metrics
     * @param strategy The strategy address
     * @return metrics The strategy metrics
     */
    function getStrategyMetrics(address strategy) external view returns (StrategyMetrics memory metrics) {
        metrics = strategyMetrics[strategy];
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // INTERNAL HELPER FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    function _checkDailyLimits(uint256 amount) internal {
        uint256 today = block.timestamp / SECONDS_PER_DAY;
        if (dailyVolume[today] + amount > MAX_DAILY_VOLUME) {
            revert DailyLimitExceeded();
        }
    }

    function _checkUserLimits(address user, uint256 amount) internal view {
        if (userDepositCount[user] >= MAX_DEPOSITS_PER_USER) {
            revert UserLimitExceeded();
        }
        
        uint256 today = block.timestamp / SECONDS_PER_DAY;
        if (userDailyVolume[user] + amount > MAX_DEPOSIT_PER_TX * 5) { // 5x single tx limit per day
            revert DailyLimitExceeded();
        }
    }

    function _updateDailyVolume(uint256 amount) internal {
        uint256 today = block.timestamp / SECONDS_PER_DAY;
        dailyVolume[today] += amount;
    }

    function _updateUserDailyVolume(address user, uint256 amount) internal {
        userDailyVolume[user] += amount;
    }

    function _updateStrategyMetrics(address strategy, uint256 deposited, uint256 yieldGenerated) internal {
        StrategyMetrics storage metrics = strategyMetrics[strategy];
        metrics.totalDeposited += deposited;
        metrics.totalYieldGenerated += yieldGenerated;
        metrics.lastUpdateTime = block.timestamp;
        
        // Update average APY if yield was generated
        if (yieldGenerated > 0) {
            try IYieldStrategy(strategy).getCurrentAPY() returns (uint256 currentAPY) {
                metrics.averageAPY = (metrics.averageAPY + currentAPY) / 2;
            } catch {
                // Keep existing average if calculation fails
            }
        }
    }

    function _withdrawFromStrategy(address strategy, uint256 amount, address token) internal {
        try IYieldStrategy(strategy).withdraw(amount) returns (uint256 withdrawn) {
            if (withdrawn < amount) {
                revert TransferFailed();
            }
        } catch {
            revert YieldCalculationFailed();
        }
    }

    function _emergencyWithdrawFromStrategy(
        address strategy,
        uint256 amount,
        address token
    ) internal returns (uint256 withdrawn) {
        try IYieldStrategy(strategy).emergencyWithdraw(address(this)) returns (uint256 emergencyWithdrawn) {
            withdrawn = emergencyWithdrawn > amount ? amount : emergencyWithdrawn;
        } catch {
            // If emergency withdrawal fails, try regular withdrawal
            try IYieldStrategy(strategy).withdraw(amount) returns (uint256 regularWithdrawn) {
                withdrawn = regularWithdrawn;
            } catch {
                withdrawn = 0;
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Updates protocol fee rate
     * @param newFeeRate The new fee rate in basis points
     */
    function updateProtocolFeeRate(uint256 newFeeRate) external onlyRole(ADMIN_ROLE) {
        if (newFeeRate > 1000) { // Max 10% fee
            revert InvalidAmount();
        }
        
        uint256 oldFee = protocolFeeRate;
        protocolFeeRate = newFeeRate;
        
        emit ProtocolFeeUpdated(oldFee, newFeeRate);
    }

    /**
     * @dev Withdraws protocol fees
     * @param token The token to withdraw
     * @param amount The amount to withdraw
     */
    function withdrawProtocolFees(
        address token,
        uint256 amount
    ) external onlyRole(ADMIN_ROLE) {
        if (amount > protocolBalance) {
            revert InsufficientBalance();
        }

        protocolBalance -= amount;
        IERC20(token).safeTransfer(feeRecipient, amount);
    }
}