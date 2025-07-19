# YieldRails Mobile Application

A React Native mobile application for DeFi yield optimization and cross-chain payments.

## 🚀 Features

- **Wallet Integration**: Support for MetaMask, WalletConnect, and other Web3 wallets
- **Cross-Chain Payments**: Send payments across different blockchain networks
- **Yield Strategies**: Access and manage DeFi yield farming strategies
- **Real-Time Updates**: WebSocket-powered live data and notifications
- **Biometric Security**: Touch ID, Face ID, and PIN authentication
- **Push Notifications**: Real-time alerts for payments and yield updates
- **Native UI/UX**: Platform-specific components and interactions

## 📱 Supported Platforms

- iOS 12.0+
- Android API 21+ (Android 5.0+)

## 🛠 Development Setup

### Prerequisites

- Node.js 18+
- React Native CLI
- Xcode 14+ (for iOS development)
- Android Studio (for Android development)
- CocoaPods (for iOS dependencies)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yieldrails/yieldrails-mobile.git
cd yieldrails-mobile/mobile
```

2. Install dependencies:
```bash
npm install
```

3. Install iOS dependencies (macOS only):
```bash
cd ios && pod install && cd ..
```

4. Create environment configuration:
```bash
cp .env.example .env
# Edit .env with your configuration
```

### Running the App

#### Development Mode

```bash
# Start Metro bundler
npm start

# Run on iOS simulator
npm run ios

# Run on Android emulator
npm run android
```

#### Testing

```bash
# Run unit tests
npm run test:unit

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run test:e2e:build
npm run test:e2e

# Run linting
npm run lint

# Run type checking
npm run type-check
```

## 🏗 Building

### Quick Build

```bash
# Build for current environment
npm run build

# Build for specific environment
npm run build:dev
npm run build:staging
npm run build:prod
```

### Platform-Specific Builds

```bash
# Android APK
npm run build:android

# iOS Archive
npm run build:ios

# Custom build with options
./scripts/build.sh -p android -e staging -t apk
./scripts/build.sh -p ios -e production -t ipa
```

### Build Script Options

```bash
./scripts/build.sh [OPTIONS]

Options:
  -p, --platform PLATFORM    Target platform (ios|android|all) [default: all]
  -e, --environment ENV       Build environment (development|staging|production) [default: development]
  -t, --type TYPE            Build type (apk|aab|ipa) [default: apk]
  -c, --clean                Clean build cache before building
  -v, --verbose              Enable verbose output
  -h, --help                 Show help message
```

## 🚀 Deployment

### Quick Deployment

```bash
# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:prod
```

### Custom Deployment

```bash
./scripts/deploy.sh [OPTIONS]

Options:
  -e, --environment ENV       Deploy environment (staging|production) [default: staging]
  -p, --platform PLATFORM    Target platform (ios|android|all) [default: all]
  -s, --skip-build           Skip the build process
  -t, --skip-tests           Skip running tests
  -a, --auto-submit          Automatically submit to app stores (production only)
  -v, --verbose              Enable verbose output
```

### Examples

```bash
# Deploy Android to staging
./scripts/deploy.sh -e staging -p android

# Deploy to production with auto-submit
./scripts/deploy.sh -e production -a

# Quick deploy (skip tests and build)
./scripts/deploy.sh --skip-build --skip-tests
```

## 🧪 Testing

### Test Structure

```
mobile/
├── src/
│   ├── __tests__/          # Unit tests
│   │   ├── components/     # Component tests
│   │   ├── services/       # Service tests
│   │   ├── utils/          # Utility tests
│   │   └── stores/         # Store tests
│   └── utils/
│       ├── testSetup.ts    # Test configuration
│       └── testHelpers.tsx # Test utilities
├── e2e/                    # E2E tests
│   ├── tests/              # Test files
│   ├── init.js             # E2E setup
│   └── jest.config.js      # E2E Jest config
└── jest.config.js          # Unit test config
```

### Writing Tests

#### Unit Tests

```typescript
import { render } from '@testing-library/react-native';
import { renderWithProviders } from '@utils/testHelpers';
import { PaymentScreen } from '@screens/PaymentScreen';

describe('PaymentScreen', () => {
  it('should render payment form', () => {
    const { getByTestId } = renderWithProviders(<PaymentScreen />);
    expect(getByTestId('payment-form')).toBeTruthy();
  });
});
```

#### E2E Tests

```typescript
import { device, expect, element, by } from 'detox';

describe('Payment Flow', () => {
  it('should create payment successfully', async () => {
    await element(by.id('create-payment-button')).tap();
    await element(by.id('amount-input')).typeText('100');
    await element(by.id('submit-button')).tap();
    
    await expect(element(by.text('Payment created'))).toBeVisible();
  });
});
```

### Test Coverage

Current coverage targets:
- Lines: 80%
- Functions: 80%
- Branches: 80%
- Statements: 80%

## 📦 Project Structure

```
mobile/
├── src/
│   ├── components/         # Reusable components
│   │   ├── ui/            # UI components
│   │   ├── forms/         # Form components
│   │   └── charts/        # Chart components
│   ├── screens/           # Screen components
│   │   ├── auth/          # Authentication screens
│   │   ├── payments/      # Payment screens
│   │   ├── wallet/        # Wallet screens
│   │   └── yield/         # Yield screens
│   ├── services/          # API and business logic
│   │   ├── ApiService.ts  # HTTP client
│   │   ├── WalletService.ts # Wallet integration
│   │   └── NotificationService.ts # Push notifications
│   ├── store/             # Redux store
│   │   ├── slices/        # Redux slices
│   │   └── index.ts       # Store configuration
│   ├── navigation/        # Navigation setup
│   ├── types/             # TypeScript types
│   ├── utils/             # Utility functions
│   └── assets/            # Images and fonts
├── android/               # Android-specific code
├── ios/                   # iOS-specific code
├── e2e/                   # E2E tests
├── scripts/               # Build and deployment scripts
└── docs/                  # Documentation
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the mobile directory:

```bash
# API Configuration
API_BASE_URL=https://api.yieldrails.com/api
WEBSOCKET_URL=wss://api.yieldrails.com/ws

# Wallet Configuration
WALLET_CONNECT_PROJECT_ID=your_project_id

# Notification Configuration
FCM_SERVER_KEY=your_fcm_server_key

# Environment
NODE_ENV=development
APP_VARIANT=development
```

### App Configuration

The `app.config.js` file handles environment-specific configuration:

- Development: Local API, debugging enabled
- Staging: Staging API, internal distribution
- Production: Production API, app store distribution

## 🔐 Security

### Authentication Methods

1. **Email/Password**: Traditional authentication
2. **Biometric**: Touch ID, Face ID, Fingerprint
3. **PIN**: 6-digit PIN authentication
4. **Wallet**: Web3 wallet signature authentication

### Security Features

- End-to-end encryption for sensitive data
- Secure storage using device keychain
- Biometric authentication for transactions
- Auto-lock after inactivity
- Certificate pinning for API calls

## 📱 Platform-Specific Features

### iOS

- Touch ID / Face ID integration
- Haptic feedback
- iOS-specific UI components
- Push notification categories
- Deep linking support

### Android

- Fingerprint authentication
- Android-specific UI components
- Background sync
- Custom notification channels
- Intent filters

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass: `npm run test`
6. Lint your code: `npm run lint`
7. Commit your changes: `git commit -m 'Add your feature'`
8. Push to the branch: `git push origin feature/your-feature`
9. Submit a pull request

### Code Style

- Use TypeScript for type safety
- Follow React Native best practices
- Use functional components with hooks
- Implement proper error handling
- Add JSDoc comments for complex functions
- Maintain test coverage above 80%

## 📚 Documentation

- [API Documentation](./docs/api.md)
- [Component Library](./docs/components.md)
- [Development Guide](./docs/development.md)
- [Deployment Guide](./docs/deployment.md)
- [Troubleshooting](./docs/troubleshooting.md)

## 🐛 Troubleshooting

### Common Issues

1. **Metro bundler cache issues**:
   ```bash
   npm start -- --reset-cache
   ```

2. **iOS build fails**:
   ```bash
   cd ios && pod install && cd ..
   ```

3. **Android build fails**:
   ```bash
   cd android && ./gradlew clean && cd ..
   ```

4. **E2E tests fail**:
   ```bash
   npm run test:e2e:build
   ```

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

- GitHub Issues: [Report a bug](https://github.com/yieldrails/yieldrails-mobile/issues)
- Email: support@yieldrails.com
- Discord: [YieldRails Community](https://discord.gg/yieldrails)

---

Built with ❤️ by the YieldRails Team