export interface HealthServerConfig {
    port: number;
    host: string;
    enableCors: boolean;
    logRequests: boolean;
}
export declare class HealthServer {
    private config;
    private server;
    private intervals;
    constructor(config?: Partial<HealthServerConfig>);
    private createJsonResponse;
    private createErrorResponse;
    private handleHealthRequest;
    private handleLivenessRequest;
    private handleReadinessRequest;
    private handleMetricsRequest;
    private handleRootRequest;
    private setupRoutes;
    start(): Promise<void>;
    stop(): Promise<void>;
    updateConfig(newConfig: Partial<HealthServerConfig>): void;
    getConfig(): HealthServerConfig;
    isRunning(): boolean;
}
export declare const healthServer: HealthServer;
export declare const startHealthServer: (config?: Partial<HealthServerConfig>) => Promise<void>;
export declare const stopHealthServer: () => Promise<void>;
//# sourceMappingURL=healthServer.d.ts.map