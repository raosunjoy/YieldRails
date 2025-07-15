// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IYieldStrategy.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title ResolvStrategy
 * @dev Yield strategy that integrates with Resolv Protocol for delta-neutral DeFi yields
 * @notice This strategy provides stable yields through delta-neutral positions
 * @author YieldRails Team
 */
contract ResolvStrategy is IYieldStrategy, ReentrancyGuard, Pausable, AccessControl {
    using SafeERC20 for IERC20;

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // CONSTANTS & IMMUTABLES
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant HARVESTER_ROLE = keccak256("HARVESTER_ROLE");
    bytes32 public constant REBALANCER_ROLE = keccak256("REBALANCER_ROLE");
    
    address public immutable override asset;
    address public immutable resolvProtocol;
    address public immutable resolvVault;
    
    uint256 public constant MAX_CAPACITY = 50_000_000e6; // 50M USDC
    uint256 public constant MIN_DEPOSIT = 10000e6; // 10,000 USDC minimum
    uint256 public constant RISK_SCORE = 4; // Medium risk (1-10 scale)
    uint256 public constant BASE_APY = 800; // 8% base APY in basis points
    uint256 public constant REBALANCE_THRESHOLD = 500; // 5% threshold for rebalancing

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    string private _name;
    string private _description;
    
    uint256 private _totalAssets;
    uint256 private _totalShares;
    uint256 private _totalYieldGenerated;
    uint256 private _lastHarvestTime;
    uint256 private _lastRebalanceTime;
    uint256 private _currentAPY;
    uint256 private _performanceBuffer;
    
    mapping(address => uint256) private _balances;
    mapping(address => uint256) private _depositTimestamps;
    mapping(address => uint256) private _lastYieldCalculation;
    
    // Delta-neutral position tracking
    uint256 private _longPosition;
    uint256 private _shortPosition;
    uint256 private _hedgeRatio;
    bool private _isRebalancing;

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // CUSTOM ERRORS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    error InsufficientAmount();
    error InsufficientShares();
    error InsufficientBalance();
    error ExceedsMaxCapacity();
    error BelowMinimumDeposit();
    error ResolvProtocolError();
    error YieldCalculationFailed();
    error EmergencyWithdrawalFailed();
    error InvalidAddress();
    error StrategyInactive();
    error RebalanceInProgress();
    error InvalidHedgeRatio();
    error DeltaNeutralityBreach();

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    event ResolvProtocolInteraction(string action, uint256 amount, bool success);
    event APYUpdated(uint256 oldAPY, uint256 newAPY);
    event EmergencyWithdrawalExecuted(address indexed user, uint256 amount);
    event PositionRebalanced(uint256 longPosition, uint256 shortPosition, uint256 hedgeRatio);
    event DeltaNeutralityRestored(uint256 deviation, uint256 newHedgeRatio);
    event PerformanceBufferUpdated(uint256 oldBuffer, uint256 newBuffer);

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Constructor for ResolvStrategy
     * @param _asset The underlying asset (USDC)
     * @param _resolvProtocol The Resolv Protocol contract address
     * @param _resolvVault The Resolv Vault contract address
     */
    constructor(
        address _asset,
        address _resolvProtocol,
        address _resolvVault
    ) {
        if (_asset == address(0) || _resolvProtocol == address(0) || _resolvVault == address(0)) {
            revert InvalidAddress();
        }
        
        asset = _asset;
        resolvProtocol = _resolvProtocol;
        resolvVault = _resolvVault;
        _name = "Resolv Delta-Neutral Strategy";
        _description = "Medium-risk yield strategy using delta-neutral positions via Resolv Protocol";
        _currentAPY = BASE_APY;
        _lastHarvestTime = block.timestamp;
        _lastRebalanceTime = block.timestamp;
        _hedgeRatio = 10000; // 100% hedge ratio (perfect delta neutral)
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MANAGER_ROLE, msg.sender);
        _grantRole(HARVESTER_ROLE, msg.sender);
        _grantRole(REBALANCER_ROLE, msg.sender);
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // DEPOSIT & WITHDRAWAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Deposits assets into the Resolv delta-neutral strategy
     * @param amount The amount of assets to deposit
     * @return shares The number of shares minted to the depositor
     */
    function deposit(uint256 amount) 
        external 
        override 
        nonReentrant 
        whenNotPaused 
        returns (uint256 shares) 
    {
        if (amount == 0) revert InsufficientAmount();
        if (amount < MIN_DEPOSIT) revert BelowMinimumDeposit();
        if (_totalAssets + amount > MAX_CAPACITY) revert ExceedsMaxCapacity();
        if (_isRebalancing) revert RebalanceInProgress();

        // Transfer assets from user
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);

        // Calculate shares to mint
        shares = convertToShares(amount);
        
        // Update user balance and global state
        _balances[msg.sender] += shares;
        _depositTimestamps[msg.sender] = block.timestamp;
        _lastYieldCalculation[msg.sender] = block.timestamp;
        _totalShares += shares;
        _totalAssets += amount;

        // Deploy to Resolv Protocol with delta-neutral positioning
        _deployToResolv(amount);

        emit Deposit(msg.sender, amount, shares);
        return shares;
    }

    /**
     * @dev Withdraws assets from the Resolv delta-neutral strategy
     * @param shares The number of shares to burn
     * @return amount The amount of assets withdrawn
     */
    function withdraw(uint256 shares) 
        external 
        override 
        nonReentrant 
        whenNotPaused 
        returns (uint256 amount) 
    {
        if (shares == 0) revert InsufficientShares();
        if (_balances[msg.sender] < shares) revert InsufficientBalance();
        if (_isRebalancing) revert RebalanceInProgress();

        // Calculate assets to withdraw
        amount = convertToAssets(shares);
        
        // Update user balance and global state
        _balances[msg.sender] -= shares;
        _totalShares -= shares;
        _totalAssets -= amount;

        // Withdraw from Resolv Protocol
        _withdrawFromResolv(amount);

        // Transfer assets to user
        IERC20(asset).safeTransfer(msg.sender, amount);

        emit Withdrawal(msg.sender, amount, shares);
        return amount;
    }

    /**
     * @dev Emergency withdrawal of all user funds (may incur penalties)
     * @param user The address to withdraw funds for
     * @return amount The amount of assets withdrawn
     */
    function emergencyWithdraw(address user) 
        external 
        override 
        onlyRole(MANAGER_ROLE) 
        nonReentrant 
        returns (uint256 amount) 
    {
        if (user == address(0)) revert InvalidAddress();
        
        uint256 userShares = _balances[user];
        if (userShares == 0) return 0;

        try this.convertToAssets(userShares) returns (uint256 assets) {
            amount = assets;
            
            // Update state
            _balances[user] = 0;
            _totalShares -= userShares;
            _totalAssets -= amount;

            // Emergency withdraw from Resolv (may break delta neutrality temporarily)
            _emergencyWithdrawFromResolv(amount);

            // Transfer to user
            IERC20(asset).safeTransfer(user, amount);

            emit EmergencyWithdrawalExecuted(user, amount);
        } catch {
            revert EmergencyWithdrawalFailed();
        }

        return amount;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // YIELD CALCULATION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Calculates the current APY of the strategy
     * @return apy The current APY in basis points
     */
    function getCurrentAPY() external view override returns (uint256 apy) {
        return _currentAPY;
    }

    /**
     * @dev Calculates yield generated for a specific user
     * @param user The user address
     * @return yieldAmount The amount of yield generated
     */
    function calculateUserYield(address user) external view override returns (uint256 yieldAmount) {
        if (_balances[user] == 0) return 0;
        
        uint256 userAssets = convertToAssets(_balances[user]);
        uint256 timeElapsed = block.timestamp - _lastYieldCalculation[user];
        
        // Calculate yield with performance buffer adjustment
        uint256 effectiveAPY = _currentAPY;
        if (_performanceBuffer > 0) {
            effectiveAPY = (_currentAPY * (10000 + _performanceBuffer)) / 10000;
        }
        
        uint256 annualYield = (userAssets * effectiveAPY) / 10000;
        uint256 secondsInYear = 365 * 24 * 60 * 60;
        
        yieldAmount = (annualYield * timeElapsed) / secondsInYear;
        return yieldAmount;
    }

    /**
     * @dev Calculates the total yield generated by the strategy
     * @return totalYield The total yield generated
     */
    function getTotalYieldGenerated() external view override returns (uint256 totalYield) {
        return _totalYieldGenerated;
    }

    /**
     * @dev Harvests yield from the Resolv Protocol
     * @return yieldHarvested The amount of yield harvested
     */
    function harvestYield() 
        external 
        override 
        onlyRole(HARVESTER_ROLE) 
        nonReentrant 
        returns (uint256 yieldHarvested) 
    {
        yieldHarvested = _harvestFromResolv();
        
        if (yieldHarvested > 0) {
            _totalYieldGenerated += yieldHarvested;
            _totalAssets += yieldHarvested;
            _lastHarvestTime = block.timestamp;
            
            // Update performance buffer based on actual vs expected yield
            _updatePerformanceBuffer(yieldHarvested);
            
            emit YieldHarvested(yieldHarvested, _totalAssets);
        }
        
        return yieldHarvested;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // DELTA-NEUTRAL MANAGEMENT FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Rebalances the delta-neutral position
     * @return success Whether the rebalance was successful
     */
    function rebalancePosition() 
        external 
        onlyRole(REBALANCER_ROLE) 
        nonReentrant 
        returns (bool success) 
    {
        _isRebalancing = true;
        
        try this._executeRebalance() {
            _lastRebalanceTime = block.timestamp;
            success = true;
            
            emit PositionRebalanced(_longPosition, _shortPosition, _hedgeRatio);
        } catch {
            success = false;
        }
        
        _isRebalancing = false;
        return success;
    }

    /**
     * @dev Checks if rebalancing is needed
     * @return needed Whether rebalancing is needed
     */
    function isRebalanceNeeded() external view returns (bool needed) {
        if (_totalAssets == 0) return false;
        
        uint256 currentDeviation = _calculateDeltaDeviation();
        return currentDeviation > REBALANCE_THRESHOLD;
    }

    /**
     * @dev Gets current delta neutrality status
     * @return deviation The current deviation from perfect delta neutrality (in basis points)
     */
    function getDeltaDeviation() external view returns (uint256 deviation) {
        return _calculateDeltaDeviation();
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // SHARE CALCULATION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Converts assets to shares
     * @param assets The amount of assets
     * @return shares The equivalent number of shares
     */
    function convertToShares(uint256 assets) public view override returns (uint256 shares) {
        if (_totalAssets == 0 || _totalShares == 0) {
            return assets;
        }
        return (assets * _totalShares) / _totalAssets;
    }

    /**
     * @dev Converts shares to assets
     * @param shares The number of shares
     * @return assets The equivalent amount of assets
     */
    function convertToAssets(uint256 shares) public view override returns (uint256 assets) {
        if (_totalShares == 0) {
            return shares;
        }
        return (shares * _totalAssets) / _totalShares;
    }

    /**
     * @dev Gets the user's share balance
     * @param user The user address
     * @return balance The user's share balance
     */
    function balanceOf(address user) external view override returns (uint256 balance) {
        return _balances[user];
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // STRATEGY INFORMATION FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Gets comprehensive strategy information
     * @return info The strategy information struct
     */
    function getStrategyInfo() external view override returns (StrategyInfo memory info) {
        return StrategyInfo({
            name: _name,
            description: _description,
            totalAssets: _totalAssets,
            totalShares: _totalShares,
            currentAPY: _currentAPY,
            riskScore: RISK_SCORE,
            lastHarvest: _lastHarvestTime,
            active: !paused() && !_isRebalancing
        });
    }

    /**
     * @dev Gets the total assets under management
     * @return totalManagedAssets The total assets managed by this strategy
     */
    function totalAssets() external view override returns (uint256 totalManagedAssets) {
        return _totalAssets;
    }

    /**
     * @dev Gets the strategy's risk score
     * @return risk The risk score from 1-10 (1 = lowest risk)
     */
    function getRiskScore() external pure override returns (uint256 risk) {
        return RISK_SCORE;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // PERFORMANCE FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Gets historical performance data
     * @param period The time period to look back (in seconds)
     * @return performance The performance data for the specified period
     */
    function getPerformanceData(uint256 period) external view override returns (uint256 performance) {
        // Return effective APY including performance buffer
        uint256 effectiveAPY = _currentAPY;
        if (_performanceBuffer > 0) {
            effectiveAPY = (_currentAPY * (10000 + _performanceBuffer)) / 10000;
        }
        return effectiveAPY;
    }

    /**
     * @dev Checks if the strategy is profitable
     * @return profitable Whether the strategy is currently profitable
     */
    function isProfitable() external view override returns (bool profitable) {
        return _currentAPY > 0 && !paused() && _calculateDeltaDeviation() < 1000; // <10% deviation
    }

    /**
     * @dev Gets the maximum capacity of the strategy
     * @return maxCapacity The maximum amount of assets the strategy can handle
     */
    function maxCapacity() external pure override returns (uint256) {
        return MAX_CAPACITY;
    }

    /**
     * @dev Gets the current utilization rate
     * @return utilization The utilization rate as a percentage (basis points)
     */
    function utilizationRate() external view override returns (uint256 utilization) {
        if (MAX_CAPACITY == 0) return 0;
        return (_totalAssets * 10000) / MAX_CAPACITY;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Updates the current APY (only manager)
     * @param newAPY The new APY in basis points
     */
    function updateAPY(uint256 newAPY) external onlyRole(MANAGER_ROLE) {
        require(newAPY <= 2000, "APY too high"); // Max 20%
        
        uint256 oldAPY = _currentAPY;
        _currentAPY = newAPY;
        
        emit APYUpdated(oldAPY, newAPY);
        emit StrategyUpdated("APY", oldAPY, newAPY);
    }

    /**
     * @dev Updates the hedge ratio (only manager)
     * @param newHedgeRatio The new hedge ratio in basis points
     */
    function updateHedgeRatio(uint256 newHedgeRatio) external onlyRole(MANAGER_ROLE) {
        require(newHedgeRatio >= 8000 && newHedgeRatio <= 12000, "Invalid hedge ratio"); // 80-120%
        
        uint256 oldRatio = _hedgeRatio;
        _hedgeRatio = newHedgeRatio;
        
        emit StrategyUpdated("HedgeRatio", oldRatio, newHedgeRatio);
    }

    /**
     * @dev Pauses the strategy (emergency only)
     */
    function pause() external onlyRole(MANAGER_ROLE) {
        _pause();
    }

    /**
     * @dev Unpauses the strategy
     */
    function unpause() external onlyRole(MANAGER_ROLE) {
        _unpause();
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // INTERNAL FUNCTIONS - RESOLV PROTOCOL INTEGRATION
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Deploys assets to Resolv Protocol with delta-neutral positioning
     * @param amount The amount to deploy
     */
    function _deployToResolv(uint256 amount) internal {
        // Mock Resolv Protocol interaction
        IERC20(asset).safeApprove(resolvProtocol, 0);
        IERC20(asset).safeApprove(resolvProtocol, amount);
        
        // Split amount for long and short positions to maintain delta neutrality
        uint256 longAmount = (amount * _hedgeRatio) / 10000;
        uint256 shortAmount = amount - longAmount;
        
        _longPosition += longAmount;
        _shortPosition += shortAmount;
        
        bool success = true; // Mock success
        
        emit ResolvProtocolInteraction("deploy", amount, success);
        
        if (!success) {
            revert ResolvProtocolError();
        }
    }

    /**
     * @dev Withdraws assets from Resolv Protocol
     * @param amount The amount to withdraw
     */
    function _withdrawFromResolv(uint256 amount) internal {
        // Calculate proportional withdrawal from long and short positions
        uint256 totalPosition = _longPosition + _shortPosition;
        if (totalPosition == 0) return;
        
        uint256 longWithdraw = (amount * _longPosition) / totalPosition;
        uint256 shortWithdraw = amount - longWithdraw;
        
        _longPosition -= longWithdraw;
        _shortPosition -= shortWithdraw;
        
        bool success = true; // Mock success
        
        emit ResolvProtocolInteraction("withdraw", amount, success);
        
        if (!success) {
            revert ResolvProtocolError();
        }
    }

    /**
     * @dev Emergency withdrawal from Resolv Protocol
     * @param amount The amount to withdraw
     */
    function _emergencyWithdrawFromResolv(uint256 amount) internal {
        // Emergency withdrawal may break delta neutrality temporarily
        bool success = true; // Mock success
        
        emit ResolvProtocolInteraction("emergencyWithdraw", amount, success);
        
        if (!success) {
            revert ResolvProtocolError();
        }
    }

    /**
     * @dev Harvests yield from Resolv Protocol
     * @return yieldAmount The amount of yield harvested
     */
    function _harvestFromResolv() internal returns (uint256 yieldAmount) {
        // Calculate expected yield since last harvest
        uint256 timeElapsed = block.timestamp - _lastHarvestTime;
        uint256 annualYield = (_totalAssets * _currentAPY) / 10000;
        uint256 secondsInYear = 365 * 24 * 60 * 60;
        
        yieldAmount = (annualYield * timeElapsed) / secondsInYear;
        
        // Apply performance buffer
        if (_performanceBuffer > 0) {
            yieldAmount = (yieldAmount * (10000 + _performanceBuffer)) / 10000;
        }
        
        bool success = true; // Mock success
        
        emit ResolvProtocolInteraction("harvest", yieldAmount, success);
        
        if (!success) {
            yieldAmount = 0;
        }
        
        return yieldAmount;
    }

    /**
     * @dev Executes position rebalancing
     */
    function _executeRebalance() external {
        require(msg.sender == address(this), "Internal function");
        
        // Calculate target positions
        uint256 targetLong = (_totalAssets * _hedgeRatio) / 10000;
        uint256 targetShort = _totalAssets - targetLong;
        
        // Adjust positions
        if (_longPosition != targetLong) {
            _longPosition = targetLong;
        }
        if (_shortPosition != targetShort) {
            _shortPosition = targetShort;
        }
        
        // Verify delta neutrality is restored
        uint256 deviation = _calculateDeltaDeviation();
        if (deviation > REBALANCE_THRESHOLD) {
            revert DeltaNeutralityBreach();
        }
        
        emit DeltaNeutralityRestored(deviation, _hedgeRatio);
    }

    /**
     * @dev Calculates current delta deviation
     * @return deviation The deviation from perfect delta neutrality (in basis points)
     */
    function _calculateDeltaDeviation() internal view returns (uint256 deviation) {
        if (_totalAssets == 0) return 0;
        
        uint256 expectedLong = (_totalAssets * _hedgeRatio) / 10000;
        uint256 actualDeviation = _longPosition > expectedLong 
            ? _longPosition - expectedLong 
            : expectedLong - _longPosition;
            
        deviation = (actualDeviation * 10000) / _totalAssets;
        return deviation;
    }

    /**
     * @dev Updates performance buffer based on actual vs expected yield
     * @param actualYield The actual yield harvested
     */
    function _updatePerformanceBuffer(uint256 actualYield) internal {
        uint256 timeElapsed = block.timestamp - _lastHarvestTime;
        uint256 expectedYield = (_totalAssets * _currentAPY * timeElapsed) / (10000 * 365 * 24 * 60 * 60);
        
        uint256 oldBuffer = _performanceBuffer;
        
        // Only update buffer if we have meaningful expected yield
        if (expectedYield > 0) {
            if (actualYield > expectedYield) {
                // Outperforming - increase buffer
                uint256 outperformance = ((actualYield - expectedYield) * 10000) / expectedYield;
                _performanceBuffer = (_performanceBuffer + outperformance) / 2; // Smooth adjustment
            } else if (actualYield < expectedYield) {
                // Underperforming - decrease buffer
                uint256 underperformance = ((expectedYield - actualYield) * 10000) / expectedYield;
                _performanceBuffer = _performanceBuffer > underperformance 
                    ? (_performanceBuffer - underperformance) / 2 
                    : 0;
            }
        }
        
        // Cap buffer at 20%
        if (_performanceBuffer > 2000) {
            _performanceBuffer = 2000;
        }
        
        emit PerformanceBufferUpdated(oldBuffer, _performanceBuffer);
    }
}