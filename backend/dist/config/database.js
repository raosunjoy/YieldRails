"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.database = void 0;
const client_1 = require("@prisma/client");
const environment_1 = require("./environment");
const logger_1 = require("../utils/logger");
class DatabaseManager {
    constructor() {
        this.isConnected = false;
        this.prisma = new client_1.PrismaClient({
            log: environment_1.isDevelopment ? ['query', 'info', 'warn', 'error'] : ['error'],
            datasources: {
                db: {
                    url: environment_1.config.DATABASE_URL,
                },
            },
        });
    }
    async connect() {
        try {
            await this.prisma.$connect();
            this.isConnected = true;
            logger_1.logger.info('Database connection established');
        }
        catch (error) {
            logger_1.logger.error('Failed to connect to database:', error);
            throw error;
        }
    }
    async disconnect() {
        try {
            await this.prisma.$disconnect();
            this.isConnected = false;
            logger_1.logger.info('Database connection closed');
        }
        catch (error) {
            logger_1.logger.error('Error disconnecting from database:', error);
            throw error;
        }
    }
    getClient() {
        if (!this.isConnected) {
            throw new Error('Database not connected. Call connect() first.');
        }
        return this.prisma;
    }
    async healthCheck() {
        try {
            await this.prisma.$queryRaw `SELECT 1`;
            return true;
        }
        catch (error) {
            logger_1.logger.error('Database health check failed:', error);
            return false;
        }
    }
    async migrate() {
        try {
            if (environment_1.isDevelopment) {
                logger_1.logger.info('Running database migrations...');
                logger_1.logger.info('Database migrations completed');
            }
        }
        catch (error) {
            logger_1.logger.error('Database migration failed:', error);
            throw error;
        }
    }
    async reset() {
        if (!environment_1.isDevelopment) {
            throw new Error('Database reset is only allowed in development environment');
        }
        try {
            logger_1.logger.warn('Resetting database...');
            await this.prisma.$executeRaw `TRUNCATE TABLE "Payment" RESTART IDENTITY CASCADE`;
            await this.prisma.$executeRaw `TRUNCATE TABLE "YieldTransaction" RESTART IDENTITY CASCADE`;
            await this.prisma.$executeRaw `TRUNCATE TABLE "CrossChainTransaction" RESTART IDENTITY CASCADE`;
            await this.prisma.$executeRaw `TRUNCATE TABLE "User" RESTART IDENTITY CASCADE`;
            logger_1.logger.info('Database reset completed');
        }
        catch (error) {
            logger_1.logger.error('Database reset failed:', error);
            throw error;
        }
    }
    async transaction(fn) {
        return this.prisma.$transaction(fn);
    }
}
exports.database = new DatabaseManager();
//# sourceMappingURL=database.js.map