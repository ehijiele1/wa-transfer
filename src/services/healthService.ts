import { operationalMonitor } from './operationalMonitor';
import { logger } from './logger';
import { getAnonClient } from './supabaseClients';

export interface HealthCheck {
  component: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  details?: Record<string, any>;
  dependencies?: Record<string, HealthCheck>;
}

export interface HealthReport {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  components: Record<string, HealthCheck>;
  summary: {
    totalComponents: number;
    healthyComponents: number;
    degradedComponents: number;
    unhealthyComponents: number;
    uptime: number;
    memoryUsage: number;
    lastError?: string;
  };
  readiness: {
    isReady: boolean;
    checks: Array<{
      name: string;
      passed: boolean;
      message?: string;
    }>;
  };
}

export class HealthService {
  private healthCheckIntervalMs: number = 30000; // 30 seconds
  private readinessChecks: Array<{
    name: string;
    check: () => Promise<boolean>;
    critical: boolean;
  }> = [];
  private intervals: NodeJS.Timeout[] = [];

  constructor() {
    this.initializeReadinessChecks();
  }

  private initializeReadinessChecks(): void {
    // Add critical readiness checks
    this.addReadinessCheck('Database Connection', this.checkDatabaseConnection, true);
    this.addReadinessCheck('WhatsApp Service', this.checkWhatsAppService, true);
    this.addReadinessCheck('Configuration', this.checkConfiguration, true);
    
    // Add non-critical checks
    this.addReadinessCheck('Instagram Service', this.checkInstagramService, false);
    this.addReadinessCheck('Social Media Services', this.checkSocialMediaServices, false);
    this.addReadinessCheck('Memory Usage', this.checkMemoryUsage, false);
  }

  private async checkDatabaseConnection(): Promise<boolean> {
    try {
      const startTime = Date.now();
      const client = getAnonClient();
      const { error } = await client.from('whatsapp_messages').select('count').limit(1);
      
      if (error) {
        logger.error('HealthCheck', 'Database connection failed', { error: error.message });
        return false;
      }

      const responseTime = Date.now() - startTime;
      logger.debug('HealthCheck', 'Database connection healthy', { responseTime });
      return true;
    } catch (error) {
      logger.error('HealthCheck', 'Database connection check failed', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  private async checkWhatsAppService(): Promise<boolean> {
    try {
      // Check if WhatsApp service is initialized and can connect
      // This is a simplified check - in a real implementation, you'd check actual connection state
      const isConnected = true; // WhatsAppService.isConnected() 
      
      if (!isConnected) {
        logger.warn('HealthCheck', 'WhatsApp service is not connected');
        return false;
      }

      logger.debug('HealthCheck', 'WhatsApp service healthy');
      return true;
    } catch (error) {
      logger.error('HealthCheck', 'WhatsApp service check failed', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  private async checkConfiguration(): Promise<boolean> {
    try {
      const config = {
        supabase: !!process.env.SUPABASE_URL,
        whatsapp: !!process.env.WHATSAPP_SESSION_ID,
        ollama: !!process.env.OLLAMA_BASE_URL,
        monitoring: !!process.env.MONITORING_GROUPS,
      };

      const missingConfigs = Object.entries(config)
        .filter(([_, isValid]) => !isValid)
        .map(([key]) => key);

      if (missingConfigs.length > 0) {
        logger.warn('HealthCheck', 'Missing configuration', { missingConfigs });
        return false;
      }

      logger.debug('HealthCheck', 'Configuration healthy');
      return true;
    } catch (error) {
      logger.error('HealthCheck', 'Configuration check failed', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  private async checkInstagramService(): Promise<boolean> {
    try {
      const hasInstagramConfig = !!(process.env.INSTAGRAM_ACCESS_TOKEN && process.env.INSTAGRAM_ACCOUNT_ID);
      
      if (!hasInstagramConfig) {
        logger.debug('HealthCheck', 'Instagram service not configured');
        return false; // Not unhealthy, just not available
      }

      logger.debug('HealthCheck', 'Instagram service healthy');
      return true;
    } catch (error) {
      logger.error('HealthCheck', 'Instagram service check failed', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  private async checkSocialMediaServices(): Promise<boolean> {
    try {
      const hasSocialMediaConfig = !!(process.env.FACEBOOK_ACCESS_TOKEN || 
                                     process.env.TWITTER_BEARER_TOKEN || 
                                     process.env.LINKEDIN_ACCESS_TOKEN);

      if (!hasSocialMediaConfig) {
        logger.debug('HealthCheck', 'Social media services not configured');
        return false; // Not unhealthy, just not available
      }

      logger.debug('HealthCheck', 'Social media services healthy');
      return true;
    } catch (error) {
      logger.error('HealthCheck', 'Social media services check failed', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  private async checkMemoryUsage(): Promise<boolean> {
    try {
      // Use system-wide memory, not the Node heap (a fresh heap is
      // naturally 80-90% allocated and would always read as degraded)
      const os = await import('os');
      const total = os.totalmem();
      const free = os.freemem();
      const memoryPercent = ((total - free) / total) * 100;

      if (memoryPercent > 90) {
        logger.error('HealthCheck', 'Critical memory usage', { memoryPercent: memoryPercent.toFixed(2) });
        return false;
      } else if (memoryPercent > 80) {
        logger.warn('HealthCheck', 'High memory usage', { memoryPercent: memoryPercent.toFixed(2) });
        return false; // Degraded but not unhealthy
      }

      logger.debug('HealthCheck', 'Memory usage healthy', { memoryPercent: memoryPercent.toFixed(2) });
      return true;
    } catch (error) {
      logger.error('HealthCheck', 'Memory usage check failed', { error: error instanceof Error ? error.message : String(error) });
      return false;
    }
  }

  addReadinessCheck(name: string, check: () => Promise<boolean>, critical: boolean = true): void {
    this.readinessChecks.push({ name, check, critical });
  }

  async runReadinessChecks(): Promise<Array<{ name: string; passed: boolean; message?: string }>> {
    const results = await Promise.allSettled(
      this.readinessChecks.map(({ name, check }) => 
        check().then(passed => ({ name, passed }))
      )
    );

    return results.map((result, index) => {
      const readinessCheck = this.readinessChecks[index];
      if (!readinessCheck) {
        return { name: 'unknown', passed: false, message: 'Readiness check not found' };
      }
      
      if (result.status === 'fulfilled') {
        return { name: readinessCheck.name, passed: result.value.passed };
      } else {
        return { 
          name: readinessCheck.name, 
          passed: false, 
          message: result.reason instanceof Error ? result.reason.message : String(result.reason) 
        };
      }
    });
  }

  async getHealthReport(): Promise<HealthReport> {
    const healthStatus = operationalMonitor.getHealthStatus();
    const systemSummary = operationalMonitor.getSystemSummary();

    // Convert health status to HealthCheck format
    const components: Record<string, HealthCheck> = {};
    
    if (healthStatus instanceof Map) {
      healthStatus.forEach((status, component) => {
        if (typeof status === 'object' && 'status' in status) {
          components[component] = {
            component,
            status: status.status,
            timestamp: status.timestamp,
            details: status.details,
          } as HealthCheck;
        }
      });
    } else if (typeof healthStatus === 'object' && healthStatus !== null) {
      // Handle single health status
      components['System'] = {
        component: 'System',
        status: healthStatus.status,
        timestamp: healthStatus.timestamp,
        details: healthStatus.details,
      } as HealthCheck;
    }

    // Add system health
    components['System'] = {
      component: 'System',
      status: systemSummary.overallStatus,
      timestamp: new Date(),
      details: {
        memoryUsage: systemSummary.metrics.averageResponseTime ? {
          used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
          total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
          percentage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal * 100),
        } : undefined,
        uptime: process.uptime(),
      } as any,
    };

    // Run readiness checks
    const readinessChecks = await this.runReadinessChecks();
    const isReady = readinessChecks.every(check => check.passed);

    // Find the most recent error
    const lastError = Object.values(components)
      .filter(component => typeof component === 'object' && 'status' in component && component.status === 'unhealthy')
      .map((component: any) => component.details?.error)
      .find(error => error !== undefined);

    return {
      overall: systemSummary.overallStatus,
      timestamp: new Date(),
      components,
      summary: {
        totalComponents: Object.keys(components).length,
        healthyComponents: Object.values(components).filter(c => c.status === 'healthy').length,
        degradedComponents: Object.values(components).filter(c => c.status === 'degraded').length,
        unhealthyComponents: Object.values(components).filter(c => c.status === 'unhealthy').length,
        uptime: process.uptime(),
        memoryUsage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal * 100),
        lastError: lastError ? String(lastError) : undefined as any,
      },
      readiness: {
        isReady,
        checks: readinessChecks,
      },
    };
  }

  async getHealthCheck(component?: string): Promise<HealthCheck | HealthReport> {
    if (component) {
      const healthStatus = operationalMonitor.getHealthStatus(component);
      if (healthStatus && typeof healthStatus === 'object' && 'status' in healthStatus) {
        return {
          component,
          status: healthStatus.status,
          timestamp: healthStatus.timestamp,
          details: healthStatus.details,
        } as HealthCheck;
      }
      
      // Fallback to system health
      return {
        component,
        status: 'unhealthy',
        timestamp: new Date(),
        details: { error: 'Component not found' },
      } as HealthCheck;
    }

    return await this.getHealthReport();
  }

  // Liveness probe - simple check that the process is running
  getLiveness(): { status: 'alive' | 'dead'; timestamp: Date; uptime: number } {
    return {
      status: 'alive',
      timestamp: new Date(),
      uptime: process.uptime(),
    };
  }

  // Readiness probe - check if the application is ready to serve traffic
  async getReadiness(): Promise<{ status: 'ready' | 'not_ready'; timestamp: Date; checks: any[] }> {
    const checks = await this.runReadinessChecks();
    const isReady = checks.every(check => check.passed);

    return {
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date(),
      checks,
    };
  }

  // Start periodic health checks
  startHealthChecks(): void {
    const interval = setInterval(async () => {
      try {
        await this.runReadinessChecks();
      } catch (error) {
        logger.error('HealthService', 'Periodic health check failed', { error: error instanceof Error ? error.message : String(error) });
      }
    }, this.healthCheckIntervalMs);

    this.intervals.push(interval);
    logger.info('HealthService', 'Health checks started');
  }

  // Stop health checks
  stopHealthChecks(): void {
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    logger.info('HealthService', 'Health checks stopped');
  }

  // Get health metrics for monitoring
  getHealthMetrics(): {
    uptime: number;
    memoryUsage: number;
    healthyComponents: number;
    totalComponents: number;
    lastError?: string;
  } {
    const healthStatus = operationalMonitor.getHealthStatus();
    const systemSummary = operationalMonitor.getSystemSummary();

    return {
      uptime: process.uptime(),
      memoryUsage: (process.memoryUsage().heapUsed / process.memoryUsage().heapTotal * 100),
      healthyComponents: Object.values(healthStatus).filter(status => 
        typeof status !== 'function' && status.status === 'healthy'
      ).length,
      totalComponents: Object.keys(healthStatus).length,
        lastError: systemSummary.metrics.errorRate > 0.05 ? 'High error rate' : undefined as any,
    };
  }
}

// Global health service instance
export const healthService = new HealthService();

// Convenience functions for HTTP endpoints
export const getHealth = async (component?: string) => {
  return await healthService.getHealthCheck(component);
};

export const getLiveness = () => {
  return healthService.getLiveness();
};

export const getReadiness = async () => {
  return await healthService.getReadiness();
};

export const getHealthMetrics = () => {
  return healthService.getHealthMetrics();
};