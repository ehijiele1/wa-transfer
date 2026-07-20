import socialMediaConfig from '../config/socialMedia';
import { PostContent, ScheduledPost, ContentQueue, BulkPublishOptions } from '../types/socialMedia';
import { PlatformAdapterFactory } from './platformAdapters';
import { generateId, createExponentialBackoff } from '../utils';
import SupabaseService from './supabase';

export class SocialMediaScheduler {
  private supabase: SupabaseService;
  private activeQueues: Map<string, ContentQueue> = new Map();
  private retryBackoff = createExponentialBackoff(1000, 30000, 2);

  constructor() {
    this.supabase = new SupabaseService();
  }

  async schedulePost(content: PostContent, platform: 'facebook' | 'twitter' | 'linkedin', scheduledAt: Date): Promise<ScheduledPost> {
    try {
      console.log(`Scheduling post for ${platform} at ${scheduledAt.toISOString()}`);

      // Validate platform configuration
      if (!this.validatePlatform(platform)) {
        throw new Error(`Platform ${platform} is not configured`);
      }

      // Validate content
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

      // Create scheduled post
      const scheduledPost: ScheduledPost = {
        id: generateId(),
        platform,
        content,
        scheduledAt,
        status: 'pending',
        retryCount: 0,
        maxRetries: 3,
      };

      // Save to database
      await this.saveScheduledPost(scheduledPost);

      // Add to processing queue
      await this.addToQueue(scheduledPost);

      console.log(`Post scheduled successfully: ${scheduledPost.id}`);
      return scheduledPost;
    } catch (error) {
      console.error(`Error scheduling post for ${platform}:`, error);
      throw error;
    }
  }

  async bulkSchedulePosts(options: BulkPublishOptions): Promise<ScheduledPost[]> {
    try {
      console.log(`Bulk scheduling ${options.content.length} posts for ${options.platform}`);

      const scheduledPosts: ScheduledPost[] = [];

      for (const content of options.content) {
        try {
          const scheduledAt = options.scheduleAt || new Date(Date.now() + 24 * 60 * 60 * 1000); // Default to 24 hours from now
          
          const scheduledPost = await this.schedulePost(content, options.platform === 'all' ? 'facebook' : options.platform, scheduledAt);
          scheduledPosts.push(scheduledPost);

          // Add delay between posts to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`Error scheduling post in bulk operation:`, error);
          // Continue with next post
        }
      }

      console.log(`Bulk scheduling completed: ${scheduledPosts.length} posts scheduled`);
      return scheduledPosts;
    } catch (error) {
      console.error('Error in bulk scheduling:', error);
      throw error;
    }
  }

  async processScheduledPosts(): Promise<void> {
    try {
      console.log('Processing scheduled posts...');

      // Get all pending posts
      const pendingPosts = await this.getPendingPosts();

      for (const post of pendingPosts) {
        try {
          await this.processSinglePost(post);
        } catch (error) {
          console.error(`Error processing scheduled post ${post.id}:`, error);
          await this.handlePostFailure(post, error);
        }
      }

      console.log('Scheduled posts processing completed');
    } catch (error) {
      console.error('Error processing scheduled posts:', error);
    }
  }

  private async processSinglePost(post: ScheduledPost): Promise<void> {
    const now = new Date();
    
    // Check if it's time to publish
    if (now < post.scheduledAt) {
      return; // Not yet time
    }

    console.log(`Processing scheduled post: ${post.id}`);

    // Update status to processing
    post.status = 'processing';
    await this.updateScheduledPost(post);

    try {
      const adapter = PlatformAdapterFactory.createAdapter(post.platform);
      
      // Publish the post
      const result = await adapter.publish(post.content);
      
      // Update post with publishing result
      post.status = 'published';
      post.content.publishedAt = now;
      
      // Save publishing result
      await this.savePublishingResult(post, result);
      
      console.log(`Post published successfully: ${post.id} - ${result.url || result.postId}`);
    } catch (error) {
      // Handle retry logic
      if (post.retryCount < post.maxRetries) {
        post.retryCount++;
        post.status = 'pending';
        
        // Schedule retry with exponential backoff
        const retryDelay = this.retryBackoff(post.retryCount);
        post.scheduledAt = new Date(Date.now() + retryDelay);
        
        console.log(`Retrying post ${post.id} in ${retryDelay}ms (attempt ${post.retryCount}/${post.maxRetries})`);
      } else {
        post.status = 'failed';
        console.error(`Post ${post.id} failed after ${post.maxRetries} retries`);
      }
      
      await this.updateScheduledPost(post);
      throw error;
    }
  }

  private async handlePostFailure(post: ScheduledPost, error: any): Promise<void> {
    try {
      // Log the failure
      await this.logPostFailure(post, error);
      
      // Update post status
      if (post.retryCount >= post.maxRetries) {
        post.status = 'failed';
        await this.updateScheduledPost(post);
      }
    } catch (loggingError) {
      console.error('Error logging post failure:', loggingError);
    }
  }

  async createContentQueue(platform: 'facebook' | 'twitter' | 'linkedin' | 'all', priority: 'high' | 'medium' | 'low' = 'medium'): Promise<ContentQueue> {
    try {
      console.log(`Creating content queue for ${platform} with priority ${priority}`);

      const queue: ContentQueue = {
        id: generateId(),
        platform,
        posts: [],
        status: 'active',
        priority,
        createdAt: new Date(),
      };

      // Save queue to database
      await this.saveQueue(queue);

      // Add to active queues
      this.activeQueues.set(queue.id, queue);

      console.log(`Content queue created: ${queue.id}`);
      return queue;
    } catch (error) {
      console.error('Error creating content queue:', error);
      throw error;
    }
  }

  async processQueue(queueId: string): Promise<void> {
    try {
      const queue = this.activeQueues.get(queueId);
      if (!queue) {
        throw new Error(`Queue ${queueId} not found`);
      }

      console.log(`Processing queue: ${queueId}`);

      // Filter posts for this queue
      const postsToProcess = queue.posts.filter(post => 
        post.status === 'pending' && new Date() >= post.scheduledAt
      );

      for (const post of postsToProcess) {
        try {
          await this.processSinglePost(post);
        } catch (error) {
          console.error(`Error processing queue post ${post.id}:`, error);
        }
      }

      // Check if queue is complete
      const remainingPosts = queue.posts.filter(post => post.status === 'pending');
      if (remainingPosts.length === 0) {
        queue.status = 'completed';
        queue.processedAt = new Date();
        await this.updateQueue(queue);
      }

      console.log(`Queue processing completed: ${queueId}`);
    } catch (error) {
      console.error('Error processing queue:', error);
      throw error;
    }
  }

  async getQueueStatus(queueId: string): Promise<ContentQueue | undefined> {
    try {
      // Check active queues first
      let queue = this.activeQueues.get(queueId);
      
      if (!queue) {
        // Load from database
        queue = await this.loadQueueFromDatabase(queueId);
        if (queue) {
          this.activeQueues.set(queueId, queue);
        }
      }

      return queue;
    } catch (error) {
      console.error('Error getting queue status:', error);
      return undefined;
    }
  }

  async getAllQueues(): Promise<ContentQueue[]> {
    try {
      const queues = Array.from(this.activeQueues.values());
      
      // If no active queues, load from database
      if (queues.length === 0) {
        return await this.loadAllQueuesFromDatabase();
      }

      return queues;
    } catch (error) {
      console.error('Error getting all queues:', error);
      return [];
    }
  }

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

  private async saveScheduledPost(post: ScheduledPost): Promise<void> {
    // Implementation for saving to database
    console.log(`Saving scheduled post to database: ${post.id}`);
  }

  private async updateScheduledPost(post: ScheduledPost): Promise<void> {
    // Implementation for updating in database
    console.log(`Updating scheduled post in database: ${post.id}`);
  }

  private async getPendingPosts(): Promise<ScheduledPost[]> {
    // Implementation for getting pending posts from database
    console.log('Getting pending posts from database');
    return [];
  }

  private async savePublishingResult(post: ScheduledPost, result: any): Promise<void> {
    // Implementation for saving publishing result
    console.log(`Saving publishing result for post ${post.id}`);
  }

  private async logPostFailure(post: ScheduledPost, error: any): Promise<void> {
    // Implementation for logging failures
    console.log(`Logging failure for post ${post.id}:`, error);
  }

  private async addToQueue(post: ScheduledPost): Promise<void> {
    // Add to appropriate queue
    let queueId = `queue_${post.platform}_default`;
    let queue = this.activeQueues.get(queueId);
    
    if (!queue) {
      queue = await this.createContentQueue(post.platform);
      queueId = queue.id;
    }

    queue.posts.push(post);
    this.activeQueues.set(queueId, queue);
  }

  private async saveQueue(queue: ContentQueue): Promise<void> {
    // Implementation for saving queue to database
    console.log(`Saving queue to database: ${queue.id}`);
  }

  private async updateQueue(queue: ContentQueue): Promise<void> {
    // Implementation for updating queue in database
    console.log(`Updating queue in database: ${queue.id}`);
  }

  private async loadQueueFromDatabase(queueId: string): Promise<ContentQueue | undefined> {
    // Implementation for loading queue from database
    console.log(`Loading queue from database: ${queueId}`);
    return undefined;
  }

  private async loadAllQueuesFromDatabase(): Promise<ContentQueue[]> {
    // Implementation for loading all queues from database
    console.log('Loading all queues from database');
    return [];
  }

  // Utility methods
  async getQueueStatistics(): Promise<any> {
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

  async pauseQueue(queueId: string): Promise<void> {
    const queue = this.activeQueues.get(queueId);
    if (queue) {
      queue.status = 'paused';
      await this.updateQueue(queue);
      console.log(`Queue paused: ${queueId}`);
    }
  }

  async resumeQueue(queueId: string): Promise<void> {
    const queue = this.activeQueues.get(queueId);
    if (queue) {
      queue.status = 'active';
      await this.updateQueue(queue);
      console.log(`Queue resumed: ${queueId}`);
    }
  }

  async clearQueue(queueId: string): Promise<void> {
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

export default SocialMediaScheduler;