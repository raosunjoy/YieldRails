import 'react-native-gesture-handler/jestSetup';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

// Mock React Native modules
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock React Native Config
jest.mock('react-native-config', () => ({
  API_BASE_URL: 'https://api.test.yieldrails.com',
  WEBSOCKET_URL: 'wss://api.test.yieldrails.com/ws',
  WALLET_CONNECT_PROJECT_ID: 'test_project_id',
}));

// Mock Expo modules
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
  isEnrolledAsync: jest.fn(() => Promise.resolve(true)),
  supportedAuthenticationTypesAsync: jest.fn(() => Promise.resolve([1, 2])),
  authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
  },
}));

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve('test_value')),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-notifications', () => ({
  hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'test_push_token' })),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  removeNotificationSubscription: jest.fn(),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('notification_id')),
  presentNotificationAsync: jest.fn(() => Promise.resolve()),
  dismissAllNotificationsAsync: jest.fn(() => Promise.resolve()),
  setBadgeCountAsync: jest.fn(() => Promise.resolve()),
  getBadgeCountAsync: jest.fn(() => Promise.resolve(0)),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  AndroidImportance: {
    MAX: 5,
    HIGH: 4,
    DEFAULT: 3,
    LOW: 2,
    MIN: 1,
  },
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

jest.mock('expo-device', () => ({
  isDevice: true,
  getDeviceTypeAsync: jest.fn(() => Promise.resolve('PHONE')),
}));

jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      eas: {
        projectId: 'test_project_id',
      },
    },
  },
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    dispatch: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
    name: 'TestScreen',
  }),
  useFocusEffect: jest.fn(),
}));

// Mock WalletConnect
jest.mock('@walletconnect/core', () => ({
  Core: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('@walletconnect/web3wallet', () => ({
  Web3Wallet: {
    init: jest.fn(() => Promise.resolve({
      on: jest.fn(),
      approveSession: jest.fn(),
      rejectSession: jest.fn(),
      respondSessionRequest: jest.fn(),
      disconnectSession: jest.fn(),
      getActiveSessions: jest.fn(() => ({})),
    })),
  },
}));

jest.mock('@walletconnect/utils', () => ({
  buildApprovedNamespaces: jest.fn(() => ({})),
  getSdkError: jest.fn(() => ({ code: -1, message: 'Error' })),
}));

// Mock ethers
jest.mock('ethers', () => ({
  ethers: {
    JsonRpcProvider: jest.fn().mockImplementation(() => ({
      getBalance: jest.fn(() => Promise.resolve('1000000000000000000')),
      getBlockNumber: jest.fn(() => Promise.resolve(12345678)),
      getTransactionReceipt: jest.fn(() => Promise.resolve({})),
    })),
    Contract: jest.fn().mockImplementation(() => ({
      balanceOf: jest.fn(() => Promise.resolve('1000000000000000000')),
      decimals: jest.fn(() => Promise.resolve(18)),
      symbol: jest.fn(() => Promise.resolve('TEST')),
      name: jest.fn(() => Promise.resolve('Test Token')),
      on: jest.fn(),
      removeAllListeners: jest.fn(),
    })),
    Wallet: jest.fn().mockImplementation(() => ({
      signMessage: jest.fn(() => Promise.resolve('0xsignature')),
      signTransaction: jest.fn(() => Promise.resolve('0xsignedtx')),
      signTypedData: jest.fn(() => Promise.resolve('0xsignature')),
      sendTransaction: jest.fn(() => Promise.resolve({ hash: '0xtxhash' })),
    })),
    formatEther: jest.fn((value) => '1.0'),
    formatUnits: jest.fn((value, decimals) => '1.0'),
    parseUnits: jest.fn((value, decimals) => '1000000000000000000'),
    parseEther: jest.fn((value) => '1000000000000000000'),
    isAddress: jest.fn(() => true),
  },
}));

// Mock Socket.IO
jest.mock('socket.io-client', () => {
  const mockSocket = {
    on: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connected: true,
  };
  return jest.fn(() => mockSocket);
});

// Mock React Native Paper Provider
jest.mock('react-native-paper', () => {
  const RealModule = jest.requireActual('react-native-paper');
  return {
    ...RealModule,
    Provider: ({ children }: { children: React.ReactNode }) => children,
  };
});

// Mock Redux Persist
jest.mock('redux-persist', () => ({
  persistStore: jest.fn(() => ({
    purge: jest.fn(() => Promise.resolve()),
  })),
  persistReducer: jest.fn((config, reducer) => reducer),
  createTransform: jest.fn(),
  FLUSH: 'persist/FLUSH',
  REHYDRATE: 'persist/REHYDRATE',
  PAUSE: 'persist/PAUSE',
  PERSIST: 'persist/PERSIST',
  PURGE: 'persist/PURGE',
  REGISTER: 'persist/REGISTER',
}));

jest.mock('redux-persist/lib/storage', () => ({
  getItem: jest.fn(() => Promise.resolve(null)),
  setItem: jest.fn(() => Promise.resolve()),
  removeItem: jest.fn(() => Promise.resolve()),
}));

// Global test utilities
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Setup test environment
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.resetAllMocks();
});

export {};