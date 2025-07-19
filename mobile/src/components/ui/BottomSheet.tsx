import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Modal,
  Animated,
  PanGestureHandler,
  State,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Card, IconButton } from 'react-native-paper';
import * as Haptics from 'expo-haptics';

const { height: screenHeight, width: screenWidth } = Dimensions.get('window');

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  height?: number;
  snapPoints?: number[];
  enablePanDown?: boolean;
  enableBackdropPress?: boolean;
  showHandle?: boolean;
  title?: string;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  visible,
  onClose,
  children,
  height = screenHeight * 0.6,
  snapPoints = [height],
  enablePanDown = true,
  enableBackdropPress = true,
  showHandle = true,
  title,
}) => {
  const translateY = useRef(new Animated.Value(height)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [currentSnapPoint, setCurrentSnapPoint] = useState(0);

  useEffect(() => {
    if (visible) {
      show();
    } else {
      hide();
    }
  }, [visible]);

  const show = () => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        tension: 100,
        friction: 8,
        useNativeDriver: false,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0.5,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const hide = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: height,
        duration: 300,
        useNativeDriver: false,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: false,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: translateY } }],
    { useNativeDriver: false }
  );

  const onHandlerStateChange = (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationY, velocityY } = event.nativeEvent;
      
      // Calculate closest snap point
      let closestSnapPoint = 0;
      let minDistance = Math.abs(translationY - snapPoints[0]);
      
      for (let i = 1; i < snapPoints.length; i++) {
        const distance = Math.abs(translationY - snapPoints[i]);
        if (distance < minDistance) {
          minDistance = distance;
          closestSnapPoint = i;
        }
      }

      // Consider velocity for quick swipes
      if (velocityY > 1000) {
        // Fast swipe down - close or go to next snap point
        if (closestSnapPoint < snapPoints.length - 1) {
          closestSnapPoint += 1;
        } else {
          hide();
          return;
        }
      } else if (velocityY < -1000) {
        // Fast swipe up - go to previous snap point
        if (closestSnapPoint > 0) {
          closestSnapPoint -= 1;
        }
      }

      // Check if should close
      if (translationY > height * 0.5) {
        hide();
        return;
      }

      // Snap to closest point
      setCurrentSnapPoint(closestSnapPoint);
      Animated.spring(translateY, {
        toValue: snapPoints[closestSnapPoint],
        tension: 100,
        friction: 8,
        useNativeDriver: false,
      }).start();

      // Haptic feedback
      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } catch (error) {
        // Ignore
      }
    }
  };

  const handleBackdropPress = () => {
    if (enableBackdropPress) {
      hide();
    }
  };

  const handleClose = () => {
    hide();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <TouchableWithoutFeedback onPress={handleBackdropPress}>
          <Animated.View
            style={[
              styles.backdrop,
              { opacity: backdropOpacity },
            ]}
          />
        </TouchableWithoutFeedback>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          <PanGestureHandler
            onGestureEvent={onGestureEvent}
            onHandlerStateChange={onHandlerStateChange}
            enabled={enablePanDown}
          >
            <Animated.View
              style={[
                styles.sheet,
                {
                  height,
                  transform: [{ translateY }],
                },
              ]}
            >
              <Card style={styles.card}>
                {showHandle && (
                  <View style={styles.header}>
                    <View style={styles.handle} />
                    {title && (
                      <View style={styles.titleContainer}>
                        <IconButton
                          icon="close"
                          size={20}
                          onPress={handleClose}
                          style={styles.closeButton}
                        />
                      </View>
                    )}
                  </View>
                )}

                <View style={styles.content}>
                  {children}
                </View>
              </Card>
            </Animated.View>
          </PanGestureHandler>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
  },
  keyboardView: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    width: screenWidth,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  card: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    paddingTop: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: '#ddd',
    borderRadius: 2,
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  closeButton: {
    alignSelf: 'flex-end',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
});