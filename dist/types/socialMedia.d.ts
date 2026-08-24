export interface PlatformConfig {
    facebook: {
        accessToken: string;
        pageId: string;
        graphApiVersion: string;
        postTypes: ['text', 'image', 'video', 'link'];
        maxTextLength: number;
        maxImagesPerPost: number;
        maxVideosPerPost: number;
    };
    twitter: {
        bearerToken: string;
        apiKey: string;
        apiSecret: string;
        accessToken: string;
        accessSecret: string;
        maxTextLength: number;
        maxImagesPerTweet: number;
        maxVideosPerTweet: number;
    };
    linkedin: {
        accessToken: string;
        clientId: string;
        clientSecret: string;
        maxTextLength: number;
        maxImagesPerPost: number;
    };
}
export interface PostContent {
    id: string;
    platform: 'facebook' | 'twitter' | 'linkedin';
    type: 'text' | 'image' | 'video' | 'carousel' | 'link';
    title: string;
    content: string;
    mediaUrls: string[];
    hashtags: string[];
    mentions: string[];
    scheduledAt?: Date;
    publishedAt?: Date;
    status: 'draft' | 'scheduled' | 'published' | 'failed';
    engagement?: {
        likes: number;
        shares: number;
        comments: number;
        impressions: number;
        reach: number;
    };
    metrics?: {
        clicks: number;
        engagementRate: number;
        sentimentScore: number;
    };
}
export interface ScheduledPost {
    id: string;
    platform: 'facebook' | 'twitter' | 'linkedin';
    content: PostContent;
    scheduledAt: Date;
    status: 'pending' | 'processing' | 'published' | 'failed';
    retryCount: number;
    maxRetries: number;
    idempotencyKey?: string;
    errorMessage?: string;
}
export interface ContentQueue {
    id: string;
    posts: ScheduledPost[];
    platform: 'facebook' | 'twitter' | 'linkedin' | 'all';
    status: 'active' | 'paused' | 'completed';
    priority: 'high' | 'medium' | 'low';
    createdAt: Date;
    processedAt?: Date | null;
}
export interface AnalyticsData {
    platform: 'facebook' | 'twitter' | 'linkedin' | 'all';
    dateRange: {
        start: Date;
        end: Date;
    };
    metrics: {
        totalPosts: number;
        publishedPosts: number;
        failedPosts: number;
        totalEngagement: number;
        averageEngagementRate: number;
        topPerformingContent: PostContent[];
        bestPostingTimes: string[];
        audienceDemographics: {
            ageGroups: {
                [key: string]: number;
            };
            gender: {
                [key: string]: number;
            };
            locations: {
                [key: string]: number;
            };
        };
    };
}
export interface PlatformAdapter {
    platform: 'facebook' | 'twitter' | 'linkedin';
    config: any;
    publish(content: PostContent): Promise<any>;
    schedule(content: PostContent, scheduledAt: Date): Promise<any>;
    getPostMetrics(postId: string): Promise<any>;
    getAnalytics(dateRange: {
        start: Date;
        end: Date;
    }): Promise<any>;
    validateContent(content: PostContent): {
        valid: boolean;
        errors: string[];
    };
}
export interface BulkPublishOptions {
    platform: 'facebook' | 'twitter' | 'linkedin' | 'all';
    content: PostContent[];
    scheduleAt?: Date;
    priority: 'high' | 'medium' | 'low';
    dryRun?: boolean;
}
export interface ATestConfig {
    id: string;
    name: string;
    description: string;
    variants: {
        id: string;
        content: PostContent;
        audience?: string[];
        metrics?: {
            engagement: number;
            reach: number;
            clicks: number;
        };
    }[];
    platform: 'facebook' | 'twitter' | 'linkedin';
    status: 'draft' | 'running' | 'completed' | 'paused';
    startDate?: Date;
    endDate?: Date;
    results?: {
        variantId: string;
        engagement: number;
        reach: number;
        clicks: number;
    }[];
}
//# sourceMappingURL=socialMedia.d.ts.map