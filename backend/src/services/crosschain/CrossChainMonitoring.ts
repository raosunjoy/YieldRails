import { logger } from '../../utils/logger';
import { CrossChainMetrics } from '../CrossChainService';

/**
 * Cross-chain monitoring and alerting service
 * Tracks performance metrics and system health
 */
export class CrossChainMonitoring {
    private metrics: CrossChainMetrics;
    private monitoringInterval: NodeJS.Timeout | null = null;
    private alertThresholds: AlertThresholds;

    constructor() {
        this.metrics = {
            totalTransactions: 0,
            successfulTransactions: 0,
            failedTransactions: 0,
            averageProcessingTime: 0,
            totalVolume: 0,
            liquidityUtilization: 0,
            lastUpdated: new Date()
        };

        this.alertThresholds = {
            maxFailureRate: 0.05, // 5%
            maxProcessingTime: 300000, // 5 minutes
            minLiquidityUtilization: 0.1, // 10%
            maxLiquidityUtilization: 0.9 // 90%
        };
    }

    /**
     * Get current monitoring metrics
     */
    public getMetrics(): CrossChainMetrics {
        return { ...this.metrics };
    }

    /**
     * Start monitoring services
     */
    public startMonitoring(): void {
        if (this.monitoringInterval) {
            return; // Already monitoring
        }

        this.monitoringInterval = setInterval(() => {
            this.updateMetrics();
            this.checkAlerts();
        }, 60000); // Update every minute

        logger.info('Cross-chain monitoring started');
    }

    /**
     * Stop monitoring services
     */
    public stopMonitoring(): void {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            logger.info('Cross-chain monitoring stopped');
        }
    }

    /**
     * Update monitoring metrics
     */
    private updateMetrics(): void {
        // In production, this would query actual data from database and other sources
        // For now, we'll simulate metric updates
        this.metrics.lastUpdated = new Date();
        
        logger.debug('Monitoring metrics updated', this.metrics);
    }

    /**
     * Record transaction metrics
     */
    public recordTransaction(success: boolean, processingTime: number, volume: number): void {
        this.metrics.totalTransactions++;
        
        if (success) {
            this.metrics.successfulTransactions++;
        } else {
            this.metrics.failedTransactions++;
        }

        // Update average processing time
        const totalTime = this.metrics.averageProcessingTime * (this.metrics.totalTransactions - 1) + processingTime;
        this.metrics.averageProcessingTime = totalTime / this.metrics.totalTransactions;

        this.metrics.totalVolume += volume;
        this.metrics.lastUpdated = new Date();

        logger.debug('Transaction metrics recorded', {
            success,
            processingTime,
            volume,
            totalTransactions: this.metrics.totalTransactions
        });
    }

    /**
     * Update liquidity utilization metrics
     */
    public updateLiquidityMetrics(utilizationRate: number): void {
        this.metrics.liquidityUtilization = utilizationRate;
        this.metrics.lastUpdated = new Date();

        logger.debug('Liquidity metrics updated', { utilizationRate });
    }

    /**
     * Check for alert conditions
     */
    private checkAlerts(): void {
        const failureRate = this.metrics.totalTransactions > 0 
            ? this.metrics.failedTransactions / this.metrics.totalTransactions 
            : 0;

        // Check failure rate alert
        if (failureRate > this.alertThresholds.maxFailureRate) {
            this.triggerAlert('HIGH_FAILURE_RATE', {
                currentRate: failureRate,
                threshold: this.alertThresholds.maxFailureRate,
                failedTransactions: this.metrics.failedTransactions,
                totalTransactions: this.metrics.totalTransactions
            });
        }

        // Check processing time alert
        if (this.metrics.averageProcessingTime > this.alertThresholds.maxProcessingTime) {
            this.triggerAlert('HIGH_PROCESSING_TIME', {
                currentTime: this.metrics.averageProcessingTime,
                threshold: this.alertThresholds.maxProcessingTime
            });
        }

        // Check liquidity utilization alerts
        if (this.metrics.liquidityUtilization < this.alertThresholds.minLiquidityUtilization) {
            this.triggerAlert('LOW_LIQUIDITY_UTILIZATION', {
                currentUtilization: this.metrics.liquidityUtilization,
                threshold: this.alertThresholds.minLiquidityUtilization
            });
        }

        if (this.metrics.liquidityUtilization > this.alertThresholds.maxLiquidityUtilization) {
            this.triggerAlert('HIGH_LIQUIDITY_UTILIZATION', {
                currentUtilization: this.metrics.liquidityUtilization,
                threshold: this.alertThresholds.maxLiquidityUtilization
            });
        }
    }

    /**
     * Trigger an alert
     */
    private triggerAlert(alertType: string, data: any): void {
        logger.warn('Cross-chain alert triggered', {
            alertType,
            data,
            timestamp: new Date()
        });

        // In production, this would send notifications via email, Slack, etc.
        // For now, we'll just log the alert
    }

    /**
     * Get system health status
     */
    public getHealthStatus(): HealthStatus {
        const failureRate = this.metrics.totalTransactions > 0 
            ? this.metrics.failedTransactions / this.metrics.totalTransactions 
            : 0;

        const isHealthy = 
            failureRate <= this.alertThresholds.maxFailureRate &&
            this.metrics.averageProcessingTime <= this.alertThresholds.maxProcessingTime &&
            this.metrics.liquidityUtilization >= this.alertThresholds.minLiquidityUtilization &&
            this.metrics.liquidityUtilization <= this.alertThresholds.maxLiquidityUtilization;

        return {
            status: isHealthy ? 'healthy' : 'degraded',
            failureRate,
            averageProcessingTime: this.metrics.averageProcessingTime,
            liquidityUtilization: this.metrics.liquidityUtilization,
            lastUpdated: this.metrics.lastUpdated
        };
    }

    /**
     * Reset metrics (useful for testing)
     */
    public resetMetrics(): void {
        this.metrics = {
            totalTransactions: 0,
            successfulTransactions: 0,
            failedTransactions: 0,
            averageProcessingTime: 0,
            totalVolume: 0,
            liquidityUtilization: 0,
            lastUpdated: new Date()
        };

        logger.info('Monitoring metrics reset');
    }
}

interface AlertThresholds {
    maxFailureRate: number;
    maxProcessingTime: number;
    minLiquidityUtilization: number;
    maxLiquidityUtilization: number;
}

interface HealthStatus {
    status: 'healthy' | 'degraded' | 'critical';
    failureRate: number;
    averageProcessingTime: number;
    liquidityUtilization: number;
    lastUpdated: Date;
}