import { AnalyticsData } from '../types/socialMedia';
export declare class SocialMediaAnalytics {
    private supabase;
    constructor();
    getPlatformAnalytics(platform: 'facebook' | 'twitter' | 'linkedin' | 'all', dateRange: {
        start: Date;
        end: Date;
    }): Promise<AnalyticsData[]>;
    private getSinglePlatformAnalytics;
    getCrossPlatformAnalytics(dateRange: {
        start: Date;
        end: Date;
    }): Promise<any>;
    getRealTimeMetrics(platform?: 'facebook' | 'twitter' | 'linkedin'): Promise<any>;
    getContentPerformance(dateRange: {
        start: Date;
        end: Date;
    }): Promise<any>;
    getAudienceInsights(dateRange: {
        start: Date;
        end: Date;
    }): Promise<any>;
    generatePerformanceReport(dateRange: {
        start: Date;
        end: Date;
    }): Promise<string>;
    private calculateAverageEngagementRate;
    private getBestPostingTimes;
    private getAudienceDemographics;
    private getPlatformDataFromDatabase;
    private getContentDataFromDatabase;
    private getAudienceDataFromDatabase;
    private getBestHashtags;
    private analyzePostingTimes;
    private getPeakEngagementHours;
    private getPeakEngagementDays;
    private getPlatformPreferences;
    private getFollowerGrowth;
    private getEngagementGrowth;
}
export default SocialMediaAnalytics;
//# sourceMappingURL=socialMediaAnalytics.d.ts.map