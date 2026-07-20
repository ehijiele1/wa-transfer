import { PostContent, ScheduledPost, BulkPublishOptions, AnalyticsData } from '../types/socialMedia';
export declare class SocialMediaManager {
    private scheduler;
    private analytics;
    private abTesting;
    private supabase;
    constructor();
    publishContent(content: PostContent, platform: 'facebook' | 'twitter' | 'linkedin', immediate?: boolean): Promise<any>;
    bulkPublish(options: BulkPublishOptions): Promise<any>;
    scheduleContent(content: PostContent, platform: 'facebook' | 'twitter' | 'linkedin', scheduledAt: Date): Promise<ScheduledPost>;
    scheduleBulkContent(options: BulkPublishOptions): Promise<ScheduledPost[]>;
    createQueue(platform: 'facebook' | 'twitter' | 'linkedin' | 'all', priority?: 'high' | 'medium' | 'low'): Promise<any>;
    processQueues(): Promise<void>;
    getQueueStatus(queueId?: string): Promise<any>;
    manageQueue(queueId: string, action: 'pause' | 'resume' | 'clear'): Promise<void>;
    getPlatformAnalytics(platform: 'facebook' | 'twitter' | 'linkedin' | 'all', dateRange: {
        start: Date;
        end: Date;
    }): Promise<AnalyticsData[]>;
    getCrossPlatformAnalytics(dateRange: {
        start: Date;
        end: Date;
    }): Promise<any>;
    getRealTimeMetrics(platform?: 'facebook' | 'twitter' | 'linkedin'): Promise<any>;
    generatePerformanceReport(dateRange: {
        start: Date;
        end: Date;
    }): Promise<string>;
    createABTest(testConfig: any): Promise<any>;
    startABTest(testId: string): Promise<any>;
    stopABTest(testId: string): Promise<any>;
    getABTestResults(testId: string): Promise<any>;
    getTestRecommendations(testId: string): Promise<any>;
    adaptContentForPlatform(content: PostContent, targetPlatform: 'facebook' | 'twitter' | 'linkedin'): Promise<PostContent>;
    crossPlatformPublish(content: PostContent, platforms: ('facebook' | 'twitter' | 'linkedin')[], scheduleAt?: Date): Promise<any>;
    private validatePlatform;
    private savePublishingResult;
    private truncateText;
    private limitHashtags;
    private makeProfessional;
    private makeEngaging;
    private professionalHashtags;
    private engagingHashtags;
    getDashboardSummary(): Promise<any>;
    private getRecentActivity;
    private getRecommendations;
}
export default SocialMediaManager;
//# sourceMappingURL=socialMediaManager.d.ts.map