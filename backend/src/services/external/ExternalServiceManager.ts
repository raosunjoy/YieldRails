import { Logger } from 'pino';
import { logger } from '../../config/logger';
import { CircleCCTPService } from './CircleCCTPService';
import { NobleProtocolService } from './NobleProtocolService';
import { ResolvProtocolService } from './ResolvProtocolService';
import { AaveProtocolService } from './AaveProtocolService';

export interface ServiceHealth {
  status: 'healthy' | 'unhealthy';
  latency?: number;
  error?: string;
  lastChecked: string;
}

export interface ExternalServiceStatus {
  circleCCTP: ServiceHealth;
  noble: ServiceHealth;
  resolv: ServiceHealth;
  aave: ServiceHealth;
}

export interface FailoverConfiguration {
  maxRetries: number;
  retryDelay: number;
  healthCheckInterval: number;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
}

/**
 * Manages external service integrations with health monitoring and failover capabilities
 */
export class ExternalServiceManager {
  private readonly logger: Logger;
  private readonly services: {
    circleCCTP: CircleCCTPService;
    noble: NobleProtocolService;
    resolv: ResolvProtocolService;
    aave: AaveProtocolService;
  };
  
  private healthStatus: ExternalServiceStatus;
  private circuitBreakers: Map<string, { 
    isOpen: boolean; 
    failures: number; 
    lastFailure: number; 
  }>;
  
  private readonly config: FailoverConfiguration;
  private healthCheckTimer?: NodeJS.Timeout;

  constructor(config?: Partial<FailoverConfiguration>) {
    this.logger = logger.child({ service: 'ExternalServiceManager' });
    
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      healthCheckInterval: 30000, // 30 seconds
      circuitBreakerThreshold: 5,
      circuitBreakerTimeout: 60000, // 1 minute
      ...config,
    };

    this.services = {
      circleCCTP: new CircleCCTPService(),
      noble: new NobleProtocolService(),
      resolv: new ResolvProtocolService(),
      aave: new AaveProtocolService(),
    };

    this.circuitBreakers = new Map();
    this.healthStatus = {
      circleCCTP: { status: 'unhealthy', lastChecked: new Date().toISOString() },
      noble: { status: 'unhealthy', lastChecked: new Date().toISOString() },
      resolv: { status: 'unhealthy', lastChecked: new Date().toISOString() },
      aave: { status: 'unhealthy', lastChecked: new Date().toISOString() },
    };

    this.initializeCircuitBreakers();
    this.startHealthMonitoring();
  }

  private initializeCircuitBreakers(): void {
    const serviceNames = ['circleCCTP', 'noble', 'resolv', 'aave'];
    
    for (const serviceName of serviceNames) {
      this.circuitBreakers.set(serviceName, {
        isOpen: false,
        failures: 0,
        lastFailure: 0,
      });
    }
  }

  private startHealthMonitoring(): void {
    this.logger.info('Starting external service health monitoring');
    
    // Initial health check
    this.performHealthCheck();
    
    // Set up periodic health checks
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  private async performHealthCheck(): Promise<void> {
    try {
      const healthChecks = await Promise.allSettled([
        this.checkServiceHealth('circleCCTP', () => this.services.circleCCTP.healthCheck()),
        this.checkServiceHealth('noble', () => this.services.noble.healthCheck()),
        this.checkServiceHealth('resolv', () => this.services.resolv.healthCheck()),
        this.checkServiceHealth('aave', () => this.services.aave.healthCheck()),
      ]);

      const [circleResult, nobleResult, resolvResult, aaveResult] = healthChecks;

      this.healthStatus = {
        circleCCTP: this.processHealthResult('circleCCTP', circleResult),
        noble: this.processHealthResult('noble', nobleResult),
        resolv: this.processHealthResult('resolv', resolvResult),
        aave: this.processHealthResult('aave', aaveResult),
      };

      this.logger.debug('Health check completed', {
        status: this.healthStatus,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      this.logger.error('Health check failed', { error });
    }
  }

  private async checkServiceHealth(
    serviceName: string, 
    healthCheckFn: () => Promise<{ status: 'healthy' | 'unhealthy'; latency?: number; error?: string }>
  ): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      const result = await healthCheckFn();
      
      if (result.status === 'healthy') {
        this.resetCircuitBreaker(serviceName);
      }
      
      return {
        status: result.status,
        latency: result.latency || Date.now() - startTime,
        error: result.error,
        lastChecked: new Date().toISOString(),
      };
    } catch (error) {
      this.recordServiceFailure(serviceName);
      
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date().toISOString(),
      };
    }
  }

  private processHealthResult(
    serviceName: string, 
    result: PromiseSettledResult<ServiceHealth>
  ): ServiceHealth {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      this.recordServiceFailure(serviceName);
      return {
        status: 'unhealthy',
        error: result.reason?.message || 'Health check failed',
        lastChecked: new Date().toISOString(),
      };
    }
  }

  private recordServiceFailure(serviceName: string): void {
    const breaker = this.circuitBreakers.get(serviceName);
    if (!breaker) return;

    breaker.failures++;
    breaker.lastFailure = Date.now();

    if (breaker.failures >= this.config.circuitBreakerThreshold) {
      breaker.isOpen = true;
      this.logger.warn(`Circuit breaker opened for service: ${serviceName}`, {
        failures: breaker.failures,
        threshold: this.config.circuitBreakerThreshold,
      });
    }
  }

  private resetCircuitBreaker(serviceName: string): void {
    const breaker = this.circuitBreakers.get(serviceName);
    if (!breaker) return;

    if (breaker.failures > 0 || breaker.isOpen) {
      this.logger.info(`Circuit breaker reset for service: ${serviceName}`);
    }

    breaker.failures = 0;
    breaker.isOpen = false;
    breaker.lastFailure = 0;
  }

  private isCircuitBreakerOpen(serviceName: string): boolean {
    const breaker = this.circuitBreakers.get(serviceName);
    if (!breaker || !breaker.isOpen) return false;

    // Check if circuit breaker timeout has elapsed
    const timeoutElapsed = Date.now() - breaker.lastFailure > this.config.circuitBreakerTimeout;
    
    if (timeoutElapsed) {
      this.logger.info(`Circuit breaker timeout elapsed for service: ${serviceName}, attempting half-open state`);
      breaker.isOpen = false;
      return false;
    }

    return true;
  }

  /**
   * Execute a service operation with retry and circuit breaker logic
   */
  async executeWithFailover<T>(
    serviceName: keyof typeof this.services,
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    if (this.isCircuitBreakerOpen(serviceName)) {
      this.logger.warn(`Circuit breaker is open for service: ${serviceName}, attempting fallback`);
      
      if (fallback) {
        return await fallback();
      }
      
      throw new Error(`Service ${serviceName} is currently unavailable (circuit breaker open)`);
    }

    let lastError: Error | undefined;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const result = await operation();
        
        if (attempt > 1) {
          this.logger.info(`Service operation succeeded on attempt ${attempt}`, { serviceName });
          this.resetCircuitBreaker(serviceName);
        }
        
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        this.logger.warn(`Service operation failed on attempt ${attempt}`, {
          serviceName,
          attempt,
          maxRetries: this.config.maxRetries,
          error: lastError.message,
        });
        
        if (attempt === this.config.maxRetries) {
          this.recordServiceFailure(serviceName);
          break;
        }
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * attempt));
      }
    }

    // All retries failed, try fallback
    if (fallback) {
      this.logger.info(`All retries failed for service: ${serviceName}, attempting fallback`);
      return await fallback();
    }

    throw lastError || new Error(`Service ${serviceName} operation failed after ${this.config.maxRetries} attempts`);
  }

  /**
   * Get current health status of all external services
   */
  getHealthStatus(): ExternalServiceStatus {
    return { ...this.healthStatus };
  }

  /**
   * Get circuit breaker status for all services
   */
  getCircuitBreakerStatus(): Record<string, { isOpen: boolean; failures: number }> {
    const status: Record<string, { isOpen: boolean; failures: number }> = {};
    
    for (const [serviceName, breaker] of this.circuitBreakers.entries()) {
      status[serviceName] = {
        isOpen: breaker.isOpen,
        failures: breaker.failures,
      };
    }
    
    return status;
  }

  /**
   * Force a health check for all services
   */
  async forceHealthCheck(): Promise<ExternalServiceStatus> {
    await this.performHealthCheck();
    return this.getHealthStatus();
  }

  /**
   * Get service instances for direct access
   */
  getServices() {
    return { ...this.services };
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
    
    this.logger.info('External service health monitoring stopped');
  }

  /**
   * Reset circuit breaker for a specific service
   */
  resetServiceCircuitBreaker(serviceName: string): void {
    this.resetCircuitBreaker(serviceName);
  }

  /**
   * Get configuration
   */
  getConfiguration(): FailoverConfiguration {
    return { ...this.config };
  }
}

// Export singleton instance
export const externalServiceManager = new ExternalServiceManager();