import Redis from 'ioredis';
declare class RedisManager {
    private client;
    private subscriber;
    private publisher;
    private isConnected;
    constructor();
    private setupEventHandlers;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    getClient(): Redis;
    getSubscriber(): Redis;
    getPublisher(): Redis;
    healthCheck(): Promise<boolean>;
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ttl?: number): Promise<boolean>;
    del(key: string): Promise<boolean>;
    exists(key: string): Promise<boolean>;
    lpush(key: string, ...values: string[]): Promise<number>;
    rpop(key: string): Promise<string | null>;
    hset(key: string, field: string, value: string): Promise<boolean>;
    hget(key: string, field: string): Promise<string | null>;
    hgetall(key: string): Promise<Record<string, string>>;
    publish(channel: string, message: string): Promise<boolean>;
    subscribe(channel: string, callback: (message: string) => void): Promise<void>;
    acquireLock(key: string, ttl?: number): Promise<boolean>;
    releaseLock(key: string): Promise<boolean>;
    isRateLimited(key: string, limit: number, window: number): Promise<boolean>;
    flushAll(): Promise<void>;
}
export declare const redis: RedisManager;
export {};
//# sourceMappingURL=redis.d.ts.map