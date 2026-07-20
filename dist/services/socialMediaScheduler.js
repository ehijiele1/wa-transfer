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
class SocialMediaScheduler {
    supabase;
    activeQueues = new Map();
    retryBackoff = (0, utils_1.createExponentialBackoff)(1000, 30000, 2);
    constructor() {
        this.supabase = new supabase_1.default();
    }
    async schedulePost(content, platform, scheduledAt) {
        try {
            console.log(`Scheduling post for ${platform} at ${scheduledAt.toISOString()}`);
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
            const scheduledPost = {
                id: (0, utils_1.generateId)(),
                platform,
                content,
                scheduledAt,
                status: 'pending',
                retryCount: 0,
                maxRetries: 3,
            };
            await this.saveScheduledPost(scheduledPost);
            await this.addToQueue(scheduledPost);
            console.log(`Post scheduled successfully: ${scheduledPost.id}`);
            return scheduledPost;
        }
        catch (error) {
            console.error(`Error scheduling post for ${platform}:`, error);
            throw error;
        }
    }
    async bulkSchedulePosts(options) {
        try {
            console.log(`Bulk scheduling ${options.content.length} posts for ${options.platform}`);
            const scheduledPosts = [];
            for (const content of options.content) {
                try {
                    const scheduledAt = options.scheduleAt || new Date(Date.now() + 24 * 60 * 60 * 1000);
                    const scheduledPost = await this.schedulePost(content, options.platform === 'all' ? 'facebook' : options.platform, scheduledAt);
                    scheduledPosts.push(scheduledPost);
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
                catch (error) {
                    console.error(`Error scheduling post in bulk operation:`, error);
                }
            }
            console.log(`Bulk scheduling completed: ${scheduledPosts.length} posts scheduled`);
            return scheduledPosts;
        }
        catch (error) {
            console.error('Error in bulk scheduling:', error);
            throw error;
        }
    }
    async processScheduledPosts() {
        try {
            console.log('Processing scheduled posts...');
            const pendingPosts = await this.getPendingPosts();
            for (const post of pendingPosts) {
                try {
                    await this.processSinglePost(post);
                }
                catch (error) {
                    console.error(`Error processing scheduled post ${post.id}:`, error);
                    await this.handlePostFailure(post, error);
                }
            }
            console.log('Scheduled posts processing completed');
        }
        catch (error) {
            console.error('Error processing scheduled posts:', error);
        }
    }
    async processSinglePost(post) {
        const now = new Date();
        if (now < post.scheduledAt) {
            return;
        }
        console.log(`Processing scheduled post: ${post.id}`);
        post.status = 'processing';
        await this.updateScheduledPost(post);
        try {
            const adapter = platformAdapters_1.PlatformAdapterFactory.createAdapter(post.platform);
            const result = await adapter.publish(post.content);
            post.status = 'published';
            post.content.publishedAt = now;
            await this.savePublishingResult(post, result);
            console.log(`Post published successfully: ${post.id} - ${result.url || result.postId}`);
        }
        catch (error) {
            if (post.retryCount < post.maxRetries) {
                post.retryCount++;
                post.status = 'pending';
                const retryDelay = this.retryBackoff(post.retryCount);
                post.scheduledAt = new Date(Date.now() + retryDelay);
                console.log(`Retrying post ${post.id} in ${retryDelay}ms (attempt ${post.retryCount}/${post.maxRetries})`);
            }
            else {
                post.status = 'failed';
                console.error(`Post ${post.id} failed after ${post.maxRetries} retries`);
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
            console.error('Error logging post failure:', loggingError);
        }
    }
    async createContentQueue(platform, priority = 'medium') {
        try {
            console.log(`Creating content queue for ${platform} with priority ${priority}`);
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
            console.log(`Content queue created: ${queue.id}`);
            return queue;
        }
        catch (error) {
            console.error('Error creating content queue:', error);
            throw error;
        }
    }
    async processQueue(queueId) {
        try {
            const queue = this.activeQueues.get(queueId);
            if (!queue) {
                throw new Error(`Queue ${queueId} not found`);
            }
            console.log(`Processing queue: ${queueId}`);
            const postsToProcess = queue.posts.filter(post => post.status === 'pending' && new Date() >= post.scheduledAt);
            for (const post of postsToProcess) {
                try {
                    await this.processSinglePost(post);
                }
                catch (error) {
                    console.error(`Error processing queue post ${post.id}:`, error);
                }
            }
            const remainingPosts = queue.posts.filter(post => post.status === 'pending');
            if (remainingPosts.length === 0) {
                queue.status = 'completed';
                queue.processedAt = new Date();
                await this.updateQueue(queue);
            }
            console.log(`Queue processing completed: ${queueId}`);
        }
        catch (error) {
            console.error('Error processing queue:', error);
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
            console.error('Error getting queue status:', error);
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
            console.error('Error getting all queues:', error);
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
        console.log(`Saving scheduled post to database: ${post.id}`);
    }
    async updateScheduledPost(post) {
        console.log(`Updating scheduled post in database: ${post.id}`);
    }
    async getPendingPosts() {
        console.log('Getting pending posts from database');
        return [];
    }
    async savePublishingResult(post, result) {
        console.log(`Saving publishing result for post ${post.id}`);
    }
    async logPostFailure(post, error) {
        console.log(`Logging failure for post ${post.id}:`, error);
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
        console.log(`Saving queue to database: ${queue.id}`);
    }
    async updateQueue(queue) {
        console.log(`Updating queue in database: ${queue.id}`);
    }
    async loadQueueFromDatabase(queueId) {
        console.log(`Loading queue from database: ${queueId}`);
        return undefined;
    }
    async loadAllQueuesFromDatabase() {
        console.log('Loading all queues from database');
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
            console.log(`Queue paused: ${queueId}`);
        }
    }
    async resumeQueue(queueId) {
        const queue = this.activeQueues.get(queueId);
        if (queue) {
            queue.status = 'active';
            await this.updateQueue(queue);
            console.log(`Queue resumed: ${queueId}`);
        }
    }
    async clearQueue(queueId) {
        const queue = this.activeQueues.get(queueId);
        if (queue) {
            queue.posts = [];
            queue.status = 'completed';
            await this.updateQueue(queue);
            this.activeQueues.delete(queueId);
            console.log(`Queue cleared: ${queueId}`);
        }
    }
}
exports.SocialMediaScheduler = SocialMediaScheduler;
exports.default = SocialMediaScheduler;
//# sourceMappingURL=socialMediaScheduler.js.map