import { PrismaClient } from '@prisma/client';
declare class DatabaseManager {
    private prisma;
    private isConnected;
    constructor();
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    getClient(): PrismaClient;
    healthCheck(): Promise<boolean>;
    migrate(): Promise<void>;
    reset(): Promise<void>;
    transaction<T>(fn: (tx: any) => Promise<T>): Promise<T>;
}
export declare const database: DatabaseManager;
export {};
//# sourceMappingURL=database.d.ts.map