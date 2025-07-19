import React from 'react';
import {
  View,
  Modal,
  StyleSheet,
  Animated,
  Easing,
} from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  translucent?: boolean;
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  visible,
  message = 'Loading...',
  translucent = true,
}) => {
  const spinValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 2000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spinValue.setValue(0);
    }
  }, [visible, spinValue]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
    >
      <View style={[
        styles.container,
        translucent && styles.translucent
      ]}>
        <View style={styles.content}>
          <View style={styles.loader}>
            <ActivityIndicator size="large" color="#2196f3" />
            <Animated.View style={[
              styles.spinnerRing,
              { transform: [{ rotate: spin }] }
            ]}>
              <View style={styles.ring} />
            </Animated.View>
          </View>
          
          <Text variant="bodyLarge" style={styles.message}>
            {message}
          </Text>
        </View>
      </View>
    </Modal>
  );
};

interface LoadingDotsProps {
  color?: string;
  size?: number;
}

export const LoadingDots: React.FC<LoadingDotsProps> = ({
  color = '#2196f3',
  size = 8,
}) => {
  const dot1Anim = React.useRef(new Animated.Value(0)).current;
  const dot2Anim = React.useRef(new Animated.Value(0)).current;
  const dot3Anim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const animateDots = () => {
      const animationDuration = 600;
      const staggerDelay = 200;

      Animated.loop(
        Animated.sequence([
          Animated.timing(dot1Anim, {
            toValue: 1,
            duration: animationDuration,
            useNativeDriver: true,
          }),
          Animated.timing(dot1Anim, {
            toValue: 0,
            duration: animationDuration,
            useNativeDriver: true,
          }),
        ])
      ).start();

      setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(dot2Anim, {
              toValue: 1,
              duration: animationDuration,
              useNativeDriver: true,
            }),
            Animated.timing(dot2Anim, {
              toValue: 0,
              duration: animationDuration,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }, staggerDelay);

      setTimeout(() => {
        Animated.loop(
          Animated.sequence([
            Animated.timing(dot3Anim, {
              toValue: 1,
              duration: animationDuration,
              useNativeDriver: true,
            }),
            Animated.timing(dot3Anim, {
              toValue: 0,
              duration: animationDuration,
              useNativeDriver: true,
            }),
          ])
        ).start();
      }, staggerDelay * 2);
    };

    animateDots();
  }, [dot1Anim, dot2Anim, dot3Anim]);

  const getDotStyle = (anim: Animated.Value) => ({
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: color,
    marginHorizontal: 2,
    opacity: anim,
    transform: [
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.5, 1],
        }),
      },
    ],
  });

  return (
    <View style={styles.dotsContainer}>
      <Animated.View style={getDotStyle(dot1Anim)} />
      <Animated.View style={getDotStyle(dot2Anim)} />
      <Animated.View style={getDotStyle(dot3Anim)} />
    </View>
  );
};

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: any;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  width = '100%',
  height = 20,
  borderRadius = 4,
  style,
}) => {
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: '#e0e0e0',
          opacity,
        },
        style,
      ]}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  translucent: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  content: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: 'white',
    borderRadius: 16,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  loader: {
    position: 'relative',
    marginBottom: 16,
  },
  spinnerRing: {
    position: 'absolute',
    top: -8,
    left: -8,
    right: -8,
    bottom: -8,
  },
  ring: {
    flex: 1,
    borderWidth: 2,
    borderColor: 'transparent',
    borderTopColor: '#2196f3',
    borderRadius: 30,
  },
  message: {
    textAlign: 'center',
    color: '#666',
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});