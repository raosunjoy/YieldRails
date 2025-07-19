import io, { Socket } from 'socket.io-client';
import Config from 'react-native-config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NotificationService } from './NotificationService';

export interface RealtimeEvent {
  type: string;
  data: any;
  timestamp: number;
  userId?: string;
}

export interface ConnectionStatus {
  connected: boolean;
  reconnecting: boolean;
  lastConnected?: number;
  connectionAttempts: number;
}

export class RealtimeService {
  private static instance: RealtimeService;
  private socket: Socket | null = null;
  private connectionStatus: ConnectionStatus = {
    connected: false,
    reconnecting: false,
    connectionAttempts: 0,
  };
  private eventListeners: Map<string, ((data: any) => void)[]> = new Map();
  private notificationService: NotificationService;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  private constructor() {
    this.notificationService = NotificationService.getInstance();
  }

  public static getInstance(): RealtimeService {
    if (!RealtimeService.instance) {
      RealtimeService.instance = new RealtimeService();
    }
    return RealtimeService.instance;
  }

  async initialize(): Promise<void> {
    try {
      await this.connect();
      this.setupEventHandlers();
    } catch (error) {
      console.error('Failed to initialize realtime service:', error);
      throw new Error('Failed to initialize realtime connection');
    }
  }

  private async connect(): Promise<void> {
    try {
      const wsUrl = Config.WEBSOCKET_URL || 'wss://api.yieldrails.com/ws';
      const authToken = await AsyncStorage.getItem('auth_token');

      this.socket = io(wsUrl, {
        auth: {
          token: authToken,
        },
        transports: ['websocket'],
        timeout: 20000,
        forceNew: true,
      });

      return new Promise((resolve, reject) => {
        if (!this.socket) {
          reject(new Error('Socket not initialized'));
          return;
        }

        this.socket.on('connect', () => {
          console.log('Realtime connection established');
          this.connectionStatus.connected = true;
          this.connectionStatus.reconnecting = false;
          this.connectionStatus.lastConnected = Date.now();
          this.connectionStatus.connectionAttempts = 0;
          
          if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
          }

          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('Realtime connection error:', error);
          this.connectionStatus.connected = false;
          this.connectionStatus.connectionAttempts++;
          
          if (this.connectionStatus.connectionAttempts <= this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
          
          reject(error);
        });

        this.socket.on('disconnect', (reason) => {
          console.log('Realtime connection disconnected:', reason);
          this.connectionStatus.connected = false;
          
          // Attempt to reconnect if disconnection was unexpected
          if (reason === 'io server disconnect') {
            // Server disconnected, don't auto-reconnect
            console.log('Server disconnected the client');
          } else {
            // Client disconnected, attempt to reconnect
            this.scheduleReconnect();
          }
        });
      });
    } catch (error) {
      console.error('Failed to connect to realtime service:', error);
      throw error;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer || this.connectionStatus.connectionAttempts > this.maxReconnectAttempts) {
      return;
    }

    this.connectionStatus.reconnecting = true;
    const delay = this.reconnectDelay * Math.pow(2, this.connectionStatus.connectionAttempts - 1);

    console.log(`Scheduling reconnect in ${delay}ms (attempt ${this.connectionStatus.connectionAttempts})`);

    this.reconnectTimer = setTimeout(async () => {
      try {
        await this.connect();
      } catch (error) {
        console.error('Reconnection failed:', error);
      }
    }, delay);
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Payment events
    this.socket.on('payment:created', (data) => {
      this.handlePaymentEvent('payment:created', data);
    });

    this.socket.on('payment:updated', (data) => {
      this.handlePaymentEvent('payment:updated', data);
    });

    this.socket.on('payment:completed', (data) => {
      this.handlePaymentEvent('payment:completed', data);
    });

    this.socket.on('payment:failed', (data) => {
      this.handlePaymentEvent('payment:failed', data);
    });

    // Yield events
    this.socket.on('yield:earned', (data) => {
      this.handleYieldEvent('yield:earned', data);
    });

    this.socket.on('yield:strategy_updated', (data) => {
      this.handleYieldEvent('yield:strategy_updated', data);
    });

    // Bridge events
    this.socket.on('bridge:initiated', (data) => {
      this.handleBridgeEvent('bridge:initiated', data);
    });

    this.socket.on('bridge:completed', (data) => {
      this.handleBridgeEvent('bridge:completed', data);
    });

    this.socket.on('bridge:failed', (data) => {
      this.handleBridgeEvent('bridge:failed', data);
    });

    // Wallet events
    this.socket.on('wallet:balance_updated', (data) => {
      this.handleWalletEvent('wallet:balance_updated', data);
    });

    this.socket.on('wallet:transaction_confirmed', (data) => {
      this.handleWalletEvent('wallet:transaction_confirmed', data);
    });

    // Security events
    this.socket.on('security:alert', (data) => {
      this.handleSecurityEvent('security:alert', data);
    });

    // System events
    this.socket.on('system:maintenance', (data) => {
      this.handleSystemEvent('system:maintenance', data);
    });

    this.socket.on('system:update', (data) => {
      this.handleSystemEvent('system:update', data);
    });
  }

  private async handlePaymentEvent(type: string, data: any): Promise<void> {
    console.log('Payment event received:', type, data);

    // Emit to listeners
    this.emitToListeners(type, data);

    // Send push notification
    switch (type) {
      case 'payment:completed':
        await this.notificationService.sendImmediateNotification(
          'Payment Completed',
          `Your payment of ${data.amount} ${data.currency} has been completed successfully.`,
          { type: 'payment_sent', paymentId: data.id }
        );
        break;
      case 'payment:failed':
        await this.notificationService.sendImmediateNotification(
          'Payment Failed',
          `Your payment of ${data.amount} ${data.currency} has failed. Please try again.`,
          { type: 'payment_failed', paymentId: data.id }
        );
        break;
    }
  }

  private async handleYieldEvent(type: string, data: any): Promise<void> {
    console.log('Yield event received:', type, data);

    // Emit to listeners
    this.emitToListeners(type, data);

    // Send push notification
    if (type === 'yield:earned') {
      await this.notificationService.sendImmediateNotification(
        'Yield Earned!',
        `You've earned ${data.amount} ${data.currency} from your ${data.strategy} strategy.`,
        { type: 'yield_earned', strategyId: data.strategyId }
      );
    }
  }

  private async handleBridgeEvent(type: string, data: any): Promise<void> {
    console.log('Bridge event received:', type, data);

    // Emit to listeners
    this.emitToListeners(type, data);

    // Send push notification
    switch (type) {
      case 'bridge:completed':
        await this.notificationService.sendImmediateNotification(
          'Bridge Transfer Completed',
          `Your cross-chain transfer of ${data.amount} ${data.currency} has been completed.`,
          { type: 'bridge_completed', transactionId: data.id }
        );
        break;
      case 'bridge:failed':
        await this.notificationService.sendImmediateNotification(
          'Bridge Transfer Failed',
          `Your cross-chain transfer has failed. Your funds have been refunded.`,
          { type: 'bridge_failed', transactionId: data.id }
        );
        break;
    }
  }

  private handleWalletEvent(type: string, data: any): void {
    console.log('Wallet event received:', type, data);
    this.emitToListeners(type, data);
  }

  private async handleSecurityEvent(type: string, data: any): Promise<void> {
    console.log('Security event received:', type, data);

    // Emit to listeners
    this.emitToListeners(type, data);

    // Send high-priority security notification
    await this.notificationService.sendImmediateNotification(
      'Security Alert',
      data.message || 'A security event has been detected on your account.',
      { type: 'security_alert', alertId: data.id }
    );
  }

  private handleSystemEvent(type: string, data: any): void {
    console.log('System event received:', type, data);
    this.emitToListeners(type, data);
  }

  private emitToListeners(eventType: string, data: any): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error('Error in event listener:', error);
        }
      });
    }
  }

  // Public methods for subscribing to events
  subscribe(eventType: string, callback: (data: any) => void): () => void {
    const listeners = this.eventListeners.get(eventType) || [];
    listeners.push(callback);
    this.eventListeners.set(eventType, listeners);

    // Return unsubscribe function
    return () => {
      const currentListeners = this.eventListeners.get(eventType) || [];
      const index = currentListeners.indexOf(callback);
      if (index > -1) {
        currentListeners.splice(index, 1);
        this.eventListeners.set(eventType, currentListeners);
      }
    };
  }

  // Subscribe to payment events
  subscribeToPayments(callback: (data: any) => void): () => void {
    const unsubscribers = [
      this.subscribe('payment:created', callback),
      this.subscribe('payment:updated', callback),
      this.subscribe('payment:completed', callback),
      this.subscribe('payment:failed', callback),
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }

  // Subscribe to yield events
  subscribeToYield(callback: (data: any) => void): () => void {
    const unsubscribers = [
      this.subscribe('yield:earned', callback),
      this.subscribe('yield:strategy_updated', callback),
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }

  // Subscribe to wallet events
  subscribeToWallet(callback: (data: any) => void): () => void {
    const unsubscribers = [
      this.subscribe('wallet:balance_updated', callback),
      this.subscribe('wallet:transaction_confirmed', callback),
    ];

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }

  // Send events to server
  emit(eventType: string, data: any): void {
    if (this.socket && this.connectionStatus.connected) {
      this.socket.emit(eventType, data);
    } else {
      console.warn('Cannot emit event - not connected to realtime service');
    }
  }

  // Join specific rooms for targeted updates
  joinRoom(room: string): void {
    if (this.socket && this.connectionStatus.connected) {
      this.socket.emit('join', room);
    }
  }

  leaveRoom(room: string): void {
    if (this.socket && this.connectionStatus.connected) {
      this.socket.emit('leave', room);
    }
  }

  // Get connection status
  getConnectionStatus(): ConnectionStatus {
    return { ...this.connectionStatus };
  }

  // Force reconnect
  async reconnect(): Promise<void> {
    if (this.socket) {
      this.socket.disconnect();
    }
    await this.connect();
  }

  // Cleanup
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }

    this.connectionStatus.connected = false;
    this.connectionStatus.reconnecting = false;
    this.eventListeners.clear();
  }
}