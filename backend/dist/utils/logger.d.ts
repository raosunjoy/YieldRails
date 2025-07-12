import pino from 'pino';
export declare const logger: import("pino").Logger<never>;
export declare const createChildLogger: (context: Record<string, any>) => pino.Logger<never>;
export declare const requestLogger: (req: any, res: any, next: any) => void;
export declare const logError: (error: Error, context?: Record<string, any>) => void;
export declare const logPerformance: (operation: string, duration: number, metadata?: Record<string, any>) => void;
export declare const logBlockchainOperation: (operation: string, chainId: number, txHash?: string, gasUsed?: number, metadata?: Record<string, any>) => void;
export declare const logSecurityEvent: (event: string, severity: 'low' | 'medium' | 'high' | 'critical', details: Record<string, any>) => void;
export declare const logApiMetrics: (endpoint: string, method: string, statusCode: number, duration: number, userId?: string) => void;
export declare const logBusinessEvent: (event: string, userId?: string, metadata?: Record<string, any>) => void;
export default logger;
//# sourceMappingURL=logger.d.ts.map