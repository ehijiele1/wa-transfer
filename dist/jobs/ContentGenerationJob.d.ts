export declare class ContentGenerationJob {
    private supabaseService;
    private instagramService;
    private instagramCarouselGenerator;
    private isRunning;
    constructor();
    start(): Promise<void>;
    processInstagramContent(): Promise<{
        generated: number;
        failed: number;
    }>;
    generateSingleCarousel(propertyId: string): Promise<any>;
    publishSingleCarousel(carouselId: string): Promise<any>;
    batchPublishCarousels(): Promise<any>;
    getInstagramAnalytics(): Promise<any>;
    stop(): Promise<void>;
    getStatus(): {
        isRunning: boolean;
        instagramAvailable: boolean;
    };
}
//# sourceMappingURL=ContentGenerationJob.d.ts.map