import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  AppState,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  IconButton,
  ActivityIndicator,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@store/index';
import {
  authenticateWithBiometrics,
  authenticateWithPin,
  checkAuthenticationRequired,
  clearError,
} from '@store/authSlice';

export const AuthenticationScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  
  const {
    user,
    biometricAvailable,
    biometricEnabled,
    biometricType,
    pinEnabled,
    loading,
    error,
  } = useSelector((state: RootState) => state.auth);

  const [showPinInput, setShowPinInput] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    // Check if authentication is required when component mounts
    dispatch(checkAuthenticationRequired() as any);
  }, [dispatch]);

  useEffect(() => {
    // Handle app state changes to re-check authentication
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        dispatch(checkAuthenticationRequired() as any);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [dispatch]);

  useEffect(() => {
    if (error) {
      setIsError(true);
      setEnteredPin('');
      setAttempts(prev => prev + 1);
      
      setTimeout(() => {
        setIsError(false);
        dispatch(clearError());
      }, 500);

      // Show alert for multiple failed attempts
      if (attempts >= 2) {
        Alert.alert(
          'Authentication Failed',
          'Multiple authentication attempts have failed. Please try again or use an alternative method.',
          [{ text: 'OK' }]
        );
      }
    }
  }, [error, attempts, dispatch]);

  const handleBiometricAuth = async () => {
    try {
      await dispatch(authenticateWithBiometrics() as any).unwrap();
      // Navigation will be handled by the parent component
    } catch (error) {
      // Error is handled by useEffect
    }
  };

  const handlePinNumberPress = (number: string) => {
    if (enteredPin.length >= 6) return;

    const newPin = enteredPin + number;
    setEnteredPin(newPin);

    if (newPin.length === 6) {
      setTimeout(() => handlePinSubmit(newPin), 200);
    }
  };

  const handlePinBackspace = () => {
    setEnteredPin(prev => prev.slice(0, -1));
  };

  const handlePinSubmit = async (pin: string) => {
    try {
      await dispatch(authenticateWithPin(pin) as any).unwrap();
      // Navigation will be handled by the parent component
    } catch (error) {
      // Error is handled by useEffect
    }
  };

  const togglePinInput = () => {
    setShowPinInput(!showPinInput);
    setEnteredPin('');
    setIsError(false);
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
        return 'Use Face ID';
      case 'TouchID':
        return 'Use Touch ID';
      case 'Fingerprint':
        return 'Use Fingerprint';
      default:
        return 'Use Biometric';
    }
  };

  const renderPinDots = () => {
    const dots = [];
    for (let i = 0; i < 6; i++) {
      const isFilled = i < enteredPin.length;
      dots.push(
        <View
          key={i}
          style={[
            styles.pinDot,
            isFilled && styles.pinDotFilled,
            isError && styles.pinDotError,
          ]}
        />
      );
    }
    return <View style={styles.pinDots}>{dots}</View>;
  };

  const renderKeypad = () => {
    const numbers = [
      ['1', '2', '3'],
      ['4', '5', '6'],
      ['7', '8', '9'],
      ['', '0', 'backspace'],
    ];

    return (
      <View style={styles.keypad}>
        {numbers.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.keypadRow}>
            {row.map((key, keyIndex) => {
              if (key === '') {
                return <View key={keyIndex} style={styles.keypadButton} />;
              }

              if (key === 'backspace') {
                return (
                  <Button
                    key={keyIndex}
                    mode="text"
                    onPress={handlePinBackspace}
                    style={styles.keypadButton}
                    contentStyle={styles.keypadButtonContent}
                    disabled={loading}
                  >
                    <IconButton icon="backspace" size={24} />
                  </Button>
                );
              }

              return (
                <Button
                  key={keyIndex}
                  mode="text"
                  onPress={() => handlePinNumberPress(key)}
                  style={styles.keypadButton}
                  contentStyle={styles.keypadButtonContent}
                  disabled={loading}
                >
                  <Text variant="headlineSmall">{key}</Text>
                </Button>
              );
            })}
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Card style={styles.authCard}>
          <Card.Content>
            <View style={styles.header}>
              <IconButton icon="shield-lock" size={60} iconColor="#2196f3" />
              <Text variant="headlineMedium" style={styles.title}>
                Welcome Back
              </Text>
              <Text variant="bodyLarge" style={styles.subtitle}>
                {user?.email || 'Please authenticate to continue'}
              </Text>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" />
                <Text style={styles.loadingText}>Authenticating...</Text>
              </View>
            ) : showPinInput ? (
              <View style={styles.pinContainer}>
                <Text variant="titleMedium" style={styles.pinTitle}>
                  Enter your PIN
                </Text>
                {renderPinDots()}
                {renderKeypad()}
                
                {biometricEnabled && (
                  <Button
                    mode="outlined"
                    onPress={togglePinInput}
                    style={styles.switchMethodButton}
                    icon={getBiometricIcon()}
                  >
                    {getBiometricLabel()}
                  </Button>
                )}
              </View>
            ) : (
              <View style={styles.biometricContainer}>
                {biometricEnabled ? (
                  <>
                    <Button
                      mode="contained"
                      onPress={handleBiometricAuth}
                      style={styles.authButton}
                      icon={getBiometricIcon()}
                      contentStyle={styles.authButtonContent}
                    >
                      {getBiometricLabel()}
                    </Button>
                    
                    {pinEnabled && (
                      <Button
                        mode="outlined"
                        onPress={togglePinInput}
                        style={styles.switchMethodButton}
                        icon="numeric"
                      >
                        Use PIN Instead
                      </Button>
                    )}
                  </>
                ) : pinEnabled ? (
                  <Button
                    mode="contained"
                    onPress={togglePinInput}
                    style={styles.authButton}
                    icon="numeric"
                    contentStyle={styles.authButtonContent}
                  >
                    Enter PIN
                  </Button>
                ) : (
                  <View style={styles.noAuthContainer}>
                    <Text variant="bodyLarge" style={styles.noAuthText}>
                      No authentication method enabled
                    </Text>
                    <Button
                      mode="contained"
                      onPress={() => navigation.navigate('BiometricSetup')}
                      style={styles.setupButton}
                    >
                      Set Up Authentication
                    </Button>
                  </View>
                )}

                {attempts > 0 && (
                  <Text variant="bodySmall" style={styles.attemptsText}>
                    Failed attempts: {attempts}
                  </Text>
                )}
              </View>
            )}
          </Card.Content>
        </Card>

        <View style={styles.footer}>
          <Text variant="bodySmall" style={styles.footerText}>
            Your data is protected with end-to-end encryption
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  authCard: {
    marginBottom: 32,
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
  },
  biometricContainer: {
    alignItems: 'center',
  },
  pinContainer: {
    alignItems: 'center',
  },
  pinTitle: {
    marginBottom: 24,
  },
  pinDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
    gap: 12,
  },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#e0e0e0',
    backgroundColor: 'transparent',
  },
  pinDotFilled: {
    backgroundColor: '#2196f3',
    borderColor: '#2196f3',
  },
  pinDotError: {
    backgroundColor: '#f44336',
    borderColor: '#f44336',
  },
  keypad: {
    alignItems: 'center',
    marginBottom: 24,
  },
  keypadRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  keypadButton: {
    width: 70,
    height: 70,
    margin: 6,
    borderRadius: 35,
  },
  keypadButtonContent: {
    width: 70,
    height: 70,
  },
  authButton: {
    marginBottom: 16,
    minWidth: 200,
  },
  authButtonContent: {
    paddingVertical: 8,
  },
  switchMethodButton: {
    marginTop: 8,
  },
  noAuthContainer: {
    alignItems: 'center',
  },
  noAuthText: {
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.7,
  },
  setupButton: {
    minWidth: 200,
  },
  attemptsText: {
    textAlign: 'center',
    color: '#f44336',
    marginTop: 16,
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    textAlign: 'center',
    opacity: 0.6,
    paddingHorizontal: 32,
  },
});