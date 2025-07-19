# Merchant Integration Guide

Welcome to YieldRails Merchant Integration! This guide will help you integrate yield-generating payments into your business, allowing you to earn additional revenue while providing better payment experiences for your customers.

## 📋 Table of Contents

- [Overview](#overview)
- [Getting Started](#getting-started)
- [Merchant Dashboard](#merchant-dashboard)
- [API Integration](#api-integration)
- [Payment Flows](#payment-flows)
- [Yield Revenue Sharing](#yield-revenue-sharing)
- [Compliance & KYC](#compliance--kyc)
- [Testing & Development](#testing--development)
- [Production Deployment](#production-deployment)
- [Support & Resources](#support--resources)

## Overview

### What is YieldRails for Merchants?

YieldRails transforms traditional payments into yield-generating assets. As a merchant, you can:

- **Earn Additional Revenue**: Get 20% of yield generated from customer payments
- **Improve Cash Flow**: Payments generate returns while processing
- **Reduce Processing Costs**: Yield often offsets traditional payment fees
- **Enhanced Customer Experience**: Customers earn yield on their payments
- **Global Reach**: Accept cross-chain payments with automatic conversion

### Revenue Model

YieldRails uses a fair revenue sharing model:
- **70%** → Customer (payment sender)
- **20%** → Merchant (you)
- **10%** → Protocol (platform maintenance)

### Key Benefits

✅ **Additional Revenue Stream**: Earn yield on all customer payments  
✅ **Zero Integration Fees**: No setup costs or monthly fees  
✅ **Flexible Integration**: API, SDK, or dashboard integration options  
✅ **Real-time Analytics**: Track payments and yield in real-time  
✅ **Multi-chain Support**: Accept payments from multiple blockchains  
✅ **Automated Compliance**: Built-in KYC/AML and regulatory compliance  

## Getting Started

### 1. Merchant Registration

Visit the [YieldRails Merchant Portal](https://merchants.yieldrails.com) to get started:

1. **Create Account**: Register with business email and details
2. **Business Verification**: Complete KYC/business verification
3. **API Credentials**: Get your merchant API keys
4. **Dashboard Access**: Access your merchant dashboard

### 2. Quick Integration Test

```typescript
import { YieldRailsSDK } from '@yieldrails/sdk';

// Initialize with merchant credentials
const sdk = new YieldRailsSDK({
  apiUrl: 'https://api.yieldrails.com',
  apiKey: 'your-merchant-api-key',
});

// Create a test payment
const payment = await sdk.payments.create({
  amount: '100.00',
  token: 'USDC',
  recipient: 'your-merchant-wallet-address',
  yieldStrategy: 'aave-lending-v3',
  sourceChain: 1,
  destinationChain: 137,
  merchantId: 'your-merchant-id',
  metadata: {
    orderId: 'order-12345',
    customerEmail: 'customer@example.com'
  }
});

console.log('Payment created:', payment.id);
console.log('Expected merchant yield:', payment.merchantYield);
```

### 3. Merchant Onboarding Checklist

- [ ] Register merchant account
- [ ] Complete business verification (KYC/KYB)
- [ ] Set up wallet address for receiving payments
- [ ] Configure webhook endpoints
- [ ] Test payment integration
- [ ] Review compliance requirements
- [ ] Set up production monitoring
- [ ] Go live with real transactions

## Merchant Dashboard

### Dashboard Features

The YieldRails Merchant Dashboard provides comprehensive tools for managing your integration:

#### 📊 Analytics & Reporting
- **Payment Volume**: Track daily, weekly, monthly payment volumes
- **Yield Earnings**: Monitor yield generated from customer payments
- **Revenue Breakdown**: Detailed breakdown of payment fees vs. yield earnings
- **Customer Analytics**: Customer payment patterns and behavior
- **Performance Metrics**: Success rates, processing times, error rates

#### 💳 Payment Management
- **Payment History**: View all customer payments and their status
- **Yield Tracking**: Real-time yield generation for each payment
- **Payment Details**: Comprehensive payment information and metadata
- **Refund Management**: Process refunds and handle disputes
- **Transaction Search**: Search and filter payments by various criteria

#### ⚙️ Settings & Configuration
- **API Key Management**: Generate and manage API keys
- **Webhook Configuration**: Set up webhook endpoints for payment notifications
- **Yield Strategy Preferences**: Configure preferred yield strategies
- **Notification Settings**: Configure email and SMS notifications
- **Business Profile**: Update business information and settings

### Accessing the Dashboard

1. Log in to [merchants.yieldrails.com](https://merchants.yieldrails.com)
2. Navigate through the dashboard sections:
   - **Overview**: High-level metrics and recent activity
   - **Payments**: Detailed payment management
   - **Analytics**: Comprehensive reporting and insights
   - **Yield**: Yield generation tracking and optimization
   - **Settings**: Account and integration configuration

## API Integration

### Authentication

All merchant API requests require authentication using your merchant API key:

```typescript
const sdk = new YieldRailsSDK({
  apiUrl: 'https://api.yieldrails.com',
  apiKey: process.env.YIELDRAILS_MERCHANT_API_KEY,
});
```

### Payment Creation

#### Basic Payment Integration

```typescript
async function createMerchantPayment(orderData) {
  try {
    const payment = await sdk.payments.create({
      amount: orderData.totalAmount,
      token: 'USDC', // or orderData.preferredToken
      recipient: process.env.MERCHANT_WALLET_ADDRESS,
      yieldStrategy: 'auto-optimize', // Let YieldRails choose optimal strategy
      sourceChain: orderData.customerChain || 1,
      destinationChain: process.env.MERCHANT_CHAIN || 137,
      merchantId: process.env.MERCHANT_ID,
      metadata: {
        orderId: orderData.orderId,
        customerEmail: orderData.customerEmail,
        productIds: orderData.products.map(p => p.id),
        customerNote: orderData.note
      }
    });

    // Store payment ID with order
    await storePaymentWithOrder(orderData.orderId, payment.id);

    return payment;
  } catch (error) {
    console.error('Payment creation failed:', error);
    throw error;
  }
}
```

#### Advanced Payment Options

```typescript
async function createAdvancedPayment(orderData) {
  // Get optimal yield strategy for amount and time frame
  const optimization = await sdk.yield.optimize({
    amount: orderData.totalAmount,
    riskTolerance: 'moderate',
    timeHorizon: orderData.estimatedDeliveryDays || 7
  });

  const payment = await sdk.payments.create({
    amount: orderData.totalAmount,
    token: orderData.token || 'USDC',
    recipient: process.env.MERCHANT_WALLET_ADDRESS,
    yieldStrategy: optimization.recommendedStrategy.id,
    sourceChain: orderData.sourceChain,
    destinationChain: orderData.destinationChain,
    merchantId: process.env.MERCHANT_ID,
    
    // Scheduled release (for pre-orders, etc.)
    releaseDate: orderData.scheduledDelivery,
    
    // Rich metadata
    metadata: {
      orderId: orderData.orderId,
      customerEmail: orderData.customerEmail,
      customerAddress: orderData.shippingAddress,
      products: orderData.products,
      discount: orderData.discountAmount,
      tax: orderData.taxAmount,
      shipping: orderData.shippingCost,
      notes: orderData.customerNotes
    }
  });

  return payment;
}
```

### Payment Status Monitoring

#### Real-time Payment Updates

```typescript
async function setupPaymentMonitoring() {
  // Initialize WebSocket for real-time updates
  await sdk.initializeWebSocket({
    autoReconnect: true,
    heartbeat: true
  });

  // Subscribe to all merchant payments
  sdk.payments.subscribeToMerchantUpdates(process.env.MERCHANT_ID, (update) => {
    console.log('Payment update:', update);
    
    // Update order status based on payment status
    switch (update.status) {
      case 'confirmed':
        updateOrderStatus(update.metadata.orderId, 'payment_confirmed');
        break;
      case 'yielding':
        updateOrderStatus(update.metadata.orderId, 'generating_yield');
        break;
      case 'released':
        updateOrderStatus(update.metadata.orderId, 'payment_complete');
        processOrder(update.metadata.orderId);
        break;
      case 'failed':
        updateOrderStatus(update.metadata.orderId, 'payment_failed');
        handlePaymentFailure(update);
        break;
    }
  });
}
```

#### Webhook Integration

Set up webhooks to receive payment notifications:

```typescript
// Express.js webhook handler
app.post('/webhooks/yieldrails', async (req, res) => {
  const signature = req.headers['yieldrails-signature'];
  const payload = req.body;

  // Verify webhook signature
  if (!verifyWebhookSignature(payload, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).send('Unauthorized');
  }

  try {
    switch (payload.eventType) {
      case 'payment.created':
        await handlePaymentCreated(payload.data);
        break;
      case 'payment.confirmed':
        await handlePaymentConfirmed(payload.data);
        break;
      case 'payment.yielding':
        await handlePaymentYielding(payload.data);
        break;
      case 'payment.released':
        await handlePaymentReleased(payload.data);
        break;
      case 'yield.distributed':
        await handleYieldDistribution(payload.data);
        break;
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Webhook processing failed:', error);
    res.status(500).send('Internal Server Error');
  }
});

async function handleYieldDistribution(yieldData) {
  const { paymentId, merchantYield, totalYield } = yieldData;
  
  // Update merchant accounting
  await recordYieldEarnings(paymentId, merchantYield);
  
  // Notify merchant of yield earnings
  await notifyMerchantYieldEarned(merchantYield, paymentId);
}
```

## Payment Flows

### E-commerce Integration

#### Checkout Flow

```typescript
// 1. Customer initiates checkout
async function initiateCheckout(cartData, customerInfo) {
  // Calculate total with fees
  const orderTotal = calculateOrderTotal(cartData);
  
  // Get yield estimate for customer
  const yieldEstimate = await sdk.yield.estimateYield({
    amount: orderTotal.toString(),
    timeframe: 7 // days until delivery
  });

  // Present payment options to customer
  return {
    orderTotal,
    yieldEstimate,
    paymentMethods: [
      {
        type: 'yieldrails',
        displayName: 'Pay with Yield Generation',
        description: `Earn ~$${yieldEstimate.customerYield} while your payment processes`,
        fees: '0%', // Yield often covers fees
        recommended: true
      },
      {
        type: 'traditional',
        displayName: 'Traditional Payment',
        fees: '2.9% + $0.30'
      }
    ]
  };
}

// 2. Process YieldRails payment
async function processYieldRailsPayment(orderData, paymentData) {
  const payment = await sdk.payments.create({
    amount: orderData.total,
    token: paymentData.token,
    recipient: process.env.MERCHANT_WALLET_ADDRESS,
    yieldStrategy: paymentData.selectedStrategy || 'auto-optimize',
    sourceChain: paymentData.sourceChain,
    destinationChain: process.env.MERCHANT_CHAIN,
    merchantId: process.env.MERCHANT_ID,
    metadata: {
      orderId: orderData.orderId,
      customerWallet: paymentData.customerWallet,
      products: orderData.items
    }
  });

  // Update order with payment information
  await updateOrderPayment(orderData.orderId, {
    paymentId: payment.id,
    paymentMethod: 'yieldrails',
    status: 'processing',
    estimatedYield: payment.estimatedYield
  });

  return payment;
}

// 3. Handle order fulfillment
async function handleOrderFulfillment(orderId) {
  const order = await getOrder(orderId);
  const payment = await sdk.payments.getDetails(order.paymentId);

  if (payment.status === 'released') {
    // Payment complete, fulfill order
    await fulfillOrder(orderId);
    
    // Send completion notification with yield information
    await sendOrderCompletionEmail(order.customerEmail, {
      orderId,
      totalPaid: payment.amount,
      yieldEarned: payment.yieldBreakdown.userYield,
      merchantYieldEarned: payment.yieldBreakdown.merchantYield
    });
  }
}
```

### Subscription Payments

```typescript
// Recurring subscription with yield generation
async function createSubscriptionPayment(subscription) {
  const payment = await sdk.payments.create({
    amount: subscription.monthlyAmount,
    token: 'USDC',
    recipient: process.env.MERCHANT_WALLET_ADDRESS,
    yieldStrategy: 'stable-yield', // Conservative strategy for recurring payments
    sourceChain: subscription.customerChain,
    destinationChain: process.env.MERCHANT_CHAIN,
    
    // Schedule release for end of billing period
    releaseDate: subscription.nextBillingDate,
    
    merchantId: process.env.MERCHANT_ID,
    metadata: {
      subscriptionId: subscription.id,
      customerId: subscription.customerId,
      billingPeriod: subscription.currentPeriod,
      serviceType: subscription.serviceType
    }
  });

  // Store subscription payment
  await recordSubscriptionPayment(subscription.id, payment.id);

  return payment;
}
```

### Service Payments

```typescript
// Service-based payments with milestone releases
async function createServicePayment(serviceContract) {
  const totalAmount = serviceContract.totalValue;
  const milestoneAmount = totalAmount / serviceContract.milestones.length;

  // Create payment for each milestone
  const payments = await Promise.all(
    serviceContract.milestones.map(async (milestone, index) => {
      return await sdk.payments.create({
        amount: milestoneAmount.toString(),
        token: 'USDC',
        recipient: process.env.MERCHANT_WALLET_ADDRESS,
        yieldStrategy: 'moderate-yield',
        sourceChain: 1,
        destinationChain: 137,
        
        // Schedule release for milestone date
        releaseDate: milestone.expectedCompletionDate,
        
        merchantId: process.env.MERCHANT_ID,
        metadata: {
          contractId: serviceContract.id,
          milestoneId: milestone.id,
          milestoneNumber: index + 1,
          description: milestone.description,
          deliverables: milestone.deliverables
        }
      });
    })
  );

  return payments;
}
```

## Yield Revenue Sharing

### Understanding Yield Distribution

YieldRails automatically distributes yield generated from customer payments:

```typescript
// Example yield breakdown for $10,000 payment generating $50 yield over 30 days
const yieldBreakdown = {
  totalYield: '50.00',        // Total yield generated
  userYield: '35.00',         // 70% to customer
  merchantYield: '10.00',     // 20% to merchant (you!)
  protocolYield: '5.00',      // 10% to protocol
  yieldPeriod: 30 * 24 * 60 * 60, // 30 days in seconds
  strategy: 'aave-lending-v3',
  apy: 6.05 // Annualized percentage yield
};
```

### Merchant Yield Tracking

```typescript
// Track yield earnings for accounting
async function trackMerchantYield() {
  // Get yield earnings for current month
  const currentMonth = new Date().getMonth();
  const yieldEarnings = await sdk.payments.getMerchantYieldEarnings({
    merchantId: process.env.MERCHANT_ID,
    startDate: new Date(2024, currentMonth, 1),
    endDate: new Date(2024, currentMonth + 1, 0)
  });

  console.log('Monthly yield earnings:', {
    totalYieldEarned: yieldEarnings.totalAmount,
    numberOfPayments: yieldEarnings.paymentCount,
    averageYieldPerPayment: yieldEarnings.averageYield,
    topPerformingStrategy: yieldEarnings.topStrategy
  });

  // Export for accounting systems
  await exportYieldEarningsToAccounting(yieldEarnings);
}

// Real-time yield notifications
sdk.yield.subscribeToMerchantYield(process.env.MERCHANT_ID, (yieldUpdate) => {
  console.log(`New yield earned: $${yieldUpdate.amount} from payment ${yieldUpdate.paymentId}`);
  
  // Update dashboard
  updateMerchantDashboard({
    newYieldEarned: yieldUpdate.amount,
    totalYieldToDate: yieldUpdate.totalEarned
  });
  
  // Send notification to merchant
  sendYieldNotification(yieldUpdate);
});
```

### Yield Optimization for Merchants

```typescript
// Optimize yield strategies based on business patterns
async function optimizeMerchantYield() {
  const merchantAnalytics = await sdk.analytics.getMerchantInsights(process.env.MERCHANT_ID);
  
  const optimization = await sdk.yield.optimizeForMerchant({
    merchantId: process.env.MERCHANT_ID,
    averagePaymentAmount: merchantAnalytics.averagePaymentAmount,
    averageHoldPeriod: merchantAnalytics.averagePaymentHoldTime,
    riskTolerance: 'moderate', // Based on merchant preferences
    historicalPerformance: merchantAnalytics.yieldPerformance
  });

  console.log('Optimization recommendations:', {
    recommendedStrategy: optimization.recommendedStrategy.name,
    projectedAdditionalYield: optimization.projectedIncrease,
    riskAssessment: optimization.riskAnalysis
  });

  // Auto-apply optimization for future payments
  await updateMerchantDefaultStrategy(optimization.recommendedStrategy.id);
}
```

## Compliance & KYC

### Merchant KYC Requirements

As a merchant on YieldRails, you must complete business verification:

#### Required Documentation
- **Business Registration**: Certificate of incorporation or business license
- **Tax Documentation**: EIN/Tax ID and tax certificates
- **Banking Information**: Business bank account verification
- **Identity Verification**: Key personnel identity verification
- **Address Verification**: Business address confirmation

#### Compliance Features
- **Automated AML Screening**: All transactions screened against sanctions lists
- **Transaction Monitoring**: Real-time monitoring for suspicious activity
- **Regulatory Reporting**: Automated compliance reporting
- **Audit Trail**: Complete audit trail for all transactions

### Customer KYC Integration

```typescript
// Integrate customer KYC into payment flow
async function createPaymentWithKYC(orderData, customerData) {
  // Check customer KYC status
  const kycStatus = await sdk.compliance.checkCustomerKYC(customerData.email);
  
  if (kycStatus.status !== 'approved' && orderData.amount > 1000) {
    // Require KYC for payments over $1,000
    const kycRequest = await sdk.compliance.initiateKYC({
      email: customerData.email,
      name: customerData.name,
      address: customerData.address,
      dateOfBirth: customerData.dateOfBirth,
      documentType: 'passport' // or 'drivers_license'
    });

    return {
      requiresKYC: true,
      kycRequestId: kycRequest.id,
      kycUploadUrl: kycRequest.uploadUrl
    };
  }

  // Proceed with payment creation
  const payment = await sdk.payments.create({
    // ... payment details
    kycVerified: kycStatus.status === 'approved'
  });

  return { payment };
}
```

### Transaction Monitoring

```typescript
// Monitor transactions for compliance
sdk.compliance.subscribeToTransactionAlerts(process.env.MERCHANT_ID, (alert) => {
  console.log('Compliance alert:', alert);
  
  switch (alert.type) {
    case 'large_transaction':
      // Handle large transaction alert
      handleLargeTransactionAlert(alert);
      break;
    case 'suspicious_pattern':
      // Handle suspicious pattern detection
      handleSuspiciousPatternAlert(alert);
      break;
    case 'sanctions_screening':
      // Handle sanctions screening alert
      handleSanctionsAlert(alert);
      break;
  }
});
```

## Testing & Development

### Sandbox Environment

YieldRails provides a comprehensive sandbox environment for testing:

```typescript
// Sandbox configuration
const sandboxSDK = new YieldRailsSDK({
  apiUrl: 'https://sandbox-api.yieldrails.com',
  apiKey: 'sandbox-merchant-api-key',
});

// Create test payments with mock yield generation
const testPayment = await sandboxSDK.payments.create({
  amount: '100.00',
  token: 'USDC',
  recipient: 'merchant-test-wallet',
  yieldStrategy: 'mock-high-yield',
  sourceChain: 5, // Goerli testnet
  destinationChain: 80001, // Mumbai testnet
});
```

### Test Data & Scenarios

```typescript
// Test different payment scenarios
const testScenarios = [
  {
    name: 'Small Payment',
    amount: '50.00',
    expectedBehavior: 'Low yield, fast processing'
  },
  {
    name: 'Large Payment',
    amount: '10000.00',
    expectedBehavior: 'Higher yield, KYC required'
  },
  {
    name: 'Cross-chain Payment',
    sourceChain: 1,
    destinationChain: 137,
    expectedBehavior: 'Bridge fees, transit yield'
  },
  {
    name: 'Scheduled Payment',
    releaseDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    expectedBehavior: 'Extended yield generation'
  }
];

// Run test scenarios
for (const scenario of testScenarios) {
  const result = await runTestScenario(scenario);
  console.log(`${scenario.name}: ${result.success ? 'PASS' : 'FAIL'}`);
}
```

### Integration Testing

```typescript
// Complete integration test
async function runIntegrationTest() {
  console.log('🧪 Running YieldRails Integration Test');

  // 1. Test payment creation
  const payment = await sandboxSDK.payments.create({
    amount: '500.00',
    token: 'USDC',
    recipient: 'test-merchant-wallet',
    yieldStrategy: 'test-strategy',
    sourceChain: 5,
    destinationChain: 80001,
    merchantId: 'test-merchant-id'
  });

  console.log('✅ Payment created:', payment.id);

  // 2. Test webhook delivery
  await waitForWebhook(payment.id, 'payment.confirmed');
  console.log('✅ Webhook received');

  // 3. Test yield generation
  const yieldUpdate = await waitForYieldGeneration(payment.id);
  console.log('✅ Yield generated:', yieldUpdate.amount);

  // 4. Test payment release
  const releaseResult = await sandboxSDK.payments.release(payment.id, 'test-signature');
  console.log('✅ Payment released:', releaseResult.transactionHash);

  // 5. Test yield distribution
  const yieldDistribution = await waitForYieldDistribution(payment.id);
  console.log('✅ Yield distributed:', yieldDistribution.merchantYield);

  console.log('🎉 Integration test completed successfully!');
}
```

## Production Deployment

### Pre-Production Checklist

Before going live with YieldRails:

- [ ] **Complete merchant verification**: Business KYC/KYB approved
- [ ] **Test all payment flows**: Successful sandbox testing
- [ ] **Configure webhooks**: Production webhook endpoints set up
- [ ] **Set up monitoring**: Error tracking and alerting configured
- [ ] **Security review**: API keys secured, HTTPS enabled
- [ ] **Compliance check**: All regulatory requirements met
- [ ] **Documentation review**: Team trained on integration
- [ ] **Backup procedures**: Fallback payment methods configured

### Production Configuration

```typescript
// Production SDK configuration
const productionSDK = new YieldRailsSDK({
  apiUrl: 'https://api.yieldrails.com',
  apiKey: process.env.YIELDRAILS_PRODUCTION_API_KEY,
  timeout: 30000,
  retryAttempts: 3,
  debug: false // Disable debug logging in production
});

// Production error handling
productionSDK.on('error', (error) => {
  // Log to monitoring service
  logToMonitoring('yieldrails_error', {
    error: error.message,
    code: error.code,
    timestamp: new Date().toISOString()
  });

  // Alert operations team for critical errors
  if (error.code === 'PAYMENT_SYSTEM_DOWN') {
    alertOperationsTeam(error);
  }
});
```

### Monitoring & Alerting

```typescript
// Set up comprehensive monitoring
async function setupProductionMonitoring() {
  // Monitor payment success rates
  setInterval(async () => {
    const metrics = await productionSDK.analytics.getRealtimeMetrics();
    
    if (metrics.paymentSuccessRate < 0.95) {
      alertOperationsTeam({
        type: 'low_success_rate',
        rate: metrics.paymentSuccessRate,
        threshold: 0.95
      });
    }
  }, 60000); // Check every minute

  // Monitor yield generation
  productionSDK.yield.subscribeToMerchantYield(process.env.MERCHANT_ID, (yieldUpdate) => {
    updateMetrics('yield_earned', yieldUpdate.amount);
    
    // Alert if yield drops significantly
    if (yieldUpdate.dailyYield < expectedDailyYield * 0.8) {
      alertFinanceTeam({
        type: 'low_yield_alert',
        actual: yieldUpdate.dailyYield,
        expected: expectedDailyYield
      });
    }
  });
}
```

## Support & Resources

### Getting Help

#### Technical Support
- **Email**: [merchant-support@yieldrails.com](mailto:merchant-support@yieldrails.com)
- **Discord**: [YieldRails Merchant Community](https://discord.gg/yieldrails-merchants)
- **Documentation**: [docs.yieldrails.com](https://docs.yieldrails.com)
- **Status Page**: [status.yieldrails.com](https://status.yieldrails.com)

#### Business Support
- **Account Management**: [accounts@yieldrails.com](mailto:accounts@yieldrails.com)
- **Partnership Inquiries**: [partnerships@yieldrails.com](mailto:partnerships@yieldrails.com)
- **Enterprise Sales**: [enterprise@yieldrails.com](mailto:enterprise@yieldrails.com)

### Additional Resources

#### Developer Resources
- **[API Reference](../api/openapi.yaml)**: Complete API documentation
- **[SDK Documentation](../developer-guide/sdk-reference.md)**: TypeScript SDK reference
- **[Code Examples](../examples/)**: Integration examples and templates
- **[Best Practices](../developer-guide/best-practices.md)**: Security and performance guidelines

#### Business Resources
- **[Merchant Portal](https://merchants.yieldrails.com)**: Dashboard and account management
- **[Yield Calculator](https://yieldrails.com/calculator)**: Estimate potential yield earnings
- **[Compliance Guide](./compliance.md)**: Regulatory requirements and guidelines
- **[Fee Structure](./fees.md)**: Detailed fee and revenue sharing information

#### Integration Examples
- **[E-commerce Integration](../examples/ecommerce-integration/)**: Complete online store integration
- **[Subscription Service](../examples/subscription-service/)**: Recurring payment integration
- **[Marketplace Integration](../examples/marketplace/)**: Multi-vendor marketplace setup
- **[Mobile App Integration](../examples/mobile-integration/)**: Mobile payment integration

### Community & Feedback

We value merchant feedback and actively work to improve our platform:

- **Feature Requests**: [GitHub Discussions](https://github.com/raosunjoy/YieldRails/discussions)
- **Bug Reports**: [GitHub Issues](https://github.com/raosunjoy/YieldRails/issues)
- **Merchant Newsletter**: Monthly updates on new features and optimizations
- **Beta Program**: Early access to new features and integrations

---

Ready to start earning additional revenue from your payments? Begin with our [Quick Start Guide](./quick-start.md) or contact our [merchant support team](mailto:merchant-support@yieldrails.com) for personalized assistance.