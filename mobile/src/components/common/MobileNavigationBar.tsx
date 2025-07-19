import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { Text, Badge } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withSpring 
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');

interface TabItem {
  name: string;
  icon: string;
  label: string;
  badge?: number;
}

const TABS: TabItem[] = [
  { name: 'Dashboard', icon: '🏠', label: 'Home' },
  { name: 'Payments', icon: '💸', label: 'Payments' },
  { name: 'Yield', icon: '📈', label: 'Yield' },
  { name: 'Wallet', icon: '👛', label: 'Wallet' },
  { name: 'Profile', icon: '👤', label: 'Profile' },
];

export const MobileNavigationBar: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const indicatorPosition = useSharedValue(0);

  const getActiveTabIndex = () => {
    const activeRouteName = route.name;
    return TABS.findIndex(tab => 
      activeRouteName.toLowerCase().includes(tab.name.toLowerCase())
    );
  };

  const activeIndex = getActiveTabIndex();

  React.useEffect(() => {
    const tabWidth = screenWidth / TABS.length;
    indicatorPosition.value = withSpring(activeIndex * tabWidth + tabWidth / 2 - 20);
  }, [activeIndex, indicatorPosition]);

  const handleTabPress = (tab: TabItem, index: number) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      // Ignore
    }

    // Update indicator position
    const tabWidth = screenWidth / TABS.length;
    indicatorPosition.value = withSpring(index * tabWidth + tabWidth / 2 - 20);

    // Navigate to tab
    navigation.navigate(tab.name as never);
  };

  const indicatorStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: indicatorPosition.value }],
    };
  });

  const renderTab = (tab: TabItem, index: number) => {
    const isActive = index === activeIndex;
    const tabWidth = screenWidth / TABS.length;

    return (
      <TouchableOpacity
        key={tab.name}
        style={[styles.tab, { width: tabWidth }]}
        onPress={() => handleTabPress(tab, index)}
        activeOpacity={0.7}
      >
        <View style={styles.tabContent}>
          <View style={styles.iconContainer}>
            <Text style={[
              styles.tabIcon,
              { opacity: isActive ? 1 : 0.6 }
            ]}>
              {tab.icon}
            </Text>
            {tab.badge && tab.badge > 0 && (
              <Badge
                size={16}
                style={styles.badge}
              >
                {tab.badge > 99 ? '99+' : tab.badge.toString()}
              </Badge>
            )}
          </View>
          <Text
            variant="labelSmall"
            style={[
              styles.tabLabel,
              {
                color: isActive ? '#2196f3' : '#666',
                fontWeight: isActive ? '600' : '400',
              },
            ]}
          >
            {tab.label}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Active indicator */}
      <Animated.View style={[styles.indicator, indicatorStyle]} />
      
      {/* Tab items */}
      <View style={styles.tabsContainer}>
        {TABS.map(renderTab)}
      </View>
    </View>
  );
};

interface FloatingTabBarProps {
  visible?: boolean;
}

export const FloatingTabBar: React.FC<FloatingTabBarProps> = ({
  visible = true,
}) => {
  const navigation = useNavigation();
  const route = useRoute();

  const getActiveTabIndex = () => {
    const activeRouteName = route.name;
    return TABS.findIndex(tab => 
      activeRouteName.toLowerCase().includes(tab.name.toLowerCase())
    );
  };

  const activeIndex = getActiveTabIndex();

  const handleTabPress = (tab: TabItem) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch (error) {
      // Ignore
    }

    navigation.navigate(tab.name as never);
  };

  if (!visible) return null;

  return (
    <View style={styles.floatingContainer}>
      <View style={styles.floatingTabBar}>
        {TABS.slice(0, 4).map((tab, index) => {
          const isActive = index === activeIndex;
          
          return (
            <TouchableOpacity
              key={tab.name}
              style={[
                styles.floatingTab,
                isActive && styles.activeFloatingTab,
              ]}
              onPress={() => handleTabPress(tab)}
              activeOpacity={0.8}
            >
              <View style={styles.floatingTabContent}>
                <Text style={[
                  styles.floatingTabIcon,
                  { opacity: isActive ? 1 : 0.6 }
                ]}>
                  {tab.icon}
                </Text>
                {isActive && (
                  <Text
                    variant="labelSmall"
                    style={styles.floatingTabLabel}
                  >
                    {tab.label}
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    paddingBottom: Platform.OS === 'ios' ? 20 : 0,
  },
  indicator: {
    position: 'absolute',
    top: 0,
    width: 40,
    height: 3,
    backgroundColor: '#2196f3',
    borderRadius: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingTop: 8,
  },
  tab: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  tabIcon: {
    fontSize: 24,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#f44336',
    color: '#fff',
    fontSize: 10,
  },
  tabLabel: {
    fontSize: 11,
  },
  floatingContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  floatingTabBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 25,
    paddingHorizontal: 8,
    paddingVertical: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  floatingTab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginHorizontal: 4,
  },
  activeFloatingTab: {
    backgroundColor: '#2196f3',
  },
  floatingTabContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  floatingTabIcon: {
    fontSize: 20,
  },
  floatingTabLabel: {
    marginLeft: 8,
    color: '#fff',
    fontWeight: '600',
  },
});