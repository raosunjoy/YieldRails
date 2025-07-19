import { device, expect, element, by, waitFor } from 'detox';

describe('Authentication Flow', () => {
  beforeEach(async () => {
    await device.reloadReactNative();
  });

  describe('Login Screen', () => {
    it('should display login screen on app launch', async () => {
      await waitFor(element(by.id('login-screen')))
        .toBeVisible()
        .withTimeout(10000);
      
      await expect(element(by.id('email-input'))).toBeVisible();
      await expect(element(by.id('password-input'))).toBeVisible();
      await expect(element(by.id('login-button'))).toBeVisible();
    });

    it('should show validation errors for invalid credentials', async () => {
      await element(by.id('email-input')).typeText('invalid-email');
      await element(by.id('password-input')).typeText('weak');
      await element(by.id('login-button')).tap();

      await waitFor(element(by.text('Please enter a valid email')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should login successfully with valid credentials', async () => {
      await element(by.id('email-input')).typeText(global.testData.validUser.email);
      await element(by.id('password-input')).typeText(global.testData.validUser.password);
      await element(by.id('login-button')).tap();

      await waitFor(element(by.id('dashboard-screen')))
        .toBeVisible()
        .withTimeout(15000);
    });

    it('should navigate to registration screen', async () => {
      await element(by.id('register-link')).tap();
      
      await waitFor(element(by.id('register-screen')))
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  describe('Biometric Authentication', () => {
    beforeEach(async () => {
      // Login first to access biometric settings
      await element(by.id('email-input')).typeText(global.testData.validUser.email);
      await element(by.id('password-input')).typeText(global.testData.validUser.password);
      await element(by.id('login-button')).tap();
      
      await waitFor(element(by.id('dashboard-screen')))
        .toBeVisible()
        .withTimeout(15000);
    });

    it('should enable biometric authentication', async () => {
      await element(by.id('profile-tab')).tap();
      await element(by.id('security-settings')).tap();
      
      await waitFor(element(by.id('biometric-toggle')))
        .toBeVisible()
        .withTimeout(5000);
      
      await element(by.id('biometric-toggle')).tap();
      
      // Mock biometric authentication success
      await waitFor(element(by.text('Biometric authentication enabled')))
        .toBeVisible()
        .withTimeout(10000);
    });

    it('should authenticate with biometrics on app restart', async () => {
      // Enable biometrics first
      await element(by.id('profile-tab')).tap();
      await element(by.id('security-settings')).tap();
      await element(by.id('biometric-toggle')).tap();
      
      // Restart app
      await device.terminateApp();
      await device.launchApp();
      
      await waitFor(element(by.id('authentication-screen')))
        .toBeVisible()
        .withTimeout(10000);
      
      await expect(element(by.id('biometric-auth-button'))).toBeVisible();
      await element(by.id('biometric-auth-button')).tap();
      
      // Mock successful biometric authentication
      await waitFor(element(by.id('dashboard-screen')))
        .toBeVisible()
        .withTimeout(15000);
    });
  });

  describe('PIN Authentication', () => {
    beforeEach(async () => {
      // Login and enable PIN
      await element(by.id('email-input')).typeText(global.testData.validUser.email);
      await element(by.id('password-input')).typeText(global.testData.validUser.password);
      await element(by.id('login-button')).tap();
      
      await waitFor(element(by.id('dashboard-screen')))
        .toBeVisible()
        .withTimeout(15000);
      
      // Enable PIN authentication
      await element(by.id('profile-tab')).tap();
      await element(by.id('security-settings')).tap();
      await element(by.id('pin-toggle')).tap();
      
      // Set PIN
      for (let i = 0; i < global.testData.validUser.pin.length; i++) {
        await element(by.id(`pin-key-${global.testData.validUser.pin[i]}`)).tap();
      }
      
      // Confirm PIN
      for (let i = 0; i < global.testData.validUser.pin.length; i++) {
        await element(by.id(`pin-key-${global.testData.validUser.pin[i]}`)).tap();
      }
    });

    it('should authenticate with PIN', async () => {
      // Restart app
      await device.terminateApp();
      await device.launchApp();
      
      await waitFor(element(by.id('authentication-screen')))
        .toBeVisible()
        .withTimeout(10000);
      
      await element(by.id('pin-auth-button')).tap();
      
      // Enter PIN
      for (let i = 0; i < global.testData.validUser.pin.length; i++) {
        await element(by.id(`pin-key-${global.testData.validUser.pin[i]}`)).tap();
      }
      
      await waitFor(element(by.id('dashboard-screen')))
        .toBeVisible()
        .withTimeout(15000);
    });

    it('should handle incorrect PIN attempts', async () => {
      await device.terminateApp();
      await device.launchApp();
      
      await waitFor(element(by.id('authentication-screen')))
        .toBeVisible()
        .withTimeout(10000);
      
      await element(by.id('pin-auth-button')).tap();
      
      // Enter incorrect PIN
      const incorrectPin = '000000';
      for (let i = 0; i < incorrectPin.length; i++) {
        await element(by.id(`pin-key-${incorrectPin[i]}`)).tap();
      }
      
      await waitFor(element(by.text('Incorrect PIN')))
        .toBeVisible()
        .withTimeout(5000);
      
      await expect(element(by.id('authentication-screen'))).toBeVisible();
    });
  });

  describe('Registration Flow', () => {
    beforeEach(async () => {
      await element(by.id('register-link')).tap();
      
      await waitFor(element(by.id('register-screen')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should register a new user successfully', async () => {
      await element(by.id('register-email-input')).typeText('newuser@example.com');
      await element(by.id('register-password-input')).typeText('NewPassword123!');
      await element(by.id('register-confirm-password-input')).typeText('NewPassword123!');
      await element(by.id('terms-checkbox')).tap();
      await element(by.id('register-button')).tap();

      await waitFor(element(by.text('Registration successful')))
        .toBeVisible()
        .withTimeout(10000);
    });

    it('should validate password strength', async () => {
      await element(by.id('register-email-input')).typeText('test@example.com');
      await element(by.id('register-password-input')).typeText('weak');
      await element(by.id('register-button')).tap();

      await waitFor(element(by.text('Password must be at least 8 characters')))
        .toBeVisible()
        .withTimeout(5000);
    });

    it('should validate password confirmation', async () => {
      await element(by.id('register-email-input')).typeText('test@example.com');
      await element(by.id('register-password-input')).typeText('StrongPassword123!');
      await element(by.id('register-confirm-password-input')).typeText('DifferentPassword123!');
      await element(by.id('register-button')).tap();

      await waitFor(element(by.text('Passwords do not match')))
        .toBeVisible()
        .withTimeout(5000);
    });
  });

  describe('Logout', () => {
    beforeEach(async () => {
      // Login first
      await element(by.id('email-input')).typeText(global.testData.validUser.email);
      await element(by.id('password-input')).typeText(global.testData.validUser.password);
      await element(by.id('login-button')).tap();
      
      await waitFor(element(by.id('dashboard-screen')))
        .toBeVisible()
        .withTimeout(15000);
    });

    it('should logout successfully', async () => {
      await element(by.id('profile-tab')).tap();
      await element(by.id('logout-button')).tap();
      
      await waitFor(element(by.text('Are you sure you want to logout?')))
        .toBeVisible()
        .withTimeout(5000);
      
      await element(by.text('Logout')).tap();
      
      await waitFor(element(by.id('login-screen')))
        .toBeVisible()
        .withTimeout(10000);
    });
  });
});