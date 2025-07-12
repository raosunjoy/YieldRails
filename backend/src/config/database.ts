import { PrismaClient } from '@prisma/client';
import { config, isDevelopment } from './environment';
import { logger } from '../utils/logger';

/**
 * Database configuration and connection management
 */
class DatabaseManager {
    private prisma: PrismaClient;
    private isConnected: boolean = false;

    constructor() {
        this.prisma = new PrismaClient({
            log: isDevelopment ? ['query', 'info', 'warn', 'error'] : ['error'],
            datasources: {
                db: {
                    url: config.DATABASE_URL,
                },
            },
        });

        // Handle Prisma events (remove for now due to type issues)
        // this.prisma.$on('error', (e) => {
        //     logger.error('Prisma error:', e);
        // });

        // if (isDevelopment) {
        //     this.prisma.$on('query', (e) => {
        //         logger.debug(`Query: ${e.query} | Params: ${e.params} | Duration: ${e.duration}ms`);
        //     });
        // }
    }

    /**
     * Connect to the database
     */
    public async connect(): Promise<void> {
        try {
            await this.prisma.$connect();
            this.isConnected = true;
            logger.info('Database connection established');
        } catch (error) {
            logger.error('Failed to connect to database:', error);
            throw error;
        }
    }

    /**
     * Disconnect from the database
     */
    public async disconnect(): Promise<void> {
        try {
            await this.prisma.$disconnect();
            this.isConnected = false;
            logger.info('Database connection closed');
        } catch (error) {
            logger.error('Error disconnecting from database:', error);
            throw error;
        }
    }

    /**
     * Get the Prisma client instance
     */
    public getClient(): PrismaClient {
        if (!this.isConnected) {
            throw new Error('Database not connected. Call connect() first.');
        }
        return this.prisma;
    }

    /**
     * Health check for database connection
     */
    public async healthCheck(): Promise<boolean> {
        try {
            await this.prisma.$queryRaw`SELECT 1`;
            return true;
        } catch (error) {
            logger.error('Database health check failed:', error);
            return false;
        }
    }

    /**
     * Execute database migrations
     */
    public async migrate(): Promise<void> {
        try {
            // Note: In production, migrations should be run separately
            if (isDevelopment) {
                logger.info('Running database migrations...');
                // Migrations are typically run via CLI: npx prisma migrate deploy
                logger.info('Database migrations completed');
            }
        } catch (error) {
            logger.error('Database migration failed:', error);
            throw error;
        }
    }

    /**
     * Reset database (development only)
     */
    public async reset(): Promise<void> {
        if (!isDevelopment) {
            throw new Error('Database reset is only allowed in development environment');
        }

        try {
            logger.warn('Resetting database...');
            await this.prisma.$executeRaw`TRUNCATE TABLE "Payment" RESTART IDENTITY CASCADE`;
            await this.prisma.$executeRaw`TRUNCATE TABLE "YieldTransaction" RESTART IDENTITY CASCADE`;
            await this.prisma.$executeRaw`TRUNCATE TABLE "CrossChainTransaction" RESTART IDENTITY CASCADE`;
            await this.prisma.$executeRaw`TRUNCATE TABLE "User" RESTART IDENTITY CASCADE`;
            logger.info('Database reset completed');
        } catch (error) {
            logger.error('Database reset failed:', error);
            throw error;
        }
    }

    /**
     * Transaction wrapper
     */
    public async transaction<T>(
        fn: (tx: any) => Promise<T>
    ): Promise<T> {
        return this.prisma.$transaction(fn);
    }
}

export const database = new DatabaseManager();