import socialMediaConfig from '../config/socialMedia';
import { AnalyticsData, PostContent } from '../types/socialMedia';
import { PlatformAdapterFactory } from './platformAdapters';
import SupabaseService from './supabase';
import { generateId } from '../utils';
import { logger } from '../utils/logger';

export class SocialMediaAnalytics {
  private supabase: SupabaseService;

  constructor() {
    this.supabase = new SupabaseService();
  }

  async getPlatformAnalytics(platform: 'facebook' | 'twitter' | 'linkedin' | 'all', dateRange: { start: Date; end: Date }): Promise<AnalyticsData[]> {
    try {
      logger.info(`Getting analytics`, { platform, start: dateRange.start.toISOString(), end: dateRange.end.toISOString() });

      const analyticsData: AnalyticsData[] = [];

      if (platform === 'all') {
        // Get analytics for all platforms
        const platforms: ('facebook' | 'twitter' | 'linkedin')[] = ['facebook', 'twitter', 'linkedin'];
        for (const p of platforms) {
          const data = await this.getSinglePlatformAnalytics(p, dateRange);
          if (data) {
            analyticsData.push(data);
          }
        }
      } else {
        const data = await this.getSinglePlatformAnalytics(platform, dateRange);
        if (data) {
          analyticsData.push(data);
        }
      }

      return analyticsData;
    } catch (error) {
      logger.error('Error getting platform analytics', error as Error);
      throw error;
    }
  }

  private async getSinglePlatformAnalytics(platform: 'facebook' | 'twitter' | 'linkedin', dateRange: { start: Date; end: Date }): Promise<AnalyticsData | null> {
    try {
      const adapter = PlatformAdapterFactory.createAdapter(platform);
      const platformData = await adapter.getAnalytics(dateRange);

      // Get additional data from database
      const dbData = await this.getPlatformDataFromDatabase(platform, dateRange);

      // Combine data
      const analytics: AnalyticsData = {
        platform,
        dateRange,
        metrics: {
          totalPosts: dbData.totalPosts || 0,
          publishedPosts: dbData.publishedPosts || 0,
          failedPosts: dbData.failedPosts || 0,
          totalEngagement: platformData.metrics?.totalEngagement || 0,
          averageEngagementRate: this.calculateAverageEngagementRate(platformData.metrics),
          topPerformingContent: dbData.topPerformingContent || [],
          bestPostingTimes: await this.getBestPostingTimes(platform, dateRange),
          audienceDemographics: await this.getAudienceDemographics(platform, dateRange),
        },
      };

      return analytics;
    } catch (error) {
      logger.error(`Error getting analytics`, error as Error, { platform, dateRange });
      return null;
    }
  }

  async getCrossPlatformAnalytics(dateRange: { start: Date; end: Date }): Promise<any> {
    try {
      logger.info('Getting cross-platform analytics', { dateRange });

      const allAnalytics = await this.getPlatformAnalytics('all', dateRange);

      // Aggregate metrics across platforms
      const aggregatedMetrics = {
        totalPosts: allAnalytics.reduce((sum, data) => sum + data.metrics.totalPosts, 0),
        totalPublished: allAnalytics.reduce((sum, data) => sum + data.metrics.publishedPosts, 0),
        totalFailed: allAnalytics.reduce((sum, data) => sum + data.metrics.failedPosts, 0),
        totalEngagement: allAnalytics.reduce((sum, data) => sum + data.metrics.totalEngagement, 0),
        averageEngagementRate: allAnalytics.reduce((sum, data) => sum + (data.metrics.averageEngagementRate || 0), 0) / allAnalytics.length,
        platformBreakdown: {
          facebook: allAnalytics.find(a => a.platform === 'facebook')?.metrics || {},
          twitter: allAnalytics.find(a => a.platform === 'twitter')?.metrics || {},
          linkedin: allAnalytics.find(a => a.platform === 'linkedin')?.metrics || {},
        },
        topPerformingPlatforms: allAnalytics
          .sort((a, b) => (b.metrics.averageEngagementRate || 0) - (a.metrics.averageEngagementRate || 0))
          .map(data => ({
            platform: data.platform,
            engagementRate: data.metrics.averageEngagementRate || 0,
          })),
        contentPerformance: await this.getContentPerformance(dateRange),
        audienceInsights: await this.getAudienceInsights(dateRange),
      };

      return aggregatedMetrics;
    } catch (error) {
      logger.error('Error getting cross-platform analytics', error as Error);
      throw error;
    }
  }

  async getRealTimeMetrics(platform?: 'facebook' | 'twitter' | 'linkedin'): Promise<any> {
    try {
      logger.info('Getting real-time metrics', { ...(platform ? { platform } : {}) });

      const now = new Date();
      const last24Hours = {
        start: new Date(now.getTime() - 24 * 60 * 60 * 1000),
        end: now,
      };

      if (platform) {
        const analytics = await this.getSinglePlatformAnalytics(platform, last24Hours);
        return {
          platform,
          metrics: analytics?.metrics || {},
          timestamp: now.toISOString(),
        };
      } else {
        const allAnalytics = await this.getPlatformAnalytics('all', last24Hours);
        return {
          timestamp: now.toISOString(),
          platforms: allAnalytics.map(data => ({
            platform: data.platform,
            metrics: data.metrics,
          })),
        };
      }
    } catch (error) {
      logger.error('Error getting real-time metrics', error as Error);
      throw error;
    }
  }

  async getContentPerformance(dateRange: { start: Date; end: Date }): Promise<any> {
    try {
      logger.info('Getting content performance analysis', { dateRange });

      // Get content from database
      const contentData = await this.getContentDataFromDatabase(dateRange);

      const performance = {
        topPerformingContent: contentData
          .sort((a, b) => (b.engagement || 0) - (a.engagement || 0))
          .slice(0, 10)
          .map(content => ({
            id: content.id,
            platform: content.platform,
            title: content.title,
            engagement: content.engagement || 0,
            reach: content.reach || 0,
            engagementRate: content.engagementRate || 0,
          })),
        contentTypes: {
          text: contentData.filter(c => c.type === 'text').length,
          image: contentData.filter(c => c.type === 'image').length,
          video: contentData.filter(c => c.type === 'video').length,
          carousel: contentData.filter(c => c.type === 'carousel').length,
        },
        bestHashtags: await this.getBestHashtags(dateRange),
        postingTimes: await this.analyzePostingTimes(dateRange),
      };

      return performance;
    } catch (error) {
      logger.error('Error getting content performance', error as Error);
      throw error;
    }
  }

  async getAudienceInsights(dateRange: { start: Date; end: Date }): Promise<any> {
    try {
      logger.info('Getting audience insights', { dateRange });

      const audienceData = await this.getAudienceDataFromDatabase(dateRange);

      const insights = {
        demographics: {
          ageGroups: audienceData.ageGroups || {},
          gender: audienceData.gender || {},
          locations: audienceData.locations || {},
        },
        engagementPatterns: {
          peakHours: await this.getPeakEngagementHours(dateRange),
          peakDays: await this.getPeakEngagementDays(dateRange),
          platformPreferences: await this.getPlatformPreferences(dateRange),
        },
        growthMetrics: {
          followerGrowth: await this.getFollowerGrowth(dateRange),
          engagementGrowth: await this.getEngagementGrowth(dateRange),
        },
      };

      return insights;
    } catch (error) {
      logger.error('Error getting audience insights', error as Error);
      throw error;
    }
  }

  async generatePerformanceReport(dateRange: { start: Date; end: Date }): Promise<string> {
    try {
      logger.info('Generating performance report', { dateRange });

      const analytics = await this.getCrossPlatformAnalytics(dateRange);
      const contentPerformance = await this.getContentPerformance(dateRange);
      const audienceInsights = await this.getAudienceInsights(dateRange);

      const report = `
# Social Media Performance Report
**Period:** ${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}
**Generated:** ${new Date().toLocaleDateString()}

## Executive Summary
- Total Posts: ${analytics.totalPosts}
- Published Posts: ${analytics.totalPublished}
- Success Rate: ${((analytics.totalPublished / analytics.totalPosts) * 100).toFixed(1)}%
- Total Engagement: ${analytics.totalEngagement.toLocaleString()}
- Average Engagement Rate: ${(analytics.averageEngagementRate * 100).toFixed(2)}%

## Platform Performance
${Object.entries(analytics.platformBreakdown).map(([platform, metrics]) => `
### ${platform.charAt(0).toUpperCase() + platform.slice(1)}
- Total Posts: ${(metrics as any)?.totalPosts || 0}
- Published: ${(metrics as any)?.publishedPosts || 0}
- Failed: ${(metrics as any)?.failedPosts || 0}
- Engagement Rate ${(((metrics as any)?.averageEngagementRate || 0) * 100).toFixed(2)}%
`).join('')}

## Top Performing Content
${contentPerformance.topPerformingContent.slice(0, 5).map((content: any, index: number) => `
${index + 1}. **${content.title}** (${content.platform})
   - Engagement: ${content.engagement?.toLocaleString() || 'N/A'}
   - Reach: ${content.reach?.toLocaleString() || 'N/A'}
   - Engagement Rate: ${((content.engagementRate || 0) * 100).toFixed(2)}%
`).join('')}

## Audience Insights
### Demographics
${Object.entries((audienceInsights.demographics as any)?.ageGroups || {}).map(([age, count]) => 
  `- ${age}: ${(count as number).toLocaleString()} followers`
).join('\n')}

### Best Posting Times
${contentPerformance.postingTimes.slice(0, 3).map((time: any, index: number) => 
`${index + 1}. ${time.time} - ${time.engagementRate || 0}% engagement`
).join('\n')}

## Recommendations
1. Focus on content types that perform best
2. Post during peak engagement hours
3. Use top-performing hashtags
4. Allocate more resources to high-performing platforms

## Next Steps
1. Implement suggested posting schedule
2. Create more of the top-performing content types
3. Test new hashtags and content formats
4. Monitor audience response to changes
`;

      return report;
    } catch (error) {
      logger.error('Error generating performance report', error as Error);
      throw error;
    }
  }

  // Helper methods
  private calculateAverageEngagementRate(metrics: any): number {
    if (!metrics) return 0;
    // Calculate based on available metrics
    const engagement = (metrics.likes || 0) + (metrics.shares || 0) + (metrics.comments || 0);
    const reach = metrics.reach || 1;
    return engagement / reach;
  }

  private async getBestPostingTimes(platform: string, dateRange: { start: Date; end: Date }): Promise<string[]> {
    // Implementation for analyzing best posting times
    return ['9:00 AM', '12:00 PM', '6:00 PM'];
  }

  private async getAudienceDemographics(platform: string, dateRange: { start: Date; end: Date }): Promise<any> {
    // Implementation for getting audience demographics
    return {
      ageGroups: { '18-24': 25, '25-34': 35, '35-44': 20, '45+': 20 },
      gender: { male: 45, female: 55 },
      locations: { 'US': 40, 'UK': 20, 'CA': 15, 'Other': 25 },
    };
  }

  private async getPlatformDataFromDatabase(platform: string, dateRange: { start: Date; end: Date }): Promise<any> {
    // Implementation for getting platform data from database
    return {
      totalPosts: 50,
      publishedPosts: 45,
      failedPosts: 5,
      topPerformingContent: [],
    };
  }

  private async getContentDataFromDatabase(dateRange: { start: Date; end: Date }): Promise<any[]> {
    // Implementation for getting content data from database
    return [];
  }

  private async getAudienceDataFromDatabase(dateRange: { start: Date; end: Date }): Promise<any> {
    // Implementation for getting audience data from database
    return {
      ageGroups: {},
      gender: {},
      locations: {},
    };
  }

  private async getBestHashtags(dateRange: { start: Date; end: Date }): Promise<string[]> {
    // Implementation for getting best performing hashtags
    return ['#realestate', '#homesforsale', '#dreamhome', '#property'];
  }

  private async analyzePostingTimes(dateRange: { start: Date; end: Date }): Promise<any[]> {
    // Implementation for analyzing posting times
    return [
      { time: '9:00 AM', engagementRate: 4.2 },
      { time: '12:00 PM', engagementRate: 3.8 },
      { time: '6:00 PM', engagementRate: 5.1 },
      { time: '8:00 PM', engagementRate: 3.2 },
    ];
  }

  private async getPeakEngagementHours(dateRange: { start: Date; end: Date }): Promise<string[]> {
    // Implementation for getting peak engagement hours
    return ['9:00 AM', '6:00 PM', '8:00 PM'];
  }

  private async getPeakEngagementDays(dateRange: { start: Date; end: Date }): Promise<string[]> {
    // Implementation for getting peak engagement days
    return ['Tuesday', 'Wednesday', 'Thursday'];
  }

  private async getPlatformPreferences(dateRange: { start: Date; end: Date }): Promise<any> {
    // Implementation for getting platform preferences
    return {
      facebook: 40,
      twitter: 25,
      linkedin: 35,
    };
  }

  private async getFollowerGrowth(dateRange: { start: Date; end: Date }): Promise<any> {
    // Implementation for getting follower growth
    return {
      facebook: 150,
      twitter: 75,
      linkedin: 200,
    };
  }

  private async getEngagementGrowth(dateRange: { start: Date; end: Date }): Promise<any> {
    // Implementation for getting engagement growth
    return {
      facebook: 25,
      twitter: 15,
      linkedin: 35,
    };
  }
}

export default SocialMediaAnalytics;