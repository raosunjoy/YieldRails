import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Button, ButtonProps } from 'react-native-paper';
import * as Haptics from 'expo-haptics';

interface HapticButtonProps extends ButtonProps {
  hapticType?: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';
  onPress?: () => void;
  children?: React.ReactNode;
}

export const HapticButton: React.FC<HapticButtonProps> = ({
  hapticType = 'light',
  onPress,
  children,
  ...props
}) => {
  const handlePress = async () => {
    // Trigger haptic feedback
    try {
      switch (hapticType) {
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'success':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'error':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        default:
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      // Haptic feedback not available on this device
      console.log('Haptic feedback not available');
    }

    // Call the original onPress handler
    if (onPress) {
      onPress();
    }
  };

  return (
    <Button
      {...props}
      onPress={handlePress}
    >
      {children}
    </Button>
  );
};

interface HapticTouchableProps {
  hapticType?: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';
  onPress?: () => void;
  children: React.ReactNode;
  style?: any;
  disabled?: boolean;
}

export const HapticTouchable: React.FC<HapticTouchableProps> = ({
  hapticType = 'light',
  onPress,
  children,
  style,
  disabled = false,
}) => {
  const handlePress = async () => {
    if (disabled) return;

    // Trigger haptic feedback
    try {
      switch (hapticType) {
        case 'light':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;
        case 'medium':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;
        case 'heavy':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;
        case 'success':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;
        case 'warning':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case 'error':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        default:
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch (error) {
      // Haptic feedback not available on this device
      console.log('Haptic feedback not available');
    }

    // Call the original onPress handler
    if (onPress) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[style, disabled && styles.disabled]}
      activeOpacity={0.7}
      disabled={disabled}
    >
      {children}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  disabled: {
    opacity: 0.5,
  },
});