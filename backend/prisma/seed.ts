import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create Admin User
  const adminPasswordHash = await hash('admin123!@#', 12);
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@yieldrails.com' },
    update: {},
    create: {
      email: 'admin@yieldrails.com',
      hashedPassword: adminPasswordHash,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      kycStatus: 'APPROVED',
      userPreferences: {
        create: {
          defaultCurrency: 'USD',
          notificationSettings: {
            email: true,
            push: true,
            sms: false
          },
          yieldOptimization: true,
          autoReinvest: false,
          maxSlippage: 0.01,
          preferredChains: ['ethereum', 'polygon', 'arbitrum']
        }
      }
    }
  });

  // Create Test Merchant
  const testMerchant = await prisma.merchant.upsert({
    where: { email: 'merchant@test.com' },
    update: {},
    create: {
      name: 'Test E-commerce Store',
      email: 'merchant@test.com',
      website: 'https://test-store.com',
      description: 'A test merchant for development',
      category: 'E-commerce',
      businessType: 'ONLINE',
      defaultCurrency: 'USD',
      supportedChains: ['ethereum', 'polygon'],
      verificationStatus: 'APPROVED'
    }
  });

  // Create Yield Strategies
  const yieldStrategies = [
    {
      name: 'Circle USDC Lending',
      description: 'Conservative USDC lending strategy',
      protocolName: 'Circle',
      chainId: 'ethereum',
      contractAddress: '0x0000000000000000000000000000000000000001',
      strategyType: 'LENDING' as const,
      expectedAPY: 0.045, // 4.5%
      riskLevel: 'LOW' as const,
      minAmount: 100,
      maxAmount: 1000000,
      strategyConfig: {
        compound: true,
        lockPeriod: 0,
        withdrawalFee: 0
      }
    },
    {
      name: 'Noble T-Bill Strategy',
      description: 'US Treasury Bill backed yield',
      protocolName: 'Noble',
      chainId: 'ethereum',
      contractAddress: '0x0000000000000000000000000000000000000002',
      strategyType: 'TREASURY_BILLS' as const,
      expectedAPY: 0.052, // 5.2%
      riskLevel: 'LOW' as const,
      minAmount: 1000,
      maxAmount: 10000000,
      strategyConfig: {
        maturityDays: 90,
        autoRollover: true,
        collateralizationRatio: 1.1
      }
    },
    {
      name: 'Polygon MATIC Staking',
      description: 'MATIC staking on Polygon network',
      protocolName: 'Polygon',
      chainId: 'polygon',
      contractAddress: '0x0000000000000000000000000000000000000003',
      strategyType: 'STAKING' as const,
      expectedAPY: 0.08, // 8%
      riskLevel: 'MEDIUM' as const,
      minAmount: 10,
      maxAmount: 100000,
      strategyConfig: {
        unbondingPeriod: 2160000, // 25 days in seconds
        slashingRisk: 0.05,
        delegatedValidator: '0x...'
      }
    },
    {
      name: 'Arbitrum GMX Liquidity',
      description: 'GMX liquidity provision on Arbitrum',
      protocolName: 'GMX',
      chainId: 'arbitrum',
      contractAddress: '0x0000000000000000000000000000000000000004',
      strategyType: 'LIQUIDITY_PROVIDING' as const,
      expectedAPY: 0.12, // 12%
      riskLevel: 'HIGH' as const,
      minAmount: 1000,
      maxAmount: 500000,
      strategyConfig: {
        poolType: 'GLP',
        rebalanceFrequency: 86400, // daily
        impermanentLossProtection: false
      }
    }
  ];

  for (const strategy of yieldStrategies) {
    await prisma.yieldStrategy.upsert({
      where: { name: strategy.name },
      update: {},
      create: strategy
    });
  }

  // Create Test Users
  const testUsers = [
    {
      email: 'alice@test.com',
      firstName: 'Alice',
      lastName: 'Johnson',
      walletAddress: '0x742d35Cc6634C0532925a3b8D0A79D1Ebbf3b7d0'
    },
    {
      email: 'bob@test.com',
      firstName: 'Bob',
      lastName: 'Smith',
      walletAddress: '0x8ba1f109551bD432803012645Hac136c9c3D9Ca8'
    },
    {
      email: 'charlie@test.com',
      firstName: 'Charlie',
      lastName: 'Brown',
      walletAddress: '0x1aE0EA34a72D944a8C7603FfB3eC30a6669E454C'
    }
  ];

  for (const userData of testUsers) {
    const userPasswordHash = await hash('password123', 12);
    await prisma.user.upsert({
      where: { email: userData.email },
      update: {},
      create: {
        ...userData,
        hashedPassword: userPasswordHash,
        kycStatus: 'APPROVED',
        userPreferences: {
          create: {
            defaultCurrency: 'USD',
            notificationSettings: {
              email: true,
              push: true,
              sms: false
            },
            yieldOptimization: true,
            autoReinvest: false,
            maxSlippage: 0.01,
            preferredChains: ['ethereum', 'polygon']
          }
        }
      }
    });
  }

  // Create Test Payments
  const usdcStrategy = await prisma.yieldStrategy.findFirst({
    where: { name: 'Circle USDC Lending' }
  });

  const aliceUser = await prisma.user.findFirst({
    where: { email: 'alice@test.com' }
  });

  if (usdcStrategy && aliceUser) {
    const testPayment = await prisma.payment.create({
      data: {
        userId: aliceUser.id,
        merchantId: testMerchant.id,
        amount: 1000,
        currency: 'USD',
        tokenSymbol: 'USDC',
        status: 'COMPLETED',
        type: 'MERCHANT_PAYMENT',
        sourceChain: 'ethereum',
        destinationChain: 'ethereum',
        senderAddress: aliceUser.walletAddress!,
        recipientAddress: testMerchant.id,
        estimatedYield: 4.5,
        actualYield: 4.3,
        yieldDuration: 86400, // 1 day
        yieldStrategy: usdcStrategy.name,
        platformFee: 5,
        networkFee: 2,
        totalFees: 7,
        description: 'Test payment with yield',
        confirmedAt: new Date(),
        releasedAt: new Date()
      }
    });

    // Create Yield Earning for the payment
    await prisma.yieldEarning.create({
      data: {
        userId: aliceUser.id,
        paymentId: testPayment.id,
        strategyId: usdcStrategy.id,
        principalAmount: 1000,
        yieldAmount: 4.3,
        feeAmount: 0.43, // 10% platform fee on yield
        netYieldAmount: 3.87,
        tokenAddress: '0xA0b86a33E6441c5f6f9e61c3f90b9e2B7D3e5c0d', // USDC
        tokenSymbol: 'USDC',
        chainId: 'ethereum',
        startTime: new Date(Date.now() - 86400000), // 1 day ago
        endTime: new Date(),
        duration: 86400,
        actualAPY: 0.043,
        status: 'COMPLETED',
        transactionHash: '0x1234567890abcdef1234567890abcdef12345678'
      }
    });
  }

  // Create System Metrics
  const systemMetrics = [
    {
      metricName: 'total_value_locked',
      metricValue: 125000,
      metricType: 'GAUGE' as const,
      metadata: { currency: 'USD' }
    },
    {
      metricName: 'total_payments_processed',
      metricValue: 342,
      metricType: 'COUNTER' as const
    },
    {
      metricName: 'average_yield_apy',
      metricValue: 0.067,
      metricType: 'GAUGE' as const,
      metadata: { format: 'percentage' }
    },
    {
      metricName: 'active_users_count',
      metricValue: 156,
      metricType: 'GAUGE' as const
    }
  ];

  for (const metric of systemMetrics) {
    await prisma.systemMetrics.create({
      data: metric
    });
  }

  console.log('✅ Database seed completed successfully!');
  console.log('📊 Seeded data:');
  console.log('- 1 Admin user');
  console.log('- 3 Test users');
  console.log('- 1 Test merchant');
  console.log('- 4 Yield strategies');
  console.log('- 1 Test payment with yield earning');
  console.log('- 4 System metrics');
}

main()
  .catch((e) => {
    console.error('❌ Database seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });