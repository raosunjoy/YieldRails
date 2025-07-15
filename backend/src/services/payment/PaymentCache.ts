import { redis } from '../../config/redis';
import { logger } from '../../utils/logger';

/**
 * Payment caching utilities
 */
export class PaymentCache {
    private static readonly CACHE_TTL = 3600; // 1 hour
    private static readonly CACHE_PREFIX = 'payment:';

    /**
     * Cache a payment object
     */
    static async cachePayment(payment: any): Promise<void> {
        try {
            const cacheKey = `${this.CACHE_PREFIX}${payment.id}`;
            await redis.set(cacheKey, JSON.stringify(payment), this.CACHE_TTL);
        } catch (error) {
            logger.warn('Failed to cache payment:', error);
        }
    }

    /**
     * Get cached payment
     */
    static async getCachedPayment(paymentId: string): Promise<any | null> {
        try {
            const cacheKey = `${this.CACHE_PREFIX}${paymentId}`;
            const cached = await redis.get(cacheKey);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            logger.warn('Redis cache error, falling back to database:', error);
            return null;
        }
    }

    /**
     * Invalidate payment cache
     */
    static async invalidatePaymentCache(paymentId: string): Promise<void> {
        try {
            const cacheKey = `${this.CACHE_PREFIX}${paymentId}`;
            await redis.del(cacheKey);
        } catch (error) {
            logger.warn('Failed to invalidate payment cache:', error);
        }
    }

    /**
     * Cache payment analytics
     */
    static async cacheAnalytics(
        merchantId: string, 
        analytics: any, 
        ttl: number = 300
    ): Promise<void> {
        try {
            const cacheKey = `analytics:merchant:${merchantId}`;
            await redis.set(cacheKey, JSON.stringify(analytics), ttl);
        } catch (error) {
            logger.warn('Failed to cache analytics:', error);
        }
    }

    /**
     * Get cached analytics
     */
    static async getCachedAnalytics(merchantId: string): Promise<any | null> {
        try {
            const cacheKey = `analytics:merchant:${merchantId}`;
            const cached = await redis.get(cacheKey);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            logger.warn('Failed to get cached analytics:', error);
            return null;
        }
    }

    /**
     * Cache user payment history
     */
    static async cacheUserHistory(
        userId: string, 
        history: any, 
        ttl: number = 600
    ): Promise<void> {
        try {
            const cacheKey = `history:user:${userId}`;
            await redis.set(cacheKey, JSON.stringify(history), ttl);
        } catch (error) {
            logger.warn('Failed to cache user history:', error);
        }
    }

    /**
     * Get cached user history
     */
    static async getCachedUserHistory(userId: string): Promise<any | null> {
        try {
            const cacheKey = `history:user:${userId}`;
            const cached = await redis.get(cacheKey);
            return cached ? JSON.parse(cached) : null;
        } catch (error) {
            logger.warn('Failed to get cached user history:', error);
            return null;
        }
    }

    /**
     * Batch invalidate caches for a user
     */
    static async invalidateUserCaches(userId: string): Promise<void> {
        try {
            // Since we don't have a keys method, we'll invalidate known cache patterns
            const cacheKeys = [
                `history:user:${userId}`,
                `analytics:user:${userId}`,
                `metrics:user:${userId}`
            ];
            
            for (const key of cacheKeys) {
                await redis.del(key);
            }
        } catch (error) {
            logger.warn('Failed to invalidate user caches:', error);
        }
    }

    /**
     * Batch invalidate caches for a merchant
     */
    static async invalidateMerchantCaches(merchantId: string): Promise<void> {
        try {
            // Since we don't have a keys method, we'll invalidate known cache patterns
            const cacheKeys = [
                `analytics:merchant:${merchantId}`,
                `payments:merchant:${merchantId}`,
                `metrics:merchant:${merchantId}`
            ];
            
            for (const key of cacheKeys) {
                await redis.del(key);
            }
        } catch (error) {
            logger.warn('Failed to invalidate merchant caches:', error);
        }
    }
}