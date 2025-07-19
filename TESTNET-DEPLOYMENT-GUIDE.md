# YieldRails Testnet Deployment Guide

This guide provides instructions for deploying YieldRails smart contracts to various testnets.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Supported Networks](#supported-networks)
- [Environment Setup](#environment-setup)
- [Deployment Process](#deployment-process)
- [Contract Verification](#contract-verification)
- [Testing Deployed Contracts](#testing-deployed-contracts)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Node.js 18 or higher
- Hardhat installed
- Private key with testnet funds
- API keys for block explorers (Etherscan, Polygonscan, etc.)

## Supported Networks

YieldRails supports deployment to the following testnets:

- Ethereum Sepolia
- Polygon Mumbai
- Arbitrum Goerli
- Base Goerli
- XRP EVM Sidechain Testnet
- Solana Devnet

## Environment Setup

1. Navigate to the contracts directory:
   ```bash
   cd contracts
   ```

2. Create environment file:
   ```bash
   cp .env.example .env.testnet
   ```

3. Update the `.env.testnet` file with your private key and API keys:
   ```
   PRIVATE_KEY=your_private_key_here
   ETHERSCAN_API_KEY=your_etherscan_api_key
   POLYGONSCAN_API_KEY=your_polygonscan_api_key
   ARBISCAN_API_KEY=your_arbiscan_api_key
   BASESCAN_API_KEY=your_basescan_api_key
   ```

## Deployment Process

### 1. Get Testnet Funds

Run the script to get testnet funds:

```bash
node scripts/get-testnet-funds.js
```

This script will:
- Check your balance on each testnet
- Provide links to faucets if needed
- Wait for confirmation of funds

### 2. Deploy Contracts

To deploy to all supported testnets:

```bash
npx hardhat run scripts/deploy.js --network all-testnets
```

To deploy to a specific testnet:

```bash
npx hardhat run scripts/deploy.js --network sepolia
npx hardhat run scripts/deploy.js --network mumbai
npx hardhat run scripts/deploy.js --network arbitrum-goerli
npx hardhat run scripts/deploy.js --network base-goerli
npx hardhat run scripts/deploy.js --network xrp-testnet
npx hardhat run scripts/deploy.js --network solana-devnet
```

### 3. Deploy Optimized Contracts

For gas-optimized versions:

```bash
npx hardhat run scripts/deploy-optimized.js --network sepolia
```

## Contract Verification

Verify contracts on block explorers:

```bash
npx hardhat run scripts/verify-contracts.js --network sepolia
```

This script will:
- Retrieve deployment addresses from deployment files
- Verify each contract on the appropriate block explorer
- Log verification status and links

## Testing Deployed Contracts

Run basic tests against deployed contracts:

```bash
npx hardhat run scripts/validate-deployment.js --network sepolia
```

This script will:
- Connect to deployed contracts
- Run basic functionality tests (deposit, yield calculation, etc.)
- Verify contract state and configuration

## Troubleshooting

### Common Issues

1. **Insufficient Funds**:
   - Use the faucet links provided by the `get-testnet-funds.js` script
   - Check your balance with `npx hardhat balance --network sepolia`

2. **Failed Transactions**:
   - Increase gas limit in Hardhat config
   - Check network congestion and adjust gas price

3. **Verification Failures**:
   - Ensure compiler version matches between deployment and verification
   - Check that all constructor arguments are correctly provided
   - Wait a few minutes after deployment before verifying

### Network-Specific Issues

#### Ethereum Sepolia
- Faucet: https://sepoliafaucet.com/
- Block Explorer: https://sepolia.etherscan.io/

#### Polygon Mumbai
- Faucet: https://faucet.polygon.technology/
- Block Explorer: https://mumbai.polygonscan.com/

#### Arbitrum Goerli
- Faucet: https://goerlifaucet.com/
- Block Explorer: https://goerli.arbiscan.io/

#### Base Goerli
- Faucet: https://goerli-faucet.pk910.de/
- Block Explorer: https://goerli.basescan.org/

## Deployment Records

After successful deployment, update the deployment records in `deployments/` directory with:

- Contract addresses
- Deployment transaction hashes
- Block numbers
- Network information
- Deployment timestamp