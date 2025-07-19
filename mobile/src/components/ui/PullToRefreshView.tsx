import React, { useRef, useState } from 'react';
import {
  View,
  ScrollView,
  Animated,
  PanGestureHandler,
  State,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';

const { height: screenHeight } = Dimensions.get('window');
const PULL_THRESHOLD = 80;
const MAX_PULL_DISTANCE = 120;

interface PullToRefreshViewProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  refreshing?: boolean;
  pullThreshold?: number;
  style?: any;
}

export const PullToRefreshView: React.FC<PullToRefreshViewProps> = ({
  children,
  onRefresh,
  refreshing = false,
  pullThreshold = PULL_THRESHOLD,
  style,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [canRefresh, setCanRefresh] = useState(false);
  const pullDistance = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef<ScrollView>(null);

  const onGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: pullDistance } }],
    { 
      useNativeDriver: false,
      listener: (event) => {
        const { translationY } = event.nativeEvent;
        setCanRefresh(translationY >= pullThreshold);
      }
    }
  );

  const onHandlerStateChange = async (event: any) => {
    if (event.nativeEvent.state === State.END) {
      const { translationY } = event.nativeEvent;

      if (translationY >= pullThreshold && !isRefreshing) {
        // Trigger refresh
        setIsRefreshing(true);
        
        // Animate to refresh position
        Animated.timing(pullDistance, {
          toValue: pullThreshold,
          duration: 200,
          useNativeDriver: false,
        }).start();

        try {
          await onRefresh();
        } finally {
          setIsRefreshing(false);
          setCanRefresh(false);
          
          // Return to original position
          Animated.timing(pullDistance, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
          }).start();
        }
      } else {
        // Return to original position
        setCanRefresh(false);
        Animated.spring(pullDistance, {
          toValue: 0,
          tension: 100,
          friction: 8,
          useNativeDriver: false,
        }).start();
      }
    }
  };

  const pullProgress = pullDistance.interpolate({
    inputRange: [0, pullThreshold, MAX_PULL_DISTANCE],
    outputRange: [0, 1, 1],
    extrapolate: 'clamp',
  });

  const indicatorScale = pullDistance.interpolate({
    inputRange: [0, pullThreshold / 2, pullThreshold],
    outputRange: [0, 0.5, 1],
    extrapolate: 'clamp',
  });

  const indicatorRotation = pullDistance.interpolate({
    inputRange: [0, pullThreshold],
    outputRange: ['0deg', '360deg'],
    extrapolate: 'clamp',
  });

  return (
    <View style={[styles.container, style]}>
      <Animated.View
        style={[
          styles.refreshIndicator,
          {
            height: pullDistance,
            opacity: pullProgress,
          },
        ]}
      >
        <View style={styles.indicatorContent}>
          {isRefreshing || refreshing ? (
            <ActivityIndicator size="small" color="#2196f3" />
          ) : (
            <Animated.View
              style={[
                styles.pullIcon,
                {
                  transform: [
                    { scale: indicatorScale },
                    { rotate: indicatorRotation },
                  ],
                },
              ]}
            >
              <Text style={[
                styles.pullText,
                { color: canRefresh ? '#4caf50' : '#999' }
              ]}>
                {canRefresh ? '↓' : '↑'}
              </Text>
            </Animated.View>
          )}
          
          <Text variant="bodySmall" style={styles.refreshText}>
            {isRefreshing || refreshing
              ? 'Refreshing...'
              : canRefresh
              ? 'Release to refresh'
              : 'Pull to refresh'
            }
          </Text>
        </View>
      </Animated.View>

      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onHandlerStateChange}
        enabled={!isRefreshing && !refreshing}
        activeOffsetY={[0, 10]}
        failOffsetY={[-5, 5]}
      >
        <Animated.View style={styles.content}>
          <ScrollView
            ref={scrollViewRef}
            scrollEventThrottle={16}
            showsVerticalScrollIndicator={false}
            bounces={false}
            style={styles.scrollView}
          >
            {children}
          </ScrollView>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  refreshIndicator: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  indicatorContent: {
    alignItems: 'center',
    paddingBottom: 16,
  },
  pullIcon: {
    marginBottom: 8,
  },
  pullText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  refreshText: {
    color: '#666',
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
});