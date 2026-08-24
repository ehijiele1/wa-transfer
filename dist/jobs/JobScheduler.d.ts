import { SocialMediaPublishingJob } from './SocialMediaPublishingJob';
import { ContentGenerationJob } from './ContentGenerationJob';
export declare class JobScheduler {
    private cronJobs;
    private isRunning;
    private socialMediaPublishingJob;
    private contentGenerationJob;
    constructor();
    getSocialMediaPublishingJob(): SocialMediaPublishingJob;
    getContentGenerationJob(): ContentGenerationJob;
    start(): Promise<void>;
    stop(): Promise<void>;
    private schedulePeriodicJobs;
    executeMessageProcessing(): Promise<any>;
    executeContentGeneration(): Promise<any>;
    executeSocialMediaProcessing(): Promise<any>;
    getJobStatus(): any;
    getHealth(): Promise<any>;
}
//# sourceMappingURL=JobScheduler.d.ts.map