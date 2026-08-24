"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobScheduler = void 0;
const logger_1 = require("../utils/logger");
const queueManager_1 = require("../queues/queueManager");
const processors_1 = require("../queues/processors");
const SocialMediaPublishingJob_1 = require("./SocialMediaPublishingJob");
const ContentGenerationJob_1 = require("./ContentGenerationJob");
const node_cron_1 = __importDefault(require("node-cron"));
class JobScheduler {
    cronJobs = [];
    isRunning = false;
    socialMediaPublishingJob = null;
    contentGenerationJob = null;
    constructor() { }
    getSocialMediaPublishingJob() {
        if (!this.socialMediaPublishingJob) {
            this.socialMediaPublishingJob = new SocialMediaPublishingJob_1.SocialMediaPublishingJob();
        }
        return this.socialMediaPublishingJob;
    }
    getContentGenerationJob() {
        if (!this.contentGenerationJob) {
            this.contentGenerationJob = new ContentGenerationJob_1.ContentGenerationJob();
        }
        return this.contentGenerationJob;
    }
    async start() {
        logger_1.logger.info('Starting job scheduler');
        this.isRunning = true;
        processors_1.QueueProcessors.setupWorkers(queueManager_1.queueManager);
        this.schedulePeriodicJobs();
        logger_1.logger.info('Job scheduler started');
    }
    async stop() {
        logger_1.logger.info('Stopping job scheduler');
        this.isRunning = false;
        for (const job of this.cronJobs) {
            job.stop();
        }
        this.cronJobs = [];
        await queueManager_1.queueManager.close();
        logger_1.logger.info('Job scheduler stopped');
    }
    schedulePeriodicJobs() {
        const messageJob = node_cron_1.default.schedule('*/30 * * * * *', async () => {
            if (!this.isRunning)
                return;
            await this.executeMessageProcessing();
        });
        const socialMediaJob = node_cron_1.default.schedule('* * * * *', async () => {
            if (!this.isRunning)
                return;
            await this.executeSocialMediaProcessing();
        });
        const instagramJob = node_cron_1.default.schedule('*/5 * * * *', async () => {
            if (!this.isRunning)
                return;
            await this.executeContentGeneration();
        });
        this.cronJobs.push(messageJob, socialMediaJob, instagramJob);
        logger_1.logger.info('Periodic jobs scheduled', {
            messageJob: 'every 30s',
            socialMediaJob: 'every 1m',
            instagramJob: 'every 5m',
        });
    }
    async executeMessageProcessing() {
        logger_1.logger.info('Executing message processing job');
        try {
            await queueManager_1.queueManager.addJob('message-processing', {
                id: `msg-${Date.now()}`,
                type: 'process_messages',
                payload: {},
                priority: 'high',
                attempts: 3,
                maxAttempts: 3,
            });
            return { success: true };
        }
        catch (error) {
            logger_1.logger.error('Failed to execute message processing', error);
            return { success: false, error: error.message };
        }
    }
    async executeContentGeneration() {
        logger_1.logger.info('Executing content generation job');
        try {
            const SupabaseService = (await Promise.resolve().then(() => __importStar(require('../services/supabase')))).default;
            const supabase = new SupabaseService();
            const properties = await supabase.getUnprocessedProperties();
            for (const property of properties) {
                await queueManager_1.queueManager.addJob('instagram-carousels', {
                    id: `carousel-${property.id}`,
                    type: 'generate_carousel',
                    payload: { propertyId: property.id },
                    priority: 'medium',
                    attempts: 2,
                    maxAttempts: 2,
                });
            }
            return { success: true, count: properties.length };
        }
        catch (error) {
            logger_1.logger.error('Failed to execute content generation', error);
            return { success: false, error: error.message };
        }
    }
    async executeSocialMediaProcessing() {
        logger_1.logger.info('Executing social media processing job');
        try {
            const SupabaseService = (await Promise.resolve().then(() => __importStar(require('../services/supabase')))).default;
            const supabase = new SupabaseService();
            const posts = await supabase.getPendingScheduledPosts();
            for (const post of posts) {
                await queueManager_1.queueManager.addJob('scheduled-posts', {
                    id: `publish-${post.id}`,
                    type: 'publish_post',
                    payload: {
                        postId: post.id,
                        platform: post.platform,
                        content: post.content,
                        scheduledAt: post.scheduled_at,
                    },
                    priority: 'high',
                    attempts: post.retry_count || 0,
                    maxAttempts: 3,
                });
            }
            return { success: true, count: posts.length };
        }
        catch (error) {
            logger_1.logger.error('Failed to execute social media processing', error);
            return { success: false, error: error.message };
        }
    }
    getJobStatus() {
        return {
            isRunning: this.isRunning,
            cronJobs: this.cronJobs.map(job => ({
                running: job.running?.() ?? false,
                nextTick: job.nextTickDS ?? job.nextTick?.() ?? null,
            })),
        };
    }
    async getHealth() {
        const queueStats = await queueManager_1.queueManager.getQueueStats('scheduled-posts');
        return {
            scheduler: {
                running: this.isRunning,
                cronJobsCount: this.cronJobs.length,
            },
            queues: queueStats,
        };
    }
}
exports.JobScheduler = JobScheduler;
//# sourceMappingURL=JobScheduler.js.map