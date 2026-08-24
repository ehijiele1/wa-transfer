import { Job } from 'bullmq';
export interface SchedulePostJob {
    postId: string;
    platform: string;
    content: any;
    scheduledAt: string;
}
export interface GenerateCarouselJob {
    propertyId: string;
}
export declare class QueueProcessors {
    static processSchedulePost(job: Job<SchedulePostJob>): Promise<any>;
    static processGenerateCarousel(job: Job<GenerateCarouselJob>): Promise<any>;
    static processPublishPost(job: Job<any>): Promise<any>;
    static setupWorkers(queueManager: any): void;
}
//# sourceMappingURL=processors.d.ts.map