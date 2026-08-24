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
export declare class HealthService {
    private healthCheckIntervalMs;
    private readinessChecks;
    private intervals;
    constructor();
    private initializeReadinessChecks;
    private checkDatabaseConnection;
    private checkWhatsAppService;
    private checkConfiguration;
    private checkInstagramService;
    private checkSocialMediaServices;
    private checkMemoryUsage;
    addReadinessCheck(name: string, check: () => Promise<boolean>, critical?: boolean): void;
    runReadinessChecks(): Promise<Array<{
        name: string;
        passed: boolean;
        message?: string;
    }>>;
    getHealthReport(): Promise<HealthReport>;
    getHealthCheck(component?: string): Promise<HealthCheck | HealthReport>;
    getLiveness(): {
        status: 'alive' | 'dead';
        timestamp: Date;
        uptime: number;
    };
    getReadiness(): Promise<{
        status: 'ready' | 'not_ready';
        timestamp: Date;
        checks: any[];
    }>;
    startHealthChecks(): void;
    stopHealthChecks(): void;
    getHealthMetrics(): {
        uptime: number;
        memoryUsage: number;
        healthyComponents: number;
        totalComponents: number;
        lastError?: string;
    };
}
export declare const healthService: HealthService;
export declare const getHealth: (component?: string) => Promise<HealthCheck | HealthReport>;
export declare const getLiveness: () => {
    status: "alive" | "dead";
    timestamp: Date;
    uptime: number;
};
export declare const getReadiness: () => Promise<{
    status: "ready" | "not_ready";
    timestamp: Date;
    checks: any[];
}>;
export declare const getHealthMetrics: () => {
    uptime: number;
    memoryUsage: number;
    healthyComponents: number;
    totalComponents: number;
    lastError?: string;
};
//# sourceMappingURL=healthService.d.ts.map