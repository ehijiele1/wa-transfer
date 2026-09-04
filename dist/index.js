"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const JobScheduler_1 = require("./jobs/JobScheduler");
const config_1 = __importDefault(require("./config"));
const logger_1 = require("./utils/logger");
const health_1 = require("./api/health");
const healthServer_1 = require("./services/healthServer");
const MessageProcessingJob_1 = require("./jobs/MessageProcessingJob");
class WhatsAppMonitoringApp {
    jobScheduler;
    messageJob;
    isRunning = false;
    constructor() {
        this.jobScheduler = new JobScheduler_1.JobScheduler();
        this.messageJob = new MessageProcessingJob_1.MessageProcessingJob();
    }
    async start() {
        try {
            logger_1.logger.info('🚀 Starting WhatsApp Monitoring Application...');
            logger_1.logger.info('📋 Configuration', {
                supabase: config_1.default.supabase.url ? 'configured' : 'missing',
                whatsapp: { sessionId: config_1.default.whatsapp.sessionId },
                monitoring: { groups: config_1.default.monitoring.groups },
                ollama: { baseUrl: config_1.default.ollama.baseUrl }
            });
            await this.jobScheduler.start();
            await healthServer_1.healthServer.start();
            this.messageJob.start().catch(e => logger_1.logger.warn('MessageProcessingJob start failed, will retry via health checks', { error: e.message }));
            this.isRunning = true;
            logger_1.logger.info('✅ WhatsApp Monitoring Application started successfully');
        }
        catch (error) {
            logger_1.logger.error('❌ Failed to start application', error);
            throw error;
        }
    }
    async publishToSocialMedia(content, platforms, scheduleAt) {
        try {
            logger_1.logger.info(`📤 Publishing to social media platforms: ${platforms.join(', ')}`);
            const socialMediaJob = this.jobScheduler.getSocialMediaPublishingJob();
            const results = await socialMediaJob.publishToSocialMedia(content, platforms, scheduleAt);
            return results;
        }
        catch (error) {
            logger_1.logger.error('❌ Error publishing to social media', error, { platforms });
            return { success: false, error: error.message };
        }
    }
    async getSocialMediaAnalytics(platform, dateRange) {
        try {
            logger_1.logger.info(`📊 Getting social media analytics for ${platform || 'all platforms'}`);
            const socialMediaJob = this.jobScheduler.getSocialMediaPublishingJob();
            if (dateRange) {
                return await socialMediaJob.getAnalytics(platform, dateRange);
            }
            else {
                return await socialMediaJob.getAnalytics();
            }
        }
        catch (error) {
            logger_1.logger.error('❌ Error getting social media analytics', error, { ...(platform ? { platform } : {}), dateRange });
            return { success: false, error: error.message };
        }
    }
    async createSocialMediaQueue(platform, priority) {
        try {
            logger_1.logger.info(`📦 Creating social media queue for ${platform}`);
            const socialMediaJob = this.jobScheduler.getSocialMediaPublishingJob();
            return await socialMediaJob.createQueue(platform, priority);
        }
        catch (error) {
            logger_1.logger.error('❌ Error creating social media queue', error, { platform, priority });
            return { success: false, error: error.message };
        }
    }
    async getSocialMediaDashboard() {
        try {
            logger_1.logger.info('📈 Generating social media dashboard summary');
            const socialMediaJob = this.jobScheduler.getSocialMediaPublishingJob();
            return await socialMediaJob.getDashboard();
        }
        catch (error) {
            logger_1.logger.error('❌ Error generating social media dashboard', error);
            return { success: false, error: error.message };
        }
    }
    async createABTest(testConfig) {
        try {
            logger_1.logger.info('🧪 Creating A/B test for social media');
            const socialMediaJob = this.jobScheduler.getSocialMediaPublishingJob();
            return await socialMediaJob.createABTest(testConfig);
        }
        catch (error) {
            logger_1.logger.error('❌ Error creating A/B test', error, { testConfig });
            return { success: false, error: error.message };
        }
    }
    async getABTestResults(testId) {
        try {
            logger_1.logger.info(`📊 Getting A/B test results: ${testId}`);
            const socialMediaJob = this.jobScheduler.getSocialMediaPublishingJob();
            return await socialMediaJob.getABTestResults(testId);
        }
        catch (error) {
            logger_1.logger.error('❌ Error getting A/B test results', error, { testId });
            return { success: false, error: error.message };
        }
    }
    async generateInstagramCarousel(propertyId) {
        try {
            logger_1.logger.info(`🎨 Generating Instagram carousel for property ${propertyId}...`);
            const contentJob = this.jobScheduler.getContentGenerationJob();
            return await contentJob.generateSingleCarousel(propertyId);
        }
        catch (error) {
            logger_1.logger.error('❌ Error generating carousel for property', error, { propertyId });
            return { success: false, error: error.message };
        }
    }
    async publishInstagramCarousel(carouselId) {
        try {
            logger_1.logger.info(`📤 Publishing Instagram carousel ${carouselId}...`);
            const contentJob = this.jobScheduler.getContentGenerationJob();
            return await contentJob.publishSingleCarousel(carouselId);
        }
        catch (error) {
            logger_1.logger.error('❌ Error publishing Instagram carousel', error, { carouselId });
            return { success: false, error: error.message };
        }
    }
    async getInstagramAnalytics() {
        try {
            logger_1.logger.info('📊 Getting Instagram analytics...');
            const contentJob = this.jobScheduler.getContentGenerationJob();
            return await contentJob.getInstagramAnalytics();
        }
        catch (error) {
            logger_1.logger.error('❌ Error getting Instagram analytics', error);
            return { success: false, error: error.message };
        }
    }
    async batchPublishInstagram() {
        try {
            logger_1.logger.info('📦 Starting batch Instagram publish...');
            const contentJob = this.jobScheduler.getContentGenerationJob();
            return await contentJob.batchPublishCarousels();
        }
        catch (error) {
            logger_1.logger.error('❌ Error in batch Instagram publish', error);
            return { success: false, error: error.message };
        }
    }
    async stop() {
        try {
            logger_1.logger.info('🛑 Stopping WhatsApp Monitoring Application...');
            this.isRunning = false;
            await this.messageJob.stop().catch(() => { });
            await this.jobScheduler.stop();
            await (0, healthServer_1.stopHealthServer)();
            logger_1.logger.info('✅ WhatsApp Monitoring Application stopped successfully');
        }
        catch (error) {
            logger_1.logger.error('❌ Error stopping application', error);
            throw error;
        }
    }
    getStatus() {
        return {
            isRunning: this.isRunning,
            jobs: this.jobScheduler.getJobStatus()
        };
    }
    getHealth() {
        return this.jobScheduler.getHealth();
    }
    async getSystemHealth() {
        return await health_1.healthChecker.checkHealth();
    }
    async executeMessageProcessing() {
        return await this.jobScheduler.executeMessageProcessing();
    }
    async executeContentGeneration() {
        return await this.jobScheduler.executeContentGeneration();
    }
    async executeSocialMediaProcessing() {
        return await this.jobScheduler.executeSocialMediaProcessing();
    }
}
async function main() {
    const app = new WhatsAppMonitoringApp();
    process.on('SIGINT', async () => {
        logger_1.logger.info('Received SIGINT, shutting down gracefully...');
        await app.stop();
        process.exit(0);
    });
    process.on('SIGTERM', async () => {
        logger_1.logger.info('Received SIGTERM, shutting down gracefully...');
        await app.stop();
        process.exit(0);
    });
    try {
        await app.start();
    }
    catch (error) {
        logger_1.logger.error('Application failed to start', error);
        process.exit(1);
    }
}
if (typeof require !== 'undefined' && require.main === module) {
    main();
}
exports.default = WhatsAppMonitoringApp;
//# sourceMappingURL=index.js.map