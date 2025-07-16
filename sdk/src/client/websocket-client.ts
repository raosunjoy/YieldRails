/**
 * WebSocket client for real-time updates
 */

import WebSocket from 'ws';
import { WebSocketConfig } from '../types/common';

export interface WebSocketEvents {
  // Payment events
  'payment:created': PaymentCreatedEvent;
  'payment:confirmed': PaymentConfirmedEvent;
  'payment:released': PaymentReleasedEvent;
  'payment:failed': PaymentFailedEvent;
  
  // Yield events
  'yield:earned': YieldEarnedEvent;
  'yield:optimized': YieldOptimizedEvent;
  'yield:strategy_updated': StrategyUpdatedEvent;
  
  // Cross-chain events
  'bridge:initiated': BridgeInitiatedEvent;
  'bridge:completed': BridgeCompletedEvent;
  'bridge:failed': BridgeFailedEvent;
  
  // Connection events
  'connected': void;
  'disconnected': void;
  'error': Error;
}

interface PaymentCreatedEvent {
  paymentId: string;
  amount: string;
  token: string;
  merchant: string;
}

interface PaymentConfirmedEvent {
  paymentId: string;
  transactionHash: string;
  blockNumber: number;
}

interface PaymentReleasedEvent {
  paymentId: string;
  yieldEarned: string;
  totalAmount: string;
}

interface PaymentFailedEvent {
  paymentId: string;
  reason: string;
  error: string;
}

interface YieldEarnedEvent {
  paymentId: string;
  earningId: string;
  amount: string;
  strategy: string;
}

interface YieldOptimizedEvent {
  userId: string;
  newStrategy: string;
  expectedIncrease: string;
}

interface StrategyUpdatedEvent {
  strategyId: string;
  newAPY: string;
  change: string;
}

interface BridgeInitiatedEvent {
  transactionId: string;
  sourceChain: string;
  destinationChain: string;
  amount: string;
}

interface BridgeCompletedEvent {
  transactionId: string;
  completionTime: number;
  yieldEarned: string;
}

interface BridgeFailedEvent {
  transactionId: string;
  reason: string;
  refundInitiated: boolean;
}

export class WebSocketClient {
  private ws?: WebSocket;
  private config: WebSocketConfig;
  private listeners: Map<keyof WebSocketEvents, Set<Function>> = new Map();
  private reconnectAttempts = 0;
  private reconnectTimer?: NodeJS.Timeout;
  private accessToken?: string;
  private isConnecting = false;

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnect: true,
      maxReconnectAttempts: 5,
      reconnectInterval: 5000,
      ...config,
    };
  }

  /**
   * Connect to WebSocket server
   */
  public async connect(accessToken?: string): Promise<void> {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    this.accessToken = accessToken;

    return new Promise((resolve, reject) => {
      try {
        const headers: Record<string, string> = {};
        if (this.accessToken) {
          headers['Authorization'] = `Bearer ${this.accessToken}`;
        }

        this.ws = new WebSocket(this.config.url, { headers });

        this.ws.on('open', () => {
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.emit('connected');
          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse WebSocket message:', error);
          }
        });

        this.ws.on('close', (code: number, _reason: string) => {
          this.isConnecting = false;
          this.emit('disconnected');
          
          if (this.config.reconnect && this.shouldReconnect(code)) {
            this.scheduleReconnect();
          }
        });

        this.ws.on('error', (error: Error) => {
          this.isConnecting = false;
          this.emit('error', error);
          reject(error);
        });

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  public disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = undefined;
    }
  }

  /**
   * Subscribe to events
   */
  public on<K extends keyof WebSocketEvents>(
    event: K,
    listener: (data: WebSocketEvents[K]) => void
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
  }

  /**
   * Unsubscribe from events
   */
  public off<K extends keyof WebSocketEvents>(
    event: K,
    listener: (data: WebSocketEvents[K]) => void
  ): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(listener);
    }
  }

  /**
   * Subscribe to payment events for specific payment
   */
  public subscribeToPayment(paymentId: string): void {
    this.send({
      type: 'subscribe',
      channel: 'payment',
      paymentId,
    });
  }

  /**
   * Unsubscribe from payment events
   */
  public unsubscribeFromPayment(paymentId: string): void {
    this.send({
      type: 'unsubscribe',
      channel: 'payment',
      paymentId,
    });
  }

  /**
   * Subscribe to yield events
   */
  public subscribeToYield(): void {
    this.send({
      type: 'subscribe',
      channel: 'yield',
    });
  }

  /**
   * Subscribe to bridge events for specific transaction
   */
  public subscribeToBridge(transactionId: string): void {
    this.send({
      type: 'subscribe',
      channel: 'bridge',
      transactionId,
    });
  }

  /**
   * Get connection status
   */
  public isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private handleMessage(message: any): void {
    const { type, data } = message;
    
    if (this.listeners.has(type)) {
      const eventListeners = this.listeners.get(type)!;
      eventListeners.forEach(listener => {
        try {
          listener(data);
        } catch (error) {
          console.error(`Error in WebSocket event listener for ${type}:`, error);
        }
      });
    }
  }

  private emit<K extends keyof WebSocketEvents>(event: K, data?: WebSocketEvents[K]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => {
        try {
          listener(data as WebSocketEvents[K]);
        } catch (error) {
          console.error(`Error in WebSocket event listener for ${event}:`, error);
        }
      });
    }
  }

  private send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private shouldReconnect(code: number): boolean {
    // Don't reconnect on normal closure or auth failures
    return code !== 1000 && code !== 1001 && code !== 4001;
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= (this.config.maxReconnectAttempts || 5)) {
      return;
    }

    this.reconnectAttempts++;
    const delay = this.config.reconnectInterval || 5000;

    this.reconnectTimer = setTimeout(() => {
      this.connect(this.accessToken).catch(error => {
        console.error('WebSocket reconnection failed:', error);
      });
    }, delay);
  }
}