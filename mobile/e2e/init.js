const { device, expect, element, by, waitFor } = require('detox');

describe('Example', () => {
  beforeAll(async () => {
    await device.launchApp();
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });
});

// Global timeout for all E2E tests
jest.setTimeout(300000);

// Global setup for Detox
beforeAll(async () => {
  await device.launchApp({
    permissions: {
      notifications: 'YES',
      camera: 'YES',
      photos: 'YES',
    },
  });
});

afterAll(async () => {
  await device.terminateApp();
});

// Helper functions for E2E tests
global.waitForElementToBeVisible = async (testID, timeout = 10000) => {
  await waitFor(element(by.id(testID)))
    .toBeVisible()
    .withTimeout(timeout);
};

global.tapElement = async (testID) => {
  await element(by.id(testID)).tap();
};

global.typeText = async (testID, text) => {
  await element(by.id(testID)).typeText(text);
};

global.clearText = async (testID) => {
  await element(by.id(testID)).clearText();
};

global.scrollToElement = async (testID, direction = 'down') => {
  await element(by.id(testID)).scroll(200, direction);
};

global.expectElementToBeVisible = async (testID) => {
  await expect(element(by.id(testID))).toBeVisible();
};

global.expectElementToHaveText = async (testID, text) => {
  await expect(element(by.id(testID))).toHaveText(text);
};

global.expectElementToExist = async (testID) => {
  await expect(element(by.id(testID))).toExist();
};

// Mock data for E2E tests
global.testData = {
  validUser: {
    email: 'test@yieldrails.com',
    password: 'TestPassword123!',
    pin: '123456',
  },
  validWallet: {
    address: '0x742d35Cc6C16C4aFF5D68Ab13C50FcA7C71F1234',
    privateKey: '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
  },
  validPayment: {
    amount: '100.00',
    currency: 'USDC',
    recipient: '0x742d35Cc6C16C4aFF5D68Ab13C50FcA7C71F1234',
  },
};

// Network mocking for E2E tests
global.mockNetworkRequests = async () => {
  // This would be used with a tool like MSW or similar
  // For now, we'll rely on the app's built-in mock mode
  await device.setURLBlacklist(['.*']);
  await device.setURLWhitelist(['.*localhost.*', '.*127.0.0.1.*']);
};