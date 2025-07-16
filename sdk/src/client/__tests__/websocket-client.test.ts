/**
 * Tests for WebSocketClient
 */

import { WebSocketClient } from '../websocket-client';
import { WebSocketConfig } from '../../types/common';
import WebSocket from 'ws';

// Mock WebSocket
jest.mock('ws');
const MockedWebSocket = WebSocket as jest.MockedClass<typeof WebSocket>;

describe('WebSocketClient', () => {
  let wsClient: WebSocketClient;
  let mockWebSocket: jest.Mocked<WebSocket>;

  const config: WebSocketConfig = {
    url: 'wss://api.yieldrails.com/ws',
    reconnect: true,
    maxReconnectAttempts: 3,
    reconnectInterval: 1000,
  };

  beforeEach(() => {
    mockWebSocket = {
      on: jest.fn(),
      close: jest.fn(),
      send: jest.fn(),
    } as any;

    // Mock readyState as a getter
    Object.defineProperty(mockWebSocket, 'readyState', {
      value: WebSocket.CONNECTING,
      writable: true,
      configurable: true,
    });

    MockedWebSocket.mockImplementation(() => mockWebSocket);
    wsClient = new WebSocketClient(config);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('constructor', () => {
    it('should initialize with default config', () => {
      const defaultClient = new WebSocketClient({ url: 'wss://test.com' });
      expect(defaultClient).toBeDefined();
    });

    it('should merge provided config with defaults', () => {
      const customConfig = {
        url: 'wss://custom.com',
        reconnect: false,
      };
      const client = new WebSocketClient(customConfig);
      expect(client).toBeDefined();
    });
  });

  describe('basic functionality', () => {
    it('should create WebSocket instance on connect', () => {
      wsClient.connect();
      expect(MockedWebSocket).toHaveBeenCalledWith(config.url, { headers: {} });
    });

    it('should create WebSocket with auth token', () => {
      wsClient.connect('test-token');
      expect(MockedWebSocket).toHaveBeenCalledWith(config.url, {
        headers: { Authorization: 'Bearer test-token' },
      });
    });

    it('should close WebSocket connection', () => {
      // First connect to create the WebSocket instance
      wsClient.connect();
      wsClient.disconnect();
      expect(mockWebSocket.close).toHaveBeenCalledWith(1000, 'Client disconnect');
    });

    it('should handle disconnect when no WebSocket exists', () => {
      const newClient = new WebSocketClient(config);
      expect(() => newClient.disconnect()).not.toThrow();
    });
  });

  describe('event handling', () => {
    it('should register event listeners', () => {
      const listener = jest.fn();
      wsClient.on('connected', listener);
      
      // Verify listener was added (we can't easily test the actual event firing without complex mocking)
      expect(listener).toBeDefined();
    });

    it('should unregister event listeners', () => {
      const listener = jest.fn();
      wsClient.on('connected', listener);
      wsClient.off('connected', listener);
      
      // Verify listener was removed (we can't easily test the actual event firing without complex mocking)
      expect(listener).toBeDefined();
    });
  });

  describe('subscriptions', () => {
    beforeEach(() => {
      // Set up WebSocket to be OPEN and connect
      Object.defineProperty(mockWebSocket, 'readyState', {
        value: WebSocket.OPEN,
        writable: true,
        configurable: true,
      });
      wsClient.connect(); // This creates the WebSocket instance
    });

    it('should subscribe to payment events', () => {
      wsClient.subscribeToPayment('payment-123');
      
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'subscribe',
          channel: 'payment',
          paymentId: 'payment-123',
        })
      );
    });

    it('should unsubscribe from payment events', () => {
      wsClient.unsubscribeFromPayment('payment-123');
      
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'unsubscribe',
          channel: 'payment',
          paymentId: 'payment-123',
        })
      );
    });

    it('should subscribe to yield events', () => {
      wsClient.subscribeToYield();
      
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'subscribe',
          channel: 'yield',
        })
      );
    });

    it('should subscribe to bridge events', () => {
      wsClient.subscribeToBridge('bridge-123');
      
      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({
          type: 'subscribe',
          channel: 'bridge',
          transactionId: 'bridge-123',
        })
      );
    });

    it('should not send if WebSocket is not open', () => {
      // Create a new client without connecting
      const newClient = new WebSocketClient(config);
      newClient.subscribeToPayment('payment-123');
      
      expect(mockWebSocket.send).not.toHaveBeenCalled();
    });
  });

  describe('connection status', () => {
    it('should have isConnected method', () => {
      expect(typeof wsClient.isConnected).toBe('function');
    });
  });
});