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
export declare class OperationalMonitor {
    private supabaseService;
    private config;
    private healthStatus;
    private metrics;
    private intervals;
    private errorCounts;
    private responseTimes;
    constructor(config?: Partial<OperationalConfig>);
    private startHealthChecks;
    private startMetricsCleanup;
    private runHealthChecks;
    private checkSupabaseHealth;
    private checkWhatsAppHealth;
    private checkSystemHealth;
    private updateHealthStatus;
    private checkSystemAlerts;
    private triggerAlert;
    private recordResponseTime;
    private recordError;
    private getResponseTimeCount;
    private recordMetric;
    private cleanupOldMetrics;
    getHealthStatus(component?: string): HealthStatus | Map<string, HealthStatus>;
    getMetrics(component?: string, metric?: string, sinceHours?: number): MetricData[];
    getSystemSummary(): {
        overallStatus: 'healthy' | 'degraded' | 'unhealthy';
        components: Record<string, HealthStatus>;
        metrics: {
            totalRequests: number;
            errorRate: number;
            averageResponseTime: number;
        };
    };
    recordRequest(component: string, responseTime: number, success?: boolean): void;
    recordMetricData(metric: MetricData): void;
    updateConfig(newConfig: Partial<OperationalConfig>): void;
    shutdown(): void;
}
export declare const operationalMonitor: OperationalMonitor;
//# sourceMappingURL=operationalMonitor.d.ts.map