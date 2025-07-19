import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Vibration,
} from 'react-native';
import {
  Card,
  Text,
  Button,
  IconButton,
  ActivityIndicator,
} from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@store/index';
import { setupPin, changePin, clearError } from '@store/authSlice';
import * as Haptics from 'expo-haptics';

interface PinSetupRouteParams {
  mode: 'setup' | 'change';
}

export const PinSetupScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const dispatch = useDispatch();
  const { mode } = route.params as PinSetupRouteParams;
  
  const { loading, error } = useSelector((state: RootState) => state.auth);

  const [step, setStep] = useState<'current' | 'new' | 'confirm'>('new');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [enteredPin, setEnteredPin] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    if (mode === 'change') {
      setStep('current');
    }
  }, [mode]);

  useEffect(() => {
    if (error) {
      setIsError(true);
      setEnteredPin('');
      setAttempts(prev => prev + 1);
      
      // Vibrate on error
      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Vibration.vibrate([0, 100, 100, 100]);
      } catch (e) {
        // Ignore if haptics not available
      }

      // Clear error after showing animation
      setTimeout(() => {
        setIsError(false);
        dispatch(clearError());
      }, 500);
    }
  }, [error, dispatch]);

  const handleNumberPress = (number: string) => {
    if (enteredPin.length >= 6) return;

    const newEnteredPin = enteredPin + number;
    setEnteredPin(newEnteredPin);

    // Haptic feedback
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      // Ignore if haptics not available
    }

    // Auto-proceed when PIN is complete
    if (newEnteredPin.length === 6) {
      setTimeout(() => handlePinComplete(newEnteredPin), 200);
    }
  };

  const handleBackspace = () => {
    if (enteredPin.length === 0) return;

    setEnteredPin(prev => prev.slice(0, -1));
    
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (e) {
      // Ignore if haptics not available
    }
  };

  const handlePinComplete = async (pin: string) => {
    switch (step) {
      case 'current':
        // Verify current PIN (this would normally call a verification service)
        setCurrentPin(pin);
        setStep('new');
        setEnteredPin('');
        break;

      case 'new':
        setNewPin(pin);
        setStep('confirm');
        setEnteredPin('');
        break;

      case 'confirm':
        setConfirmPin(pin);
        
        if (pin === newPin) {
          // PINs match, proceed with setup/change
          try {
            if (mode === 'setup') {
              await dispatch(setupPin(newPin) as any).unwrap();
              Alert.alert(
                'PIN Set Up Successfully',
                'Your PIN has been set up. You can now use it to authenticate.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
              );
            } else {
              await dispatch(changePin({ oldPin: currentPin, newPin }) as any).unwrap();
              Alert.alert(
                'PIN Changed Successfully',
                'Your PIN has been updated.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
              );
            }
          } catch (error) {
            // Error will be handled by useEffect
          }
        } else {
          // PINs don't match
          Alert.alert(
            'PINs Don\'t Match',
            'The PINs you entered don\'t match. Please try again.',
            [{ text: 'OK' }]
          );
          setStep('new');
          setNewPin('');
          setConfirmPin('');
          setEnteredPin('');
        }
        break;
    }
  };

  const getTitle = () => {
    switch (step) {
      case 'current':
        return 'Enter Current PIN';
      case 'new':
        return mode === 'setup' ? 'Create Your PIN' : 'Create New PIN';
      case 'confirm':
        return 'Confirm Your PIN';
      default:
        return 'Set Up PIN';
    }
  };

  const getSubtitle = () => {
    switch (step) {
      case 'current':
        return 'Enter your current PIN to continue';
      case 'new':
        return 'Choose a 6-digit PIN that you\'ll remember';
      case 'confirm':
        return 'Enter your PIN again to confirm';
      default:
        return '';
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
                    onPress={handleBackspace}
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
                  onPress={() => handleNumberPress(key)}
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
      <View style={styles.header}>
        <IconButton
          icon="arrow-left"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        />
      </View>

      <View style={styles.content}>
        <Card style={styles.pinCard}>
          <Card.Content>
            <View style={styles.pinHeader}>
              <IconButton icon="shield-lock" size={40} iconColor="#2196f3" />
              <Text variant="headlineMedium" style={styles.title}>
                {getTitle()}
              </Text>
              <Text variant="bodyLarge" style={styles.subtitle}>
                {getSubtitle()}
              </Text>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" />
                <Text style={styles.loadingText}>Setting up PIN...</Text>
              </View>
            ) : (
              <>
                {renderPinDots()}
                {renderKeypad()}
              </>
            )}

            {attempts > 0 && (
              <Text variant="bodySmall" style={styles.attemptsText}>
                {attempts === 1 ? '1 attempt' : `${attempts} attempts`}
              </Text>
            )}
          </Card.Content>
        </Card>

        <View style={styles.footer}>
          <Text variant="bodySmall" style={styles.footerText}>
            Your PIN is encrypted and stored securely on your device
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 16,
  },
  backButton: {
    margin: 0,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 16,
  },
  pinCard: {
    marginBottom: 32,
  },
  pinHeader: {
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
  pinDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
    gap: 16,
  },
  pinDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
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
  },
  keypadRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  keypadButton: {
    width: 80,
    height: 80,
    margin: 8,
    borderRadius: 40,
  },
  keypadButtonContent: {
    width: 80,
    height: 80,
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