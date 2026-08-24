export interface HealthStatus {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    uptime: number;
    dependencies: {
        whatsapp: DependencyStatus;
        supabase: DependencyStatus;
        ollama: DependencyStatus;
        redis: DependencyStatus;
    };
}
export interface DependencyStatus {
    status: 'up' | 'down' | 'degraded';
    latency?: number;
    lastChecked: string;
    error?: string;
}
declare class HealthChecker {
    private startTime;
    constructor();
    checkHealth(): Promise<HealthStatus>;
    private checkWhatsApp;
    private checkSupabase;
    private checkOllama;
    private checkRedis;
    getUptime(): number;
}
export declare const healthChecker: HealthChecker;
export {};
//# sourceMappingURL=health.d.ts.map