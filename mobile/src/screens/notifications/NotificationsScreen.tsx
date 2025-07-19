import React, { useEffect, useCallback } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {
  Card,
  Text,
  IconButton,
  Chip,
  Badge,
  FAB,
  Menu,
  Divider,
} from 'react-native-paper';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@store/index';
import {
  loadNotifications,
  markAsRead,
  clearAllNotifications,
  clearError,
} from '@store/notificationSlice';
import { PushNotification } from '@types/notifications';

const NOTIFICATION_ICONS = {
  payment_received: '💰',
  payment_sent: '📤',
  payment_failed: '❌',
  yield_earned: '📈',
  strategy_update: '🔄',
  price_alert: '💹',
  security_alert: '🔒',
  system_update: '🔧',
  maintenance: '⚠️',
  bridge_completed: '🌉',
  bridge_failed: '❌',
};

const NOTIFICATION_COLORS = {
  payment_received: '#4caf50',
  payment_sent: '#2196f3',
  payment_failed: '#f44336',
  yield_earned: '#4caf50',
  strategy_update: '#ff9800',
  price_alert: '#9c27b0',
  security_alert: '#f44336',
  system_update: '#607d8b',
  maintenance: '#ff9800',
  bridge_completed: '#4caf50',
  bridge_failed: '#f44336',
};

export const NotificationsScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useDispatch();
  
  const {
    notifications,
    unreadCount,
    loading,
    error,
  } = useSelector((state: RootState) => state.notifications);

  const [refreshing, setRefreshing] = React.useState(false);
  const [menuVisible, setMenuVisible] = React.useState(false);
  const [filterType, setFilterType] = React.useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      dispatch(loadNotifications() as any);
    }, [dispatch])
  );

  useEffect(() => {
    if (error) {
      // Handle error display
      console.error('Notification error:', error);
    }
  }, [error]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await dispatch(loadNotifications() as any);
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification: PushNotification) => {
    if (!notification.read) {
      await dispatch(markAsRead(notification.id) as any);
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'payment_received':
      case 'payment_sent':
      case 'payment_failed':
        if (notification.data?.paymentId) {
          navigation.navigate('PaymentDetails', { 
            paymentId: notification.data.paymentId 
          });
        } else {
          navigation.navigate('PaymentHistory');
        }
        break;
      case 'yield_earned':
      case 'strategy_update':
        navigation.navigate('YieldDashboard');
        break;
      case 'bridge_completed':
      case 'bridge_failed':
        navigation.navigate('CrossChainBridge');
        break;
      case 'security_alert':
        navigation.navigate('SecuritySettings');
        break;
      default:
        // Open notification details or appropriate screen
        break;
    }
  };

  const handleClearAll = () => {
    dispatch(clearAllNotifications() as any);
  };

  const handleFilterChange = (type: string | null) => {
    setFilterType(type);
    setMenuVisible(false);
  };

  const getFilteredNotifications = () => {
    if (!filterType) return notifications;
    return notifications.filter(notification => notification.type === filterType);
  };

  const formatTimeAgo = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    
    return new Date(timestamp).toLocaleDateString();
  };

  const renderNotificationItem = ({ item }: { item: PushNotification }) => (
    <TouchableOpacity onPress={() => handleNotificationPress(item)}>
      <Card style={[
        styles.notificationCard,
        !item.read && styles.unreadCard
      ]}>
        <Card.Content>
          <View style={styles.notificationHeader}>
            <View style={styles.notificationInfo}>
              <View style={styles.iconContainer}>
                <Text style={styles.notificationIcon}>
                  {NOTIFICATION_ICONS[item.type] || '📱'}
                </Text>
                {!item.read && <Badge style={styles.unreadBadge} />}
              </View>
              
              <View style={styles.contentContainer}>
                <Text 
                  variant="titleMedium" 
                  style={[
                    styles.notificationTitle,
                    !item.read && styles.unreadText
                  ]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <Text 
                  variant="bodyMedium" 
                  style={styles.notificationBody}
                  numberOfLines={2}
                >
                  {item.body}
                </Text>
              </View>
            </View>
            
            <View style={styles.notificationMeta}>
              <Text variant="bodySmall" style={styles.timeText}>
                {formatTimeAgo(item.timestamp)}
              </Text>
              <Chip
                mode="outlined"
                compact
                style={[
                  styles.typeChip,
                  { borderColor: NOTIFICATION_COLORS[item.type] || '#999' }
                ]}
                textStyle={{ 
                  color: NOTIFICATION_COLORS[item.type] || '#999',
                  fontSize: 10 
                }}
              >
                {item.type.replace('_', ' ')}
              </Chip>
            </View>
          </View>

          {item.actionable && item.actions && (
            <View style={styles.actionsContainer}>
              {item.actions.map((action) => (
                <TouchableOpacity
                  key={action.id}
                  style={styles.actionButton}
                  onPress={() => {
                    // Handle action
                    console.log('Action pressed:', action);
                  }}
                >
                  <Text variant="labelMedium" style={styles.actionText}>
                    {action.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🔔</Text>
      <Text variant="headlineSmall" style={styles.emptyTitle}>
        No Notifications
      </Text>
      <Text variant="bodyMedium" style={styles.emptyDescription}>
        You're all caught up! Notifications will appear here when you receive them.
      </Text>
    </View>
  );

  const filteredNotifications = getFilteredNotifications();

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text variant="headlineMedium">Notifications</Text>
          {unreadCount > 0 && (
            <Badge style={styles.headerBadge}>{unreadCount}</Badge>
          )}
        </View>
        
        <View style={styles.headerActions}>
          <Menu
            visible={menuVisible}
            onDismiss={() => setMenuVisible(false)}
            anchor={
              <IconButton
                icon="filter-variant"
                onPress={() => setMenuVisible(true)}
              />
            }
          >
            <Menu.Item
              onPress={() => handleFilterChange(null)}
              title="All Notifications"
              leadingIcon={filterType === null ? "check" : ""}
            />
            <Divider />
            <Menu.Item
              onPress={() => handleFilterChange('payment_received')}
              title="Payments"
              leadingIcon={filterType === 'payment_received' ? "check" : ""}
            />
            <Menu.Item
              onPress={() => handleFilterChange('yield_earned')}
              title="Yield"
              leadingIcon={filterType === 'yield_earned' ? "check" : ""}
            />
            <Menu.Item
              onPress={() => handleFilterChange('security_alert')}
              title="Security"
              leadingIcon={filterType === 'security_alert' ? "check" : ""}
            />
          </Menu>
          
          <IconButton
            icon="delete-sweep"
            onPress={handleClearAll}
            disabled={notifications.length === 0}
          />
        </View>
      </View>

      {filterType && (
        <View style={styles.filterIndicator}>
          <Chip
            mode="flat"
            onClose={() => setFilterType(null)}
            style={styles.filterChip}
          >
            {filterType.replace('_', ' ')}
          </Chip>
        </View>
      )}

      <FlatList
        data={filteredNotifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      <FAB
        icon="cog"
        style={styles.fab}
        onPress={() => navigation.navigate('NotificationSettings')}
      />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBadge: {
    marginLeft: 8,
    backgroundColor: '#f44336',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterIndicator: {
    padding: 16,
    paddingBottom: 8,
  },
  filterChip: {
    alignSelf: 'flex-start',
    backgroundColor: '#e3f2fd',
  },
  list: {
    padding: 16,
    paddingTop: 8,
  },
  notificationCard: {
    marginBottom: 12,
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#2196f3',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  notificationInfo: {
    flex: 1,
    flexDirection: 'row',
  },
  iconContainer: {
    position: 'relative',
    marginRight: 12,
  },
  notificationIcon: {
    fontSize: 24,
  },
  unreadBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 12,
    height: 12,
    backgroundColor: '#2196f3',
  },
  contentContainer: {
    flex: 1,
  },
  notificationTitle: {
    marginBottom: 4,
  },
  unreadText: {
    fontWeight: '600',
  },
  notificationBody: {
    opacity: 0.8,
  },
  notificationMeta: {
    alignItems: 'flex-end',
  },
  timeText: {
    opacity: 0.6,
    marginBottom: 4,
  },
  typeChip: {
    borderWidth: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#e3f2fd',
    borderRadius: 16,
  },
  actionText: {
    color: '#2196f3',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    textAlign: 'center',
    opacity: 0.7,
    paddingHorizontal: 32,
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
  },
});