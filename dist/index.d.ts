declare class WhatsAppMonitoringApp {
    private whatsappService;
    private supabaseService;
    private messageProcessor;
    private instagramService;
    private socialMediaManager;
    private isRunning;
    constructor();
    start(): Promise<void>;
    private setupMessageHandlers;
    private startPeriodicProcessing;
    private processExistingMessages;
    private processUnprocessedListings;
    private processInstagramContent;
    private processSocialMediaQueues;
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
}
export default WhatsAppMonitoringApp;
//# sourceMappingURL=index.d.ts.map