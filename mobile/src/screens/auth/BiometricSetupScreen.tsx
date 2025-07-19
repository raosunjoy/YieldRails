import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  IconButton,
  Switch,
  List,
  Divider,
  ActivityIndicator,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@store/index';
import {
  enableBiometricAuth,
  disableBiometricAuth,
  setupPin,
  disablePin,
  updateSecuritySettings,
  clearError,
} from '@store/authSlice';
import { BiometricCapabilities } from '@types/auth';
import { BiometricAuthService } from '@services/BiometricAuthService';

export const BiometricSetupScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  
  const {
    biometricAvailable,
    biometricEnabled,
    biometricType,
    pinEnabled,
    loading,
    error,
  } = useSelector((state: RootState) => state.auth);

  const [capabilities, setCapabilities] = useState<BiometricCapabilities | null>(null);
  const [securitySettings, setSecuritySettings] = useState<any>(null);
  const [loadingCapabilities, setLoadingCapabilities] = useState(true);

  useEffect(() => {
    loadBiometricCapabilities();
    loadSecuritySettings();
  }, []);

  useEffect(() => {
    if (error) {
      Alert.alert('Error', error);
      dispatch(clearError());
    }
  }, [error, dispatch]);

  const loadBiometricCapabilities = async () => {
    try {
      const biometricService = BiometricAuthService.getInstance();
      const caps = await biometricService.checkBiometricCapabilities();
      setCapabilities(caps);
    } catch (error) {
      console.error('Failed to load biometric capabilities:', error);
    } finally {
      setLoadingCapabilities(false);
    }
  };

  const loadSecuritySettings = async () => {
    try {
      const biometricService = BiometricAuthService.getInstance();
      const settings = await biometricService.getSecuritySettings();
      setSecuritySettings(settings);
    } catch (error) {
      console.error('Failed to load security settings:', error);
    }
  };

  const handleBiometricToggle = async () => {
    if (biometricEnabled) {
      Alert.alert(
        'Disable Biometric Authentication',
        `Are you sure you want to disable ${biometricType} authentication?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Disable',
            style: 'destructive',
            onPress: () => dispatch(disableBiometricAuth() as any),
          },
        ]
      );
    } else {
      if (!capabilities?.isAvailable) {
        Alert.alert(
          'Biometric Authentication Unavailable',
          'Your device does not support biometric authentication or no biometric data is enrolled.'
        );
        return;
      }

      try {
        await dispatch(enableBiometricAuth() as any).unwrap();
        Alert.alert(
          'Success',
          'Biometric authentication has been enabled successfully.'
        );
      } catch (error) {
        // Error is handled by the useEffect
      }
    }
  };

  const handlePinSetup = () => {
    navigation.navigate('PinSetup', { 
      mode: pinEnabled ? 'change' : 'setup' 
    });
  };

  const handlePinDisable = () => {
    Alert.alert(
      'Disable PIN Authentication',
      'Are you sure you want to disable PIN authentication?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disable',
          style: 'destructive',
          onPress: () => dispatch(disablePin() as any),
        },
      ]
    );
  };

  const handleAutoLockToggle = async (enabled: boolean) => {
    try {
      await dispatch(updateSecuritySettings({ autoLockEnabled: enabled }) as any);
      setSecuritySettings(prev => ({ ...prev, autoLockEnabled: enabled }));
    } catch (error) {
      // Error is handled by the useEffect
    }
  };

  const handleAutoLockTimeoutChange = (timeout: number) => {
    Alert.alert(
      'Auto-Lock Timeout',
      'Select when the app should automatically lock:',
      [
        { text: '1 minute', onPress: () => updateTimeout(60) },
        { text: '5 minutes', onPress: () => updateTimeout(300) },
        { text: '15 minutes', onPress: () => updateTimeout(900) },
        { text: '30 minutes', onPress: () => updateTimeout(1800) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const updateTimeout = async (seconds: number) => {
    try {
      await dispatch(updateSecuritySettings({ autoLockTimeout: seconds }) as any);
      setSecuritySettings(prev => ({ ...prev, autoLockTimeout: seconds }));
    } catch (error) {
      // Error is handled by the useEffect
    }
  };

  const formatTimeout = (seconds: number) => {
    if (seconds < 60) return `${seconds} seconds`;
    const minutes = seconds / 60;
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''}`;
    const hours = minutes / 60;
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  };

  const getBiometricIcon = () => {
    switch (biometricType) {
      case 'FaceID':
        return 'face-recognition';
      case 'TouchID':
      case 'Fingerprint':
        return 'fingerprint';
      default:
        return 'shield-check';
    }
  };

  const getBiometricLabel = () => {
    switch (biometricType) {
      case 'FaceID':
        return 'Face ID';
      case 'TouchID':
        return 'Touch ID';
      case 'Fingerprint':
        return 'Fingerprint';
      default:
        return 'Biometric Authentication';
    }
  };

  if (loadingCapabilities) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Loading security settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.headerCard}>
        <Card.Content>
          <View style={styles.header}>
            <IconButton icon="shield-check" size={40} iconColor="#4caf50" />
            <View style={styles.headerText}>
              <Text variant="headlineSmall">Security Settings</Text>
              <Text variant="bodyMedium" style={styles.subtitle}>
                Secure your account with biometric authentication and PIN
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Biometric Authentication */}
      <Card style={styles.settingCard}>
        <Card.Content>
          <List.Section>
            <List.Subheader>Biometric Authentication</List.Subheader>
            
            <List.Item
              title={getBiometricLabel()}
              description={
                biometricAvailable 
                  ? biometricEnabled 
                    ? 'Enabled - Authenticate with your biometric data'
                    : 'Available - Tap to enable'
                  : 'Not available on this device'
              }
              left={() => <List.Icon icon={getBiometricIcon()} />}
              right={() => (
                <Switch
                  value={biometricEnabled}
                  onValueChange={handleBiometricToggle}
                  disabled={!biometricAvailable || loading}
                />
              )}
              disabled={!biometricAvailable}
            />

            {capabilities && !capabilities.isAvailable && (
              <Text variant="bodySmall" style={styles.warningText}>
                Biometric authentication is not available on this device.
              </Text>
            )}

            {capabilities && capabilities.isAvailable && !capabilities.isEnrolled && (
              <Text variant="bodySmall" style={styles.warningText}>
                No biometric data is enrolled. Please set up biometric authentication in your device settings first.
              </Text>
            )}
          </List.Section>
        </Card.Content>
      </Card>

      {/* PIN Authentication */}
      <Card style={styles.settingCard}>
        <Card.Content>
          <List.Section>
            <List.Subheader>PIN Authentication</List.Subheader>
            
            <List.Item
              title="PIN Code"
              description={
                pinEnabled 
                  ? 'Enabled - Authenticate with your PIN'
                  : 'Disabled - Tap to set up'
              }
              left={() => <List.Icon icon="numeric" />}
              right={() => (
                <View style={styles.pinActions}>
                  {pinEnabled ? (
                    <>
                      <Button
                        mode="outlined"
                        onPress={handlePinSetup}
                        compact
                        style={styles.actionButton}
                      >
                        Change
                      </Button>
                      <Button
                        mode="outlined"
                        onPress={handlePinDisable}
                        compact
                        style={styles.actionButton}
                        textColor="#f44336"
                      >
                        Disable
                      </Button>
                    </>
                  ) : (
                    <Button
                      mode="contained"
                      onPress={handlePinSetup}
                      compact
                    >
                      Set Up
                    </Button>
                  )}
                </View>
              )}
            />
          </List.Section>
        </Card.Content>
      </Card>

      {/* Auto-Lock Settings */}
      {securitySettings && (
        <Card style={styles.settingCard}>
          <Card.Content>
            <List.Section>
              <List.Subheader>Auto-Lock</List.Subheader>
              
              <List.Item
                title="Auto-Lock"
                description="Automatically lock the app when idle"
                left={() => <List.Icon icon="lock-clock" />}
                right={() => (
                  <Switch
                    value={securitySettings.autoLockEnabled}
                    onValueChange={handleAutoLockToggle}
                    disabled={loading}
                  />
                )}
              />

              {securitySettings.autoLockEnabled && (
                <List.Item
                  title="Auto-Lock Timeout"
                  description={`Lock after ${formatTimeout(securitySettings.autoLockTimeout)}`}
                  left={() => <List.Icon icon="timer" />}
                  onPress={() => handleAutoLockTimeoutChange(securitySettings.autoLockTimeout)}
                />
              )}
            </List.Section>
          </Card.Content>
        </Card>
      )}

      {/* Additional Security Settings */}
      {securitySettings && (
        <Card style={styles.settingCard}>
          <Card.Content>
            <List.Section>
              <List.Subheader>Additional Security</List.Subheader>
              
              <List.Item
                title="Require Auth for Transactions"
                description="Authenticate before sending payments"
                left={() => <List.Icon icon="send-lock" />}
                right={() => (
                  <Switch
                    value={securitySettings.requireAuthForTransactions}
                    onValueChange={(value) => 
                      dispatch(updateSecuritySettings({ requireAuthForTransactions: value }) as any)
                    }
                    disabled={loading}
                  />
                )}
              />

              <List.Item
                title="Require Auth for Sensitive Data"
                description="Authenticate to view private keys and seed phrases"
                left={() => <List.Icon icon="eye-off" />}
                right={() => (
                  <Switch
                    value={securitySettings.requireAuthForSensitiveData}
                    onValueChange={(value) => 
                      dispatch(updateSecuritySettings({ requireAuthForSensitiveData: value }) as any)
                    }
                    disabled={loading}
                  />
                )}
              />
            </List.Section>
          </Card.Content>
        </Card>
      )}

      {/* Security Tips */}
      <Card style={styles.tipsCard}>
        <Card.Content>
          <View style={styles.tipsHeader}>
            <IconButton icon="lightbulb-on" iconColor="#ff9800" />
            <Text variant="titleMedium">Security Tips</Text>
          </View>
          
          <View style={styles.tipsList}>
            <Text variant="bodySmall" style={styles.tipItem}>
              • Enable both biometric and PIN authentication for maximum security
            </Text>
            <Text variant="bodySmall" style={styles.tipItem}>
              • Use a strong, unique PIN that you don't use elsewhere
            </Text>
            <Text variant="bodySmall" style={styles.tipItem}>
              • Enable auto-lock to protect your account when away from your device
            </Text>
            <Text variant="bodySmall" style={styles.tipItem}>
              • Keep your device's operating system updated for the latest security features
            </Text>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
  headerCard: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerText: {
    flex: 1,
    marginLeft: 16,
  },
  subtitle: {
    opacity: 0.7,
    marginTop: 4,
  },
  settingCard: {
    marginBottom: 16,
  },
  warningText: {
    color: '#ff9800',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  pinActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    minWidth: 60,
  },
  tipsCard: {
    backgroundColor: '#fff8e1',
    marginBottom: 24,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipsList: {
    gap: 8,
  },
  tipItem: {
    opacity: 0.8,
    lineHeight: 18,
  },
});