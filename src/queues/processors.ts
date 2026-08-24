/**
 * Queue Processors
 * Defines how each job type is processed
 */

import { Job } from 'bullmq';
import { logger } from '../utils/logger';
import { inputValidator } from '../utils/inputValidator';

export interface SchedulePostJob {
  postId: string;
  platform: string;
  content: any;
  scheduledAt: string;
}

export interface GenerateCarouselJob {
  propertyId: string;
}

export class QueueProcessors {
  static async processSchedulePost(job: Job<SchedulePostJob>): Promise<any> {
    const { postId, platform, content, scheduledAt } = job.data;
    
    logger.info('Processing scheduled post', { postId, platform });
    
    // Add idempotency check
    const idempotencyKey = `post:${postId}:${scheduledAt}`;
    
    try {
      // Import here to avoid circular dependencies
      const { SocialMediaManager } = await import('../services/socialMediaManager');
      const socialMediaManager = new SocialMediaManager();
      
      const result = await socialMediaManager.publishContent(content, platform as any, true);
      
      logger.info('Scheduled post published', { postId, platform, success: true });
      return { success: true, result };
    } catch (error: any) {
      logger.error('Failed to process scheduled post', error, { postId, platform });
      throw error;
    }
  }

  static async processGenerateCarousel(job: Job<GenerateCarouselJob>): Promise<any> {
    const { propertyId } = job.data;
    
    logger.info('Processing carousel generation', { propertyId });
    
    try {
      const InstagramService = (await import('../services/instagram')).default;
      const instagramService = new InstagramService();
      
      const carousel = await instagramService.generateCarouselForProperty(propertyId);
      
      logger.info('Carousel generated', { propertyId, carouselId: carousel.id });
      return { success: true, carousel };
    } catch (error: any) {
      logger.error('Failed to generate carousel', error, { propertyId });
      throw error;
    }
  }

  static async processPublishPost(job: Job<any>): Promise<any> {
    const { postId, platform, content } = job.data;
    
    logger.info('Processing post publish', { postId, platform });
    
    try {
      const { SocialMediaManager } = await import('../services/socialMediaManager');
      const socialMediaManager = new SocialMediaManager();
      
      const result = await socialMediaManager.publishContent(content, platform as any, true);
      
      logger.info('Post published', { postId, platform, success: true });
      return { success: true, result };
    } catch (error: any) {
      logger.error('Failed to publish post', error, { postId, platform });
      throw error;
    }
  }

  static setupWorkers(queueManager: any): void {
    // Schedule post worker
    queueManager.createWorker('scheduled-posts', async (job: Job) => {
      if (job.name === 'schedule_post') {
        return this.processSchedulePost(job);
      } else if (job.name === 'publish_post') {
        return this.processPublishPost(job);
      }
      throw new Error(`Unknown job type: ${job.name}`);
    });

    // Carousel generation worker
    queueManager.createWorker('instagram-carousels', async (job: Job) => {
      if (job.name === 'generate_carousel') {
        return this.processGenerateCarousel(job);
      }
      throw new Error(`Unknown job type: ${job.name}`);
    });

    logger.info('All queue workers initialized');
  }
}