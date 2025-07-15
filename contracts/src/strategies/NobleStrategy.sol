// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IYieldStrategy.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title NobleStrategy
 * @dev Yield strategy that integrates with Noble Protocol for T-bill yields
 * @notice This strategy provides stable, low-risk yields through US Treasury bills
 * @author YieldRails Team
 */
contract NobleStrategy is IYieldStrategy, ReentrancyGuard, Pausable, AccessControl {
    using SafeERC20 for IERC20;

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // CONSTANTS & IMMUTABLES
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");
    bytes32 public constant HARVESTER_ROLE = keccak256("HARVESTER_ROLE");
    
    address public immutable override asset;
    address public immutable nobleProtocol;
    
    uint256 public constant MAX_CAPACITY = 100_000_000e6; // 100M USDC
    uint256 public constant MIN_DEPOSIT = 1000e6; // 1000 USDC minimum
    uint256 public constant RISK_SCORE = 2; // Low risk (1-10 scale)
    uint256 public constant BASE_APY = 450; // 4.5% base APY in basis points

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // STATE VARIABLES
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    string private _name;
    string private _description;
    
    uint256 private _totalAssets;
    uint256 private _totalShares;
    uint256 private _totalYieldGenerated;
    uint256 private _lastHarvestTime;
    uint256 private _currentAPY;
    
    mapping(address => uint256) private _balances;
    mapping(address => uint256) private _depositTimestamps;
    mapping(address => uint256) private _lastYieldCalculation;

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // CUSTOM ERRORS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    error InsufficientAmount();
    error InsufficientShares();
    error InsufficientBalance();
    error ExceedsMaxCapacity();
    error BelowMinimumDeposit();
    error NobleProtocolError();
    error YieldCalculationFailed();
    error EmergencyWithdrawalFailed();
    error InvalidAddress();
    error StrategyInactive();

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // EVENTS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    event NobleProtocolInteraction(string action, uint256 amount, bool success);
    event APYUpdated(uint256 oldAPY, uint256 newAPY);
    event EmergencyWithdrawalExecuted(address indexed user, uint256 amount);

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Constructor for NobleStrategy
     * @param _asset The underlying asset (USDC)
     * @param _nobleProtocol The Noble Protocol contract address
     */
    constructor(
        address _asset,
        address _nobleProtocol
    ) {
        if (_asset == address(0) || _nobleProtocol == address(0)) {
            revert InvalidAddress();
        }
        
        asset = _asset;
        nobleProtocol = _nobleProtocol;
        _name = "Noble T-Bill Strategy";
        _description = "Low-risk yield strategy backed by US Treasury bills via Noble Protocol";
        _currentAPY = BASE_APY;
        _lastHarvestTime = block.timestamp;
        
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MANAGER_ROLE, msg.sender);
        _grantRole(HARVESTER_ROLE, msg.sender);
    }

    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
    // DEPOSIT & WITHDRAWAL FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Deposits assets into the Noble T-bill strategy
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

        // Interact with Noble Protocol
        _depositToNoble(amount);

        emit Deposit(msg.sender, amount, shares);
        return shares;
    }

    /**
     * @dev Withdraws assets from the Noble T-bill strategy
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
        
        // Update user balance and global state
        _balances[msg.sender] -= shares;
        _totalShares -= shares;
        _totalAssets -= amount;

        // Withdraw from Noble Protocol
        _withdrawFromNoble(amount);

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

            // Emergency withdraw from Noble (may have penalties)
            _emergencyWithdrawFromNoble(amount);

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
        
        // Calculate yield: (principal * APY * time) / (10000 * seconds_in_year)
        uint256 annualYield = (userAssets * _currentAPY) / 10000;
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
     * @dev Harvests yield from the Noble Protocol
     * @return yieldHarvested The amount of yield harvested
     */
    function harvestYield() 
        external 
        override 
        onlyRole(HARVESTER_ROLE) 
        nonReentrant 
        returns (uint256 yieldHarvested) 
    {
        yieldHarvested = _harvestFromNoble();
        
        if (yieldHarvested > 0) {
            _totalYieldGenerated += yieldHarvested;
            _totalAssets += yieldHarvested;
            _lastHarvestTime = block.timestamp;
            
            emit YieldHarvested(yieldHarvested, _totalAssets);
        }
        
        return yieldHarvested;
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
            active: !paused()
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
        // For T-bills, performance is relatively stable
        // Return current APY as performance metric
        return _currentAPY;
    }

    /**
     * @dev Checks if the strategy is profitable
     * @return profitable Whether the strategy is currently profitable
     */
    function isProfitable() external view override returns (bool profitable) {
        return _currentAPY > 0 && !paused();
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
    // INTERNAL FUNCTIONS - NOBLE PROTOCOL INTEGRATION
    // ═══════════════════════════════════════════════════════════════════════════════════════════════════════════

    /**
     * @dev Deposits assets to Noble Protocol
     * @param amount The amount to deposit
     */
    function _depositToNoble(uint256 amount) internal {
        // Mock Noble Protocol interaction
        // In production, this would interact with actual Noble Protocol contracts
        IERC20(asset).safeApprove(nobleProtocol, 0);
        IERC20(asset).safeApprove(nobleProtocol, amount);
        
        // Simulate Noble Protocol deposit
        // (bool success,) = nobleProtocol.call(
        //     abi.encodeWithSignature("deposit(uint256)", amount)
        // );
        
        bool success = true; // Mock success for now
        
        emit NobleProtocolInteraction("deposit", amount, success);
        
        if (!success) {
            revert NobleProtocolError();
        }
    }

    /**
     * @dev Withdraws assets from Noble Protocol
     * @param amount The amount to withdraw
     */
    function _withdrawFromNoble(uint256 amount) internal {
        // Mock Noble Protocol interaction
        // In production, this would interact with actual Noble Protocol contracts
        
        // Simulate Noble Protocol withdrawal
        // (bool success,) = nobleProtocol.call(
        //     abi.encodeWithSignature("withdraw(uint256)", amount)
        // );
        
        bool success = true; // Mock success for now
        
        emit NobleProtocolInteraction("withdraw", amount, success);
        
        if (!success) {
            revert NobleProtocolError();
        }
    }

    /**
     * @dev Emergency withdrawal from Noble Protocol
     * @param amount The amount to withdraw
     */
    function _emergencyWithdrawFromNoble(uint256 amount) internal {
        // Mock Noble Protocol emergency withdrawal
        // May incur penalties in production
        
        bool success = true; // Mock success for now
        
        emit NobleProtocolInteraction("emergencyWithdraw", amount, success);
        
        if (!success) {
            revert NobleProtocolError();
        }
    }

    /**
     * @dev Harvests yield from Noble Protocol
     * @return yieldAmount The amount of yield harvested
     */
    function _harvestFromNoble() internal returns (uint256 yieldAmount) {
        // Mock Noble Protocol yield harvest
        // In production, this would claim T-bill yields
        
        // Calculate expected yield since last harvest
        uint256 timeElapsed = block.timestamp - _lastHarvestTime;
        uint256 annualYield = (_totalAssets * _currentAPY) / 10000;
        uint256 secondsInYear = 365 * 24 * 60 * 60;
        
        yieldAmount = (annualYield * timeElapsed) / secondsInYear;
        
        // Simulate yield harvest from Noble
        // (bool success, bytes memory data) = nobleProtocol.call(
        //     abi.encodeWithSignature("harvestYield()")
        // );
        
        bool success = true; // Mock success for now
        
        emit NobleProtocolInteraction("harvest", yieldAmount, success);
        
        if (!success) {
            yieldAmount = 0;
        }
        
        return yieldAmount;
    }
}