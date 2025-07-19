/**
 * Cross-chain bridge usage examples for YieldRails SDK
 */

import { YieldRailsSDK } from '@yieldrails/sdk';

// Initialize SDK with configuration
const sdk = new YieldRailsSDK({
  apiUrl: process.env.YIELDRAILS_API_URL || 'https://api.yieldrails.com',
  apiKey: process.env.YIELDRAILS_API_KEY,
  timeout: 60000,
  debug: process.env.NODE_ENV === 'development',
});

async function crosschainExamples() {
  try {
    // Authenticate first
    await sdk.auth.login({
      email: 'user@example.com',
      password: 'secure-password',
    });

    console.log('=== Cross-Chain Bridge Examples ===');
    
    // Get supported chains
    const supportedChains = await sdk.crosschain.getSupportedChains();
    
    console.log('Supported chains:', supportedChains.map(chain => ({
      name: chain.name,
      chainId: chain.chainId,
      isTestnet: chain.isTestnet
    })));

    // Get liquidity pools
    const liquidityPools = await sdk.crosschain.getLiquidityPools();
    
    console.log('Liquidity pools:', liquidityPools.map(pool => ({
      id: pool.id,
      token: pool.token,
      sourceChain: pool.sourceChain,
      destinationChain: pool.destinationChain,
      utilizationRate: pool.utilizationRate
    })));

    // Check liquidity availability
    const sourceChain = '1'; // Ethereum
    const destinationChain = '137'; // Polygon
    const amount = '1000';
    const token = 'USDC';
    
    const liquidityCheck = await sdk.crosschain.checkLiquidityAvailability(
      sourceChain,
      destinationChain,
      amount,
      token
    );
    
    console.log('Liquidity check:', liquidityCheck);

    // Get bridge estimate
    const estimate = await sdk.crosschain.getBridgeEstimate(
      sourceChain,
      destinationChain,
      amount,
      token
    );
    
    console.log('Bridge estimate:', {
      fee: estimate.estimatedFee,
      time: `${estimate.estimatedTime / 1000 / 60} minutes`,
      yield: estimate.estimatedYield,
      netAmount: estimate.netAmount
    });

    // Initiate bridge transaction
    if (liquidityCheck.available) {
      const bridgeTransaction = await sdk.crosschain.initiateBridge({
        sourceChain,
        destinationChain,
        amount,
        sourceAddress: '0x1234567890123456789012345678901234567890',
        destinationAddress: '0x0987654321098765432109876543210987654321',
        token
      });
      
      console.log('Bridge transaction initiated:', {
        transactionId: bridgeTransaction.transactionId,
        status: bridgeTransaction.status,
        estimatedTime: `${bridgeTransaction.estimatedTime / 1000 / 60} minutes`
      });

      // Get transaction status
      const transactionStatus = await sdk.crosschain.getBridgeTransactionStatus(
        bridgeTransaction.transactionId
      );
      
      console.log('Transaction status:', {
        status: transactionStatus.status,
        progress: `${transactionStatus.progress}%`,
        timing: {
          elapsedMinutes: transactionStatus.timing.elapsedMinutes,
          estimatedMinutes: transactionStatus.timing.estimatedMinutes,
          remainingMinutes: transactionStatus.timing.remainingMinutes
        }
      });

      // Subscribe to transaction updates
      const subscriberId = 'user-123';
      await sdk.crosschain.subscribeToTransactionUpdates(
        bridgeTransaction.transactionId,
        subscriberId
      );
      
      console.log('Subscribed to transaction updates');

      // Process bridge transaction
      await sdk.crosschain.processBridgeTransaction(bridgeTransaction.transactionId);
      
      console.log('Bridge transaction processing initiated');

      // Get transaction history
      const transactionHistory = await sdk.crosschain.getBridgeTransactionHistory(
        bridgeTransaction.transactionId
      );
      
      console.log('Transaction history:', {
        updates: transactionHistory.updates.map(update => ({
          type: update.type,
          status: update.status,
          timestamp: update.timestamp
        })),
        subscriberCount: transactionHistory.subscriberCount
      });

      // Get subscriber updates
      const subscriberUpdates = await sdk.crosschain.getSubscriberUpdates(subscriberId);
      
      console.log('Subscriber updates:', {
        count: subscriberUpdates.count,
        updates: subscriberUpdates.updates.map(update => ({
          transactionId: update.transactionId,
          type: update.update.type,
          timestamp: update.timestamp
        }))
      });

      // Unsubscribe from transaction updates
      await sdk.crosschain.unsubscribeFromTransactionUpdates(
        bridgeTransaction.transactionId,
        subscriberId
      );
      
      console.log('Unsubscribed from transaction updates');

      // Cancel bridge transaction (if still pending)
      const cancelled = await sdk.crosschain.cancelBridgeTransaction(
        bridgeTransaction.transactionId
      );
      
      console.log('Bridge transaction cancelled:', cancelled);

      // Retry bridge transaction (if failed)
      const retried = await sdk.crosschain.retryBridgeTransaction(
        bridgeTransaction.transactionId
      );
      
      console.log('Bridge transaction retry initiated:', retried);
    }

    // Get user bridge transactions
    const userAddress = '0x1234567890123456789012345678901234567890';
    const userTransactions = await sdk.crosschain.getUserBridgeTransactions(
      userAddress,
      10,
      0
    );
    
    console.log('User bridge transactions:', {
      count: userTransactions.transactions.length,
      transactions: userTransactions.transactions.map(tx => ({
        transactionId: tx.transactionId,
        status: tx.status,
        sourceChain: tx.sourceChain,
        destinationChain: tx.destinationChain,
        amount: tx.amount
      }))
    });

    // Get bridge analytics
    const analytics = await sdk.crosschain.getBridgeAnalytics('day');
    
    console.log('Bridge analytics:', {
      timeRange: analytics.timeRange,
      totalTransactions: analytics.totalTransactions,
      successfulTransactions: analytics.successfulTransactions,
      failedTransactions: analytics.failedTransactions,
      successRate: `${analytics.successRate * 100}%`,
      totalVolume: analytics.totalVolume,
      totalFees: analytics.totalFees
    });

    // Get active validators
    const validators = await sdk.crosschain.getActiveValidators();
    
    console.log('Active validators:', {
      count: validators.count,
      requiredForConsensus: validators.requiredForConsensus,
      validators: validators.validators.map(validator => ({
        id: validator.id,
        address: validator.address,
        reputation: validator.reputation
      }))
    });

    // Get monitoring metrics (admin only)
    try {
      const metrics = await sdk.crosschain.getMonitoringMetrics();
      
      console.log('Monitoring metrics:', {
        totalTransactions: metrics.totalTransactions,
        successfulTransactions: metrics.successfulTransactions,
        failedTransactions: metrics.failedTransactions,
        averageProcessingTime: `${metrics.averageProcessingTime / 1000 / 60} minutes`,
        totalVolume: metrics.totalVolume,
        liquidityUtilization: `${metrics.liquidityUtilization * 100}%`
      });
    } catch (error) {
      console.log('Access denied to monitoring metrics (admin only)');
    }

    console.log('\n=== Cross-Chain Bridge Workflow Example ===');
    
    // Example: Complete bridge workflow
    async function completeBridgeWorkflow(
      sourceChain: string,
      destinationChain: string,
      amount: string,
      token: string,
      sourceAddress: string,
      destinationAddress: string
    ) {
      console.log('Starting bridge workflow...');
      
      // 1. Check liquidity availability
      const liquidityCheck = await sdk.crosschain.checkLiquidityAvailability(
        sourceChain,
        destinationChain,
        amount,
        token
      );
      
      if (!liquidityCheck.available) {
        console.log(`Insufficient liquidity: ${liquidityCheck.reason}`);
        console.log(`Suggested amount: ${liquidityCheck.suggestedAmount}`);
        return null;
      }
      
      // 2. Get bridge estimate
      const estimate = await sdk.crosschain.getBridgeEstimate(
        sourceChain,
        destinationChain,
        amount,
        token
      );
      
      console.log('Bridge estimate:', {
        fee: estimate.estimatedFee,
        time: `${estimate.estimatedTime / 1000 / 60} minutes`,
        yield: estimate.estimatedYield,
        netAmount: estimate.netAmount
      });
      
      // 3. Initiate bridge transaction
      const bridgeTransaction = await sdk.crosschain.initiateBridge({
        sourceChain,
        destinationChain,
        amount,
        sourceAddress,
        destinationAddress,
        token
      });
      
      console.log('Bridge transaction initiated:', {
        transactionId: bridgeTransaction.transactionId,
        status: bridgeTransaction.status
      });
      
      // 4. Process bridge transaction
      await sdk.crosschain.processBridgeTransaction(bridgeTransaction.transactionId);
      
      // 5. Monitor transaction status
      const subscriberId = `user-${Date.now()}`;
      await sdk.crosschain.subscribeToTransactionUpdates(
        bridgeTransaction.transactionId,
        subscriberId
      );
      
      // 6. Return transaction details
      return {
        transactionId: bridgeTransaction.transactionId,
        status: bridgeTransaction.status,
        estimatedTime: estimate.estimatedTime,
        subscriberId
      };
    }
    
    // Example bridge workflow (commented out to avoid actual API calls)
    /*
    const bridgeWorkflowResult = await completeBridgeWorkflow(
      '1', // Ethereum
      '137', // Polygon
      '1000',
      'USDC',
      '0x1234567890123456789012345678901234567890',
      '0x0987654321098765432109876543210987654321'
    );
    console.log('Bridge workflow result:', bridgeWorkflowResult);
    */

  } catch (error) {
    console.error('Error in cross-chain examples:', error);
  }
}

// Run cross-chain examples
if (require.main === module) {
  crosschainExamples().catch(console.error);
}

export { crosschainExamples };