"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
const ioredis_1 = __importDefault(require("ioredis"));
const environment_1 = require("./environment");
const logger_1 = require("../utils/logger");
class RedisManager {
    constructor() {
        this.isConnected = false;
        const redisConfig = {
            url: environment_1.config.REDIS_URL,
            retryDelayOnFailover: 1000,
            maxRetriesPerRequest: 3,
            lazyConnect: true,
            enableOfflineQueue: false,
        };
        if (environment_1.config.REDIS_PASSWORD) {
            redisConfig.password = environment_1.config.REDIS_PASSWORD;
        }
        this.client = new ioredis_1.default(redisConfig);
        this.subscriber = new ioredis_1.default(redisConfig);
        this.publisher = new ioredis_1.default(redisConfig);
        this.setupEventHandlers();
    }
    setupEventHandlers() {
        this.client.on('connect', () => {
            logger_1.logger.info('Redis client connected');
        });
        this.client.on('ready', () => {
            this.isConnected = true;
            logger_1.logger.info('Redis client ready');
        });
        this.client.on('error', (error) => {
            logger_1.logger.error('Redis client error:', error);
        });
        this.client.on('close', () => {
            this.isConnected = false;
            logger_1.logger.warn('Redis client connection closed');
        });
        this.subscriber.on('connect', () => {
            logger_1.logger.info('Redis subscriber connected');
        });
        this.subscriber.on('error', (error) => {
            logger_1.logger.error('Redis subscriber error:', error);
        });
        this.publisher.on('connect', () => {
            logger_1.logger.info('Redis publisher connected');
        });
        this.publisher.on('error', (error) => {
            logger_1.logger.error('Redis publisher error:', error);
        });
    }
    async connect() {
        try {
            await Promise.all([
                this.client.connect(),
                this.subscriber.connect(),
                this.publisher.connect(),
            ]);
            logger_1.logger.info('All Redis connections established');
        }
        catch (error) {
            logger_1.logger.error('Failed to connect to Redis:', error);
            throw error;
        }
    }
    async disconnect() {
        try {
            await Promise.all([
                this.client.disconnect(),
                this.subscriber.disconnect(),
                this.publisher.disconnect(),
            ]);
            this.isConnected = false;
            logger_1.logger.info('All Redis connections closed');
        }
        catch (error) {
            logger_1.logger.error('Error disconnecting from Redis:', error);
            throw error;
        }
    }
    getClient() {
        if (!this.isConnected) {
            throw new Error('Redis not connected. Call connect() first.');
        }
        return this.client;
    }
    getSubscriber() {
        return this.subscriber;
    }
    getPublisher() {
        return this.publisher;
    }
    async healthCheck() {
        try {
            const result = await this.client.ping();
            return result === 'PONG';
        }
        catch (error) {
            logger_1.logger.error('Redis health check failed:', error);
            return false;
        }
    }
    async get(key) {
        try {
            return await this.client.get(key);
        }
        catch (error) {
            logger_1.logger.error(`Redis GET error for key ${key}:`, error);
            return null;
        }
    }
    async set(key, value, ttl) {
        try {
            if (ttl) {
                await this.client.setex(key, ttl, value);
            }
            else {
                await this.client.set(key, value);
            }
            return true;
        }
        catch (error) {
            logger_1.logger.error(`Redis SET error for key ${key}:`, error);
            return false;
        }
    }
    async del(key) {
        try {
            const result = await this.client.del(key);
            return result > 0;
        }
        catch (error) {
            logger_1.logger.error(`Redis DEL error for key ${key}:`, error);
            return false;
        }
    }
    async exists(key) {
        try {
            const result = await this.client.exists(key);
            return result === 1;
        }
        catch (error) {
            logger_1.logger.error(`Redis EXISTS error for key ${key}:`, error);
            return false;
        }
    }
    async lpush(key, ...values) {
        try {
            return await this.client.lpush(key, ...values);
        }
        catch (error) {
            logger_1.logger.error(`Redis LPUSH error for key ${key}:`, error);
            return 0;
        }
    }
    async rpop(key) {
        try {
            return await this.client.rpop(key);
        }
        catch (error) {
            logger_1.logger.error(`Redis RPOP error for key ${key}:`, error);
            return null;
        }
    }
    async hset(key, field, value) {
        try {
            const result = await this.client.hset(key, field, value);
            return result === 1;
        }
        catch (error) {
            logger_1.logger.error(`Redis HSET error for key ${key}, field ${field}:`, error);
            return false;
        }
    }
    async hget(key, field) {
        try {
            return await this.client.hget(key, field);
        }
        catch (error) {
            logger_1.logger.error(`Redis HGET error for key ${key}, field ${field}:`, error);
            return null;
        }
    }
    async hgetall(key) {
        try {
            return await this.client.hgetall(key);
        }
        catch (error) {
            logger_1.logger.error(`Redis HGETALL error for key ${key}:`, error);
            return {};
        }
    }
    async publish(channel, message) {
        try {
            const result = await this.publisher.publish(channel, message);
            return result > 0;
        }
        catch (error) {
            logger_1.logger.error(`Redis PUBLISH error for channel ${channel}:`, error);
            return false;
        }
    }
    async subscribe(channel, callback) {
        try {
            await this.subscriber.subscribe(channel);
            this.subscriber.on('message', (receivedChannel, message) => {
                if (receivedChannel === channel) {
                    callback(message);
                }
            });
        }
        catch (error) {
            logger_1.logger.error(`Redis SUBSCRIBE error for channel ${channel}:`, error);
            throw error;
        }
    }
    async acquireLock(key, ttl = 10) {
        try {
            const result = await this.client.set(key, '1', 'EX', ttl, 'NX');
            return result === 'OK';
        }
        catch (error) {
            logger_1.logger.error(`Redis lock acquisition error for key ${key}:`, error);
            return false;
        }
    }
    async releaseLock(key) {
        try {
            const result = await this.client.del(key);
            return result > 0;
        }
        catch (error) {
            logger_1.logger.error(`Redis lock release error for key ${key}:`, error);
            return false;
        }
    }
    async isRateLimited(key, limit, window) {
        try {
            const current = await this.client.incr(key);
            if (current === 1) {
                await this.client.expire(key, window);
            }
            return current > limit;
        }
        catch (error) {
            logger_1.logger.error(`Redis rate limit check error for key ${key}:`, error);
            return false;
        }
    }
    async flushAll() {
        if (!environment_1.isDevelopment) {
            throw new Error('Cache flush is only allowed in development environment');
        }
        try {
            await this.client.flushall();
            logger_1.logger.warn('Redis cache cleared');
        }
        catch (error) {
            logger_1.logger.error('Redis flush error:', error);
            throw error;
        }
    }
}
exports.redis = new RedisManager();
//# sourceMappingURL=redis.js.map