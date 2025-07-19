export interface PushNotification {
  id: string;
  title: string;
  body: string;
  data?: Record<string, any>;
  timestamp: number;
  type: NotificationType;
  priority: 'default' | 'high' | 'max';
  read: boolean;
  actionable?: boolean;
  actions?: NotificationAction[];
}

export type NotificationType = 
  | 'payment_received'
  | 'payment_sent'
  | 'payment_failed'
  | 'yield_earned'
  | 'strategy_update'
  | 'price_alert'
  | 'security_alert'
  | 'system_update'
  | 'maintenance'
  | 'bridge_completed'
  | 'bridge_failed';

export interface NotificationAction {
  id: string;
  title: string;
  type: 'view' | 'approve' | 'dismiss' | 'retry';
  data?: Record<string, any>;
}

export interface NotificationSettings {
  enabled: boolean;
  types: {
    payments: boolean;
    yield: boolean;
    security: boolean;
    marketing: boolean;
    system: boolean;
  };
  schedule: {
    quietHours: {
      enabled: boolean;
      start: string; // "22:00"
      end: string;   // "08:00"
    };
    frequency: 'immediate' | 'hourly' | 'daily';
  };
  channels: {
    push: boolean;
    email: boolean;
    inApp: boolean;
  };
}

export interface PushToken {
  token: string;
  platform: 'ios' | 'android';
  deviceId: string;
  userId?: string;
  createdAt: number;
  lastUsed: number;
}

export interface NotificationState {
  notifications: PushNotification[];
  unreadCount: number;
  settings: NotificationSettings;
  pushToken: string | null;
  permission: 'granted' | 'denied' | 'undetermined';
  loading: boolean;
  error: string | null;
}