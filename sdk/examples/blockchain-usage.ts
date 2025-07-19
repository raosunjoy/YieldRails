/**
 * Blockchain interaction examples for YieldRails SDK
 * Demonstrates both low-level contract interactions and high-level YieldRails-specific methods
 */

import { YieldRailsSDK, ChainName, TokenSymbol, getContractAddress } from '@yieldrails/sdk';
import { ethers } from 'ethers';

// Sample ABI for YieldEscrow contract
const YIELD_ESCROW_ABI = [
  {
    "inputs": [
      { "name": "amount", "type": "uint256" },
      { "name": "token", "type": "address" },
      { "name": "merchant", "type": "address" },
      { "name": "strategy", "type": "address" },
      { "name": "paymentHash", "type": "bytes32" },
      { "name": "metadata", "type": "string" }
    ],
    "name": "createDeposit",
    "outputs": [{ "name": "depositIndex", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "user", "type": "address" },
      { "name": "depositIndex", "type": "uint256" }
    ],
    "name": "releasePayment",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "name": "user", "type": "address" },
      { "name": "depositIndex", "type": "uint256" }
    ],
    "name": "calculateYield",
    "outputs": [{ "name": "yield", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// Sample ABI for ERC20 token
const ERC20_ABI = [
  {
    "inputs": [
      { "name": "spender", "type": "address" },
      { "name": "amount", "type": "uint256" }
    ],
    "name": "approve",
    "outputs": [{ "name": "", "type": "bool" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "name": "account", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

// Contract addresses (these would be different per chain in a real implementation)
const CONTRACT_ADDRESSES = {
  [ChainName.ethereum]: {
    YieldEscrow: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9',
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  },
  [ChainName.polygon]: {
    YieldEscrow: '0x123d35Cc6634C0532925a3b8D4C9db96C4b4d456',
    USDC: '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
  }
};

async function blockchainExamples() {
  try {
    console.log('=== Blockchain Interaction Examples ===');
    
    // Initialize SDK
    const sdk = new YieldRailsSDK({
      apiUrl: 'https://api.yieldrails.com',
      apiKey: 'your-api-key',
    });

    // 1. Connect to wallet (in browser environment)
    console.log('\n1. Connecting to wallet...');
    let signer;
    
    if (typeof window !== 'undefined' && window.ethereum) {
      // Browser environment with MetaMask or similar
      const provider = new ethers.BrowserProvider(window.ethereum);
      signer = await sdk.connectWallet(provider);
      console.log('Connected wallet address:', await signer.getAddress());
    } else {
      // Node.js environment (using private key for demo)
      console.log('Using private key for demo (in production, use secure key management)');
      const provider = new ethers.JsonRpcProvider('https://mainnet.infura.io/v3/your-infura-key');
      const privateKey = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      signer = new ethers.Wallet(privateKey, provider);
    }

    // 2. Initialize contracts
    console.log('\n2. Initializing contracts...');
    const chain = ChainName.ethereum;
    
    // Initialize YieldEscrow contract
    const escrowContract = sdk.initContract(
      'YieldEscrow',
      CONTRACT_ADDRESSES[chain].YieldEscrow,
      YIELD_ESCROW_ABI,
      chain,
      signer
    );
    console.log('YieldEscrow contract initialized');
    
    // Initialize USDC token contract
    const usdcContract = sdk.initContract(
      'USDC',
      CONTRACT_ADDRESSES[chain].USDC,
      ERC20_ABI,
      chain,
      signer
    );
    console.log('USDC contract initialized');

    // 3. Read from blockchain
    console.log('\n3. Reading from blockchain...');
    
    // Check USDC balance
    const userAddress = await signer.getAddress();
    const balance = await sdk.blockchain.readContract<bigint>(
      'USDC',
      'balanceOf',
      [userAddress]
    );
    console.log(`USDC Balance: ${ethers.formatUnits(balance, 6)} USDC`);
    
    // 4. Estimate gas for transaction
    console.log('\n4. Estimating gas for transaction...');
    
    const amount = ethers.parseUnits('100', 6); // 100 USDC
    const merchantAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b9';
    const strategyAddress = '0x123456789abcdef123456789abcdef123456789a';
    const paymentHash = ethers.keccak256(ethers.toUtf8Bytes('payment-123'));
    const metadata = JSON.stringify({ orderId: 'order-123' });
    
    // First, estimate gas for approval
    const approvalGas = await sdk.blockchain.estimateGas(
      'USDC',
      'approve',
      [CONTRACT_ADDRESSES[chain].YieldEscrow, amount]
    );
    console.log(`Estimated gas for USDC approval: ${approvalGas.toString()}`);
    
    // Then, estimate gas for deposit creation
    const depositGas = await sdk.blockchain.estimateGas(
      'YieldEscrow',
      'createDeposit',
      [
        amount,
        CONTRACT_ADDRESSES[chain].USDC,
        merchantAddress,
        strategyAddress,
        paymentHash,
        metadata
      ]
    );
    console.log(`Estimated gas for deposit creation: ${depositGas.toString()}`);
    
    // 5. Write to blockchain
    console.log('\n5. Writing to blockchain...');
    
    // First approve USDC transfer
    console.log('Approving USDC transfer...');
    const approvalTx = await sdk.blockchain.writeContract(
      'USDC',
      'approve',
      [CONTRACT_ADDRESSES[chain].YieldEscrow, amount],
      { gasLimit: approvalGas * BigInt(120) / BigInt(100) } // Add 20% buffer
    );
    console.log(`Approval transaction hash: ${approvalTx.hash}`);
    
    // Get transaction explorer URL
    const approvalUrl = sdk.getTransactionExplorerUrl(chain, approvalTx.hash);
    console.log(`View approval transaction: ${approvalUrl}`);
    
    // Wait for approval confirmation
    console.log('Waiting for approval confirmation...');
    const approvalReceipt = await sdk.waitForTransaction(chain, approvalTx.hash, 1);
    console.log(`Approval confirmed in block ${approvalReceipt.blockNumber}`);
    
    // Create deposit
    console.log('Creating deposit...');
    const depositTx = await sdk.blockchain.writeContract(
      'YieldEscrow',
      'createDeposit',
      [
        amount,
        CONTRACT_ADDRESSES[chain].USDC,
        merchantAddress,
        strategyAddress,
        paymentHash,
        metadata
      ],
      { gasLimit: depositGas * BigInt(120) / BigInt(100) } // Add 20% buffer
    );
    console.log(`Deposit transaction hash: ${depositTx.hash}`);
    
    // Get transaction explorer URL
    const depositUrl = sdk.getTransactionExplorerUrl(chain, depositTx.hash);
    console.log(`View deposit transaction: ${depositUrl}`);
    
    // Wait for deposit confirmation
    console.log('Waiting for deposit confirmation...');
    const depositReceipt = await sdk.waitForTransaction(chain, depositTx.hash, 1);
    console.log(`Deposit confirmed in block ${depositReceipt.blockNumber}`);
    
    // 6. Calculate yield
    console.log('\n6. Calculating yield...');
    
    // Assume depositIndex is 1 for this example
    const depositIndex = 1;
    
    const yieldAmount = await sdk.blockchain.readContract<bigint>(
      'YieldEscrow',
      'calculateYield',
      [userAddress, depositIndex]
    );
    console.log(`Current yield for deposit: ${ethers.formatUnits(yieldAmount, 6)} USDC`);
    
    // 7. Using Enhanced YieldRails Contract Helpers
    console.log('\n7. Using enhanced YieldRails contract helpers...');
    
    // Initialize YieldRails contracts with deployment configuration
    const contractABIs = {
      yieldEscrow: YIELD_ESCROW_ABI,
    };
    
    await sdk.initializeContractsForChain(chain, contractABIs, signer);
    console.log('YieldRails contracts initialized with deployment config');
    
    // Create payment using high-level method
    console.log('Creating payment using high-level method...');
    const onChainPaymentTx = await sdk.createOnChainPayment(
      chain,
      merchantAddress,
      amount.toString(),
      CONTRACT_ADDRESSES[chain].USDC,
      strategyAddress
    );
    console.log(`On-chain payment transaction: ${onChainPaymentTx.hash}`);
    
    // Get real-time yield calculation
    const depositId = '1'; // In real scenario, this would come from transaction receipt
    try {
      const realtimeYield = await sdk.getRealtimeYield(chain, depositId);
      console.log(`Real-time yield: ${ethers.formatUnits(realtimeYield, 6)} USDC`);
    } catch (error) {
      console.log('Real-time yield calculation not available yet');
    }
    
    // Get user deposits from blockchain
    try {
      const userDeposits = await sdk.getUserOnChainDeposits(chain, userAddress);
      console.log(`User has ${userDeposits.length} deposits on-chain`);
    } catch (error) {
      console.log('Could not retrieve user deposits');
    }
    
    // Subscribe to blockchain events
    console.log('Setting up blockchain event listeners...');
    
    sdk.subscribeToBlockchainEvents(
      chain,
      'deposits',
      (event) => {
        console.log('New deposit event:', event.args);
      },
      userAddress
    );
    
    sdk.subscribeToBlockchainEvents(
      chain,
      'yields',
      (event) => {
        console.log('Yield earned event:', event.args);
      },
      userAddress
    );
    
    // 8. Release payment using high-level method
    console.log('\n8. Releasing payment using enhanced methods...');
    
    try {
      const releaseTx = await sdk.releaseOnChainPayment(chain, depositId);
      console.log(`Release transaction hash: ${releaseTx.hash}`);
      
      // Get transaction explorer URL
      const releaseUrl = sdk.getTransactionExplorerUrl(chain, releaseTx.hash);
      console.log(`View release transaction: ${releaseUrl}`);
      
      // Wait for release confirmation
      console.log('Waiting for release confirmation...');
      const releaseReceipt = await sdk.waitForTransaction(chain, releaseTx.hash, 1);
      console.log(`Release confirmed in block ${releaseReceipt.blockNumber}`);
    } catch (error) {
      console.log('Release operation skipped (may require merchant permissions)');
    }
    
    // 9. Get deployment information
    console.log('\n9. Contract deployment information...');
    
    const deploymentInfo = sdk.getDeploymentInfo('sepolia');
    if (deploymentInfo) {
      console.log('Sepolia testnet deployment:');
      console.log(`Chain ID: ${deploymentInfo.chainId}`);
      console.log(`Block explorer: ${deploymentInfo.blockExplorer}`);
      
      if (deploymentInfo.contracts.yieldEscrow) {
        console.log(`YieldEscrow: ${deploymentInfo.contracts.yieldEscrow.address}`);
        console.log(`Deployed at block: ${deploymentInfo.contracts.yieldEscrow.blockNumber}`);
        console.log(`Verified: ${deploymentInfo.contracts.yieldEscrow.verified}`);
      }
    }
    
    console.log('\nBlockchain interaction examples completed successfully!');
    
  } catch (error) {
    console.error('Error in blockchain examples:', error);
  }
}

// Run examples
if (require.main === module) {
  blockchainExamples().catch(console.error);
}

export { blockchainExamples };