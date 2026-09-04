declare class WhatsAppMonitoringApp {
    private jobScheduler;
    private messageJob;
    private isRunning;
    constructor();
    start(): Promise<void>;
    publishToSocialMedia(content: any, platforms: string[], scheduleAt?: Date): Promise<any>;
    getSocialMediaAnalytics(platform?: string, dateRange?: any): Promise<any>;
    createSocialMediaQueue(platform: string, priority: string): Promise<any>;
    getSocialMediaDashboard(): Promise<any>;
    createABTest(testConfig: any): Promise<any>;
    getABTestResults(testId: string): Promise<any>;
    generateInstagramCarousel(propertyId: string): Promise<any>;
    publishInstagramCarousel(carouselId: string): Promise<any>;
    getInstagramAnalytics(): Promise<any>;
    batchPublishInstagram(): Promise<any>;
    stop(): Promise<void>;
    getStatus(): {
        isRunning: boolean;
        jobs: any;
    };
    getHealth(): any;
    getSystemHealth(): Promise<any>;
    executeMessageProcessing(): Promise<any>;
    executeContentGeneration(): Promise<any>;
    executeSocialMediaProcessing(): Promise<any>;
}
export default WhatsAppMonitoringApp;
//# sourceMappingURL=index.d.ts.map