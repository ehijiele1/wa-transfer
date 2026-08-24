"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocialMediaScheduler = void 0;
const socialMedia_1 = __importDefault(require("../config/socialMedia"));
const platformAdapters_1 = require("./platformAdapters");
const utils_1 = require("../utils");
const supabase_1 = __importDefault(require("./supabase"));
const retryHelper_1 = require("./retryHelper");
const logger_1 = require("../utils/logger");
class SocialMediaScheduler {
    supabase;
    activeQueues = new Map();
    retryBackoff = (0, utils_1.createExponentialBackoff)(1000, 30000, 2);
    constructor() {
        this.supabase = new supabase_1.default();
    }
    async schedulePost(content, platform, scheduledAt) {
        try {
            logger_1.logger.info(`Scheduling post`, { platform, scheduledAt: scheduledAt.toISOString() });
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
            const idempotencyKey = await this.getIdempotencyKey(content, platform);
            const alreadyExists = await this.checkIdempotency(idempotencyKey);
            if (alreadyExists) {
                throw new Error(`Post with idempotency key ${idempotencyKey} already exists`);
            }
            const scheduledPost = {
                id: (0, utils_1.generateId)(),
                platform,
                content,
                scheduledAt,
                status: 'pending',
                retryCount: 0,
                maxRetries: 3,
                idempotencyKey,
            };
            await this.saveScheduledPost(scheduledPost);
            await this.addToQueue(scheduledPost);
            logger_1.logger.info(`Post scheduled successfully`, { postId: scheduledPost.id });
            return scheduledPost;
        }
        catch (error) {
            logger_1.logger.error(`Error scheduling post`, error, { platform, scheduledAt: scheduledAt.toISOString() });
            throw error;
        }
    }
    async bulkSchedulePosts(options) {
        try {
            logger_1.logger.info(`Bulk scheduling posts`, { count: options.content.length, platform: options.platform });
            const scheduledPosts = [];
            for (const content of options.content) {
                try {
                    const scheduledAt = options.scheduleAt || new Date(Date.now() + 24 * 60 * 60 * 1000);
                    const scheduledPost = await this.schedulePost(content, options.platform === 'all' ? 'facebook' : options.platform, scheduledAt);
                    scheduledPosts.push(scheduledPost);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                catch (error) {
                    logger_1.logger.error(`Error scheduling post in bulk operation`, error);
                }
            }
            logger_1.logger.info(`Bulk scheduling completed`, { count: scheduledPosts.length });
            return scheduledPosts;
        }
        catch (error) {
            logger_1.logger.error('Error in bulk scheduling', error);
            throw error;
        }
    }
    async processScheduledPosts() {
        try {
            logger_1.logger.info('Processing scheduled posts');
            const pendingPosts = await this.getPendingPosts();
            for (const post of pendingPosts) {
                try {
                    await this.processSinglePost(post);
                }
                catch (error) {
                    logger_1.logger.error(`Error processing scheduled post`, error, { postId: post.id });
                    await this.handlePostFailure(post, error);
                }
            }
            logger_1.logger.info('Scheduled posts processing completed');
        }
        catch (error) {
            logger_1.logger.error('Error processing scheduled posts', error);
        }
    }
    async processSinglePost(post) {
        const now = new Date();
        if (now < post.scheduledAt) {
            return;
        }
        logger_1.logger.info(`Processing scheduled post`, { postId: post.id });
        post.status = 'processing';
        await this.updateScheduledPost(post);
        try {
            const adapter = platformAdapters_1.PlatformAdapterFactory.createAdapter(post.platform);
            const result = await adapter.publish(post.content);
            post.status = 'published';
            post.content.publishedAt = now;
            await this.savePublishingResult(post, result);
            logger_1.logger.info(`Post published successfully`, { postId: post.id, resultUrl: result.url, resultPostId: result.postId });
        }
        catch (error) {
            if (post.retryCount < post.maxRetries) {
                post.retryCount++;
                post.status = 'pending';
                const retryDelay = this.retryBackoff(post.retryCount);
                post.scheduledAt = new Date(Date.now() + retryDelay);
                logger_1.logger.info(`Retrying post`, { postId: post.id, retryDelay, attempt: post.retryCount, maxRetries: post.maxRetries });
            }
            else {
                post.status = 'failed';
                logger_1.logger.error(`Post failed after retries`, undefined, { postId: post.id, maxRetries: post.maxRetries });
            }
            await this.updateScheduledPost(post);
            throw error;
        }
    }
    async handlePostFailure(post, error) {
        try {
            await this.logPostFailure(post, error);
            if (post.retryCount >= post.maxRetries) {
                post.status = 'failed';
                await this.updateScheduledPost(post);
            }
        }
        catch (loggingError) {
            logger_1.logger.error('Error logging post failure', loggingError);
        }
    }
    async createContentQueue(platform, priority = 'medium') {
        try {
            logger_1.logger.info(`Creating content queue`, { platform, priority });
            const queue = {
                id: (0, utils_1.generateId)(),
                platform,
                posts: [],
                status: 'active',
                priority,
                createdAt: new Date(),
            };
            await this.saveQueue(queue);
            this.activeQueues.set(queue.id, queue);
            logger_1.logger.info(`Content queue created`, { queueId: queue.id });
            return queue;
        }
        catch (error) {
            logger_1.logger.error('Error creating content queue', error);
            throw error;
        }
    }
    async processQueue(queueId) {
        try {
            const queue = this.activeQueues.get(queueId);
            if (!queue) {
                throw new Error(`Queue ${queueId} not found`);
            }
            logger_1.logger.info(`Processing queue`, { queueId });
            const postsToProcess = queue.posts.filter(post => post.status === 'pending' && new Date() >= post.scheduledAt);
            for (const post of postsToProcess) {
                try {
                    await this.processSinglePost(post);
                }
                catch (error) {
                    logger_1.logger.error(`Error processing queue post`, error, { postId: post.id });
                }
            }
            const remainingPosts = queue.posts.filter(post => post.status === 'pending');
            if (remainingPosts.length === 0) {
                queue.status = 'completed';
                queue.processedAt = new Date();
                await this.updateQueue(queue);
            }
            logger_1.logger.info(`Queue processing completed`, { queueId });
        }
        catch (error) {
            logger_1.logger.error('Error processing queue', error);
            throw error;
        }
    }
    async getQueueStatus(queueId) {
        try {
            let queue = this.activeQueues.get(queueId);
            if (!queue) {
                queue = await this.loadQueueFromDatabase(queueId);
                if (queue) {
                    this.activeQueues.set(queueId, queue);
                }
            }
            return queue;
        }
        catch (error) {
            logger_1.logger.error('Error getting queue status', error);
            return undefined;
        }
    }
    async getAllQueues() {
        try {
            const queues = Array.from(this.activeQueues.values());
            if (queues.length === 0) {
                return await this.loadAllQueuesFromDatabase();
            }
            return queues;
        }
        catch (error) {
            logger_1.logger.error('Error getting all queues', error);
            return [];
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
    async saveScheduledPost(post) {
        return retryHelper_1.RetryHelper.withExponentialBackoff(async () => {
            const { error } = await this.supabase.getClient()
                .from('social_media_scheduled_posts')
                .insert({
                id: post.id,
                platform: post.platform,
                content_id: post.content.id,
                scheduled_at: post.scheduledAt.toISOString(),
                status: post.status,
                retry_count: post.retryCount,
                max_retries: post.maxRetries,
                error_message: null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });
            if (error) {
                logger_1.logger.error(`Error saving scheduled post`, error, { message: error.message });
                throw error;
            }
        }, {
            maxAttempts: 3,
            baseDelayMs: 1000,
            maxDelayMs: 5000,
            jitter: true,
        });
    }
    async updateScheduledPost(post) {
        return retryHelper_1.RetryHelper.withExponentialBackoff(async () => {
            const { error } = await this.supabase.getClient()
                .from('social_media_scheduled_posts')
                .update({
                status: post.status,
                retry_count: post.retryCount,
                error_message: post.errorMessage,
                updated_at: new Date().toISOString(),
            })
                .eq('id', post.id);
            if (error) {
                logger_1.logger.error(`Error updating scheduled post`, error, { message: error.message });
                throw error;
            }
        }, {
            maxAttempts: 3,
            baseDelayMs: 1000,
            maxDelayMs: 5000,
            jitter: true,
        });
    }
    async getPendingPosts() {
        return retryHelper_1.RetryHelper.withExponentialBackoff(async () => {
            const { data, error } = await this.supabase.getClient()
                .from('social_media_scheduled_posts')
                .select('*')
                .eq('status', 'pending')
                .lte('scheduled_at', new Date().toISOString())
                .limit(50);
            if (error) {
                logger_1.logger.error(`Error getting pending posts`, error, { message: error.message });
                throw error;
            }
            return data?.map((row) => ({
                id: row.id,
                platform: row.platform,
                content: {
                    id: row.content_id,
                    platform: row.platform,
                    type: 'text',
                    title: '',
                    content: '',
                    mediaUrls: [],
                    hashtags: [],
                    mentions: [],
                    status: 'draft',
                },
                scheduledAt: new Date(row.scheduled_at),
                status: row.status,
                retryCount: row.retry_count,
                maxRetries: row.max_retries,
                errorMessage: row.error_message,
                idempotencyKey: row.idempotency_key,
            })) || [];
        }, {
            maxAttempts: 3,
            baseDelayMs: 1000,
            maxDelayMs: 5000,
            jitter: true,
        });
    }
    async savePublishingResult(post, result) {
        return retryHelper_1.RetryHelper.withExponentialBackoff(async () => {
            const { error } = await this.supabase.getClient()
                .from('social_media_scheduled_posts')
                .update({
                status: 'published',
                published_at: new Date().toISOString(),
                metadata: result,
                updated_at: new Date().toISOString(),
            })
                .eq('id', post.id);
            if (error) {
                logger_1.logger.error(`Error saving publishing result`, error, { message: error.message });
                throw error;
            }
        }, {
            maxAttempts: 3,
            baseDelayMs: 1000,
            maxDelayMs: 5000,
            jitter: true,
        });
    }
    async logPostFailure(post, error) {
        return retryHelper_1.RetryHelper.withExponentialBackoff(async () => {
            const { error: updateError } = await this.supabase.getClient()
                .from('social_media_scheduled_posts')
                .update({
                retry_count: post.retryCount,
                error_message: error.message,
                updated_at: new Date().toISOString(),
            })
                .eq('id', post.id);
            if (updateError) {
                logger_1.logger.error(`Error logging post failure`, updateError, { message: updateError.message });
                throw updateError;
            }
        }, {
            maxAttempts: 3,
            baseDelayMs: 1000,
            maxDelayMs: 5000,
            jitter: true,
        });
    }
    async addToQueue(post) {
        let queueId = `queue_${post.platform}_default`;
        let queue = this.activeQueues.get(queueId);
        if (!queue) {
            queue = await this.createContentQueue(post.platform);
            queueId = queue.id;
        }
        queue.posts.push(post);
        this.activeQueues.set(queueId, queue);
    }
    async saveQueue(queue) {
        logger_1.logger.debug(`Saving queue to memory`, { queueId: queue.id });
    }
    async updateQueue(queue) {
        logger_1.logger.debug(`Updating queue in memory`, { queueId: queue.id });
    }
    async loadQueueFromDatabase(queueId) {
        logger_1.logger.debug(`Loading queue from database`, { queueId });
        return undefined;
    }
    async loadAllQueuesFromDatabase() {
        logger_1.logger.debug('Loading all queues from database');
        return [];
    }
    async getQueueStatistics() {
        const queues = await this.getAllQueues();
        const stats = {
            totalQueues: queues.length,
            activeQueues: queues.filter(q => q.status === 'active').length,
            completedQueues: queues.filter(q => q.status === 'completed').length,
            totalPosts: queues.reduce((sum, q) => sum + q.posts.length, 0),
            pendingPosts: queues.reduce((sum, q) => sum + q.posts.filter(p => p.status === 'pending').length, 0),
            publishedPosts: queues.reduce((sum, q) => sum + q.posts.filter(p => p.status === 'published').length, 0),
            failedPosts: queues.reduce((sum, q) => sum + q.posts.filter(p => p.status === 'failed').length, 0),
        };
        return stats;
    }
    async pauseQueue(queueId) {
        const queue = this.activeQueues.get(queueId);
        if (queue) {
            queue.status = 'paused';
            await this.updateQueue(queue);
            logger_1.logger.info(`Queue paused`, { queueId });
        }
    }
    async resumeQueue(queueId) {
        const queue = this.activeQueues.get(queueId);
        if (queue) {
            queue.status = 'active';
            await this.updateQueue(queue);
            logger_1.logger.info(`Queue resumed`, { queueId });
        }
    }
    async clearQueue(queueId) {
        const queue = this.activeQueues.get(queueId);
        if (queue) {
            queue.posts = [];
            queue.status = 'completed';
            await this.updateQueue(queue);
            this.activeQueues.delete(queueId);
            logger_1.logger.info(`Queue cleared`, { queueId });
        }
    }
    async recoverStuckJobs() {
        try {
            logger_1.logger.info('Recovering stuck jobs');
            const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
            const { data, error } = await this.supabase.getClient()
                .from('social_media_scheduled_posts')
                .select('*')
                .eq('status', 'processing')
                .lt('updated_at', fiveMinutesAgo);
            if (error) {
                logger_1.logger.error(`Error recovering stuck jobs`, error, { message: error.message });
                return;
            }
            if (data && data.length > 0) {
                logger_1.logger.info(`Found stuck jobs, resetting to pending`, { count: data.length });
                for (const post of data) {
                    const { error: updateError } = await this.supabase.getClient()
                        .from('social_media_scheduled_posts')
                        .update({
                        status: 'pending',
                        retry_count: 0,
                        error_message: null,
                        updated_at: new Date().toISOString(),
                    })
                        .eq('id', post.id);
                    if (updateError) {
                        logger_1.logger.error(`Error resetting stuck job`, updateError, { postId: post.id });
                    }
                    else {
                        logger_1.logger.info(`Reset stuck job`, { postId: post.id });
                    }
                }
            }
            logger_1.logger.info('Stuck jobs recovery completed');
        }
        catch (error) {
            logger_1.logger.error('Error during stuck jobs recovery', error);
        }
    }
    async checkIdempotency(idempotencyKey) {
        try {
            const { data, error } = await this.supabase.getClient()
                .from('social_media_scheduled_posts')
                .select('id')
                .eq('idempotency_key', idempotencyKey)
                .eq('status', 'published')
                .limit(1);
            return !!(data && data.length > 0);
        }
        catch (error) {
            logger_1.logger.error('Error checking idempotency', error);
            return false;
        }
    }
    async getIdempotencyKey(content, platform) {
        const contentString = JSON.stringify({
            platform,
            type: content.type,
            title: content.title,
            content: content.content,
            mediaUrls: content.mediaUrls,
        });
        let hash = 0;
        for (let i = 0; i < contentString.length; i++) {
            const char = contentString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return `${platform}_${Math.abs(hash)}_${Date.now()}`;
    }
}
exports.SocialMediaScheduler = SocialMediaScheduler;
exports.default = SocialMediaScheduler;
//# sourceMappingURL=socialMediaScheduler.js.map