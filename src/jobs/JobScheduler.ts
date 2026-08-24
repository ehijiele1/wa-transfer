/**
 * Job Scheduler
 * Manages all scheduled jobs and periodic processing
 */

import { logger } from '../utils/logger';
import { queueManager } from '../queues/queueManager';
import { QueueProcessors } from '../queues/processors';
import { SocialMediaPublishingJob } from './SocialMediaPublishingJob';
import { ContentGenerationJob } from './ContentGenerationJob';
import cron from 'node-cron';

export class JobScheduler {
  private cronJobs: cron.ScheduledTask[] = [];
  private isRunning: boolean = false;
  private socialMediaPublishingJob: SocialMediaPublishingJob | null = null;
  private contentGenerationJob: ContentGenerationJob | null = null;

  constructor() {}

  getSocialMediaPublishingJob(): SocialMediaPublishingJob {
    if (!this.socialMediaPublishingJob) {
      this.socialMediaPublishingJob = new SocialMediaPublishingJob();
    }
    return this.socialMediaPublishingJob;
  }

  getContentGenerationJob(): ContentGenerationJob {
    if (!this.contentGenerationJob) {
      this.contentGenerationJob = new ContentGenerationJob();
    }
    return this.contentGenerationJob;
  }

  async start(): Promise<void> {
    logger.info('Starting job scheduler');
    this.isRunning = true;

    // Setup queue workers
    QueueProcessors.setupWorkers(queueManager);

    // Schedule periodic jobs
    this.schedulePeriodicJobs();

    logger.info('Job scheduler started');
  }

  async stop(): Promise<void> {
    logger.info('Stopping job scheduler');
    this.isRunning = false;

    // Stop all cron jobs
    for (const job of this.cronJobs) {
      job.stop();
    }
    this.cronJobs = [];

    // Close queue manager
    await queueManager.close();

    logger.info('Job scheduler stopped');
  }

  private schedulePeriodicJobs(): void {
    // Process messages every 30 seconds
    const messageJob = cron.schedule('*/30 * * * * *', async () => {
      if (!this.isRunning) return;
      await this.executeMessageProcessing();
    });

    // Process social media queues every minute
    const socialMediaJob = cron.schedule('* * * * *', async () => {
      if (!this.isRunning) return;
      await this.executeSocialMediaProcessing();
    });

    // Generate Instagram carousels every 5 minutes
    const instagramJob = cron.schedule('*/5 * * * *', async () => {
      if (!this.isRunning) return;
      await this.executeContentGeneration();
    });

    this.cronJobs.push(messageJob, socialMediaJob, instagramJob);

    logger.info('Periodic jobs scheduled', {
      messageJob: 'every 30s',
      socialMediaJob: 'every 1m',
      instagramJob: 'every 5m',
    });
  }

  async executeMessageProcessing(): Promise<any> {
    logger.info('Executing message processing job');

    try {
      // Add job to queue for processing
      await queueManager.addJob('message-processing', {
        id: `msg-${Date.now()}`,
        type: 'process_messages',
        payload: {},
        priority: 'high',
        attempts: 3,
        maxAttempts: 3,
      });

      return { success: true };
    } catch (error: any) {
      logger.error('Failed to execute message processing', error);
      return { success: false, error: error.message };
    }
  }

  async executeContentGeneration(): Promise<any> {
    logger.info('Executing content generation job');

    try {
      const SupabaseService = (await import('../services/supabase')).default;
      const supabase = new SupabaseService();

      // Get unprocessed properties
      const properties = await supabase.getUnprocessedProperties();
      
      for (const property of properties) {
        await queueManager.addJob('instagram-carousels', {
          id: `carousel-${property.id}`,
          type: 'generate_carousel',
          payload: { propertyId: property.id },
          priority: 'medium',
          attempts: 2,
          maxAttempts: 2,
        });
      }

      return { success: true, count: properties.length };
    } catch (error: any) {
      logger.error('Failed to execute content generation', error);
      return { success: false, error: error.message };
    }
  }

  async executeSocialMediaProcessing(): Promise<any> {
    logger.info('Executing social media processing job');
    
    try {
      const SupabaseService = (await import('../services/supabase')).default;
      const supabase = new SupabaseService();

      // Get pending scheduled posts
      const posts = await supabase.getPendingScheduledPosts();
      
      for (const post of posts) {
        await queueManager.addJob('scheduled-posts', {
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
    } catch (error: any) {
      logger.error('Failed to execute social media processing', error);
      return { success: false, error: error.message };
    }
  }

  // Job status methods
  getJobStatus(): any {
    return {
      isRunning: this.isRunning,
      cronJobs: this.cronJobs.map(job => ({
        running: (job as any).running?.() ?? false,
        nextTick: (job as any).nextTickDS ?? (job as any).nextTick?.() ?? null,
      })),
    };
  }

  async getHealth(): Promise<any> {
    const queueStats = await queueManager.getQueueStats('scheduled-posts');
    
    return {
      scheduler: {
        running: this.isRunning,
        cronJobsCount: this.cronJobs.length,
      },
      queues: queueStats,
    };
  }
}