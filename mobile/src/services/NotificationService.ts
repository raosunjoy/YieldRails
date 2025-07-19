import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PushNotification, NotificationSettings, PushToken } from '@types/notifications';
import { ApiService } from './ApiService';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export class NotificationService {
  private static instance: NotificationService;
  private apiService: ApiService;
  private pushToken: string | null = null;
  private notificationListener: any = null;
  private responseListener: any = null;

  private constructor() {
    this.apiService = ApiService.getInstance();
  }

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  async initialize(): Promise<void> {
    try {
      // Register for push notifications
      await this.registerForPushNotifications();
      
      // Set up notification listeners
      this.setupNotificationListeners();
      
      // Load saved settings
      await this.loadSettings();
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
      throw new Error('Failed to initialize notifications');
    }
  }

  private async registerForPushNotifications(): Promise<string | null> {
    if (!Device.isDevice) {
      console.log('Must use physical device for Push Notifications');
      return null;
    }

    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permissions if not already granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return null;
    }

    // Get the token
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });

    this.pushToken = token.data;

    // Configure for Android
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });

      // Create specific channels
      await this.createNotificationChannels();
    }

    // Save token to backend
    await this.savePushToken(this.pushToken);

    return this.pushToken;
  }

  private async createNotificationChannels(): Promise<void> {
    const channels = [
      {
        name: 'payments',
        channelId: 'payments',
        description: 'Payment notifications',
        importance: Notifications.AndroidImportance.HIGH,
      },
      {
        name: 'yield',
        channelId: 'yield',
        description: 'Yield and earnings notifications',
        importance: Notifications.AndroidImportance.DEFAULT,
      },
      {
        name: 'security',
        channelId: 'security',
        description: 'Security alerts',
        importance: Notifications.AndroidImportance.MAX,
      },
      {
        name: 'system',
        channelId: 'system',
        description: 'System notifications',
        importance: Notifications.AndroidImportance.LOW,
      },
    ];

    for (const channel of channels) {
      await Notifications.setNotificationChannelAsync(channel.channelId, {
        name: channel.name,
        description: channel.description,
        importance: channel.importance,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#2196f3',
      });
    }
  }

  private setupNotificationListeners(): void {
    // Listener for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      this.handleNotificationReceived(notification);
    });

    // Listener for when user taps on a notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      this.handleNotificationResponse(response);
    });
  }

  private async handleNotificationReceived(notification: Notifications.Notification): Promise<void> {
    // Update badge count
    const badgeCount = await Notifications.getBadgeCountAsync();
    await Notifications.setBadgeCountAsync(badgeCount + 1);

    // Store notification locally
    await this.storeNotificationLocally(notification);

    // Trigger any app-specific handling
    this.notifyAppOfNewNotification(notification);
  }

  private async handleNotificationResponse(response: Notifications.NotificationResponse): Promise<void> {
    const notification = response.notification;
    const actionIdentifier = response.actionIdentifier;

    // Handle different actions
    switch (actionIdentifier) {
      case Notifications.DEFAULT_ACTION_IDENTIFIER:
        // User tapped the notification
        this.handleNotificationTap(notification);
        break;
      case 'VIEW_ACTION':
        this.handleViewAction(notification);
        break;
      case 'APPROVE_ACTION':
        this.handleApproveAction(notification);
        break;
      case 'DISMISS_ACTION':
        this.handleDismissAction(notification);
        break;
      default:
        console.log('Unknown action identifier:', actionIdentifier);
    }

    // Mark as read
    await this.markNotificationAsRead(notification.request.identifier);
  }

  private async storeNotificationLocally(notification: Notifications.Notification): Promise<void> {
    try {
      const existingNotifications = await this.getStoredNotifications();
      const newNotification: PushNotification = {
        id: notification.request.identifier,
        title: notification.request.content.title || '',
        body: notification.request.content.body || '',
        data: notification.request.content.data,
        timestamp: Date.now(),
        type: notification.request.content.data?.type || 'system_update',
        priority: 'default',
        read: false,
        actionable: false,
      };

      const updatedNotifications = [newNotification, ...existingNotifications].slice(0, 100); // Keep last 100
      await AsyncStorage.setItem('stored_notifications', JSON.stringify(updatedNotifications));
    } catch (error) {
      console.error('Failed to store notification locally:', error);
    }
  }

  private notifyAppOfNewNotification(notification: Notifications.Notification): void {
    // This would trigger app-wide state updates
    // In a real app, this might dispatch a Redux action or update a context
    console.log('New notification for app:', notification.request.content.title);
  }

  private handleNotificationTap(notification: Notifications.Notification): void {
    const data = notification.request.content.data;
    
    // Navigate to appropriate screen based on notification type
    switch (data?.type) {
      case 'payment_received':
      case 'payment_sent':
      case 'payment_failed':
        // Navigate to payment details
        console.log('Navigate to payment:', data.paymentId);
        break;
      case 'yield_earned':
        // Navigate to yield dashboard
        console.log('Navigate to yield dashboard');
        break;
      case 'bridge_completed':
      case 'bridge_failed':
        // Navigate to bridge transaction
        console.log('Navigate to bridge transaction:', data.transactionId);
        break;
      default:
        console.log('Default notification tap handling');
    }
  }

  private handleViewAction(notification: Notifications.Notification): void {
    console.log('View action for notification:', notification.request.identifier);
    this.handleNotificationTap(notification);
  }

  private handleApproveAction(notification: Notifications.Notification): void {
    console.log('Approve action for notification:', notification.request.identifier);
    // Handle approval logic
  }

  private handleDismissAction(notification: Notifications.Notification): void {
    console.log('Dismiss action for notification:', notification.request.identifier);
    // Handle dismissal logic
  }

  async savePushToken(token: string): Promise<void> {
    try {
      const deviceId = await Device.getDeviceTypeAsync();
      const pushTokenData: PushToken = {
        token,
        platform: Platform.OS as 'ios' | 'android',
        deviceId: deviceId.toString(),
        createdAt: Date.now(),
        lastUsed: Date.now(),
      };

      await this.apiService.post('/notifications/register', pushTokenData);
      await AsyncStorage.setItem('push_token', token);
    } catch (error) {
      console.error('Failed to save push token:', error);
    }
  }

  async scheduleLocalNotification(
    title: string,
    body: string,
    data: any = {},
    seconds: number = 5
  ): Promise<string> {
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        priority: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      },
      trigger: {
        seconds,
      },
    });

    return id;
  }

  async sendImmediateNotification(
    title: string,
    body: string,
    data: any = {}
  ): Promise<void> {
    await Notifications.presentNotificationAsync({
      title,
      body,
      data,
      priority: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
  }

  async getStoredNotifications(): Promise<PushNotification[]> {
    try {
      const stored = await AsyncStorage.getItem('stored_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get stored notifications:', error);
      return [];
    }
  }

  async markNotificationAsRead(id: string): Promise<void> {
    try {
      const notifications = await this.getStoredNotifications();
      const updated = notifications.map(notification => 
        notification.id === id ? { ...notification, read: true } : notification
      );
      await AsyncStorage.setItem('stored_notifications', JSON.stringify(updated));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }

  async clearAllNotifications(): Promise<void> {
    try {
      await Notifications.dismissAllNotificationsAsync();
      await Notifications.setBadgeCountAsync(0);
      await AsyncStorage.removeItem('stored_notifications');
    } catch (error) {
      console.error('Failed to clear notifications:', error);
    }
  }

  async getUnreadCount(): Promise<number> {
    try {
      const notifications = await this.getStoredNotifications();
      return notifications.filter(notification => !notification.read).length;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }

  async loadSettings(): Promise<NotificationSettings> {
    try {
      const stored = await AsyncStorage.getItem('notification_settings');
      if (stored) {
        return JSON.parse(stored);
      }
      
      // Default settings
      const defaultSettings: NotificationSettings = {
        enabled: true,
        types: {
          payments: true,
          yield: true,
          security: true,
          marketing: false,
          system: true,
        },
        schedule: {
          quietHours: {
            enabled: false,
            start: '22:00',
            end: '08:00',
          },
          frequency: 'immediate',
        },
        channels: {
          push: true,
          email: true,
          inApp: true,
        },
      };

      await this.saveSettings(defaultSettings);
      return defaultSettings;
    } catch (error) {
      console.error('Failed to load notification settings:', error);
      throw new Error('Failed to load notification settings');
    }
  }

  async saveSettings(settings: NotificationSettings): Promise<void> {
    try {
      await AsyncStorage.setItem('notification_settings', JSON.stringify(settings));
      // Also update server
      await this.apiService.post('/notifications/settings', settings);
    } catch (error) {
      console.error('Failed to save notification settings:', error);
      throw new Error('Failed to save notification settings');
    }
  }

  async requestPermissions(): Promise<'granted' | 'denied' | 'undetermined'> {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      return status;
    } catch (error) {
      console.error('Failed to request notification permissions:', error);
      return 'denied';
    }
  }

  async getPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return status;
    } catch (error) {
      console.error('Failed to get permission status:', error);
      return 'undetermined';
    }
  }

  getPushToken(): string | null {
    return this.pushToken;
  }

  cleanup(): void {
    if (this.notificationListener) {
      Notifications.removeNotificationSubscription(this.notificationListener);
    }
    if (this.responseListener) {
      Notifications.removeNotificationSubscription(this.responseListener);
    }
  }
}