import { PostContent, ScheduledPost, ContentQueue, BulkPublishOptions } from '../types/socialMedia';
export declare class SocialMediaScheduler {
    private supabase;
    private activeQueues;
    private retryBackoff;
    constructor();
    schedulePost(content: PostContent, platform: 'facebook' | 'twitter' | 'linkedin', scheduledAt: Date): Promise<ScheduledPost>;
    bulkSchedulePosts(options: BulkPublishOptions): Promise<ScheduledPost[]>;
    processScheduledPosts(): Promise<void>;
    private processSinglePost;
    private handlePostFailure;
    createContentQueue(platform: 'facebook' | 'twitter' | 'linkedin' | 'all', priority?: 'high' | 'medium' | 'low'): Promise<ContentQueue>;
    processQueue(queueId: string): Promise<void>;
    getQueueStatus(queueId: string): Promise<ContentQueue | undefined>;
    getAllQueues(): Promise<ContentQueue[]>;
    private validatePlatform;
    private saveScheduledPost;
    private updateScheduledPost;
    private getPendingPosts;
    private savePublishingResult;
    private logPostFailure;
    private addToQueue;
    private saveQueue;
    private updateQueue;
    private loadQueueFromDatabase;
    private loadAllQueuesFromDatabase;
    getQueueStatistics(): Promise<any>;
    pauseQueue(queueId: string): Promise<void>;
    resumeQueue(queueId: string): Promise<void>;
    clearQueue(queueId: string): Promise<void>;
    recoverStuckJobs(): Promise<void>;
    private checkIdempotency;
    private getIdempotencyKey;
}
export default SocialMediaScheduler;
//# sourceMappingURL=socialMediaScheduler.d.ts.map