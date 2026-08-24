"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocialMediaPublishingJob = void 0;
const socialMediaManager_1 = __importDefault(require("../services/socialMediaManager"));
const supabase_1 = __importDefault(require("../services/supabase"));
class SocialMediaPublishingJob {
    socialMediaManager = null;
    supabaseService;
    isRunning = false;
    constructor() {
        this.supabaseService = new supabase_1.default();
        try {
            this.socialMediaManager = new socialMediaManager_1.default();
        }
        catch (error) {
            console.warn('⚠️ Social media manager not fully configured:', error.message);
        }
    }
    async start() {
        try {
            console.log('📢 Starting Social Media Publishing Job...');
            if (!this.socialMediaManager) {
                console.log('⚠️ Social media manager not available, publishing will be limited');
            }
            this.isRunning = true;
            console.log('✅ Social Media Publishing Job started successfully');
        }
        catch (error) {
            console.error('❌ Failed to start Social Media Publishing Job:', error);
            throw error;
        }
    }
    async processQueues() {
        if (!this.socialMediaManager) {
            console.log('⚠️ Social media manager not available, skipping queue processing');
            return { processed: 0, failed: 0 };
        }
        try {
            console.log('📋 Processing social media queues...');
            await this.socialMediaManager.processQueues();
            console.log(`✅ Social media queue processing completed`);
            return { processed: 1, failed: 0 };
        }
        catch (error) {
            console.error('❌ Error processing social media queues:', error);
            throw error;
        }
    }
    async publishToSocialMedia(content, platforms, scheduleAt) {
        if (!this.socialMediaManager) {
            throw new Error('Social media manager not initialized');
        }
        try {
            console.log(`📤 Publishing to social media platforms: ${platforms.join(', ')}`);
            const results = await this.socialMediaManager.crossPlatformPublish(content, platforms, scheduleAt);
            console.log('✅ Cross-platform publishing completed');
            return results;
        }
        catch (error) {
            console.error('❌ Error publishing to social media:', error);
            return { success: false, error: error.message };
        }
    }
    async createQueue(platform, priority) {
        if (!this.socialMediaManager) {
            throw new Error('Social media manager not initialized');
        }
        try {
            console.log(`📦 Creating social media queue for ${platform} with priority ${priority}`);
            const queue = await this.socialMediaManager.createQueue(platform, priority);
            console.log(`✅ Queue created: ${queue.id}`);
            return queue;
        }
        catch (error) {
            console.error('❌ Error creating social media queue:', error);
            return { success: false, error: error.message };
        }
    }
    async getQueueStatus(platform) {
        if (!this.socialMediaManager) {
            throw new Error('Social media manager not initialized');
        }
        try {
            console.log(`📊 Getting queue status for ${platform || 'all platforms'}`);
            const status = await this.socialMediaManager.getQueueStatus(platform || 'all');
            console.log('✅ Queue status retrieved');
            return status;
        }
        catch (error) {
            console.error('❌ Error getting queue status:', error);
            return { success: false, error: error.message };
        }
    }
    async clearQueue(platform, status) {
        if (!this.socialMediaManager) {
            throw new Error('Social media manager not initialized');
        }
        try {
            console.log(`🗑️ Clearing queue for ${platform} with status ${status || 'all'}`);
            console.log('⚠️ Queue clearing not fully implemented for this platform');
            return { success: true, message: 'Queue clearing logged' };
        }
        catch (error) {
            console.error('❌ Error clearing queue:', error);
            return { success: false, error: error.message };
        }
    }
    async getAnalytics(platform, dateRange) {
        if (!this.socialMediaManager) {
            throw new Error('Social media manager not initialized');
        }
        try {
            console.log(`📊 Getting social media analytics for ${platform || 'all platforms'}`);
            if (dateRange) {
                return await this.socialMediaManager.getPlatformAnalytics(platform || 'all', dateRange);
            }
            else {
                const last30Days = {
                    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    end: new Date(),
                };
                return await this.socialMediaManager.getCrossPlatformAnalytics(last30Days);
            }
        }
        catch (error) {
            console.error('❌ Error getting social media analytics:', error);
            return { success: false, error: error.message };
        }
    }
    async getDashboard() {
        if (!this.socialMediaManager) {
            throw new Error('Social media manager not initialized');
        }
        try {
            console.log('📈 Generating social media dashboard summary');
            const dashboard = await this.socialMediaManager.getDashboardSummary();
            console.log('✅ Dashboard summary generated');
            return dashboard;
        }
        catch (error) {
            console.error('❌ Error generating social media dashboard:', error);
            return { success: false, error: error.message };
        }
    }
    async createABTest(testConfig) {
        if (!this.socialMediaManager) {
            throw new Error('Social media manager not initialized');
        }
        try {
            console.log('🧪 Creating A/B test for social media');
            const test = await this.socialMediaManager.createABTest(testConfig);
            console.log(`✅ A/B test created: ${test.id}`);
            return test;
        }
        catch (error) {
            console.error('❌ Error creating A/B test:', error);
            return { success: false, error: error.message };
        }
    }
    async getABTestResults(testId) {
        if (!this.socialMediaManager) {
            throw new Error('Social media manager not initialized');
        }
        try {
            console.log(`📊 Getting A/B test results: ${testId}`);
            const results = await this.socialMediaManager.getABTestResults(testId);
            console.log('✅ A/B test results retrieved');
            return results;
        }
        catch (error) {
            console.error('❌ Error getting A/B test results:', error);
            return { success: false, error: error.message };
        }
    }
    async stop() {
        try {
            console.log('🛑 Stopping Social Media Publishing Job...');
            this.isRunning = false;
            console.log('✅ Social Media Publishing Job stopped successfully');
        }
        catch (error) {
            console.error('❌ Error stopping Social Media Publishing Job:', error);
            throw error;
        }
    }
    getStatus() {
        return {
            isRunning: this.isRunning,
            managerAvailable: !!this.socialMediaManager
        };
    }
}
exports.SocialMediaPublishingJob = SocialMediaPublishingJob;
//# sourceMappingURL=SocialMediaPublishingJob.js.map