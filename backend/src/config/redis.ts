import Redis from 'ioredis';
import { config, isDevelopment } from './environment';
import { logger } from '../utils/logger';

/**
 * Redis configuration and connection management
 */
class RedisManager {
    private client: Redis;
    private subscriber: Redis;
    private publisher: Redis;
    private isConnected: boolean = false;

    constructor() {
        const redisConfig = {
            url: config.REDIS_URL,
            password: config.REDIS_PASSWORD,
            retryDelayOnFailover: 1000,
            maxRetriesPerRequest: 3,
            lazyConnect: true,
            enableOfflineQueue: false,
        };

        // Main Redis client for general operations
        this.client = new Redis(redisConfig);

        // Separate clients for pub/sub to avoid blocking
        this.subscriber = new Redis(redisConfig);
        this.publisher = new Redis(redisConfig);

        this.setupEventHandlers();
    }

    private setupEventHandlers(): void {
        // Main client events
        this.client.on('connect', () => {
            logger.info('Redis client connected');
        });

        this.client.on('ready', () => {
            this.isConnected = true;
            logger.info('Redis client ready');
        });

        this.client.on('error', (error) => {
            logger.error('Redis client error:', error);
        });

        this.client.on('close', () => {
            this.isConnected = false;
            logger.warn('Redis client connection closed');
        });

        // Subscriber events
        this.subscriber.on('connect', () => {
            logger.info('Redis subscriber connected');
        });

        this.subscriber.on('error', (error) => {
            logger.error('Redis subscriber error:', error);
        });

        // Publisher events
        this.publisher.on('connect', () => {
            logger.info('Redis publisher connected');
        });

        this.publisher.on('error', (error) => {
            logger.error('Redis publisher error:', error);
        });
    }

    /**
     * Connect to Redis
     */
    public async connect(): Promise<void> {
        try {
            await Promise.all([
                this.client.connect(),
                this.subscriber.connect(),
                this.publisher.connect(),
            ]);
            logger.info('All Redis connections established');
        } catch (error) {
            logger.error('Failed to connect to Redis:', error);
            throw error;
        }
    }

    /**
     * Disconnect from Redis
     */
    public async disconnect(): Promise<void> {
        try {
            await Promise.all([
                this.client.disconnect(),
                this.subscriber.disconnect(),
                this.publisher.disconnect(),
            ]);
            this.isConnected = false;
            logger.info('All Redis connections closed');
        } catch (error) {
            logger.error('Error disconnecting from Redis:', error);
            throw error;
        }
    }

    /**
     * Get the main Redis client
     */
    public getClient(): Redis {
        if (!this.isConnected) {
            throw new Error('Redis not connected. Call connect() first.');
        }
        return this.client;
    }

    /**
     * Get the Redis subscriber client
     */
    public getSubscriber(): Redis {
        return this.subscriber;
    }

    /**
     * Get the Redis publisher client
     */
    public getPublisher(): Redis {
        return this.publisher;
    }

    /**
     * Health check for Redis connection
     */
    public async healthCheck(): Promise<boolean> {
        try {
            const result = await this.client.ping();
            return result === 'PONG';
        } catch (error) {
            logger.error('Redis health check failed:', error);
            return false;
        }
    }

    /**
     * Cache operations
     */
    public async get(key: string): Promise<string | null> {
        try {
            return await this.client.get(key);
        } catch (error) {
            logger.error(`Redis GET error for key ${key}:`, error);
            return null;
        }
    }

    public async set(key: string, value: string, ttl?: number): Promise<boolean> {
        try {
            if (ttl) {
                await this.client.setex(key, ttl, value);
            } else {
                await this.client.set(key, value);
            }
            return true;
        } catch (error) {
            logger.error(`Redis SET error for key ${key}:`, error);
            return false;
        }
    }

    public async del(key: string): Promise<boolean> {
        try {
            const result = await this.client.del(key);
            return result > 0;
        } catch (error) {
            logger.error(`Redis DEL error for key ${key}:`, error);
            return false;
        }
    }

    public async exists(key: string): Promise<boolean> {
        try {
            const result = await this.client.exists(key);
            return result === 1;
        } catch (error) {
            logger.error(`Redis EXISTS error for key ${key}:`, error);
            return false;
        }
    }

    /**
     * List operations
     */
    public async lpush(key: string, ...values: string[]): Promise<number> {
        try {
            return await this.client.lpush(key, ...values);
        } catch (error) {
            logger.error(`Redis LPUSH error for key ${key}:`, error);
            return 0;
        }
    }

    public async rpop(key: string): Promise<string | null> {
        try {
            return await this.client.rpop(key);
        } catch (error) {
            logger.error(`Redis RPOP error for key ${key}:`, error);
            return null;
        }
    }

    /**
     * Hash operations
     */
    public async hset(key: string, field: string, value: string): Promise<boolean> {
        try {
            const result = await this.client.hset(key, field, value);
            return result === 1;
        } catch (error) {
            logger.error(`Redis HSET error for key ${key}, field ${field}:`, error);
            return false;
        }
    }

    public async hget(key: string, field: string): Promise<string | null> {
        try {
            return await this.client.hget(key, field);
        } catch (error) {
            logger.error(`Redis HGET error for key ${key}, field ${field}:`, error);
            return null;
        }
    }

    public async hgetall(key: string): Promise<Record<string, string>> {
        try {
            return await this.client.hgetall(key);
        } catch (error) {
            logger.error(`Redis HGETALL error for key ${key}:`, error);
            return {};
        }
    }

    /**
     * Pub/Sub operations
     */
    public async publish(channel: string, message: string): Promise<boolean> {
        try {
            const result = await this.publisher.publish(channel, message);
            return result > 0;
        } catch (error) {
            logger.error(`Redis PUBLISH error for channel ${channel}:`, error);
            return false;
        }
    }

    public async subscribe(channel: string, callback: (message: string) => void): Promise<void> {
        try {
            await this.subscriber.subscribe(channel);
            this.subscriber.on('message', (receivedChannel, message) => {
                if (receivedChannel === channel) {
                    callback(message);
                }
            });
        } catch (error) {
            logger.error(`Redis SUBSCRIBE error for channel ${channel}:`, error);
            throw error;
        }
    }

    /**
     * Distributed lock operations
     */
    public async acquireLock(key: string, ttl: number = 10): Promise<boolean> {
        try {
            const result = await this.client.set(key, '1', 'EX', ttl, 'NX');
            return result === 'OK';
        } catch (error) {
            logger.error(`Redis lock acquisition error for key ${key}:`, error);
            return false;
        }
    }

    public async releaseLock(key: string): Promise<boolean> {
        try {
            const result = await this.client.del(key);
            return result > 0;
        } catch (error) {
            logger.error(`Redis lock release error for key ${key}:`, error);
            return false;
        }
    }

    /**
     * Rate limiting operations
     */
    public async isRateLimited(key: string, limit: number, window: number): Promise<boolean> {
        try {
            const current = await this.client.incr(key);
            if (current === 1) {
                await this.client.expire(key, window);
            }
            return current > limit;
        } catch (error) {
            logger.error(`Redis rate limit check error for key ${key}:`, error);
            return false;
        }
    }

    /**
     * Clear all cache (development only)
     */
    public async flushAll(): Promise<void> {
        if (!isDevelopment) {
            throw new Error('Cache flush is only allowed in development environment');
        }

        try {
            await this.client.flushall();
            logger.warn('Redis cache cleared');
        } catch (error) {
            logger.error('Redis flush error:', error);
            throw error;
        }
    }
}

export const redis = new RedisManager();