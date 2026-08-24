"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocialMediaManager = void 0;
const socialMedia_1 = __importDefault(require("../config/socialMedia"));
const socialMediaScheduler_1 = require("./socialMediaScheduler");
const socialMediaAnalytics_1 = require("./socialMediaAnalytics");
const abTesting_1 = require("./abTesting");
const platformAdapters_1 = require("./platformAdapters");
const supabase_1 = __importDefault(require("./supabase"));
const utils_1 = require("../utils");
const logger_1 = require("../utils/logger");
class SocialMediaManager {
    scheduler;
    analytics;
    abTesting;
    supabase;
    constructor() {
        this.scheduler = new socialMediaScheduler_1.SocialMediaScheduler();
        this.analytics = new socialMediaAnalytics_1.SocialMediaAnalytics();
        this.abTesting = new abTesting_1.ABTestingService();
        this.supabase = new supabase_1.default();
    }
    async publishContent(content, platform, immediate = true) {
        try {
            logger_1.logger.info(`Publishing content to ${platform}`, { platform, contentId: content.id });
            if (!this.validatePlatform(platform)) {
                throw new Error(`Platform ${platform} is not configured`);
            }
            const adapter = platformAdapters_1.PlatformAdapterFactory.createAdapter(platform);
            const tempContent = {
                id: content.id || (0, utils_1.generateId)(),
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
                const result = await adapter.publish(content);
                await this.savePublishingResult(content, platform, result);
                logger_1.logger.info(`Content published successfully`, { platform, resultUrl: result.url, postId: result.postId });
                return result;
            }
            else {
                return await this.scheduler.schedulePost(content, platform, new Date());
            }
        }
        catch (error) {
            logger_1.logger.error(`Error publishing content to ${platform}`, error, { platform, contentId: content.id });
            throw error;
        }
    }
    async bulkPublish(options) {
        try {
            logger_1.logger.info(`Bulk publishing posts`, { count: options.content.length, platform: options.platform });
            const results = {
                success: [],
                failed: [],
                total: options.content.length,
            };
            for (const content of options.content) {
                try {
                    const result = await this.publishContent(content, options.platform === 'all' ? 'facebook' : options.platform, !options.scheduleAt);
                    results.success.push({
                        content,
                        result: result,
                    });
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                catch (error) {
                    results.failed.push({
                        content,
                        error: error.message,
                    });
                }
            }
            logger_1.logger.info(`Bulk publishing completed`, { success: results.success.length, failed: results.failed.length });
            return results;
        }
        catch (error) {
            logger_1.logger.error('Error in bulk publishing', error);
            throw error;
        }
    }
    async scheduleContent(content, platform, scheduledAt) {
        try {
            logger_1.logger.info(`Scheduling content`, { platform, scheduledAt: scheduledAt.toISOString() });
            return await this.scheduler.schedulePost(content, platform, scheduledAt);
        }
        catch (error) {
            logger_1.logger.error(`Error scheduling content`, error, { platform, scheduledAt: scheduledAt.toISOString() });
            throw error;
        }
    }
    async scheduleBulkContent(options) {
        try {
            logger_1.logger.info(`Scheduling bulk content`, { platform: options.platform });
            return await this.scheduler.bulkSchedulePosts(options);
        }
        catch (error) {
            logger_1.logger.error('Error in bulk scheduling', error);
            throw error;
        }
    }
    async createQueue(platform, priority = 'medium') {
        try {
            logger_1.logger.info(`Creating queue`, { platform, priority });
            return await this.scheduler.createContentQueue(platform, priority);
        }
        catch (error) {
            logger_1.logger.error('Error creating queue', error);
            throw error;
        }
    }
    async processQueues() {
        try {
            logger_1.logger.info('Processing all queues');
            await this.scheduler.processScheduledPosts();
        }
        catch (error) {
            logger_1.logger.error('Error processing queues', error);
            throw error;
        }
    }
    async getQueueStatus(queueId) {
        try {
            if (queueId) {
                return await this.scheduler.getQueueStatus(queueId);
            }
            else {
                const stats = await this.scheduler.getQueueStatistics();
                return {
                    queues: await this.scheduler.getAllQueues(),
                    statistics: stats,
                };
            }
        }
        catch (error) {
            logger_1.logger.error('Error getting queue status', error);
            throw error;
        }
    }
    async manageQueue(queueId, action) {
        try {
            logger_1.logger.info(`Managing queue`, { queueId, action });
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
        }
        catch (error) {
            logger_1.logger.error(`Error managing queue`, error, { queueId, action });
            throw error;
        }
    }
    async getPlatformAnalytics(platform, dateRange) {
        try {
            logger_1.logger.info(`Getting analytics`, { platform, dateRange });
            return await this.analytics.getPlatformAnalytics(platform, dateRange);
        }
        catch (error) {
            logger_1.logger.error('Error getting platform analytics', error, { platform });
            throw error;
        }
    }
    async getCrossPlatformAnalytics(dateRange) {
        try {
            logger_1.logger.info('Getting cross-platform analytics', { dateRange });
            return await this.analytics.getCrossPlatformAnalytics(dateRange);
        }
        catch (error) {
            logger_1.logger.error('Error getting cross-platform analytics', error);
            throw error;
        }
    }
    async getRealTimeMetrics(platform) {
        try {
            logger_1.logger.info('Getting real-time metrics', { ...(platform ? { platform } : {}) });
            return await this.analytics.getRealTimeMetrics(platform);
        }
        catch (error) {
            logger_1.logger.error('Error getting real-time metrics', error);
            throw error;
        }
    }
    async generatePerformanceReport(dateRange) {
        try {
            logger_1.logger.info('Generating performance report', { dateRange });
            return await this.analytics.generatePerformanceReport(dateRange);
        }
        catch (error) {
            logger_1.logger.error('Error generating performance report', error);
            throw error;
        }
    }
    async createABTest(testConfig) {
        try {
            logger_1.logger.info('Creating A/B test');
            return await this.abTesting.createABTest(testConfig);
        }
        catch (error) {
            logger_1.logger.error('Error creating A/B test', error);
            throw error;
        }
    }
    async startABTest(testId) {
        try {
            logger_1.logger.info(`Starting A/B test`, { testId });
            return await this.abTesting.startABTest(testId);
        }
        catch (error) {
            logger_1.logger.error('Error starting A/B test', error, { testId });
            throw error;
        }
    }
    async stopABTest(testId) {
        try {
            logger_1.logger.info(`Stopping A/B test`, { testId });
            return await this.abTesting.stopABTest(testId);
        }
        catch (error) {
            logger_1.logger.error('Error stopping A/B test', error, { testId });
            throw error;
        }
    }
    async getABTestResults(testId) {
        try {
            logger_1.logger.info(`Getting A/B test results`, { testId });
            return await this.abTesting.getABTestResults(testId);
        }
        catch (error) {
            logger_1.logger.error('Error getting A/B test results', error, { testId });
            throw error;
        }
    }
    async getTestRecommendations(testId) {
        try {
            logger_1.logger.info(`Getting test recommendations`, { testId });
            return await this.abTesting.getTestRecommendations(testId);
        }
        catch (error) {
            logger_1.logger.error('Error getting test recommendations', error, { testId });
            throw error;
        }
    }
    async adaptContentForPlatform(content, targetPlatform) {
        try {
            logger_1.logger.info(`Adapting content for ${targetPlatform}`, { targetPlatform, contentId: content.id });
            const adaptedContent = { ...content };
            switch (targetPlatform) {
                case 'twitter':
                    adaptedContent.content = this.truncateText(content.content, 280);
                    adaptedContent.hashtags = this.limitHashtags(content.hashtags, 3);
                    break;
                case 'linkedin':
                    adaptedContent.content = this.makeProfessional(content.content);
                    adaptedContent.hashtags = this.professionalHashtags(content.hashtags);
                    break;
                case 'facebook':
                    adaptedContent.content = this.makeEngaging(content.content);
                    adaptedContent.hashtags = this.engagingHashtags(content.hashtags);
                    break;
            }
            return adaptedContent;
        }
        catch (error) {
            logger_1.logger.error(`Error adapting content for ${targetPlatform}`, error, { targetPlatform, contentId: content.id });
            throw error;
        }
    }
    async crossPlatformPublish(content, platforms, scheduleAt) {
        try {
            logger_1.logger.info(`Cross-platform publishing`, { platforms: platforms.join(', '), contentId: content.id });
            const results = {
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
                            platform: platform,
                            scheduled,
                        });
                    }
                    else {
                        const published = await this.publishContent(adaptedContent, platform);
                        results.success.push({
                            platform: platform,
                            published,
                        });
                    }
                }
                catch (error) {
                    results.failed.push({
                        platform: platform,
                        error: error.message,
                    });
                }
            }
            logger_1.logger.info(`Cross-platform publishing completed`, { success: results.success.length, failed: results.failed.length });
            return results;
        }
        catch (error) {
            logger_1.logger.error('Error in cross-platform publishing', error);
            throw error;
        }
    }
    validatePlatform(platform) {
        switch (platform) {
            case 'facebook':
                return !!socialMedia_1.default.facebook.accessToken && !!socialMedia_1.default.facebook.pageId;
            case 'twitter':
                return !!socialMedia_1.default.twitter.bearerToken;
            case 'linkedin':
                return !!socialMedia_1.default.linkedin.accessToken;
            default:
                return false;
        }
    }
    async savePublishingResult(content, platform, result) {
        console.log(`Saving publishing result for ${platform}:`, result);
    }
    truncateText(text, maxLength) {
        if (text.length <= maxLength)
            return text;
        return text.substring(0, maxLength - 3) + '...';
    }
    limitHashtags(hashtags, limit) {
        return hashtags.slice(0, limit);
    }
    makeProfessional(text) {
        return text
            .replace(/amazing/gi, 'excellent')
            .replace(/awesome/gi, 'impressive')
            .replace(/great/gi, 'outstanding')
            .replace(/love/gi, 'appreciate')
            .replace(/!/g, '.');
    }
    makeEngaging(text) {
        return text
            .replace(/excellent/gi, 'amazing')
            .replace(/impressive/gi, 'awesome')
            .replace(/outstanding/gi, 'great')
            .replace(/appreciate/gi, 'love')
            + ' 🎉';
    }
    professionalHashtags(hashtags) {
        return hashtags.map(tag => tag.replace(/#dreamhome/gi, '#realestate')
            .replace(/#homesforsale/gi, '#propertyinvestment'));
    }
    engagingHashtags(hashtags) {
        return hashtags.map(tag => tag.replace(/#propertyinvestment/gi, '#dreamhome')
            .replace(/#realestate/gi, '#homesforsale'));
    }
    async getDashboardSummary() {
        try {
            logger_1.logger.info('Generating dashboard summary');
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
        }
        catch (error) {
            logger_1.logger.error('Error generating dashboard summary', error);
            throw error;
        }
    }
    async getRecentActivity() {
        return [
            { type: 'publish', platform: 'facebook', timestamp: new Date() },
            { type: 'schedule', platform: 'twitter', timestamp: new Date() },
            { type: 'test', platform: 'linkedin', timestamp: new Date() },
        ];
    }
    async getRecommendations() {
        return [
            'Focus on Facebook content - highest engagement rate',
            'Test different posting times for Twitter',
            'Increase LinkedIn posting frequency',
        ];
    }
}
exports.SocialMediaManager = SocialMediaManager;
exports.default = SocialMediaManager;
//# sourceMappingURL=socialMediaManager.js.map