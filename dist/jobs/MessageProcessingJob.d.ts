export declare class MessageProcessingJob {
    private whatsappService;
    private supabaseService;
    private messageProcessor;
    private inputGuard;
    private isRunning;
    constructor();
    start(): Promise<void>;
    private setupMessageHandlers;
    private processMessage;
    processBatchMessages(limit?: number): Promise<{
        processed: number;
        failed: number;
    }>;
    processUnprocessedListings(): Promise<{
        properties: number;
        promotions: number;
    }>;
    stop(): Promise<void>;
    getStatus(): {
        isRunning: boolean;
    };
}
//# sourceMappingURL=MessageProcessingJob.d.ts.map