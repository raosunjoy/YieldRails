// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/IYieldStrategy.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/**
 * @title MockYieldStrategy
 * @dev Mock yield strategy for testing purposes
 */
contract MockYieldStrategy is IYieldStrategy {
    using SafeERC20 for IERC20;

    address public immutable override asset;
    string private _name;
    uint256 private _totalAssets;
    uint256 private _totalShares;
    uint256 private _userYield;
    uint256 private _currentAPY = 400; // 4% default
    bool private _shouldFail = false;

    mapping(address => uint256) private _balances;

    constructor(address _asset) {
        asset = _asset;
        _name = "Mock Strategy";
    }

    // Test helper functions
    function setUserYield(uint256 amount) external {
        _userYield = amount;
    }

    function setShouldFail(bool shouldFail) external {
        _shouldFail = shouldFail;
    }

    function setCurrentAPY(uint256 apy) external {
        _currentAPY = apy;
    }

    function setName(string memory strategyName) external {
        _name = strategyName;
    }

    // Additional methods for testing compatibility
    function name() external view returns (string memory) {
        return _name;
    }

    function currentAPY() external view returns (uint256) {
        return _currentAPY;
    }

    function totalDeposited() external view returns (uint256) {
        return _totalAssets;
    }

    function calculateYield(uint256 principal, uint256 timeInSeconds) external view returns (uint256) {
        // Simple yield calculation: (principal * APY * time) / (10000 * seconds_in_year)
        uint256 annualYield = (principal * _currentAPY) / 10000;
        uint256 secondsInYear = 365 * 24 * 60 * 60;
        return (annualYield * timeInSeconds) / secondsInYear;
    }

    // IYieldStrategy implementation
    function deposit(uint256 amount) external override returns (uint256 shares) {
        IERC20(asset).safeTransferFrom(msg.sender, address(this), amount);
        
        shares = convertToShares(amount);
        _balances[msg.sender] += shares;
        _totalShares += shares;
        _totalAssets += amount;

        emit Deposit(msg.sender, amount, shares);
        return shares;
    }

    function withdraw(uint256 shares) external override returns (uint256 amount) {
        require(_balances[msg.sender] >= shares, "Insufficient shares");
        
        amount = convertToAssets(shares);
        _balances[msg.sender] -= shares;
        _totalShares -= shares;
        _totalAssets -= amount;

        IERC20(asset).safeTransfer(msg.sender, amount);

        emit Withdrawal(msg.sender, amount, shares);
        return amount;
    }

    function emergencyWithdraw(address user) external override returns (uint256 amount) {
        uint256 userShares = _balances[user];
        if (userShares == 0) return 0;

        amount = convertToAssets(userShares);
        _balances[user] = 0;
        _totalShares -= userShares;
        _totalAssets -= amount;

        IERC20(asset).safeTransfer(user, amount);
        return amount;
    }

    function getCurrentAPY() external view override returns (uint256) {
        return _currentAPY;
    }

    function calculateUserYield(address user) external view override returns (uint256) {
        if (_shouldFail) {
            revert("Mock strategy failure");
        }
        return _userYield;
    }

    function getTotalYieldGenerated() external view override returns (uint256) {
        return _userYield;
    }

    function harvestYield() external override returns (uint256) {
        emit YieldHarvested(_userYield, _totalAssets);
        return _userYield;
    }

    function convertToShares(uint256 assets) public view override returns (uint256) {
        if (_totalAssets == 0) return assets;
        return (assets * _totalShares) / _totalAssets;
    }

    function convertToAssets(uint256 shares) public view override returns (uint256) {
        if (_totalShares == 0) return shares;
        return (shares * _totalAssets) / _totalShares;
    }

    function balanceOf(address user) external view override returns (uint256) {
        return _balances[user];
    }

    function getStrategyInfo() external view override returns (StrategyInfo memory) {
        return StrategyInfo({
            name: "Mock Strategy",
            description: "Mock yield strategy for testing",
            totalAssets: _totalAssets,
            totalShares: _totalShares,
            currentAPY: _currentAPY,
            riskScore: 1,
            lastHarvest: block.timestamp,
            active: true
        });
    }

    function totalAssets() external view override returns (uint256) {
        return _totalAssets;
    }

    function getRiskScore() external pure override returns (uint256) {
        return 1;
    }

    function getPerformanceData(uint256) external view override returns (uint256) {
        return _currentAPY;
    }

    function isProfitable() external pure override returns (bool) {
        return true;
    }

    function maxCapacity() external pure override returns (uint256) {
        return type(uint256).max;
    }

    function utilizationRate() external view override returns (uint256) {
        return _totalAssets > 0 ? (_totalAssets * 10000) / this.maxCapacity() : 0;
    }
}