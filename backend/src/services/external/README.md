# External Service Integrations

This directory contains integrations with external services used by the YieldRails platform.

## Services

### CircleCCTPService

Integration with Circle's Cross-Chain Transfer Protocol (CCTP) for cross-chain USDC transfers.

**Key Features:**
- Initiate cross-chain USDC transfers
- Check transfer status
- Get transfer attestations
- Estimate transfer fees
- Get supported chains

**Configuration:**
```
CIRCLE_API_KEY=your-circle-api-key
CIRCLE_API_URL=https://api.circle.com
```

### ChainalysisService

Integration with Chainalysis for compliance checks and AML/KYC.

**Key Features:**
- Check address risk
- Assess transaction risk
- Check sanctions lists
- Get supported currencies

**Configuration:**
```
CHAINALYSIS_API_KEY=your-chainalysis-api-key
CHAINALYSIS_API_URL=https://api.chainalysis.com
```

### MoonPayService

Integration with MoonPay for fiat on-ramp functionality.

**Key Features:**
- Generate widget URLs for fiat purchases
- Get transaction details
- Get supported currencies
- Get buy quotes
- Verify webhook signatures

**Configuration:**
```
MOONPAY_API_KEY=your-moonpay-api-key
MOONPAY_SECRET_KEY=your-moonpay-secret-key
MOONPAY_API_URL=https://api.moonpay.com
MOONPAY_WIDGET_URL=https://buy.moonpay.com
```

## Usage

### CircleCCTPService

```typescript
import { CircleCCTPService } from './services/external/CircleCCTPService';

const circleCCTPService = new CircleCCTPService();

// Initiate a transfer
const transfer = await circleCCTPService.initiateTransfer({
  sourceChain: '1',
  destinationChain: '137',
  amount: '100',
  sourceAddress: '0x123...',
  destinationAddress: '0x456...',
  tokenSymbol: 'USDC'
});

// Check transfer status
const status = await circleCCTPService.getTransferStatus(transfer.id);
```

### ChainalysisService

```typescript
import { ChainalysisService } from './services/external/ChainalysisService';

const chainalysisService = new ChainalysisService();

// Check address risk
const addressRisk = await chainalysisService.checkAddressRisk('0x123...');

// Check transaction risk
const transactionRisk = await chainalysisService.checkTransactionRisk({
  transactionId: 'tx-123',
  sourceAddress: '0x123...',
  destinationAddress: '0x456...',
  amount: '100',
  currency: 'USDC'
});
```

### MoonPayService

```typescript
import { MoonPayService } from './services/external/MoonPayService';

const moonPayService = new MoonPayService();

// Generate widget URL
const widgetUrl = moonPayService.generateWidgetUrl({
  currencyCode: 'USDC',
  walletAddress: '0x123...',
  baseCurrencyCode: 'USD',
  baseCurrencyAmount: 100
});

// Get transaction details
const transaction = await moonPayService.getTransaction('tx-123');
```

## Testing

Each service has comprehensive unit tests in the `test/unit/external` directory and integration tests in the `test/integration/ExternalServices.integration.test.ts` file.

The integration tests are designed to skip when API keys are not available, making them suitable for CI/CD pipelines.

## Error Handling

All services include comprehensive error handling with proper logging. They also include fallback mechanisms for API failures where appropriate.

## Security

API keys and secrets are managed through the environment configuration and are never exposed in logs or responses.