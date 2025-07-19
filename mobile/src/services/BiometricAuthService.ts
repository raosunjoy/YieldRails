import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BiometricCapabilities, BiometricAuthConfig, SecuritySettings } from '@types/auth';

export class BiometricAuthService {
  private static instance: BiometricAuthService;
  private securitySettings: SecuritySettings | null = null;

  private constructor() {}

  public static getInstance(): BiometricAuthService {
    if (!BiometricAuthService.instance) {
      BiometricAuthService.instance = new BiometricAuthService();
    }
    return BiometricAuthService.instance;
  }

  async initialize(): Promise<void> {
    try {
      await this.loadSecuritySettings();
    } catch (error) {
      console.error('Failed to initialize biometric auth service:', error);
      throw new Error('Failed to initialize biometric authentication');
    }
  }

  async checkBiometricCapabilities(): Promise<BiometricCapabilities> {
    try {
      const isAvailable = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();
      const supportedTypes = await LocalAuthentication.supportedAuthenticationTypesAsync();
      
      let biometryType: 'TouchID' | 'FaceID' | 'Fingerprint' | 'None' = 'None';
      
      if (Platform.OS === 'ios') {
        if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
          biometryType = 'FaceID';
        } else if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          biometryType = 'TouchID';
        }
      } else {
        if (supportedTypes.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
          biometryType = 'Fingerprint';
        }
      }

      return {
        isAvailable,
        biometryType,
        isEnrolled,
        supportedTypes: supportedTypes.map(type => 
          LocalAuthentication.AuthenticationType[type]
        ),
      };
    } catch (error) {
      console.error('Failed to check biometric capabilities:', error);
      return {
        isAvailable: false,
        biometryType: 'None',
        isEnrolled: false,
        supportedTypes: [],
      };
    }
  }

  async authenticateWithBiometrics(config?: Partial<BiometricAuthConfig>): Promise<boolean> {
    try {
      const capabilities = await this.checkBiometricCapabilities();
      
      if (!capabilities.isAvailable || !capabilities.isEnrolled) {
        throw new Error('Biometric authentication not available or not enrolled');
      }

      const defaultConfig: BiometricAuthConfig = {
        enabled: true,
        type: capabilities.biometryType.toLowerCase() as any,
        fallbackToPin: true,
        promptTitle: 'Authenticate',
        promptSubtitle: 'Use your biometric to access YieldRails',
        promptDescription: 'Place your finger on the sensor or look at the camera',
        cancelText: 'Cancel',
        fallbackText: 'Use PIN',
      };

      const authConfig = { ...defaultConfig, ...config };

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: authConfig.promptTitle,
        fallbackLabel: authConfig.fallbackText,
        disableDeviceFallback: !authConfig.fallbackToPin,
        cancelLabel: authConfig.cancelText,
      });

      if (result.success) {
        await this.recordSuccessfulAuth('biometric');
        return true;
      } else {
        console.log('Biometric authentication failed:', result.error);
        return false;
      }
    } catch (error) {
      console.error('Biometric authentication error:', error);
      throw new Error('Biometric authentication failed');
    }
  }

  async enableBiometricAuth(): Promise<boolean> {
    try {
      const capabilities = await this.checkBiometricCapabilities();
      
      if (!capabilities.isAvailable) {
        throw new Error('Biometric hardware not available');
      }

      if (!capabilities.isEnrolled) {
        throw new Error('No biometric data enrolled on device');
      }

      // Test authentication before enabling
      const authResult = await this.authenticateWithBiometrics({
        promptTitle: 'Enable Biometric Authentication',
        promptSubtitle: 'Authenticate to enable biometric login',
      });

      if (authResult) {
        await this.updateSecuritySettings({ biometricAuth: true });
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to enable biometric auth:', error);
      throw error;
    }
  }

  async disableBiometricAuth(): Promise<void> {
    try {
      await this.updateSecuritySettings({ biometricAuth: false });
      await this.clearBiometricData();
    } catch (error) {
      console.error('Failed to disable biometric auth:', error);
      throw new Error('Failed to disable biometric authentication');
    }
  }

  async storeBiometricData(key: string, value: string): Promise<void> {
    try {
      const authResult = await this.authenticateWithBiometrics({
        promptTitle: 'Secure Storage',
        promptSubtitle: 'Authenticate to store secure data',
      });

      if (!authResult) {
        throw new Error('Authentication required to store data');
      }

      await SecureStore.setItemAsync(key, value, {
        requireAuthentication: true,
        authenticationPrompt: 'Authenticate to access stored data',
      });
    } catch (error) {
      console.error('Failed to store biometric data:', error);
      throw new Error('Failed to store secure data');
    }
  }

  async getBiometricData(key: string): Promise<string | null> {
    try {
      const authResult = await this.authenticateWithBiometrics({
        promptTitle: 'Access Secure Data',
        promptSubtitle: 'Authenticate to access your data',
      });

      if (!authResult) {
        throw new Error('Authentication required to access data');
      }

      return await SecureStore.getItemAsync(key, {
        requireAuthentication: true,
        authenticationPrompt: 'Authenticate to access stored data',
      });
    } catch (error) {
      console.error('Failed to get biometric data:', error);
      return null;
    }
  }

  async clearBiometricData(): Promise<void> {
    try {
      const keys = ['biometric_token', 'wallet_private_key', 'secure_pin'];
      
      for (const key of keys) {
        try {
          await SecureStore.deleteItemAsync(key);
        } catch (error) {
          // Key might not exist, continue
          console.log(`Key ${key} not found or already deleted`);
        }
      }
    } catch (error) {
      console.error('Failed to clear biometric data:', error);
    }
  }

  async setupPinAuth(pin: string): Promise<boolean> {
    try {
      if (pin.length < 4 || pin.length > 8) {
        throw new Error('PIN must be between 4 and 8 digits');
      }

      if (!/^\d+$/.test(pin)) {
        throw new Error('PIN must contain only numbers');
      }

      // Hash the PIN before storing
      const hashedPin = await this.hashPin(pin);
      
      await SecureStore.setItemAsync('secure_pin', hashedPin);
      await this.updateSecuritySettings({ pinAuth: true });
      
      return true;
    } catch (error) {
      console.error('Failed to setup PIN auth:', error);
      throw error;
    }
  }

  async authenticateWithPin(pin: string): Promise<boolean> {
    try {
      const storedPin = await SecureStore.getItemAsync('secure_pin');
      
      if (!storedPin) {
        throw new Error('No PIN configured');
      }

      const hashedPin = await this.hashPin(pin);
      
      if (hashedPin === storedPin) {
        await this.recordSuccessfulAuth('pin');
        return true;
      }

      return false;
    } catch (error) {
      console.error('PIN authentication failed:', error);
      return false;
    }
  }

  async changePinAuth(oldPin: string, newPin: string): Promise<boolean> {
    try {
      // Verify old PIN first
      const oldPinValid = await this.authenticateWithPin(oldPin);
      
      if (!oldPinValid) {
        throw new Error('Current PIN is incorrect');
      }

      // Set new PIN
      return await this.setupPinAuth(newPin);
    } catch (error) {
      console.error('Failed to change PIN:', error);
      throw error;
    }
  }

  async disablePinAuth(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync('secure_pin');
      await this.updateSecuritySettings({ pinAuth: false });
    } catch (error) {
      console.error('Failed to disable PIN auth:', error);
      throw new Error('Failed to disable PIN authentication');
    }
  }

  private async hashPin(pin: string): Promise<string> {
    // Simple hash implementation - in production, use a proper cryptographic hash
    const crypto = require('crypto-js');
    return crypto.SHA256(pin + 'yieldrails_salt').toString();
  }

  private async recordSuccessfulAuth(method: 'biometric' | 'pin'): Promise<void> {
    try {
      const timestamp = Date.now();
      await AsyncStorage.setItem('last_auth_timestamp', timestamp.toString());
      await AsyncStorage.setItem('last_auth_method', method);
    } catch (error) {
      console.error('Failed to record authentication:', error);
    }
  }

  async checkAuthenticationRequired(): Promise<boolean> {
    try {
      const settings = await this.getSecuritySettings();
      
      if (!settings.autoLockEnabled) {
        return false;
      }

      const lastAuthTimestamp = await AsyncStorage.getItem('last_auth_timestamp');
      
      if (!lastAuthTimestamp) {
        return true; // No previous authentication
      }

      const timeSinceAuth = Date.now() - parseInt(lastAuthTimestamp);
      const timeoutMs = settings.autoLockTimeout * 1000;

      return timeSinceAuth > timeoutMs;
    } catch (error) {
      console.error('Failed to check authentication requirement:', error);
      return true; // Err on the side of caution
    }
  }

  async authenticateUser(): Promise<boolean> {
    try {
      const settings = await this.getSecuritySettings();
      
      // Try biometric first if enabled
      if (settings.biometricAuth) {
        try {
          return await this.authenticateWithBiometrics();
        } catch (error) {
          console.log('Biometric auth failed, falling back to PIN');
          
          if (!settings.pinAuth) {
            throw error;
          }
        }
      }

      // Fall back to PIN if biometric fails or is not enabled
      if (settings.pinAuth) {
        // This would show a PIN input dialog
        // For now, return false to indicate manual PIN entry needed
        return false;
      }

      // No authentication methods enabled
      return false;
    } catch (error) {
      console.error('User authentication failed:', error);
      return false;
    }
  }

  async getSecuritySettings(): Promise<SecuritySettings> {
    if (!this.securitySettings) {
      await this.loadSecuritySettings();
    }
    
    return this.securitySettings || this.getDefaultSecuritySettings();
  }

  private async loadSecuritySettings(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('security_settings');
      if (stored) {
        this.securitySettings = JSON.parse(stored);
      } else {
        this.securitySettings = this.getDefaultSecuritySettings();
        await this.saveSecuritySettings();
      }
    } catch (error) {
      console.error('Failed to load security settings:', error);
      this.securitySettings = this.getDefaultSecuritySettings();
    }
  }

  private getDefaultSecuritySettings(): SecuritySettings {
    return {
      biometricAuth: false,
      pinAuth: false,
      autoLockEnabled: true,
      autoLockTimeout: 300, // 5 minutes
      requireAuthForTransactions: true,
      requireAuthForSensitiveData: true,
      sessionTimeout: 3600, // 1 hour
    };
  }

  async updateSecuritySettings(updates: Partial<SecuritySettings>): Promise<void> {
    try {
      this.securitySettings = {
        ...await this.getSecuritySettings(),
        ...updates,
      };
      await this.saveSecuritySettings();
    } catch (error) {
      console.error('Failed to update security settings:', error);
      throw new Error('Failed to update security settings');
    }
  }

  private async saveSecuritySettings(): Promise<void> {
    try {
      if (this.securitySettings) {
        await AsyncStorage.setItem('security_settings', JSON.stringify(this.securitySettings));
      }
    } catch (error) {
      console.error('Failed to save security settings:', error);
      throw new Error('Failed to save security settings');
    }
  }

  async clearAllAuthData(): Promise<void> {
    try {
      await this.clearBiometricData();
      await AsyncStorage.multiRemove([
        'security_settings',
        'last_auth_timestamp',
        'last_auth_method',
      ]);
      this.securitySettings = null;
    } catch (error) {
      console.error('Failed to clear auth data:', error);
    }
  }

  async isAuthMethodAvailable(method: 'biometric' | 'pin'): Promise<boolean> {
    try {
      if (method === 'biometric') {
        const capabilities = await this.checkBiometricCapabilities();
        return capabilities.isAvailable && capabilities.isEnrolled;
      } else {
        const pin = await SecureStore.getItemAsync('secure_pin');
        return !!pin;
      }
    } catch (error) {
      console.error(`Failed to check ${method} availability:`, error);
      return false;
    }
  }
}