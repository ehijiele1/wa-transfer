import { logger, LogEntry } from './logger';
import SupabaseService from './supabase';
import WhatsAppService from './whatsapp';
import { getAnonClient } from './supabaseClients';

export interface HealthStatus {
  component: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  details?: Record<string, any>;
  lastChecked: Date;
}

export interface MetricData {
  component: string;
  metric: string;
  value: number;
  timestamp: Date;
  tags?: Record<string, string>;
}

export interface OperationalConfig {
  healthCheckIntervalMs: number;
  metricsRetentionHours: number;
  enableAlerting: boolean;
  alertThresholds: {
    errorRate: number;
    responseTimeMs: number;
    memoryUsagePercent: number;
  };
}

export class OperationalMonitor {
  private supabaseService: SupabaseService;
  private config: OperationalConfig;
  private healthStatus: Map<string, HealthStatus> = new Map();
  private metrics: MetricData[] = [];
  private intervals: NodeJS.Timeout[] = [];
  private errorCounts: Map<string, number> = new Map();
  private responseTimes: Map<string, number[]> = new Map();

  constructor(config: Partial<OperationalConfig> = {}) {
    this.supabaseService = new SupabaseService();
    this.config = {
      healthCheckIntervalMs: 30000, // 30 seconds
      metricsRetentionHours: 24,
      enableAlerting: true,
      alertThresholds: {
        errorRate: 0.05, // 5%
        responseTimeMs: 5000,
        memoryUsagePercent: 80,
      },
      ...config
    };

    this.startHealthChecks();
    this.startMetricsCleanup();
  }

  private startHealthChecks(): void {
    const interval = setInterval(async () => {
      await this.runHealthChecks();
    }, this.config.healthCheckIntervalMs);

    this.intervals.push(interval);
  }

  private startMetricsCleanup(): void {
    const interval = setInterval(() => {
      this.cleanupOldMetrics();
    }, 60 * 60 * 1000); // Run every hour

    this.intervals.push(interval);
  }

  private async runHealthChecks(): Promise<void> {
    const checks = [
      this.checkSupabaseHealth(),
      this.checkWhatsAppHealth(),
      this.checkSystemHealth(),
    ];

    const results = await Promise.allSettled(checks);

    results.forEach((result, index) => {
      const components = ['Supabase', 'WhatsApp', 'System'];
      const component = components[index]!; // Non-null assertion since we know the length matches

      if (result.status === 'fulfilled') {
        const health = result.value;
        this.updateHealthStatus(component, health);
      } else {
        logger.error('HealthCheck', `Failed to check ${component} health`, { error: result.reason instanceof Error ? result.reason.message : String(result.reason) });
        this.updateHealthStatus(component, {
          component,
          status: 'unhealthy',
          timestamp: new Date(),
          details: { error: result.reason instanceof Error ? result.reason.message : String(result.reason) },
          lastChecked: new Date(),
        });
      }
    });

    this.checkSystemAlerts();
  }

  private async checkSupabaseHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      const client = getAnonClient();
      const { data, error } = await client.from('whatsapp_messages').select('count').limit(1);

      if (error) {
        throw error;
      }

      const responseTime = Date.now() - startTime;
      this.recordResponseTime('Supabase', responseTime);

      return {
        component: 'Supabase',
        status: 'healthy',
        timestamp: new Date(),
        details: {
          responseTime,
          lastQuery: 'SELECT count FROM whatsapp_messages LIMIT 1',
          connection: 'active',
        },
        lastChecked: new Date(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.recordError('Supabase');
      
      return {
        component: 'Supabase',
        status: 'unhealthy',
        timestamp: new Date(),
        details: {
          responseTime,
          error: error instanceof Error ? error.message : String(error),
          connection: 'failed',
        },
        lastChecked: new Date(),
      };
    }
  }

  private async checkWhatsAppHealth(): Promise<HealthStatus> {
    const startTime = Date.now();
    
    try {
      // Check if WhatsApp service is connected
      // For now, we'll assume it's healthy if we can reach this point
      // In a real implementation, you would check the actual connection state
      const isConnected = true; // WhatsAppService.isConnected() 
      
      const responseTime = Date.now() - startTime;
      this.recordResponseTime('WhatsApp', responseTime);

      return {
        component: 'WhatsApp',
        status: isConnected ? 'healthy' : 'degraded',
        timestamp: new Date(),
        details: {
          responseTime,
          connected: isConnected,
          lastCheck: new Date().toISOString(),
        },
        lastChecked: new Date(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.recordError('WhatsApp');
      
      return {
        component: 'WhatsApp',
        status: 'unhealthy',
        timestamp: new Date(),
        details: {
          responseTime,
          error: error instanceof Error ? error.message : String(error),
          connected: false,
        },
        lastChecked: new Date(),
      };
    }
  }

  private checkSystemHealth(): HealthStatus {
    const startTime = Date.now();
    
    try {
      const memoryUsage = process.memoryUsage();
      const memoryPercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      const uptime = process.uptime();
      
      const responseTime = Date.now() - startTime;
      this.recordResponseTime('System', responseTime);

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      
      if (memoryPercent > this.config.alertThresholds.memoryUsagePercent) {
        status = 'degraded';
        logger.warn('System', `High memory usage: ${memoryPercent.toFixed(2)}%`);
      }

      return {
        component: 'System',
        status,
        timestamp: new Date(),
        details: {
          responseTime,
          memoryUsage: {
            used: Math.round(memoryUsage.heapUsed / 1024 / 1024), // MB
            total: Math.round(memoryUsage.heapTotal / 1024 / 1024), // MB
            percentage: memoryPercent.toFixed(2),
          },
          uptime: Math.round(uptime),
          nodeVersion: process.version,
        },
        lastChecked: new Date(),
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      return {
        component: 'System',
        status: 'unhealthy',
        timestamp: new Date(),
        details: {
          responseTime,
          error: error instanceof Error ? error.message : String(error),
        },
        lastChecked: new Date(),
      };
    }
  }

  private updateHealthStatus(component: string, health: HealthStatus): void {
    this.healthStatus.set(component, health);
    
    logger.monitorHealth(component, health.status, {
      details: health.details,
      responseTime: health.details?.responseTime,
    });

    // Record health metrics
    this.recordMetric({
      component,
      metric: 'health_status',
      value: health.status === 'healthy' ? 1 : health.status === 'degraded' ? 0.5 : 0,
      timestamp: health.timestamp,
      tags: { status: health.status },
    });
  }

  private checkSystemAlerts(): void {
    if (!this.config.enableAlerting) return;

    this.healthStatus.forEach((health, component) => {
      if (health.status === 'unhealthy') {
        this.triggerAlert(component, 'CRITICAL', `${component} is unhealthy`, health.details);
      } else if (health.status === 'degraded') {
        this.triggerAlert(component, 'WARNING', `${component} is degraded`, health.details);
      }
    });

    // Check error rates
    this.errorCounts.forEach((count, component) => {
      const totalRequests = this.getResponseTimeCount(component);
      const errorRate = totalRequests > 0 ? count / totalRequests : 0;
      
      if (errorRate > this.config.alertThresholds.errorRate) {
        this.triggerAlert(component, 'ERROR', `High error rate: ${(errorRate * 100).toFixed(2)}%`, {
          errorRate,
          errorCount: count,
          totalRequests,
        });
      }
    });

    // Check response times
    this.responseTimes.forEach((times, component) => {
      if (times.length > 0) {
        const avgTime = times.reduce((sum, time) => sum + time, 0) / times.length;
        
        if (avgTime > this.config.alertThresholds.responseTimeMs) {
          this.triggerAlert(component, 'WARNING', `Slow response time: ${avgTime.toFixed(2)}ms`, {
            averageResponseTime: avgTime,
            sampleSize: times.length,
          });
        }
      }
    });
  }

  private triggerAlert(component: string, severity: 'CRITICAL' | 'ERROR' | 'WARNING', message: string, details?: Record<string, any>): void {
    logger.error('Alert', `${component} - ${severity}: ${message}`, {
      component,
      severity,
      message,
      details,
      timestamp: new Date().toISOString(),
    });

    // In a real implementation, you would integrate with your alerting system here
    // (e.g., send to PagerDuty, Slack, email, etc.)
  }

  private recordResponseTime(component: string, responseTime: number): void {
    if (!this.responseTimes.has(component)) {
      this.responseTimes.set(component, []);
    }
    
    const times = this.responseTimes.get(component)!;
    times.push(responseTime);
    
    // Keep only last 100 response times
    if (times.length > 100) {
      times.shift();
    }
  }

  private recordError(component: string): void {
    const current = this.errorCounts.get(component) || 0;
    this.errorCounts.set(component, current + 1);
  }

  private getResponseTimeCount(component: string): number {
    return this.responseTimes.get(component)?.length || 0;
  }

  private recordMetric(metric: MetricData): void {
    this.metrics.push(metric);
  }

  private cleanupOldMetrics(): void {
    const cutoffTime = new Date(Date.now() - this.config.metricsRetentionHours * 60 * 60 * 1000);
    
    this.metrics = this.metrics.filter(metric => metric.timestamp > cutoffTime);
    
    // Also clean up old error counts and response times
    this.errorCounts.forEach((count, component) => {
      if (this.getResponseTimeCount(component) === 0) {
        this.errorCounts.delete(component);
      }
    });
  }

  // Public API
  getHealthStatus(component?: string): HealthStatus | Map<string, HealthStatus> {
    if (component) {
      return this.healthStatus.get(component) || {
        component,
        status: 'unhealthy',
        timestamp: new Date(),
        details: { error: 'Component not found' },
        lastChecked: new Date(),
      };
    }
    return this.healthStatus;
  }

  getMetrics(component?: string, metric?: string, sinceHours?: number): MetricData[] {
    let filteredMetrics = [...this.metrics];

    if (component) {
      filteredMetrics = filteredMetrics.filter(m => m.component === component);
    }

    if (metric) {
      filteredMetrics = filteredMetrics.filter(m => m.metric === metric);
    }

    if (sinceHours) {
      const cutoffTime = new Date(Date.now() - sinceHours * 60 * 60 * 1000);
      filteredMetrics = filteredMetrics.filter(m => m.timestamp > cutoffTime);
    }

    return filteredMetrics;
  }

  getSystemSummary(): {
    overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    components: Record<string, HealthStatus>;
    metrics: {
      totalRequests: number;
      errorRate: number;
      averageResponseTime: number;
    };
  } {
    const components: Record<string, HealthStatus> = {};
    let healthyCount = 0;
    let degradedCount = 0;
    let unhealthyCount = 0;

    this.healthStatus.forEach((health, component) => {
      components[component] = health;
      
      switch (health.status) {
        case 'healthy':
          healthyCount++;
          break;
        case 'degraded':
          degradedCount++;
          break;
        case 'unhealthy':
          unhealthyCount++;
          break;
      }
    });

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (unhealthyCount > 0) {
      overallStatus = 'unhealthy';
    } else if (degradedCount > 0) {
      overallStatus = 'degraded';
    }

    // Calculate system metrics
    const totalRequests = this.metrics.filter(m => m.metric === 'request_count').length;
    const errorRequests = this.metrics.filter(m => m.metric === 'error_count').length;
    const errorRate = totalRequests > 0 ? errorRequests / totalRequests : 0;
    
    const responseTimes = this.metrics
      .filter(m => m.metric === 'response_time')
      .map(m => m.value);
    const averageResponseTime = responseTimes.length > 0 
      ? responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length 
      : 0;

    return {
      overallStatus,
      components,
      metrics: {
        totalRequests,
        errorRate,
        averageResponseTime,
      },
    };
  }

  recordRequest(component: string, responseTime: number, success: boolean = true): void {
    this.recordResponseTime(component, responseTime);
    
    if (!success) {
      this.recordError(component);
    }

    this.recordMetric({
      component,
      metric: 'request_count',
      value: 1,
      timestamp: new Date(),
    });

    if (!success) {
      this.recordMetric({
        component,
        metric: 'error_count',
        value: 1,
        timestamp: new Date(),
      });
    }

    this.recordMetric({
      component,
      metric: 'response_time',
      value: responseTime,
      timestamp: new Date(),
    });
  }

  // Public method to record metrics
  public recordMetricData(metric: MetricData): void {
    this.metrics.push(metric);
  }

  updateConfig(newConfig: Partial<OperationalConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('OperationalMonitor', 'Configuration updated', { newConfig });
  }

  shutdown(): void {
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
    logger.info('OperationalMonitor', 'Monitor shutdown completed');
  }
}

// Global operational monitor instance
export const operationalMonitor = new OperationalMonitor();