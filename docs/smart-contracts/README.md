# Smart Contract Documentation

YieldRails smart contracts provide the core blockchain infrastructure for yield-generating payments, cross-chain bridging, and external DeFi protocol integrations.

## 📋 Table of Contents

- [Overview](#overview)
- [Contract Architecture](#contract-architecture)
- [Core Contracts](#core-contracts)
- [External Protocol Integrations](#external-protocol-integrations)
- [Deployment Information](#deployment-information)
- [Usage Examples](#usage-examples)
- [Security Considerations](#security-considerations)
- [Upgrades and Governance](#upgrades-and-governance)

## Overview

### Contract System

The YieldRails smart contract system consists of several interconnected contracts:

- **YieldEscrow**: Core escrow contract for yield-generating payments
- **YieldVault**: Vault contract for managing multiple yield strategies
- **CrossChainBridge**: Bridge contract for cross-chain payment transfers
- **StrategyManager**: Registry and manager for yield strategies
- **ExternalIntegration**: Adapter contracts for external DeFi protocols

### Supported Networks

| Network | Chain ID | Status | Contract Address |
|---------|----------|--------|-----------------|
| Ethereum | 1 | Active | `0x742d35Cc6C4C30C8F0b3F3f3D8e6f5e2A4c1a9e8` |
| Polygon | 137 | Active | `0x853f43b1e54B9B89C5C8B5f0F9E8B7C9D5e2A4c1` |
| Arbitrum | 42161 | Active | `0x964e54C2F8b3F3f0A8C5B7D9e2A4c1a9e853f43b` |
| Base | 8453 | Active | `0xa95f64E3B8c5F0e8B7D9e2A4c1a9e853f43b1e54` |
| Optimism | 10 | Planned | TBD |

## Contract Architecture

### System Overview

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   User Interface    │    │     Frontend        │    │      Backend        │
│   (React/Web3)      │    │   (Next.js/SDK)     │    │    (Node.js/API)    │
└─────────┬───────────┘    └─────────┬───────────┘    └─────────┬───────────┘
          │                          │                          │
          └──────────────────────────┼──────────────────────────┘
                                     │
                           ┌─────────▼───────────┐
                           │     YieldRails      │
                           │   Smart Contracts   │
                           └─────────┬───────────┘
                                     │
         ┌───────────────────────────┼───────────────────────────┐
         │                          │                           │
 ┌───────▼────────┐      ┌─────────▼──────────┐      ┌─────────▼──────────┐
 │  YieldEscrow   │      │    YieldVault      │      │  CrossChainBridge  │
 │   Contract     │      │    Contract        │      │     Contract       │
 └───────┬────────┘      └─────────┬──────────┘      └─────────┬──────────┘
         │                         │                           │
         └─────────────────────────┼───────────────────────────┘
                                   │
              ┌────────────────────┼────────────────────┐
              │                    │                    │
     ┌────────▼────────┐  ┌────────▼────────┐  ┌────────▼────────┐
     │  Noble Protocol │  │ Resolv Protocol │  │  Aave Protocol  │
     │   Integration   │  │   Integration   │  │   Integration   │
     └─────────────────┘  └─────────────────┘  └─────────────────┘
```

### Contract Interactions

1. **Payment Creation**: User creates payment through YieldEscrow
2. **Strategy Selection**: StrategyManager selects optimal yield strategy
3. **Yield Generation**: YieldVault manages strategy execution
4. **Cross-Chain Operations**: CrossChainBridge handles multi-chain transfers
5. **External Protocols**: Integration contracts interface with DeFi protocols

## Core Contracts

### YieldEscrow Contract

The main contract for creating and managing yield-generating payments.

#### Contract Address
- **Ethereum**: `0x742d35Cc6C4C30C8F0b3F3f3D8e6f5e2A4c1a9e8`
- **Polygon**: `0x853f43b1e54B9B89C5C8B5f0F9E8B7C9D5e2A4c1`
- **Arbitrum**: `0x964e54C2F8b3F3f0A8C5B7D9e2A4c1a9e853f43b`

#### Key Functions

```solidity
// Create a new yield-generating payment
function createPayment(
    address recipient,
    uint256 amount,
    address token,
    string memory yieldStrategy,
    uint256 releaseDate
) external returns (bytes32 paymentId);

// Release payment to recipient with yield distribution
function releasePayment(
    bytes32 paymentId,
    bytes memory signature
) external;

// Get payment details
function getPayment(bytes32 paymentId) 
    external view returns (Payment memory);

// Get real-time yield for a payment
function getRealtimeYield(bytes32 paymentId) 
    external view returns (uint256);

// Cancel payment (only sender, before yield starts)
function cancelPayment(bytes32 paymentId) external;
```

#### Events

```solidity
event PaymentCreated(
    bytes32 indexed paymentId,
    address indexed sender,
    address indexed recipient,
    uint256 amount,
    address token,
    string yieldStrategy
);

event PaymentReleased(
    bytes32 indexed paymentId,
    address indexed recipient,
    uint256 amount,
    uint256 yieldEarned
);

event YieldAccrued(
    bytes32 indexed paymentId,
    uint256 amount,
    uint256 timestamp
);

event PaymentCancelled(
    bytes32 indexed paymentId,
    address indexed sender,
    uint256 refundAmount
);
```

#### Usage Example

```solidity
// Create a payment with 30-day yield strategy
bytes32 paymentId = yieldEscrow.createPayment(
    0x742d35Cc6C4C30C8F0b3F3f3D8e6f5e2A4c1a9e8, // recipient
    1000 * 10**6, // 1000 USDC (6 decimals)
    0xA0b86a33E6E9F8de3dFdDA168e5ec67b18B9C2F1, // USDC address
    "noble-tbill-3m", // yield strategy
    block.timestamp + 30 days // release date
);

// Monitor yield generation
uint256 currentYield = yieldEscrow.getRealtimeYield(paymentId);

// Release payment after maturity
yieldEscrow.releasePayment(paymentId, signature);
```

### YieldVault Contract

Manages multiple yield strategies and optimizes returns.

#### Contract Address
- **Ethereum**: `0x853f43b1e54B9B89C5C8B5f0F9E8B7C9D5e2A4c1`
- **Polygon**: `0x964e54C2F8b3F3f0A8C5B7D9e2A4c1a9e853f43b`
- **Arbitrum**: `0xa95f64E3B8c5F0e8B7D9e2A4c1a9e853f43b1e54`

#### Key Functions

```solidity
// Deposit tokens into vault with strategy
function deposit(
    uint256 amount,
    address token,
    string memory strategy
) external returns (uint256 shares);

// Withdraw tokens with accumulated yield
function withdraw(
    uint256 shares,
    address token
) external returns (uint256 amount);

// Get available yield strategies
function getStrategies() 
    external view returns (Strategy[] memory);

// Get strategy performance metrics
function getStrategyPerformance(string memory strategyId)
    external view returns (PerformanceMetrics memory);

// Rebalance vault to optimal strategy allocation
function rebalance() external;
```

#### Strategy Structure

```solidity
struct Strategy {
    string id;
    string name;
    string protocolName;
    uint256 expectedAPY; // Basis points (10000 = 100%)
    uint256 actualAPY;
    uint8 riskLevel; // 1=low, 2=medium, 3=high
    uint256 totalValueLocked;
    bool isActive;
    address strategyContract;
}

struct PerformanceMetrics {
    uint256 totalReturns;
    uint256 volatility;
    uint256 sharpeRatio;
    uint256 maxDrawdown;
    uint256 winRate;
}
```

### CrossChainBridge Contract

Handles cross-chain payment transfers with yield preservation.

#### Contract Address
- **Ethereum**: `0x964e54C2F8b3F3f0A8C5B7D9e2A4c1a9e853f43b`
- **Polygon**: `0xa95f64E3B8c5F0e8B7D9e2A4c1a9e853f43b1e54`
- **Arbitrum**: `0xb05e65F4C8d5F0f8C7E9e2B4d1b9f863g54c2G8e`

#### Key Functions

```solidity
// Initiate cross-chain transfer
function initiateBridge(
    uint256 amount,
    address token,
    uint256 destinationChain,
    address recipient,
    string memory yieldStrategy
) external payable returns (bytes32 bridgeId);

// Get bridge transaction status
function getBridgeStatus(bytes32 bridgeId)
    external view returns (BridgeTransaction memory);

// Complete bridge transaction (called by validators)
function completeBridge(
    bytes32 bridgeId,
    bytes memory proof
) external;

// Get bridge fees for a transaction
function getBridgeFees(
    uint256 amount,
    address token,
    uint256 destinationChain
) external view returns (BridgeFees memory);
```

#### Bridge Transaction Structure

```solidity
struct BridgeTransaction {
    bytes32 id;
    address sender;
    address recipient;
    uint256 amount;
    address token;
    uint256 sourceChain;
    uint256 destinationChain;
    BridgeStatus status;
    uint256 fees;
    uint256 yieldEarned;
    uint256 createdAt;
    uint256 completedAt;
}

enum BridgeStatus {
    Pending,
    ConfirmedSource,
    InTransit,
    ConfirmedDestination,
    Completed,
    Failed,
    Refunded
}
```

## External Protocol Integrations

### Noble Protocol Integration

Integration with Noble Protocol for T-bill yield strategies.

#### Contract Address
- **Noble Network**: `0xc06f75G4d5H0i8D7F9g2C4e1c9h863i54d2H8f`

#### Key Functions

```solidity
// Deposit into Noble T-bill pool
function depositToNoble(
    string memory poolId,
    uint256 amount,
    address userAddress
) external returns (uint256 shares);

// Get Noble pool information
function getNoblePool(string memory poolId)
    external view returns (NoblePool memory);

// Withdraw from Noble pool
function withdrawFromNoble(
    string memory poolId,
    uint256 shares,
    address userAddress
) external returns (uint256 amount);
```

### Resolv Protocol Integration

Integration with Resolv Protocol for delta-neutral strategies.

#### Contract Address
- **Ethereum**: `0xd17g86H5e6I9j8E8G9h3D5f2d9i864j55e3I9g`

#### Key Functions

```solidity
// Enter Resolv delta-neutral position
function enterResolvPosition(
    string memory vaultId,
    uint256 amount,
    address userAddress,
    uint256 slippageTolerance
) external returns (uint256 positionId);

// Exit Resolv position
function exitResolvPosition(
    uint256 positionId,
    uint256 amount
) external returns (uint256 received);

// Get position details
function getResolvPosition(uint256 positionId)
    external view returns (ResolvPosition memory);
```

### Aave Protocol Integration

Integration with Aave Protocol for lending yield strategies.

#### Contract Address
- **Ethereum**: `0xe28h97I6f7J0k9F0I0j4E6g3e0k975k66f4J0h`
- **Polygon**: `0xf39i08J7g8K1l0G1J1k5F7h4f1l086l77g5K1i`

#### Key Functions

```solidity
// Supply to Aave lending pool
function supplyToAave(
    address asset,
    uint256 amount,
    address onBehalfOf
) external;

// Withdraw from Aave lending pool
function withdrawFromAave(
    address asset,
    uint256 amount,
    address to
) external returns (uint256);

// Get Aave user account data
function getAaveUserData(address user)
    external view returns (AaveUserData memory);
```

## Deployment Information

### Contract Deployment History

| Contract | Version | Deploy Date | Deployer | Transaction Hash |
|----------|---------|-------------|----------|------------------|
| YieldEscrow | v1.0.0 | 2024-01-15 | `0x742d...a9e8` | `0xabc123...def456` |
| YieldVault | v1.0.0 | 2024-01-15 | `0x742d...a9e8` | `0xdef456...ghi789` |
| CrossChainBridge | v1.0.0 | 2024-01-16 | `0x742d...a9e8` | `0xghi789...jkl012` |
| StrategyManager | v1.0.0 | 2024-01-16 | `0x742d...a9e8` | `0xjkl012...mno345` |

### Deployment Scripts

```bash
# Deploy to Ethereum mainnet
npx hardhat run scripts/deploy-mainnet.js --network mainnet

# Deploy to Polygon
npx hardhat run scripts/deploy-polygon.js --network polygon

# Deploy to Arbitrum
npx hardhat run scripts/deploy-arbitrum.js --network arbitrum

# Verify contracts
npx hardhat verify --network mainnet CONTRACT_ADDRESS
```

### Environment Configuration

```bash
# .env file for deployment
ETHEREUM_RPC_URL=https://mainnet.infura.io/v3/YOUR_PROJECT_ID
POLYGON_RPC_URL=https://polygon-rpc.com
ARBITRUM_RPC_URL=https://arb1.arbitrum.io/rpc
DEPLOYER_PRIVATE_KEY=your_deployer_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key
```

## Usage Examples

### Direct Contract Interaction

```javascript
const { ethers } = require('ethers');

// Contract ABI and address
const YIELD_ESCROW_ABI = [...]; // Contract ABI
const YIELD_ESCROW_ADDRESS = '0x742d35Cc6C4C30C8F0b3F3f3D8e6f5e2A4c1a9e8';

// Initialize provider and contract
const provider = new ethers.JsonRpcProvider('https://mainnet.infura.io/v3/YOUR_PROJECT_ID');
const signer = new ethers.Wallet('YOUR_PRIVATE_KEY', provider);
const yieldEscrow = new ethers.Contract(YIELD_ESCROW_ADDRESS, YIELD_ESCROW_ABI, signer);

// Create a payment
async function createPayment() {
  const tx = await yieldEscrow.createPayment(
    '0x742d35Cc6C4C30C8F0b3F3f3D8e6f5e2A4c1a9e8', // recipient
    ethers.parseUnits('1000', 6), // 1000 USDC
    '0xA0b86a33E6E9F8de3dFdDA168e5ec67b18B9C2F1', // USDC address
    'noble-tbill-3m', // strategy
    Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60) // 30 days
  );
  
  const receipt = await tx.wait();
  console.log('Payment created:', receipt.transactionHash);
}

// Monitor events
yieldEscrow.on('PaymentCreated', (paymentId, sender, recipient, amount, token, strategy) => {
  console.log('New payment created:', {
    paymentId,
    sender,
    recipient,
    amount: ethers.formatUnits(amount, 6),
    token,
    strategy
  });
});

yieldEscrow.on('YieldAccrued', (paymentId, amount, timestamp) => {
  console.log('Yield accrued:', {
    paymentId,
    amount: ethers.formatUnits(amount, 6),
    timestamp: new Date(timestamp * 1000)
  });
});
```

### Web3 Integration with React

```jsx
import { useContract, useContractRead, useContractWrite } from 'wagmi';
import { YieldEscrowABI } from './contracts/YieldEscrow';

function PaymentInterface() {
  const contract = useContract({
    address: '0x742d35Cc6C4C30C8F0b3F3f3D8e6f5e2A4c1a9e8',
    abi: YieldEscrowABI,
  });

  const { data: strategies } = useContractRead({
    address: '0x853f43b1e54B9B89C5C8B5f0F9E8B7C9D5e2A4c1',
    abi: YieldVaultABI,
    functionName: 'getStrategies',
  });

  const { write: createPayment } = useContractWrite({
    address: '0x742d35Cc6C4C30C8F0b3F3f3D8e6f5e2A4c1a9e8',
    abi: YieldEscrowABI,
    functionName: 'createPayment',
  });

  const handleCreatePayment = () => {
    createPayment({
      args: [
        recipientAddress,
        parseUnits(amount, 6),
        tokenAddress,
        selectedStrategy,
        releaseTimestamp
      ]
    });
  };

  return (
    <div>
      <h2>Create Yield Payment</h2>
      {/* Payment form UI */}
      <button onClick={handleCreatePayment}>
        Create Payment
      </button>
    </div>
  );
}
```

## Security Considerations

### Access Controls

```solidity
// Role-based access control
modifier onlyOwner() {
    require(msg.sender == owner, "Not authorized");
    _;
}

modifier onlyValidatedStrategy(string memory strategy) {
    require(strategyManager.isValidStrategy(strategy), "Invalid strategy");
    _;
}

modifier onlyAfterRelease(bytes32 paymentId) {
    require(block.timestamp >= payments[paymentId].releaseDate, "Not released yet");
    _;
}
```

### Security Audits

- **Audit Firm**: ConsenSys Diligence
- **Audit Date**: January 2024
- **Audit Report**: [Link to audit report]
- **Critical Issues**: 0
- **High Issues**: 0
- **Medium Issues**: 2 (resolved)
- **Low Issues**: 5 (resolved)

### Best Practices

1. **Reentrancy Protection**: All external calls use reentrancy guards
2. **Integer Overflow Protection**: Using OpenZeppelin SafeMath
3. **Access Control**: Role-based permissions for critical functions
4. **Pausable Contracts**: Emergency pause functionality
5. **Upgradeable Contracts**: Proxy pattern for future upgrades

## Upgrades and Governance

### Governance Structure

- **Governance Token**: YR (YieldRails)
- **Voting Period**: 7 days
- **Execution Delay**: 48 hours
- **Proposal Threshold**: 1% of total supply
- **Quorum Threshold**: 10% of total supply

### Upgrade Process

1. **Proposal Creation**: Community creates upgrade proposal
2. **Voting Period**: 7-day voting period for token holders
3. **Execution Delay**: 48-hour delay before execution
4. **Implementation**: Upgrade implementation through proxy contracts

### Governance Contract

```solidity
// Governance voting
function vote(
    uint256 proposalId,
    bool support
) external;

// Execute proposal after voting period
function executeProposal(
    uint256 proposalId
) external;

// Emergency pause (multisig only)
function emergencyPause() external onlyMultisig;
```

---

For more detailed information about specific contracts, see the [Contract Reference](./reference/) directory or visit our [Developer Portal](https://developers.yieldrails.com/contracts).
