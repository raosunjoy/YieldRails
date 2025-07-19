import React, { useRef } from 'react';
import {
  View,
  Animated,
  PanGestureHandler,
  State,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Card, IconButton, Text } from 'react-native-paper';

const { width: screenWidth } = Dimensions.get('window');
const SWIPE_THRESHOLD = screenWidth * 0.25;

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: {
    icon: string;
    color: string;
    label: string;
  };
  rightAction?: {
    icon: string;
    color: string;
    label: string;
  };
  style?: any;
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  style,
}) => {
  const translateX = useRef(new Animated.Value(0)).current;
  const actionOpacity = useRef(new Animated.Value(0)).current;

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX } }],
    { useNativeDriver: false }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationX } = event.nativeEvent;

      if (translationX > SWIPE_THRESHOLD && onSwipeRight) {
        // Swipe right
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: screenWidth,
            duration: 200,
            useNativeDriver: false,
          }),
          Animated.timing(actionOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: false,
          }),
        ]).start(() => {
          onSwipeRight();
          resetPosition();
        });
      } else if (translationX < -SWIPE_THRESHOLD && onSwipeLeft) {
        // Swipe left
        Animated.parallel([
          Animated.timing(translateX, {
            toValue: -screenWidth,
            duration: 200,
            useNativeDriver: false,
          }),
          Animated.timing(actionOpacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: false,
          }),
        ]).start(() => {
          onSwipeLeft();
          resetPosition();
        });
      } else {
        // Return to center
        resetPosition();
      }
    } else if (event.nativeEvent.state === State.BEGAN) {
      Animated.timing(actionOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }).start();
    }
  };

  const resetPosition = () => {
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: false,
      }),
      Animated.timing(actionOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const renderAction = (action: any, side: 'left' | 'right') => {
    if (!action) return null;

    return (
      <Animated.View
        style={[
          styles.actionContainer,
          side === 'left' ? styles.leftAction : styles.rightAction,
          { opacity: actionOpacity },
        ]}
      >
        <View style={[styles.actionButton, { backgroundColor: action.color }]}>
          <IconButton icon={action.icon} iconColor="white" size={24} />
        </View>
        <Text variant="bodySmall" style={styles.actionLabel}>
          {action.label}
        </Text>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {renderAction(leftAction, 'left')}
      {renderAction(rightAction, 'right')}
      
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        activeOffsetX={[-10, 10]}
      >
        <Animated.View
          style={[
            styles.cardContainer,
            style,
            { transform: [{ translateX }] },
          ]}
        >
          <Card style={styles.card}>
            {children}
          </Card>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    marginBottom: 12,
  },
  cardContainer: {
    zIndex: 2,
  },
  card: {
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  actionContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    zIndex: 1,
  },
  leftAction: {
    left: 0,
  },
  rightAction: {
    right: 0,
  },
  actionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    marginTop: 4,
    textAlign: 'center',
    color: '#666',
    fontSize: 10,
  },
});