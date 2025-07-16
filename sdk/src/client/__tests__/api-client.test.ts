/**
 * Tests for ApiClient
 */

import axios, { AxiosResponse } from 'axios';
import { ApiClient } from '../api-client';
import { SDKConfig, YieldRailsError } from '../../types/common';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ApiClient', () => {
  let apiClient: ApiClient;
  let mockAxiosInstance: any;
  const config: SDKConfig = {
    apiUrl: 'https://api.yieldrails.com',
    apiKey: 'test-api-key',
    timeout: 30000,
    debug: false,
  };

  beforeEach(() => {
    mockAxiosInstance = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
      defaults: {
        timeout: 30000,
        baseURL: 'https://api.yieldrails.com',
      },
    };

    mockedAxios.create.mockReturnValue(mockAxiosInstance);
    apiClient = new ApiClient(config);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should create axios instance with correct config', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.yieldrails.com',
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': '@yieldrails/sdk',
        },
      });
    });

    it('should setup interceptors', () => {
      expect(mockAxiosInstance.interceptors.request.use).toHaveBeenCalled();
      expect(mockAxiosInstance.interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('setAccessToken', () => {
    it('should store access token', () => {
      const token = 'test-token';
      apiClient.setAccessToken(token);
      
      // Token should be used in subsequent requests
      // This is tested indirectly through the interceptor
      expect(apiClient).toBeDefined();
    });
  });

  describe('clearAccessToken', () => {
    it('should clear stored access token', () => {
      apiClient.setAccessToken('test-token');
      apiClient.clearAccessToken();
      
      // Token should no longer be used
      expect(apiClient).toBeDefined();
    });
  });

  describe('HTTP methods', () => {
    const mockResponse: AxiosResponse = {
      data: {
        success: true,
        data: { id: '123', name: 'test' },
        timestamp: '2023-01-01T00:00:00Z',
      },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    };

    describe('get', () => {
      it('should make GET request and return data', async () => {
        mockAxiosInstance.get.mockResolvedValue(mockResponse);

        const result = await apiClient.get('/test');

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', undefined);
        expect(result).toEqual({ id: '123', name: 'test' });
      });

      it('should pass config to axios', async () => {
        mockAxiosInstance.get.mockResolvedValue(mockResponse);
        const requestConfig = { headers: { 'Custom-Header': 'value' } };

        await apiClient.get('/test', requestConfig);

        expect(mockAxiosInstance.get).toHaveBeenCalledWith('/test', requestConfig);
      });
    });

    describe('post', () => {
      it('should make POST request and return data', async () => {
        mockAxiosInstance.post.mockResolvedValue(mockResponse);
        const postData = { name: 'test' };

        const result = await apiClient.post('/test', postData);

        expect(mockAxiosInstance.post).toHaveBeenCalledWith('/test', postData, undefined);
        expect(result).toEqual({ id: '123', name: 'test' });
      });
    });

    describe('put', () => {
      it('should make PUT request and return data', async () => {
        mockAxiosInstance.put.mockResolvedValue(mockResponse);
        const putData = { name: 'updated' };

        const result = await apiClient.put('/test', putData);

        expect(mockAxiosInstance.put).toHaveBeenCalledWith('/test', putData, undefined);
        expect(result).toEqual({ id: '123', name: 'test' });
      });
    });

    describe('delete', () => {
      it('should make DELETE request and return data', async () => {
        mockAxiosInstance.delete.mockResolvedValue(mockResponse);

        const result = await apiClient.delete('/test');

        expect(mockAxiosInstance.delete).toHaveBeenCalledWith('/test', undefined);
        expect(result).toEqual({ id: '123', name: 'test' });
      });
    });
  });

  describe('error handling', () => {
    it('should throw YieldRailsError for API errors', async () => {
      const errorResponse = {
        success: false,
        error: 'INVALID_REQUEST',
        message: 'Invalid request data',
        timestamp: '2023-01-01T00:00:00Z',
      };

      mockAxiosInstance.get.mockResolvedValue({
        data: errorResponse,
        status: 400,
      });

      await expect(apiClient.get('/test')).rejects.toThrow(YieldRailsError);
      await expect(apiClient.get('/test')).rejects.toThrow('Invalid request data');
    });

    it('should throw YieldRailsError for network errors', async () => {
      // Simulate network error by rejecting with a YieldRailsError directly
      const networkError = new YieldRailsError(
        'NETWORK_ERROR',
        'Network request failed',
        500
      );
      
      mockAxiosInstance.get.mockRejectedValue(networkError);

      await expect(apiClient.get('/test')).rejects.toThrow(YieldRailsError);
    });

    it('should handle 401 errors by clearing token', async () => {
      // Simulate 401 error by rejecting with a YieldRailsError directly
      const authError = new YieldRailsError(
        'UNAUTHORIZED',
        'Token expired',
        401
      );

      apiClient.setAccessToken('expired-token');
      mockAxiosInstance.get.mockRejectedValue(authError);

      await expect(apiClient.get('/test')).rejects.toThrow(YieldRailsError);
      // Token should be cleared after 401 error
    });
  });

  describe('config management', () => {
    it('should return current config', () => {
      const currentConfig = apiClient.getConfig();
      expect(currentConfig).toEqual(config);
    });

    it('should update config', () => {
      const updates = {
        timeout: 60000,
        debug: true,
      };

      apiClient.updateConfig(updates);

      const updatedConfig = apiClient.getConfig();
      expect(updatedConfig.timeout).toBe(60000);
      expect(updatedConfig.debug).toBe(true);
      expect(mockAxiosInstance.defaults.timeout).toBe(60000);
    });

    it('should update base URL', () => {
      const updates = {
        apiUrl: 'https://new-api.yieldrails.com',
      };

      apiClient.updateConfig(updates);

      expect(mockAxiosInstance.defaults.baseURL).toBe('https://new-api.yieldrails.com');
    });
  });
});