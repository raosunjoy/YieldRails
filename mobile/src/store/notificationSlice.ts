import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { NotificationState, PushNotification, NotificationSettings } from '@types/notifications';
import { NotificationService } from '@services/NotificationService';

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  settings: {
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
  },
  pushToken: null,
  permission: 'undetermined',
  loading: false,
  error: null,
};

// Async thunks
export const initializeNotifications = createAsyncThunk(
  'notifications/initialize',
  async (_, { rejectWithValue }) => {
    try {
      const notificationService = NotificationService.getInstance();
      await notificationService.initialize();
      
      const [pushToken, permission, settings, notifications, unreadCount] = await Promise.all([
        notificationService.getPushToken(),
        notificationService.getPermissionStatus(),
        notificationService.loadSettings(),
        notificationService.getStoredNotifications(),
        notificationService.getUnreadCount(),
      ]);

      return {
        pushToken,
        permission,
        settings,
        notifications,
        unreadCount,
      };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to initialize notifications');
    }
  }
);

export const requestNotificationPermission = createAsyncThunk(
  'notifications/requestPermission',
  async (_, { rejectWithValue }) => {
    try {
      const notificationService = NotificationService.getInstance();
      const permission = await notificationService.requestPermissions();
      return permission;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to request permission');
    }
  }
);

export const loadNotifications = createAsyncThunk(
  'notifications/load',
  async (_, { rejectWithValue }) => {
    try {
      const notificationService = NotificationService.getInstance();
      const [notifications, unreadCount] = await Promise.all([
        notificationService.getStoredNotifications(),
        notificationService.getUnreadCount(),
      ]);
      return { notifications, unreadCount };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load notifications');
    }
  }
);

export const markAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (notificationId: string, { rejectWithValue }) => {
    try {
      const notificationService = NotificationService.getInstance();
      await notificationService.markNotificationAsRead(notificationId);
      
      const unreadCount = await notificationService.getUnreadCount();
      return { notificationId, unreadCount };
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to mark as read');
    }
  }
);

export const clearAllNotifications = createAsyncThunk(
  'notifications/clearAll',
  async (_, { rejectWithValue }) => {
    try {
      const notificationService = NotificationService.getInstance();
      await notificationService.clearAllNotifications();
      return true;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to clear notifications');
    }
  }
);

export const updateSettings = createAsyncThunk(
  'notifications/updateSettings',
  async (settings: NotificationSettings, { rejectWithValue }) => {
    try {
      const notificationService = NotificationService.getInstance();
      await notificationService.saveSettings(settings);
      return settings;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update settings');
    }
  }
);

export const scheduleLocalNotification = createAsyncThunk(
  'notifications/scheduleLocal',
  async (
    params: { title: string; body: string; data?: any; seconds?: number },
    { rejectWithValue }
  ) => {
    try {
      const notificationService = NotificationService.getInstance();
      const id = await notificationService.scheduleLocalNotification(
        params.title,
        params.body,
        params.data,
        params.seconds
      );
      return id;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to schedule notification');
    }
  }
);

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action: PayloadAction<PushNotification>) => {
      state.notifications.unshift(action.payload);
      if (!action.payload.read) {
        state.unreadCount += 1;
      }
      // Keep only last 100 notifications
      if (state.notifications.length > 100) {
        state.notifications = state.notifications.slice(0, 100);
      }
    },
    
    markNotificationAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(n => n.id === action.payload);
      if (notification && !notification.read) {
        notification.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    
    removeNotification: (state, action: PayloadAction<string>) => {
      const index = state.notifications.findIndex(n => n.id === action.payload);
      if (index > -1) {
        const notification = state.notifications[index];
        if (!notification.read) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        state.notifications.splice(index, 1);
      }
    },
    
    updateUnreadCount: (state, action: PayloadAction<number>) => {
      state.unreadCount = action.payload;
    },
    
    clearError: (state) => {
      state.error = null;
    },
    
    setPushToken: (state, action: PayloadAction<string | null>) => {
      state.pushToken = action.payload;
    },
    
    setPermission: (state, action: PayloadAction<'granted' | 'denied' | 'undetermined'>) => {
      state.permission = action.payload;
    },
  },
  
  extraReducers: (builder) => {
    // Initialize notifications
    builder.addCase(initializeNotifications.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(initializeNotifications.fulfilled, (state, action) => {
      state.loading = false;
      state.pushToken = action.payload.pushToken;
      state.permission = action.payload.permission;
      state.settings = action.payload.settings;
      state.notifications = action.payload.notifications;
      state.unreadCount = action.payload.unreadCount;
      state.error = null;
    });
    builder.addCase(initializeNotifications.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });

    // Request permission
    builder.addCase(requestNotificationPermission.fulfilled, (state, action) => {
      state.permission = action.payload;
    });
    builder.addCase(requestNotificationPermission.rejected, (state, action) => {
      state.error = action.payload as string;
    });

    // Load notifications
    builder.addCase(loadNotifications.fulfilled, (state, action) => {
      state.notifications = action.payload.notifications;
      state.unreadCount = action.payload.unreadCount;
    });
    builder.addCase(loadNotifications.rejected, (state, action) => {
      state.error = action.payload as string;
    });

    // Mark as read
    builder.addCase(markAsRead.fulfilled, (state, action) => {
      const notification = state.notifications.find(n => n.id === action.payload.notificationId);
      if (notification) {
        notification.read = true;
      }
      state.unreadCount = action.payload.unreadCount;
    });
    builder.addCase(markAsRead.rejected, (state, action) => {
      state.error = action.payload as string;
    });

    // Clear all notifications
    builder.addCase(clearAllNotifications.fulfilled, (state) => {
      state.notifications = [];
      state.unreadCount = 0;
    });
    builder.addCase(clearAllNotifications.rejected, (state, action) => {
      state.error = action.payload as string;
    });

    // Update settings
    builder.addCase(updateSettings.fulfilled, (state, action) => {
      state.settings = action.payload;
    });
    builder.addCase(updateSettings.rejected, (state, action) => {
      state.error = action.payload as string;
    });

    // Schedule local notification
    builder.addCase(scheduleLocalNotification.rejected, (state, action) => {
      state.error = action.payload as string;
    });
  },
});

export const {
  addNotification,
  markNotificationAsRead,
  removeNotification,
  updateUnreadCount,
  clearError,
  setPushToken,
  setPermission,
} = notificationSlice.actions;

export default notificationSlice.reducer;