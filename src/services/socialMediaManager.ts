import socialMediaConfig from '../config/socialMedia';
import { PostContent, ScheduledPost, BulkPublishOptions, AnalyticsData } from '../types/socialMedia';
import { SocialMediaScheduler } from './socialMediaScheduler';
import { SocialMediaAnalytics } from './socialMediaAnalytics';
import { ABTestingService } from './abTesting';
import { PlatformAdapterFactory } from './platformAdapters';
import SupabaseService from './supabase';
import { generateId } from '../utils';

export class SocialMediaManager {
  private scheduler: SocialMediaScheduler;
  private analytics: SocialMediaAnalytics;
  private abTesting: ABTestingService;
  private supabase: SupabaseService;

  constructor() {
    this.scheduler = new SocialMediaScheduler();
    this.analytics = new SocialMediaAnalytics();
    this.abTesting = new ABTestingService();
    this.supabase = new SupabaseService();
  }

  // Content Publishing
  async publishContent(content: PostContent, platform: 'facebook' | 'twitter' | 'linkedin', immediate = true): Promise<any> {
    try {
      console.log(`Publishing content to ${platform}`);

      // Validate platform configuration
      if (!this.validatePlatform(platform)) {
        throw new Error(`Platform ${platform} is not configured`);
      }

      const adapter = PlatformAdapterFactory.createAdapter(platform);
      
      // Create a temporary post content for validation
      const tempContent: PostContent = {
        id: content.id || generateId(),
        platform,
        type: content.type,
        title: content.title,
        content: content.content,
        mediaUrls: content.mediaUrls,
        hashtags: content.hashtags,
        mentions: content.mentions,
        status: 'draft'
      };
      
      const validation = adapter.validateContent(tempContent);
      
      if (!validation.valid) {
        throw new Error(`Content validation failed: ${validation.errors.join(', ')}`);
      }

      if (immediate) {
        // Publish immediately
        const result = await adapter.publish(content);
        
        // Save publishing result
        await this.savePublishingResult(content, platform, result);
        
        console.log(`Content published successfully to ${platform}: ${result.url || result.postId}`);
        return result;
      } else {
        // Schedule for immediate publication
        return await this.scheduler.schedulePost(content, platform, new Date());
      }
    } catch (error) {
      console.error(`Error publishing content to ${platform}:`, error);
      throw error;
    }
  }

  async bulkPublish(options: BulkPublishOptions): Promise<any> {
    try {
      console.log(`Bulk publishing ${options.content.length} posts to ${options.platform}`);

      const results: any = {
        success: [],
        failed: [],
        total: options.content.length,
      };

      for (const content of options.content) {
        try {
          const result = await this.publishContent(content, options.platform === 'all' ? 'facebook' : options.platform as any, !options.scheduleAt);
          results.success.push({
            content,
            result: result as any,
          });

          // Add delay between posts to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          results.failed.push({
            content,
            error: (error as Error).message,
          } as any);
        }
      }

      console.log(`Bulk publishing completed: ${results.success.length} successful, ${results.failed.length} failed`);
      return results;
    } catch (error) {
      console.error('Error in bulk publishing:', error);
      throw error;
    }
  }

  // Content Scheduling
  async scheduleContent(content: PostContent, platform: 'facebook' | 'twitter' | 'linkedin', scheduledAt: Date): Promise<ScheduledPost> {
    try {
      console.log(`Scheduling content for ${platform} at ${scheduledAt.toISOString()}`);
      
      return await this.scheduler.schedulePost(content, platform, scheduledAt);
    } catch (error) {
      console.error(`Error scheduling content for ${platform}:`, error);
      throw error;
    }
  }

  async scheduleBulkContent(options: BulkPublishOptions): Promise<ScheduledPost[]> {
    try {
      console.log(`Scheduling bulk content for ${options.platform}`);
      
      return await this.scheduler.bulkSchedulePosts(options);
    } catch (error) {
      console.error('Error in bulk scheduling:', error);
      throw error;
    }
  }

  // Queue Management
  async createQueue(platform: 'facebook' | 'twitter' | 'linkedin' | 'all', priority: 'high' | 'medium' | 'low' = 'medium'): Promise<any> {
    try {
      console.log(`Creating queue for ${platform} with priority ${priority}`);
      
      return await this.scheduler.createContentQueue(platform, priority);
    } catch (error) {
      console.error('Error creating queue:', error);
      throw error;
    }
  }

  async processQueues(): Promise<void> {
    try {
      console.log('Processing all queues...');
      
      await this.scheduler.processScheduledPosts();
    } catch (error) {
      console.error('Error processing queues:', error);
      throw error;
    }
  }

  async getQueueStatus(queueId?: string): Promise<any> {
    try {
      if (queueId) {
        return await this.scheduler.getQueueStatus(queueId);
      } else {
        const stats = await this.scheduler.getQueueStatistics();
        return {
          queues: await this.scheduler.getAllQueues(),
          statistics: stats,
        };
      }
    } catch (error) {
      console.error('Error getting queue status:', error);
      throw error;
    }
  }

  async manageQueue(queueId: string, action: 'pause' | 'resume' | 'clear'): Promise<void> {
    try {
      console.log(`Managing queue ${queueId}: ${action}`);
      
      switch (action) {
        case 'pause':
          await this.scheduler.pauseQueue(queueId);
          break;
        case 'resume':
          await this.scheduler.resumeQueue(queueId);
          break;
        case 'clear':
          await this.scheduler.clearQueue(queueId);
          break;
      }
    } catch (error) {
      console.error(`Error managing queue ${queueId}:`, error);
      throw error;
    }
  }

  // Analytics and Reporting
  async getPlatformAnalytics(platform: 'facebook' | 'twitter' | 'linkedin' | 'all', dateRange: { start: Date; end: Date }): Promise<AnalyticsData[]> {
    try {
      console.log(`Getting analytics for ${platform}`);
      
      return await this.analytics.getPlatformAnalytics(platform, dateRange);
    } catch (error) {
      console.error('Error getting platform analytics:', error);
      throw error;
    }
  }

  async getCrossPlatformAnalytics(dateRange: { start: Date; end: Date }): Promise<any> {
    try {
      console.log('Getting cross-platform analytics');
      
      return await this.analytics.getCrossPlatformAnalytics(dateRange);
    } catch (error) {
      console.error('Error getting cross-platform analytics:', error);
      throw error;
    }
  }

  async getRealTimeMetrics(platform?: 'facebook' | 'twitter' | 'linkedin'): Promise<any> {
    try {
      console.log('Getting real-time metrics');
      
      return await this.analytics.getRealTimeMetrics(platform);
    } catch (error) {
      console.error('Error getting real-time metrics:', error);
      throw error;
    }
  }

  async generatePerformanceReport(dateRange: { start: Date; end: Date }): Promise<string> {
    try {
      console.log('Generating performance report');
      
      return await this.analytics.generatePerformanceReport(dateRange);
    } catch (error) {
      console.error('Error generating performance report:', error);
      throw error;
    }
  }

  // A/B Testing
  async createABTest(testConfig: any): Promise<any> {
    try {
      console.log('Creating A/B test');
      
      return await this.abTesting.createABTest(testConfig);
    } catch (error) {
      console.error('Error creating A/B test:', error);
      throw error;
    }
  }

  async startABTest(testId: string): Promise<any> {
    try {
      console.log(`Starting A/B test: ${testId}`);
      
      return await this.abTesting.startABTest(testId);
    } catch (error) {
      console.error('Error starting A/B test:', error);
      throw error;
    }
  }

  async stopABTest(testId: string): Promise<any> {
    try {
      console.log(`Stopping A/B test: ${testId}`);
      
      return await this.abTesting.stopABTest(testId);
    } catch (error) {
      console.error('Error stopping A/B test:', error);
      throw error;
    }
  }

  async getABTestResults(testId: string): Promise<any> {
    try {
      console.log(`Getting A/B test results: ${testId}`);
      
      return await this.abTesting.getABTestResults(testId);
    } catch (error) {
      console.error('Error getting A/B test results:', error);
      throw error;
    }
  }

  async getTestRecommendations(testId: string): Promise<any> {
    try {
      console.log(`Getting test recommendations: ${testId}`);
      
      return await this.abTesting.getTestRecommendations(testId);
    } catch (error) {
      console.error('Error getting test recommendations:', error);
      throw error;
    }
  }

  // Content Adaptation
  async adaptContentForPlatform(content: PostContent, targetPlatform: 'facebook' | 'twitter' | 'linkedin'): Promise<PostContent> {
    try {
      console.log(`Adapting content for ${targetPlatform}`);

      const adaptedContent = { ...content };
      
      // Platform-specific adaptations
      switch (targetPlatform) {
        case 'twitter':
          // Twitter has strict character limits
          adaptedContent.content = this.truncateText(content.content, 280);
          adaptedContent.hashtags = this.limitHashtags(content.hashtags, 3);
          break;
          
        case 'linkedin':
          // LinkedIn is more professional
          adaptedContent.content = this.makeProfessional(content.content);
          adaptedContent.hashtags = this.professionalHashtags(content.hashtags);
          break;
          
        case 'facebook':
          // Facebook is more casual and engaging
          adaptedContent.content = this.makeEngaging(content.content);
          adaptedContent.hashtags = this.engagingHashtags(content.hashtags);
          break;
      }

      return adaptedContent;
    } catch (error) {
      console.error(`Error adapting content for ${targetPlatform}:`, error);
      throw error;
    }
  }

  async crossPlatformPublish(content: PostContent, platforms: ('facebook' | 'twitter' | 'linkedin')[], scheduleAt?: Date): Promise<any> {
    try {
      console.log(`Cross-platform publishing to ${platforms.join(', ')}`);

      const results: any = {
        success: [],
        failed: [],
        platforms: platforms,
      };

      for (const platform of platforms) {
        try {
          const adaptedContent = await this.adaptContentForPlatform(content, platform);
          
          if (scheduleAt) {
            const scheduled = await this.scheduleContent(adaptedContent, platform, scheduleAt);
            results.success.push({
              platform: platform as any,
              scheduled,
            } as any);
          } else {
            const published = await this.publishContent(adaptedContent, platform);
            results.success.push({
              platform: platform as any,
              published,
            } as any);
          }
        } catch (error) {
          results.failed.push({
            platform: platform as any,
            error: (error as Error).message,
          } as any);
        }
      }

      console.log(`Cross-platform publishing completed: ${results.success.length} successful, ${results.failed.length} failed`);
      return results;
    } catch (error) {
      console.error('Error in cross-platform publishing:', error);
      throw error;
    }
  }

  // Utility Methods
  private validatePlatform(platform: string): boolean {
    switch (platform) {
      case 'facebook':
        return !!socialMediaConfig.facebook.accessToken && !!socialMediaConfig.facebook.pageId;
      case 'twitter':
        return !!socialMediaConfig.twitter.bearerToken;
      case 'linkedin':
        return !!socialMediaConfig.linkedin.accessToken;
      default:
        return false;
    }
  }

  private async savePublishingResult(content: PostContent, platform: string, result: any): Promise<void> {
    // Implementation for saving publishing result
    console.log(`Saving publishing result for ${platform}:`, result);
  }

  private truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  private limitHashtags(hashtags: string[], limit: number): string[] {
    return hashtags.slice(0, limit);
  }

  private makeProfessional(text: string): string {
    // Convert to more professional tone
    return text
      .replace(/amazing/gi, 'excellent')
      .replace(/awesome/gi, 'impressive')
      .replace(/great/gi, 'outstanding')
      .replace(/love/gi, 'appreciate')
      .replace(/!/g, '.');
  }

  private makeEngaging(text: string): string {
    // Convert to more engaging tone
    return text
      .replace(/excellent/gi, 'amazing')
      .replace(/impressive/gi, 'awesome')
      .replace(/outstanding/gi, 'great')
      .replace(/appreciate/gi, 'love')
      + ' 🎉';
  }

  private professionalHashtags(hashtags: string[]): string[] {
    return hashtags.map(tag => 
      tag.replace(/#dreamhome/gi, '#realestate')
         .replace(/#homesforsale/gi, '#propertyinvestment')
    );
  }

  private engagingHashtags(hashtags: string[]): string[] {
    return hashtags.map(tag => 
      tag.replace(/#propertyinvestment/gi, '#dreamhome')
         .replace(/#realestate/gi, '#homesforsale')
    );
  }

  // Dashboard Summary
  async getDashboardSummary(): Promise<any> {
    try {
      console.log('Generating dashboard summary');

      const now = new Date();
      const last30Days = {
        start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        end: now,
      };

      const [analytics, queueStats, testStats] = await Promise.all([
        this.getCrossPlatformAnalytics(last30Days),
        this.scheduler.getQueueStatistics(),
        this.abTesting.getABTestStatistics(),
      ]);

      const summary = {
        period: 'Last 30 Days',
        overview: {
          totalPosts: analytics.totalPosts,
          publishedPosts: analytics.totalPublished,
          successRate: ((analytics.totalPublished / analytics.totalPosts) * 100).toFixed(1) + '%',
          totalEngagement: analytics.totalEngagement.toLocaleString(),
          averageEngagementRate: (analytics.averageEngagementRate * 100).toFixed(2) + '%',
        },
        platforms: analytics.platformBreakdown,
        queues: queueStats,
        testing: testStats,
        recentActivity: await this.getRecentActivity(),
        recommendations: await this.getRecommendations(),
      };

      return summary;
    } catch (error) {
      console.error('Error generating dashboard summary:', error);
      throw error;
    }
  }

  private async getRecentActivity(): Promise<any[]> {
    // Implementation for getting recent activity
    return [
      { type: 'publish', platform: 'facebook', timestamp: new Date() },
      { type: 'schedule', platform: 'twitter', timestamp: new Date() },
      { type: 'test', platform: 'linkedin', timestamp: new Date() },
    ];
  }

  private async getRecommendations(): Promise<string[]> {
    // Implementation for getting recommendations
    return [
      'Focus on Facebook content - highest engagement rate',
      'Test different posting times for Twitter',
      'Increase LinkedIn posting frequency',
    ];
  }
}

export default SocialMediaManager;