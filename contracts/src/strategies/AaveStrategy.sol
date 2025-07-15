// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IYieldStrategy.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title AaveStrategy
 * @dev Yield strategy that integrates with Aave Protocol for lending yields
 * @notice This strategy provides yields through Aave lending pools
 * @author YieldRails Team
 */
contract AaveStrategy is IYieldStrategy, ReentrancyGuard, Pausable, AccessControl {
    using SafeERC20 for IERC20;

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // CONSTANTS & IMMUTABLES
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant HARVESTER_ROLE = keccak256("HARVESTER_ROLE");
    bytes32 public constant LIQUIDATOR_ROLE = keccak256("LIQUIDATOR_ROLE");
    
    address public immutable override asset;
    address public immutable aavePool;
    address public immutable aToken;
    address public immutable incentivesController;
    
    uint256 public constant MAX_CAPACITY = 200_000_000e6; // 200M USDC
    uint256 public constant MIN_DEPOSIT = 100e6; // 100 USDC minimum
    uint256 public constant RISK_SCORE = 3; // Low-medium risk (1-10 scale)
    uint256 public constant BASE_APY = 300; // 3% base APY in basis points
    uint256 public constant UTILIZATION_THRESHOLD = 8500; // 85% utilization threshold

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    string private _name;
    string private _description;
    
    uint256 private _totalAssets;
    uint256 private _totalShares;
    uint256 private _totalYieldGenerated;
    uint256 private _totalIncentivesEarned;
    uint256 private _lastHarvestTime;
    uint256 private _currentAPY;
    uint256 private _currentUtilization;
    
    mapping(address => uint256) private _balances;
    mapping(address => uint256) private _depositTimestamps;
    mapping(address => uint256) private _lastYieldCalculation;
    mapping(address => uint256) private _accruedIncentives;
    
    // Aave-specific tracking
    uint256 private _aTokenBalance;
    uint256 private _lastUtilizationUpdate;
    bool private _emergencyMode;

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // CUSTOM ERRORS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    error InsufficientAmount();
    error InsufficientShares();
    error InsufficientBalance();
    error ExceedsMaxCapacity();
    error BelowMinimumDeposit();
    error AaveProtocolError();
    error YieldCalculationFailed();
    error EmergencyWithdrawalFailed();
    error InvalidAddress();
    error StrategyInactive();
    error HighUtilizationRisk();
    error IncentivesClaimFailed();
    error EmergencyModeActive();

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    event AaveProtocolInteraction(string action, uint256 amount, bool success);
    event APYUpdated(uint256 oldAPY, uint256 newAPY);
    event EmergencyWithdrawalExecuted(address indexed user, uint256 amount);
    event UtilizationUpdated(uint256 oldUtilization, uint256 newUtilization);
    event IncentivesClaimed(address indexed user, uint256 amount);
    event EmergencyModeToggled(bool active);
    event LiquidityRiskDetected(uint256 utilization, uint256 threshold);

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Constructor for AaveStrategy
     * @param _asset The underlying asset (USDC)
     * @param _aavePool The Aave Pool contract address
     * @param _aToken The corresponding aToken address
     * @param _incentivesController The Aave incentives controller address
     */
    constructor(
        address _asset,
        address _aavePool,
        address _aToken,
        address _incentivesController
    ) {
        if (_asset == address(0) || _aavePool == address(0) || 
            _aToken == address(0) || _incentivesController == address(0)) {
            revert InvalidAddress();
        }
        
        asset = _asset;
        aavePool = _aavePool;
        aToken = _aToken;
        incentivesController = _incentivesController;
        _name = "Aave Lending Strategy";
        _description = "Low-medium risk yield strategy through Aave lending pools";
        _currentAPY = BASE_APY;
        _lastHarvestTime = block.timestamp;
        _lastUtilizationUpdate = block.timestamp;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MANAGER_ROLE, msg.sender);
        _grantRole(HARVESTER_ROLE, msg.sender);
        _grantRole(LIQUIDATOR_ROLE, msg.sender);
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // DEPOSIT & WITHDRAWAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Deposits assets into the Aave lending strategy
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
        if (_emergencyMode) revert EmergencyModeActive();

        // Check Aave pool utilization before deposit
        _updateUtilization();
        if (_currentUtilization > UTILIZATION_THRESHOLD) {
            revert HighUtilizationRisk();
        }

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

        // Supply to Aave Pool
        _supplyToAave(amount);

        emit Deposit(msg.sender, amount, shares);
        return shares;
    }

    /**
     * @dev Withdraws assets from the Aave lending strategy
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

        // Calculate assets to withdraw
        amount = convertToAssets(shares);
        
        // Check if withdrawal is possible given current utilization
        _updateUtilization();
        
        // Update user balance and global state
        _balances[msg.sender] -= shares;
        _totalShares -= shares;
        _totalAssets -= amount;

        // Withdraw from Aave Pool
        _withdrawFromAave(amount);

        // Claim any pending incentives for the user
        _claimUserIncentives(msg.sender);

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

            // Emergency withdraw from Aave
            _emergencyWithdrawFromAave(amount);

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
        
        // Calculate base yield from lending
        uint256 annualYield = (userAssets * _currentAPY) / 10000;
        uint256 secondsInYear = 365 * 24 * 60 * 60;
        
        yieldAmount = (annualYield * timeElapsed) / secondsInYear;
        
        // Add accrued incentives
        yieldAmount += _accruedIncentives[user];
        
        return yieldAmount;
    }

    /**
     * @dev Calculates the total yield generated by the strategy
     * @return totalYield The total yield generated
     */
    function getTotalYieldGenerated() external view override returns (uint256 totalYield) {
        return _totalYieldGenerated + _totalIncentivesEarned;
    }

    /**
     * @dev Harvests yield from the Aave Protocol
     * @return yieldHarvested The amount of yield harvested
     */
    function harvestYield() 
        external 
        override 
        onlyRole(HARVESTER_ROLE) 
        nonReentrant 
        returns (uint256 yieldHarvested) 
    {
        // Update current state from Aave
        _updateAaveState();
        
        // Calculate yield from aToken balance increase
        uint256 currentATokenBalance = IERC20(aToken).balanceOf(address(this));
        if (currentATokenBalance > _aTokenBalance) {
            yieldHarvested = currentATokenBalance - _aTokenBalance;
            _aTokenBalance = currentATokenBalance;
        }
        
        // Claim protocol incentives
        uint256 incentives = _claimProtocolIncentives();
        yieldHarvested += incentives;
        
        if (yieldHarvested > 0) {
            _totalYieldGenerated += yieldHarvested;
            _totalAssets += yieldHarvested;
            _lastHarvestTime = block.timestamp;
            
            emit YieldHarvested(yieldHarvested, _totalAssets);
        }
        
        return yieldHarvested;
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // AAVE-SPECIFIC FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Claims incentives for a specific user
     * @param user The user address
     * @return incentiveAmount The amount of incentives claimed
     */
    function claimUserIncentives(address user) 
        external 
        nonReentrant 
        returns (uint256 incentiveAmount) 
    {
        require(msg.sender == user || hasRole(MANAGER_ROLE, msg.sender), "Unauthorized");
        
        incentiveAmount = _claimUserIncentives(user);
        return incentiveAmount;
    }

    /**
     * @dev Updates the current utilization rate from Aave
     */
    function updateUtilization() external {
        _updateUtilization();
    }

    /**
     * @dev Gets the current Aave pool utilization rate
     * @return utilization The current utilization rate in basis points
     */
    function getAaveUtilization() external view returns (uint256 utilization) {
        return _currentUtilization;
    }

    /**
     * @dev Toggles emergency mode (only manager)
     * @param active Whether to activate emergency mode
     */
    function setEmergencyMode(bool active) external onlyRole(MANAGER_ROLE) {
        _emergencyMode = active;
        emit EmergencyModeToggled(active);
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
            active: !paused() && !_emergencyMode
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
        // Adjust APY based on current utilization
        uint256 adjustedAPY = _currentAPY;
        if (_currentUtilization > 7000) { // >70% utilization
            adjustedAPY = (_currentAPY * 9000) / 10000; // Reduce by 10%
        }
        return adjustedAPY;
    }

    /**
     * @dev Checks if the strategy is profitable
     * @return profitable Whether the strategy is currently profitable
     */
    function isProfitable() external view override returns (bool profitable) {
        return _currentAPY > 0 && !paused() && !_emergencyMode && 
               _currentUtilization < UTILIZATION_THRESHOLD;
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
        require(newAPY <= 1500, "APY too high"); // Max 15%
        
        uint256 oldAPY = _currentAPY;
        _currentAPY = newAPY;
        
        emit APYUpdated(oldAPY, newAPY);
        emit StrategyUpdated("APY", oldAPY, newAPY);
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
    // INTERNAL FUNCTIONS - AAVE PROTOCOL INTEGRATION
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Supplies assets to Aave Pool
     * @param amount The amount to supply
     */
    function _supplyToAave(uint256 amount) internal {
        IERC20(asset).safeApprove(aavePool, 0);
        IERC20(asset).safeApprove(aavePool, amount);
        
        // Mock Aave Pool supply
        // In production: IPool(aavePool).supply(asset, amount, address(this), 0);
        
        _aTokenBalance += amount;
        
        bool success = true; // Mock success
        
        emit AaveProtocolInteraction("supply", amount, success);
        
        if (!success) {
            revert AaveProtocolError();
        }
    }

    /**
     * @dev Withdraws assets from Aave Pool
     * @param amount The amount to withdraw
     */
    function _withdrawFromAave(uint256 amount) internal {
        // Mock Aave Pool withdrawal
        // In production: IPool(aavePool).withdraw(asset, amount, address(this));
        
        _aTokenBalance -= amount;
        
        bool success = true; // Mock success
        
        emit AaveProtocolInteraction("withdraw", amount, success);
        
        if (!success) {
            revert AaveProtocolError();
        }
    }

    /**
     * @dev Emergency withdrawal from Aave Pool
     * @param amount The amount to withdraw
     */
    function _emergencyWithdrawFromAave(uint256 amount) internal {
        // Emergency withdrawal from Aave
        bool success = true; // Mock success
        
        emit AaveProtocolInteraction("emergencyWithdraw", amount, success);
        
        if (!success) {
            revert AaveProtocolError();
        }
    }

    /**
     * @dev Claims protocol incentives from Aave
     * @return incentiveAmount The amount of incentives claimed
     */
    function _claimProtocolIncentives() internal returns (uint256 incentiveAmount) {
        // Mock incentives claim
        // In production: IRewardsController(incentivesController).claimAllRewards(assets, address(this));
        
        incentiveAmount = (_totalAssets * 50) / 10000; // Mock 0.5% incentives
        _totalIncentivesEarned += incentiveAmount;
        
        bool success = true; // Mock success
        
        emit AaveProtocolInteraction("claimIncentives", incentiveAmount, success);
        
        if (!success) {
            incentiveAmount = 0;
        }
        
        return incentiveAmount;
    }

    /**
     * @dev Claims incentives for a specific user
     * @param user The user address
     * @return incentiveAmount The amount of incentives claimed
     */
    function _claimUserIncentives(address user) internal returns (uint256 incentiveAmount) {
        incentiveAmount = _accruedIncentives[user];
        if (incentiveAmount > 0) {
            _accruedIncentives[user] = 0;
            
            // Transfer incentives to user (in production, this would be the actual reward token)
            // For now, we'll track it as additional yield
            
            emit IncentivesClaimed(user, incentiveAmount);
        }
        
        return incentiveAmount;
    }

    /**
     * @dev Updates the current utilization rate from Aave
     */
    function _updateUtilization() internal {
        // Mock utilization calculation
        // In production: get from Aave Pool's reserve data
        
        uint256 oldUtilization = _currentUtilization;
        
        // Simulate utilization based on total assets (mock calculation)
        _currentUtilization = (_totalAssets * 6000) / MAX_CAPACITY; // Mock utilization
        
        if (_currentUtilization > UTILIZATION_THRESHOLD) {
            emit LiquidityRiskDetected(_currentUtilization, UTILIZATION_THRESHOLD);
        }
        
        if (oldUtilization != _currentUtilization) {
            emit UtilizationUpdated(oldUtilization, _currentUtilization);
        }
        
        _lastUtilizationUpdate = block.timestamp;
    }

    /**
     * @dev Updates Aave state including aToken balance and APY
     */
    function _updateAaveState() internal {
        // Update aToken balance
        uint256 currentBalance = IERC20(aToken).balanceOf(address(this));
        _aTokenBalance = currentBalance;
        
        // Update APY based on current Aave rates
        // In production: get from Aave Pool's reserve data
        uint256 newAPY = BASE_APY;
        
        // Adjust APY based on utilization
        if (_currentUtilization > 5000) { // >50% utilization
            newAPY = (BASE_APY * (10000 + _currentUtilization)) / 10000;
        }
        
        if (newAPY != _currentAPY) {
            uint256 oldAPY = _currentAPY;
            _currentAPY = newAPY;
            emit APYUpdated(oldAPY, newAPY);
        }
    }
}