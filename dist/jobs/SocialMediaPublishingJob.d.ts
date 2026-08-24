export declare class SocialMediaPublishingJob {
    private socialMediaManager;
    private supabaseService;
    private isRunning;
    constructor();
    start(): Promise<void>;
    processQueues(): Promise<{
        processed: number;
        failed: number;
    }>;
    publishToSocialMedia(content: any, platforms: string[], scheduleAt?: Date): Promise<any>;
    createQueue(platform: string, priority: string): Promise<any>;
    getQueueStatus(platform?: string): Promise<any>;
    clearQueue(platform: string, status?: string): Promise<any>;
    getAnalytics(platform?: string, dateRange?: any): Promise<any>;
    getDashboard(): Promise<any>;
    createABTest(testConfig: any): Promise<any>;
    getABTestResults(testId: string): Promise<any>;
    stop(): Promise<void>;
    getStatus(): {
        isRunning: boolean;
        managerAvailable: boolean;
    };
}
//# sourceMappingURL=SocialMediaPublishingJob.d.ts.map