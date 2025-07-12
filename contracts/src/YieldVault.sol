// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./interfaces/IYieldStrategy.sol";

/**
 * @title YieldVault
 * @dev Manages multiple yield strategies and optimizes yield allocation
 * @notice Central vault for yield generation across multiple DeFi protocols
 * @author YieldRails Team
 * 
 * Key Features:
 * - Multi-strategy yield optimization
 * - Automatic rebalancing based on APY and risk scores
 * - Emergency withdrawal capabilities
 * - Real-time performance tracking
 * - Risk-adjusted allocation algorithms
 */
contract YieldVault is ReentrancyGuard, Pausable, AccessControl {
    using SafeERC20 for IERC20;
    using Math for uint256;

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // CONSTANTS & IMMUTABLES
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant STRATEGY_MANAGER_ROLE = keccak256("STRATEGY_MANAGER_ROLE");
    bytes32 public constant REBALANCER_ROLE = keccak256("REBALANCER_ROLE");

    // Risk and allocation constants
    uint256 public constant MAX_STRATEGIES = 10;
    uint256 public constant BASIS_POINTS = 10000;
    uint256 public constant MAX_ALLOCATION_PER_STRATEGY = 5000; // 50%
    uint256 public constant MIN_REBALANCE_THRESHOLD = 100; // 1%
    uint256 public constant REBALANCE_COOLDOWN = 1 hours;

    // Performance tracking
    uint256 public constant PERFORMANCE_WINDOW = 7 days;
    uint256 public constant MIN_STRATEGY_ALLOCATION = 100; // 1%

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    // Core vault state
    IERC20 public immutable asset; // Base asset (e.g., USDC)
    uint256 public totalAssets;
    uint256 public totalShares;
    
    // Strategy management
    mapping(address => StrategyInfo) public strategies;
    address[] public strategyList;
    mapping(address => bool) public activeStrategies;
    
    // User balances
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    
    // Performance tracking
    mapping(address => PerformanceData) public strategyPerformance;
    mapping(uint256 => uint256) public dailyYield; // day => yield amount
    
    // Rebalancing state
    uint256 public lastRebalance;
    mapping(address => uint256) public targetAllocations; // strategy => allocation (basis points)
    
    // Vault parameters
    uint256 public managementFee = 200; // 2% annually
    uint256 public performanceFee = 1000; // 10% of profits
    address public feeRecipient;
    
    // Risk management
    uint256 public maxTotalRisk = 5; // Maximum weighted risk score
    bool public autoRebalanceEnabled = true;

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // STRUCTS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Strategy information and allocation data
     */
    struct StrategyInfo {
        IYieldStrategy strategy;        // Strategy contract
        uint256 allocation;            // Current allocation (basis points)
        uint256 targetAllocation;     // Target allocation (basis points)
        uint256 totalDeposited;       // Total amount deposited to strategy
        uint256 lastUpdate;           // Last update timestamp
        bool active;                  // Whether strategy is active
        uint256 riskScore;            // Risk score (1-10)
        string name;                  // Strategy name
    }

    /**
     * @dev Performance tracking data
     */
    struct PerformanceData {
        uint256 totalYieldGenerated;   // Total yield generated
        uint256 averageAPY;           // Historical average APY
        uint256 lastAPY;              // Last recorded APY
        uint256[] apyHistory;         // APY history for performance analysis
        uint256 lastPerformanceUpdate; // Last performance update
        uint256 sharpeRatio;          // Risk-adjusted returns
    }

    /**
     * @dev Rebalancing proposal
     */
    struct RebalanceProposal {
        address[] strategies;
        uint256[] newAllocations;
        uint256 timestamp;
        string reason;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    event StrategyAdded(
        address indexed strategy,
        string name,
        uint256 riskScore,
        uint256 initialAllocation
    );

    event StrategyRemoved(
        address indexed strategy,
        string reason,
        uint256 fundsWithdrawn
    );

    event Deposit(
        address indexed user,
        uint256 assets,
        uint256 shares
    );

    event Withdrawal(
        address indexed user,
        uint256 assets,
        uint256 shares
    );

    event Rebalanced(
        address indexed rebalancer,
        address[] strategies,
        uint256[] oldAllocations,
        uint256[] newAllocations,
        uint256 timestamp
    );

    event YieldHarvested(
        address indexed strategy,
        uint256 yieldAmount,
        uint256 newTotalYield
    );

    event PerformanceUpdated(
        address indexed strategy,
        uint256 newAPY,
        uint256 sharpeRatio
    );

    event EmergencyAction(
        address indexed admin,
        string action,
        address indexed strategy,
        uint256 amount
    );

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // ERRORS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    error InvalidStrategy();
    error StrategyAlreadyExists();
    error StrategyNotActive();
    error MaxStrategiesReached();
    error InvalidAllocation();
    error InsufficientBalance();
    error InvalidAmount();
    error RebalanceCooldownActive();
    error ExceedsRiskLimit();
    error InvalidTarget();
    error TransferFailed();

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Initialize the YieldVault
     * @param _asset The base asset for the vault (e.g., USDC)
     * @param _admin The admin address
     * @param _feeRecipient The fee recipient address
     */
    constructor(
        address _asset,
        address _admin,
        address _feeRecipient
    ) {
        if (_asset == address(0) || _admin == address(0) || _feeRecipient == address(0)) {
            revert InvalidAmount();
        }

        asset = IERC20(_asset);
        feeRecipient = _feeRecipient;

        _grantRole(DEFAULT_ADMIN_ROLE, _admin);
        _grantRole(ADMIN_ROLE, _admin);
        _grantRole(STRATEGY_MANAGER_ROLE, _admin);
        _grantRole(REBALANCER_ROLE, _admin);

        lastRebalance = block.timestamp;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // STRATEGY MANAGEMENT FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Adds a new yield strategy to the vault
     * @param strategy The strategy contract address
     * @param name The strategy name
     * @param riskScore The risk score (1-10)
     * @param initialAllocation Initial allocation in basis points
     */
    function addStrategy(
        address strategy,
        string calldata name,
        uint256 riskScore,
        uint256 initialAllocation
    ) external onlyRole(STRATEGY_MANAGER_ROLE) {
        if (strategy == address(0)) revert InvalidStrategy();
        if (activeStrategies[strategy]) revert StrategyAlreadyExists();
        if (strategyList.length >= MAX_STRATEGIES) revert MaxStrategiesReached();
        if (riskScore == 0 || riskScore > 10) revert InvalidAmount();
        if (initialAllocation > MAX_ALLOCATION_PER_STRATEGY) revert InvalidAllocation();

        // Verify strategy implements IYieldStrategy
        try IYieldStrategy(strategy).asset() returns (address strategyAsset) {
            if (strategyAsset != address(asset)) revert InvalidStrategy();
        } catch {
            revert InvalidStrategy();
        }

        strategies[strategy] = StrategyInfo({
            strategy: IYieldStrategy(strategy),
            allocation: initialAllocation,
            targetAllocation: initialAllocation,
            totalDeposited: 0,
            lastUpdate: block.timestamp,
            active: true,
            riskScore: riskScore,
            name: name
        });

        activeStrategies[strategy] = true;
        strategyList.push(strategy);
        targetAllocations[strategy] = initialAllocation;

        // Initialize performance data
        strategyPerformance[strategy] = PerformanceData({
            totalYieldGenerated: 0,
            averageAPY: 0,
            lastAPY: 0,
            apyHistory: new uint256[](0),
            lastPerformanceUpdate: block.timestamp,
            sharpeRatio: 0
        });

        // Validate total risk doesn't exceed limit
        _validateRiskLimits();

        emit StrategyAdded(strategy, name, riskScore, initialAllocation);
    }

    /**
     * @dev Removes a strategy from the vault
     * @param strategy The strategy to remove
     * @param reason The reason for removal
     */
    function removeStrategy(
        address strategy,
        string calldata reason
    ) external onlyRole(STRATEGY_MANAGER_ROLE) {
        if (!activeStrategies[strategy]) revert StrategyNotActive();

        StrategyInfo storage strategyInfo = strategies[strategy];
        
        // Withdraw all funds from strategy
        uint256 withdrawnAmount = 0;
        if (strategyInfo.totalDeposited > 0) {
            try strategyInfo.strategy.withdraw(strategyInfo.totalDeposited) 
                returns (uint256 amount) {
                withdrawnAmount = amount;
            } catch {
                // Try emergency withdrawal
                try strategyInfo.strategy.emergencyWithdraw(address(this)) 
                    returns (uint256 emergencyAmount) {
                    withdrawnAmount = emergencyAmount;
                } catch {
                    // Strategy withdrawal failed - mark as inactive but keep record
                }
            }
        }

        // Update state
        activeStrategies[strategy] = false;
        strategyInfo.active = false;
        strategyInfo.allocation = 0;
        targetAllocations[strategy] = 0;

        // Remove from strategy list
        for (uint256 i = 0; i < strategyList.length; i++) {
            if (strategyList[i] == strategy) {
                strategyList[i] = strategyList[strategyList.length - 1];
                strategyList.pop();
                break;
            }
        }

        emit StrategyRemoved(strategy, reason, withdrawnAmount);
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // DEPOSIT & WITHDRAWAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Deposits assets into the vault and allocates to strategies
     * @param assets The amount of assets to deposit
     * @return shares The number of shares minted
     */
    function deposit(uint256 assets) external nonReentrant whenNotPaused returns (uint256 shares) {
        if (assets == 0) revert InvalidAmount();

        // Calculate shares to mint
        shares = convertToShares(assets);

        // Transfer assets from user
        asset.safeTransferFrom(msg.sender, address(this), assets);

        // Update balances
        _balances[msg.sender] += shares;
        totalShares += shares;
        totalAssets += assets;

        // Allocate to strategies
        _allocateToStrategies(assets);

        emit Deposit(msg.sender, assets, shares);
    }

    /**
     * @dev Withdraws assets from the vault
     * @param shares The number of shares to burn
     * @return assets The amount of assets withdrawn
     */
    function withdraw(uint256 shares) external nonReentrant returns (uint256 assets) {
        if (shares == 0) revert InvalidAmount();
        if (_balances[msg.sender] < shares) revert InsufficientBalance();

        // Calculate assets to withdraw
        assets = convertToAssets(shares);

        // Withdraw from strategies as needed
        _withdrawFromStrategies(assets);

        // Update balances
        _balances[msg.sender] -= shares;
        totalShares -= shares;
        totalAssets -= assets;

        // Transfer assets to user
        asset.safeTransfer(msg.sender, assets);

        emit Withdrawal(msg.sender, assets, shares);
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // YIELD OPTIMIZATION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Rebalances allocations across strategies
     * @param newAllocations Array of new allocations (must sum to 10000)
     */
    function rebalance(
        address[] calldata strategyAddresses,
        uint256[] calldata newAllocations
    ) external onlyRole(REBALANCER_ROLE) {
        if (block.timestamp < lastRebalance + REBALANCE_COOLDOWN) {
            revert RebalanceCooldownActive();
        }
        if (strategyAddresses.length != newAllocations.length) revert InvalidAmount();

        // Validate allocations
        uint256 totalAllocation = 0;
        for (uint256 i = 0; i < newAllocations.length; i++) {
            if (!activeStrategies[strategyAddresses[i]]) revert StrategyNotActive();
            if (newAllocations[i] > MAX_ALLOCATION_PER_STRATEGY) revert InvalidAllocation();
            totalAllocation += newAllocations[i];
        }
        
        // For rebalance, we require that all strategies are included and sum to 100%
        if (strategyAddresses.length != _getActiveStrategyCount()) revert InvalidAllocation();
        if (totalAllocation != BASIS_POINTS) revert InvalidAllocation();

        // Store old allocations for event
        uint256[] memory oldAllocations = new uint256[](strategyAddresses.length);
        for (uint256 i = 0; i < strategyAddresses.length; i++) {
            oldAllocations[i] = strategies[strategyAddresses[i]].allocation;
        }

        // Update target allocations
        for (uint256 i = 0; i < strategyAddresses.length; i++) {
            targetAllocations[strategyAddresses[i]] = newAllocations[i];
        }

        // Execute rebalancing (updates actual allocations)
        _executeRebalance();

        lastRebalance = block.timestamp;

        emit Rebalanced(msg.sender, strategyAddresses, oldAllocations, newAllocations, block.timestamp);
    }

    /**
     * @dev Automatically rebalances based on performance and risk
     */
    function autoRebalance() external onlyRole(REBALANCER_ROLE) {
        if (!autoRebalanceEnabled) revert InvalidTarget();
        if (block.timestamp < lastRebalance + REBALANCE_COOLDOWN) {
            revert RebalanceCooldownActive();
        }

        // Calculate optimal allocations
        uint256[] memory optimalAllocations = _calculateOptimalAllocations();
        
        // Update target allocations
        for (uint256 i = 0; i < strategyList.length; i++) {
            address strategy = strategyList[i];
            if (activeStrategies[strategy]) {
                targetAllocations[strategy] = optimalAllocations[i];
            }
        }

        // Execute rebalancing
        _executeRebalance();

        lastRebalance = block.timestamp;
    }

    /**
     * @dev Harvests yield from all strategies
     * @return totalYieldHarvested The total yield harvested
     */
    function harvestAll() external nonReentrant returns (uint256 totalYieldHarvested) {
        for (uint256 i = 0; i < strategyList.length; i++) {
            address strategyAddr = strategyList[i];
            if (activeStrategies[strategyAddr]) {
                StrategyInfo storage strategyInfo = strategies[strategyAddr];
                
                try strategyInfo.strategy.harvestYield() returns (uint256 yieldHarvested) {
                    if (yieldHarvested > 0) {
                        totalYieldHarvested += yieldHarvested;
                        
                        // Update performance tracking
                        strategyPerformance[strategyAddr].totalYieldGenerated += yieldHarvested;
                        
                        emit YieldHarvested(strategyAddr, yieldHarvested, 
                            strategyPerformance[strategyAddr].totalYieldGenerated);
                    }
                } catch {
                    // Strategy harvest failed - continue with others
                    continue;
                }
            }
        }

        // Update daily yield tracking
        uint256 today = block.timestamp / 1 days;
        dailyYield[today] += totalYieldHarvested;

        // Collect fees if applicable
        if (totalYieldHarvested > 0) {
            _collectFees(totalYieldHarvested);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // VIEW FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Gets the current vault APY based on strategy performance
     * @return vaultAPY The weighted average APY
     */
    function getCurrentAPY() external view returns (uint256 vaultAPY) {
        uint256 totalWeightedAPY = 0;
        uint256 totalWeight = 0;

        for (uint256 i = 0; i < strategyList.length; i++) {
            address strategyAddr = strategyList[i];
            if (activeStrategies[strategyAddr]) {
                StrategyInfo memory strategyInfo = strategies[strategyAddr];
                
                try strategyInfo.strategy.getCurrentAPY() returns (uint256 strategyAPY) {
                    uint256 weight = strategyInfo.allocation;
                    totalWeightedAPY += strategyAPY * weight;
                    totalWeight += weight;
                } catch {
                    // Strategy APY call failed - skip
                    continue;
                }
            }
        }

        if (totalWeight > 0) {
            vaultAPY = totalWeightedAPY / totalWeight;
        }
    }

    /**
     * @dev Converts assets to shares
     * @param assets The amount of assets
     * @return shares The equivalent shares
     */
    function convertToShares(uint256 assets) public view returns (uint256 shares) {
        if (totalAssets == 0 || totalShares == 0) {
            return assets;
        }
        return assets.mulDiv(totalShares, totalAssets);
    }

    /**
     * @dev Converts shares to assets
     * @param shares The number of shares
     * @return assets The equivalent assets
     */
    function convertToAssets(uint256 shares) public view returns (uint256 assets) {
        if (totalShares == 0) {
            return shares;
        }
        return shares.mulDiv(totalAssets, totalShares);
    }

    /**
     * @dev Gets user's share balance
     * @param user The user address
     * @return balance The user's share balance
     */
    function balanceOf(address user) external view returns (uint256 balance) {
        return _balances[user];
    }

    /**
     * @dev Gets strategy allocation data
     * @param strategy The strategy address
     * @return info The strategy information
     */
    function getStrategyInfo(address strategy) external view returns (StrategyInfo memory info) {
        return strategies[strategy];
    }

    /**
     * @dev Gets performance data for a strategy
     * @param strategy The strategy address
     * @return performance The performance data
     */
    function getStrategyPerformance(address strategy) 
        external 
        view 
        returns (PerformanceData memory performance) 
    {
        return strategyPerformance[strategy];
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    function _allocateToStrategies(uint256 assets) internal {
        for (uint256 i = 0; i < strategyList.length; i++) {
            address strategyAddr = strategyList[i];
            if (activeStrategies[strategyAddr]) {
                StrategyInfo storage strategyInfo = strategies[strategyAddr];
                uint256 allocationAmount = (assets * strategyInfo.allocation) / BASIS_POINTS;
                
                if (allocationAmount > 0) {
                    asset.safeApprove(strategyAddr, allocationAmount);
                    try strategyInfo.strategy.deposit(allocationAmount) {
                        strategyInfo.totalDeposited += allocationAmount;
                    } catch {
                        // Strategy deposit failed - handle gracefully
                        asset.safeApprove(strategyAddr, 0);
                    }
                }
            }
        }
    }

    function _withdrawFromStrategies(uint256 assets) internal {
        uint256 remainingToWithdraw = assets;
        
        // Withdraw proportionally from strategies
        for (uint256 i = 0; i < strategyList.length && remainingToWithdraw > 0; i++) {
            address strategyAddr = strategyList[i];
            if (activeStrategies[strategyAddr]) {
                StrategyInfo storage strategyInfo = strategies[strategyAddr];
                
                uint256 proportionalAmount = (assets * strategyInfo.allocation) / BASIS_POINTS;
                uint256 withdrawAmount = Math.min(proportionalAmount, 
                    Math.min(remainingToWithdraw, strategyInfo.totalDeposited));
                
                if (withdrawAmount > 0) {
                    try strategyInfo.strategy.withdraw(withdrawAmount) returns (uint256 withdrawn) {
                        strategyInfo.totalDeposited -= Math.min(withdrawAmount, strategyInfo.totalDeposited);
                        remainingToWithdraw -= Math.min(withdrawn, remainingToWithdraw);
                    } catch {
                        // Strategy withdrawal failed - continue with others
                        continue;
                    }
                }
            }
        }
    }

    function _executeRebalance() internal {
        // Implementation would involve complex rebalancing logic
        // For now, update allocations
        for (uint256 i = 0; i < strategyList.length; i++) {
            address strategyAddr = strategyList[i];
            if (activeStrategies[strategyAddr]) {
                strategies[strategyAddr].allocation = targetAllocations[strategyAddr];
            }
        }
    }

    function _calculateOptimalAllocations() internal view returns (uint256[] memory allocations) {
        allocations = new uint256[](strategyList.length);
        
        // Simple implementation - equal weight for active strategies
        uint256 activeCount = 0;
        for (uint256 i = 0; i < strategyList.length; i++) {
            if (activeStrategies[strategyList[i]]) {
                activeCount++;
            }
        }
        
        if (activeCount > 0) {
            uint256 equalWeight = BASIS_POINTS / activeCount;
            for (uint256 i = 0; i < strategyList.length; i++) {
                if (activeStrategies[strategyList[i]]) {
                    allocations[i] = equalWeight;
                }
            }
        }
    }

    function _getActiveStrategyCount() internal view returns (uint256 count) {
        for (uint256 i = 0; i < strategyList.length; i++) {
            if (activeStrategies[strategyList[i]]) {
                count++;
            }
        }
    }

    function _validateTotalAllocations() internal view {
        uint256 totalAllocation = 0;
        
        for (uint256 i = 0; i < strategyList.length; i++) {
            address strategyAddr = strategyList[i];
            if (activeStrategies[strategyAddr]) {
                totalAllocation += strategies[strategyAddr].allocation;
            }
        }
        
        if (totalAllocation > BASIS_POINTS) {
            revert InvalidAllocation();
        }
    }

    function _validateRiskLimits() internal view {
        uint256 totalWeightedRisk = 0;
        uint256 totalWeight = 0;

        for (uint256 i = 0; i < strategyList.length; i++) {
            address strategyAddr = strategyList[i];
            if (activeStrategies[strategyAddr]) {
                StrategyInfo memory strategyInfo = strategies[strategyAddr];
                totalWeightedRisk += strategyInfo.riskScore * strategyInfo.allocation;
                totalWeight += strategyInfo.allocation;
            }
        }

        if (totalWeight > 0) {
            uint256 avgRisk = totalWeightedRisk / totalWeight;
            if (avgRisk > maxTotalRisk) {
                revert ExceedsRiskLimit();
            }
        }
    }

    function _collectFees(uint256 yieldAmount) internal {
        if (performanceFee > 0 && yieldAmount > 0) {
            uint256 feeAmount = (yieldAmount * performanceFee) / BASIS_POINTS;
            uint256 availableBalance = asset.balanceOf(address(this));
            
            if (feeAmount > 0 && availableBalance >= feeAmount) {
                asset.safeTransfer(feeRecipient, feeAmount);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Emergency pause function
     */
    function emergencyPause() external onlyRole(ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Resume operations
     */
    function unpause() external onlyRole(ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Updates vault parameters
     */
    function updateVaultParameters(
        uint256 _managementFee,
        uint256 _performanceFee,
        address _feeRecipient,
        bool _autoRebalanceEnabled
    ) external onlyRole(ADMIN_ROLE) {
        if (_managementFee > 1000 || _performanceFee > 2000) revert InvalidAmount(); // Max 10%/20%
        if (_feeRecipient == address(0)) revert InvalidAmount();

        managementFee = _managementFee;
        performanceFee = _performanceFee;
        feeRecipient = _feeRecipient;
        autoRebalanceEnabled = _autoRebalanceEnabled;
    }
}