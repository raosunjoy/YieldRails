import React, { useRef, useState } from 'react';
import {
  View,
  Animated,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { FAB, IconButton, Text } from 'react-native-paper';
import * as Haptics from 'expo-haptics';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface FloatingAction {
  icon: string;
  label: string;
  onPress: () => void;
  color?: string;
}

interface FloatingActionButtonProps {
  actions?: FloatingAction[];
  icon?: string;
  onPress?: () => void;
  visible?: boolean;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
  color?: string;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  actions = [],
  icon = 'plus',
  onPress,
  visible = true,
  position = 'bottom-right',
  color = '#2196f3',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(1)).current;

  const toggleMenu = () => {
    const toValue = isOpen ? 0 : 1;
    
    // Haptic feedback
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      // Ignore
    }

    Animated.parallel([
      Animated.spring(animation, {
        toValue,
        tension: 100,
        friction: 8,
        useNativeDriver: false,
      }),
      Animated.spring(fabScale, {
        toValue: isOpen ? 1 : 0.9,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    setIsOpen(!isOpen);
  };

  const handleActionPress = (action: FloatingAction) => {
    // Close menu first
    setIsOpen(false);
    Animated.parallel([
      Animated.spring(animation, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: false,
      }),
      Animated.spring(fabScale, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Haptic feedback
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      // Ignore
    }

    // Execute action
    action.onPress();
  };

  const handleMainPress = () => {
    if (actions.length > 0) {
      toggleMenu();
    } else if (onPress) {
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Ignore
      }
      onPress();
    }
  };

  const getPositionStyle = () => {
    switch (position) {
      case 'bottom-left':
        return { left: 16, bottom: 16 };
      case 'bottom-center':
        return { 
          left: screenWidth / 2 - 28, // 28 is half of FAB width (56)
          bottom: 16 
        };
      case 'bottom-right':
      default:
        return { right: 16, bottom: 16 };
    }
  };

  const backgroundOpacity = animation.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.5],
  });

  const renderActionButton = (action: FloatingAction, index: number) => {
    const translateY = animation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -(60 * (index + 1))],
    });

    const opacity = animation.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0, 0, 1],
    });

    const scale = animation.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    });

    return (
      <Animated.View
        key={action.label}
        style={[
          styles.actionButton,
          {
            transform: [
              { translateY },
              { scale },
            ],
            opacity,
          },
        ]}
      >
        <View style={styles.actionContainer}>
          <View style={styles.labelContainer}>
            <Text variant="bodyMedium" style={styles.actionLabel}>
              {action.label}
            </Text>
          </View>
          
          <TouchableOpacity
            onPress={() => handleActionPress(action)}
            style={[
              styles.actionFab,
              { backgroundColor: action.color || '#fff' },
            ]}
            activeOpacity={0.8}
          >
            <IconButton
              icon={action.icon}
              size={20}
              iconColor={action.color ? '#fff' : '#333'}
            />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  };

  if (!visible) return null;

  return (
    <View style={styles.container}>
      {/* Background overlay */}
      {isOpen && (
        <Animated.View
          style={[
            styles.overlay,
            { opacity: backgroundOpacity },
          ]}
        >
          <TouchableOpacity
            style={styles.overlayTouch}
            onPress={toggleMenu}
            activeOpacity={1}
          />
        </Animated.View>
      )}

      {/* Action buttons */}
      <View style={[styles.fabContainer, getPositionStyle()]}>
        {actions.map((action, index) => renderActionButton(action, index))}
        
        {/* Main FAB */}
        <Animated.View
          style={[
            styles.mainFab,
            { transform: [{ scale: fabScale }] },
          ]}
        >
          <FAB
            icon={isOpen ? 'close' : icon}
            onPress={handleMainPress}
            style={[styles.fab, { backgroundColor: color }]}
            color="#fff"
          />
        </Animated.View>
      </View>
    </View>
  );
};

interface SpeedDialProps {
  actions: FloatingAction[];
  visible?: boolean;
  onStateChange?: (isOpen: boolean) => void;
}

export const SpeedDial: React.FC<SpeedDialProps> = ({
  actions,
  visible = true,
  onStateChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const animation = useRef(new Animated.Value(0)).current;

  const toggleDial = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    onStateChange?.(newState);

    Animated.spring(animation, {
      toValue: newState ? 1 : 0,
      tension: 100,
      friction: 8,
      useNativeDriver: false,
    }).start();

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch (error) {
      // Ignore
    }
  };

  if (!visible) return null;

  return (
    <FloatingActionButton
      actions={actions}
      icon="menu"
      visible={visible}
      onPress={toggleDial}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  overlayTouch: {
    flex: 1,
  },
  fabContainer: {
    position: 'absolute',
    alignItems: 'center',
  },
  mainFab: {
    zIndex: 2,
  },
  fab: {
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  actionButton: {
    position: 'absolute',
    bottom: 0,
    zIndex: 1,
  },
  actionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  labelContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 12,
  },
  actionLabel: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  actionFab: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});