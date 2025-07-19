/**
 * Example usage of YieldRails SDK external service integrations
 * This demonstrates how to interact with Noble, Resolv, Aave, and Circle protocols
 */

import { YieldRailsSDK } from '../src';

async function externalServicesExample() {
  // Initialize SDK
  const sdk = new YieldRailsSDK({
    apiUrl: 'http://localhost:3001',
    apiKey: 'your-api-key-here',
  });

  try {
    console.log('=== External Services Health Check ===');
    
    // Check health of all external services
    const health = await sdk.external.getServiceHealth();
    console.log('External services health:', JSON.stringify(health, null, 2));

    // Check circuit breaker status
    const circuitBreakers = await sdk.external.getCircuitBreakerStatus();
    console.log('Circuit breaker status:', circuitBreakers);

    console.log('\n=== Noble Protocol T-Bill Integration ===');
    
    // Get available Noble T-bill pools
    const noblePools = await sdk.external.getNoblePools();
    console.log('Available Noble pools:', noblePools.length);
    
    if (noblePools.length > 0) {
      const pool = noblePools[0];
      console.log(`Pool: ${pool.name} - APY: ${pool.currentAPY}%`);
      
      // Get detailed pool information
      const poolDetails = await sdk.external.getNoblePool(pool.poolId);
      console.log('Pool details:', {
        totalAssets: poolDetails.totalAssets,
        minimumDeposit: poolDetails.minimumDeposit,
        status: poolDetails.status
      });
      
      // Example deposit (would need actual user address and signature)
      try {
        const depositResult = await sdk.external.initiateNobleDeposit({
          poolId: pool.poolId,
          amount: '1000000000', // 1000 USDC (6 decimals)
          userAddress: '0x742d35Cc6C4C30C8F0b3F3f3D8e6f5e2A4c1a9e8',
          referralCode: 'YIELDRAILS'
        });
        console.log('Deposit initiated:', depositResult.transactionId);
      } catch (error) {
        console.log('Deposit failed (expected in demo):', error.message);
      }
    }

    console.log('\n=== Resolv Protocol Delta-Neutral Strategies ===');
    
    // Get available Resolv vaults
    const resolvVaults = await sdk.external.getResolvVaults();
    console.log('Available Resolv vaults:', resolvVaults.length);
    
    if (resolvVaults.length > 0) {
      const vault = resolvVaults[0];
      console.log(`Vault: ${vault.name} - APY: ${vault.currentAPY}% - Risk: ${vault.riskScore}`);
      
      // Get detailed vault information
      const vaultDetails = await sdk.external.getResolvVault(vault.vaultId);
      console.log('Vault details:', {
        strategy: vaultDetails.strategy,
        totalValueLocked: vaultDetails.totalValueLocked,
        collateralRatio: vaultDetails.collateralRatio
      });
      
      // Example position entry
      try {
        const positionResult = await sdk.external.enterResolvPosition({
          vaultId: vault.vaultId,
          amount: '5000000000000000000000', // 5000 tokens
          userAddress: '0x742d35Cc6C4C30C8F0b3F3f3D8e6f5e2A4c1a9e8',
          slippageTolerance: 100, // 1%
          deadline: Math.floor(Date.now() / 1000) + 1800 // 30 minutes
        });
        console.log('Position entered:', positionResult.transactionId);
      } catch (error) {
        console.log('Position entry failed (expected in demo):', error.message);
      }
    }

    console.log('\n=== Aave Protocol Lending Integration ===');
    
    // Get available Aave markets
    const aaveMarkets = await sdk.external.getAaveMarkets();
    console.log('Available Aave markets:', aaveMarkets.length);
    
    if (aaveMarkets.length > 0) {
      const market = aaveMarkets[0];
      console.log(`Market: ${market.name} - Liquidity Rate: ${market.liquidityRate}%`);
      
      // Get market assets
      const assets = await sdk.external.getAaveMarketAssets(market.marketId);
      console.log('Market assets:', assets.length);
      
      if (assets.length > 0) {
        const usdcAsset = assets.find(a => a.symbol === 'USDC') || assets[0];
        console.log(`Asset: ${usdcAsset.symbol} - Supply APY: ${usdcAsset.liquidityRate}%`);
        
        // Example supply
        try {
          const supplyResult = await sdk.external.supplyToAave({
            marketId: market.marketId,
            asset: usdcAsset.symbol,
            amount: '1000000000', // 1000 USDC
            userAddress: '0x742d35Cc6C4C30C8F0b3F3f3D8e6f5e2A4c1a9e8'
          });
          console.log('Supply initiated:', supplyResult.transactionId);
        } catch (error) {
          console.log('Supply failed (expected in demo):', error.message);
        }
      }
    }

    console.log('\n=== Circle CCTP Cross-Chain Transfers ===');
    
    // Get supported chains
    const supportedChains = await sdk.external.getCircleSupportedChains();
    console.log('Circle supported chains:', supportedChains.map(c => c.name));
    
    if (supportedChains.length >= 2) {
      const sourceChain = supportedChains[0];
      const destChain = supportedChains[1];
      
      // Get transfer fees
      const fees = await sdk.external.getCircleTransferFees({
        amount: '1000000000', // 1000 USDC
        sourceChain: sourceChain.chainId,
        destinationChain: destChain.chainId
      });
      console.log('Transfer fees:', {
        bridgeFee: fees.bridgeFee,
        totalFee: fees.totalFee,
        estimatedTime: `${fees.estimatedTime} seconds`
      });
      
      // Example transfer initiation
      try {
        const transferResult = await sdk.external.initiateCircleTransfer({
          amount: '1000000000',
          sourceChain: sourceChain.chainId,
          destinationChain: destChain.chainId,
          sender: '0x742d35Cc6C4C30C8F0b3F3f3D8e6f5e2A4c1a9e8',
          recipient: '0x1234567890abcdef1234567890abcdef12345678'
        });
        console.log('Transfer initiated:', transferResult.transferId);
        
        // Monitor transfer status
        const status = await sdk.external.getCircleTransferStatus(transferResult.transferId);
        console.log('Transfer status:', status.status);
        
      } catch (error) {
        console.log('Transfer failed (expected in demo):', error.message);
      }
    }

    console.log('\n=== Integration Examples Complete ===');
    
    // Demonstrate integrated yield strategy selection
    console.log('\nIntegrated yield strategy selection:');
    
    // Get yield strategies (enhanced with real-time data)
    const strategies = await sdk.yield.getStrategies();
    console.log('Available strategies with real-time data:');
    
    strategies.forEach(strategy => {
      console.log(`- ${strategy.name}: ${strategy.actualAPY}% APY (${strategy.protocolName})`);
      if (strategy.realTimeData) {
        console.log(`  Real-time data from ${strategy.realTimeData.source} (${strategy.realTimeData.lastUpdated})`);
      }
    });

  } catch (error) {
    console.error('External services example failed:', error);
  }
}

// Example of error handling and fallback mechanisms
async function externalServicesWithFallback() {
  const sdk = new YieldRailsSDK({
    apiUrl: 'http://localhost:3001',
    apiKey: 'your-api-key-here',
  });

  try {
    console.log('=== Testing Fallback Mechanisms ===');
    
    // Attempt to get Noble pools with fallback handling
    try {
      const pools = await sdk.external.getNoblePools();
      console.log('Noble pools retrieved successfully:', pools.length);
    } catch (error) {
      console.log('Noble service unavailable, using fallback data');
      // In a real implementation, you might use cached data or alternative strategies
    }
    
    // Check if circuit breakers are open
    const circuitBreakers = await sdk.external.getCircuitBreakerStatus();
    const openBreakers = Object.entries(circuitBreakers)
      .filter(([, status]) => status.isOpen)
      .map(([service]) => service);
    
    if (openBreakers.length > 0) {
      console.log('Open circuit breakers:', openBreakers);
      
      // Attempt to reset circuit breakers (admin operation)
      for (const service of openBreakers) {
        try {
          await sdk.external.resetCircuitBreaker(service);
          console.log(`Reset circuit breaker for ${service}`);
        } catch (error) {
          console.log(`Failed to reset circuit breaker for ${service}`);
        }
      }
    }
    
  } catch (error) {
    console.error('Fallback example failed:', error);
  }
}

// Run examples
if (require.main === module) {
  console.log('Running YieldRails SDK External Services Examples...\n');
  
  externalServicesExample()
    .then(() => {
      console.log('\n' + '='.repeat(50));
      return externalServicesWithFallback();
    })
    .then(() => {
      console.log('\nAll examples completed successfully!');
    })
    .catch((error) => {
      console.error('Examples failed:', error);
      process.exit(1);
    });
}

export { externalServicesExample, externalServicesWithFallback };