import { PostContent, PlatformAdapter } from '../types/socialMedia';
export declare abstract class BasePlatformAdapter implements PlatformAdapter {
    config: any;
    constructor(config: any);
    abstract platform: 'facebook' | 'twitter' | 'linkedin';
    abstract publish(content: PostContent): Promise<any>;
    abstract schedule(content: PostContent, scheduledAt: Date): Promise<any>;
    abstract getPostMetrics(postId: string): Promise<any>;
    abstract getAnalytics(dateRange: {
        start: Date;
        end: Date;
    }): Promise<any>;
    validateContent(content: PostContent): {
        valid: boolean;
        errors: string[];
    };
    protected uploadMedia(mediaUrl: string, filename: string): Promise<string>;
    protected formatContent(content: PostContent): string;
    protected handleError(error: any, operation: string): Promise<never>;
}
export declare class FacebookAdapter extends BasePlatformAdapter {
    platform: "facebook";
    constructor();
    publish(content: PostContent): Promise<any>;
    schedule(content: PostContent, scheduledAt: Date): Promise<any>;
    getPostMetrics(postId: string): Promise<any>;
    getAnalytics(dateRange: {
        start: Date;
        end: Date;
    }): Promise<any>;
    protected uploadMedia(mediaUrl: string, filename: string): Promise<string>;
}
export declare class TwitterAdapter extends BasePlatformAdapter {
    platform: "twitter";
    constructor();
    publish(content: PostContent): Promise<any>;
    schedule(content: PostContent, scheduledAt: Date): Promise<any>;
    getPostMetrics(tweetId: string): Promise<any>;
    getAnalytics(dateRange: {
        start: Date;
        end: Date;
    }): Promise<any>;
}
export declare class LinkedInAdapter extends BasePlatformAdapter {
    platform: "linkedin";
    constructor();
    publish(content: PostContent): Promise<any>;
    schedule(content: PostContent, scheduledAt: Date): Promise<any>;
    getPostMetrics(postId: string): Promise<any>;
    getAnalytics(dateRange: {
        start: Date;
        end: Date;
    }): Promise<any>;
}
export declare class PlatformAdapterFactory {
    static createAdapter(platform: 'facebook' | 'twitter' | 'linkedin'): PlatformAdapter;
}
export default PlatformAdapterFactory;
//# sourceMappingURL=platformAdapters.d.ts.map