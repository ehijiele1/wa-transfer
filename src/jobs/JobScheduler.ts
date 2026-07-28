import { MessageProcessingJob } from './MessageProcessingJob';
import { ContentGenerationJob } from './ContentGenerationJob';
import { SocialMediaPublishingJob } from './SocialMediaPublishingJob';
import config from '../config';
import { operationalMonitor } from '../services/operationalMonitor';
import { healthService } from '../services/healthService';
import { log } from '../services/logger';

export interface JobStatus {
  name: string;
  isRunning: boolean;
  lastRun?: Date;
  nextRun?: Date;
  status: 'running' | 'stopped' | 'error';
  error?: string;
}

export interface JobSchedulerConfig {
  messageProcessingIntervalMs: number;
  contentGenerationIntervalMs: number;
  socialMediaIntervalMs: number;
  enableAutoPublish: boolean;
}

export class JobScheduler {
  private messageProcessingJob: MessageProcessingJob;
  private contentGenerationJob: ContentGenerationJob;
  private socialMediaPublishingJob: SocialMediaPublishingJob;
  
  private config: JobSchedulerConfig;
  private isRunning: boolean = false;
  private intervals: NodeJS.Timeout[] = [];
  private jobStatus: Map<string, JobStatus> = new Map();

  constructor(configOverride?: Partial<JobSchedulerConfig>) {
    this.messageProcessingJob = new MessageProcessingJob();
    this.contentGenerationJob = new ContentGenerationJob();
    this.socialMediaPublishingJob = new SocialMediaPublishingJob();
    
    this.config = {
      messageProcessingIntervalMs: config.monitoring?.messageProcessingIntervalMs || 30000,
      contentGenerationIntervalMs: config.monitoring?.contentGenerationIntervalMs || 300000, // 5 minutes
      socialMediaIntervalMs: config.monitoring?.socialMediaIntervalMs || 60000, // 1 minute
      enableAutoPublish: config.instagram?.accessToken ? true : false,
      ...configOverride
    };

    this.initializeJobStatus();
  }

  private initializeJobStatus(): void {
    this.jobStatus.set('messageProcessing', {
      name: 'Message Processing',
      isRunning: false,
      status: 'stopped'
    });

    this.jobStatus.set('contentGeneration', {
      name: 'Content Generation',
      isRunning: false,
      status: 'stopped'
    });

    this.jobStatus.set('socialMedia', {
      name: 'Social Media Publishing',
      isRunning: false,
      status: 'stopped'
    });
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      log.warn('JobScheduler', 'Job Scheduler is already running');
      return;
    }

    const startTime = Date.now();
    try {
      log.info('JobScheduler', 'Starting Job Scheduler...');
      
      // Start health monitoring
      healthService.startHealthChecks();
      
      // Start all jobs
      await this.messageProcessingJob.start();
      await this.contentGenerationJob.start();
      await this.socialMediaPublishingJob.start();
      
      // Start periodic tasks
      this.startPeriodicTasks();
      
      this.isRunning = true;
      const duration = Date.now() - startTime;
      log.info('JobScheduler', 'Job Scheduler started successfully', { duration });
      
      this.updateJobStatus('messageProcessing', 'running');
      this.updateJobStatus('contentGeneration', 'running');
      this.updateJobStatus('socialMedia', 'running');
      
      // Record startup metrics
      operationalMonitor.recordMetricData({
        component: 'JobScheduler',
        metric: 'startup_time',
        value: duration,
        timestamp: new Date(),
      });
      
    } catch (error) {
      const duration = Date.now() - startTime;
      log.error('JobScheduler', 'Failed to start Job Scheduler', { 
        error: error instanceof Error ? error.message : String(error),
        duration 
      });
      throw error;
    }
  }

  private startPeriodicTasks(): void {
    // Message processing (more frequent)
    this.intervals.push(setInterval(
      async () => {
        try {
          await this.runMessageProcessing();
        } catch (error) {
          console.error('❌ Error in message processing interval:', error);
          this.updateJobStatus('messageProcessing', 'error', (error as Error).message);
        }
      },
      this.config.messageProcessingIntervalMs
    ));

    // Content generation (less frequent)
    this.intervals.push(setInterval(
      async () => {
        try {
          await this.runContentGeneration();
        } catch (error) {
          console.error('❌ Error in content generation interval:', error);
          this.updateJobStatus('contentGeneration', 'error', (error as Error).message);
        }
      },
      this.config.contentGenerationIntervalMs
    ));

    // Social media processing (moderate frequency)
    this.intervals.push(setInterval(
      async () => {
        try {
          await this.runSocialMediaProcessing();
        } catch (error) {
          console.error('❌ Error in social media processing interval:', error);
          this.updateJobStatus('socialMedia', 'error', (error as Error).message);
        }
      },
      this.config.socialMediaIntervalMs
    ));
  }

  private async runMessageProcessing(): Promise<void> {
    const startTime = Date.now();
    const traceId = `msg_proc_${Date.now()}`;
    
    try {
      log.info('JobScheduler', 'Running scheduled message processing', { traceId });
      
      // Process existing messages
      const batchResult = await this.messageProcessingJob.processBatchMessages(50);
      
      // Process unprocessed listings
      const listingsResult = await this.messageProcessingJob.processUnprocessedListings();
      
      const duration = Date.now() - startTime;
      log.info('JobScheduler', 'Message processing completed', { 
        traceId, 
        duration, 
        messages: batchResult.processed, 
        properties: listingsResult.properties, 
        promotions: listingsResult.promotions 
      });
      
      // Record metrics
      operationalMonitor.recordRequest('MessageProcessing', duration, true);
      operationalMonitor.recordMetricData({
        component: 'MessageProcessing',
        metric: 'messages_processed',
        value: batchResult.processed,
        timestamp: new Date(),
        tags: { traceId },
      });
      
      this.updateJobStatus('messageProcessing', 'running');
      
    } catch (error) {
      const duration = Date.now() - startTime;
      log.error('JobScheduler', 'Message processing failed', { 
        traceId,
        error: error instanceof Error ? error.message : String(error),
        duration 
      });
      
      // Record failure metrics
      operationalMonitor.recordRequest('MessageProcessing', duration, false);
      operationalMonitor.recordMetricData({
        component: 'MessageProcessing',
        metric: 'processing_errors',
        value: 1,
        timestamp: new Date(),
        tags: { traceId },
      });
      
      throw error;
    }
  }

  private async runContentGeneration(): Promise<void> {
    const startTime = Date.now();
    const traceId = 'content_gen_' + Date.now();
    
    try {
      log.info('JobScheduler', 'Running scheduled content generation', { traceId });
      
      const result = await this.contentGenerationJob.processInstagramContent();
      
      const duration = Date.now() - startTime;
      log.info('JobScheduler', 'Content generation completed', { 
        traceId, 
        duration, 
        generated: result.generated, 
        failed: result.failed 
      });
      
      // Record metrics
      operationalMonitor.recordRequest('ContentGeneration', duration, result.generated > 0);
      operationalMonitor.recordMetricData({
        component: 'ContentGeneration',
        metric: 'carousels_generated',
        value: result.generated,
        timestamp: new Date(),
        tags: { traceId },
      });
      
      this.updateJobStatus('contentGeneration', 'running');
      
    } catch (error) {
      const duration = Date.now() - startTime;
      log.error('JobScheduler', 'Content generation failed', { 
        traceId,
        error: error instanceof Error ? error.message : String(error),
        duration 
      });
      
      // Record failure metrics
      operationalMonitor.recordRequest('ContentGeneration', duration, false);
      operationalMonitor.recordMetricData({
        component: 'ContentGeneration',
        metric: 'generation_errors',
        value: 1,
        timestamp: new Date(),
        tags: { traceId },
      });
      
      throw error;
    }
  }

  private async runSocialMediaProcessing(): Promise<void> {
    const startTime = Date.now();
    const traceId = 'social_media_' + Date.now();
    
    try {
      log.info('JobScheduler', 'Running scheduled social media processing', { traceId });
      
      const result = await this.socialMediaPublishingJob.processQueues();
      
      const duration = Date.now() - startTime;
      log.info('JobScheduler', 'Social media processing completed', { 
        traceId, 
        duration, 
        processed: result.processed, 
        failed: result.failed 
      });
      
      // Record metrics
      operationalMonitor.recordRequest('SocialMedia', duration, result.processed > 0);
      operationalMonitor.recordMetricData({
        component: 'SocialMedia',
        metric: 'posts_processed',
        value: result.processed,
        timestamp: new Date(),
        tags: { traceId },
      });
      
      this.updateJobStatus('socialMedia', 'running');
      
    } catch (error) {
      const duration = Date.now() - startTime;
      log.error('JobScheduler', 'Social media processing failed', { 
        traceId,
        error: error instanceof Error ? error.message : String(error),
        duration 
      });
      
      // Record failure metrics
      operationalMonitor.recordRequest('SocialMedia', duration, false);
      operationalMonitor.recordMetricData({
        component: 'SocialMedia',
        metric: 'processing_errors',
        value: 1,
        timestamp: new Date(),
        tags: { traceId },
      });
      
      throw error;
    }
  }

  private updateJobStatus(jobName: string, status: 'running' | 'stopped' | 'error', error?: unknown): void {
    const job = this.jobStatus.get(jobName);
    if (job) {
      job.isRunning = status === 'running';
      job.status = status;
      job.lastRun = new Date();
      job.error = typeof error === 'string' ? error : (error as Error)?.message || 'Unknown error';
      
      if (status === 'running') {
        job.nextRun = new Date(Date.now() + (this.getIntervalForJob(jobName) ?? 60000));
      }
    }
  }

  private getIntervalForJob(jobName: string): number {
    switch (jobName) {
      case 'messageProcessing':
        return this.config.messageProcessingIntervalMs;
      case 'contentGeneration':
        return this.config.contentGenerationIntervalMs;
      case 'socialMedia':
        return this.config.socialMediaIntervalMs;
      default:
        return 60000;
    }
  }

  // Manual job execution methods
  async executeMessageProcessing(): Promise<any> {
    console.log('🚀 Manually executing message processing...');
    return await this.runMessageProcessing();
  }

  async executeContentGeneration(): Promise<any> {
    console.log('🚀 Manually executing content generation...');
    return await this.runContentGeneration();
  }

  async executeSocialMediaProcessing(): Promise<any> {
    console.log('🚀 Manually executing social media processing...');
    return await this.runSocialMediaProcessing();
  }

  // Status and monitoring methods
  getJobStatus(): JobStatus[] {
    return Array.from(this.jobStatus.values());
  }

  getOverallStatus(): { isRunning: boolean, jobs: JobStatus[] } {
    return {
      isRunning: this.isRunning,
      jobs: this.getJobStatus()
    };
  }

  getHealth(): { status: 'healthy' | 'degraded' | 'unhealthy', details: any } {
    const jobs = this.getJobStatus();
    const runningJobs = jobs.filter(job => job.status === 'running');
    const errorJobs = jobs.filter(job => job.status === 'error');
    
    if (errorJobs.length > 0) {
      return {
        status: 'unhealthy',
        details: {
          errorJobs: errorJobs.length,
          errors: errorJobs.map(job => ({ name: job.name, error: job.error }))
        }
      };
    } else if (runningJobs.length < jobs.length) {
      return {
        status: 'degraded',
        details: {
          totalJobs: jobs.length,
          runningJobs: runningJobs.length,
          stoppedJobs: jobs.length - runningJobs.length
        }
      };
    } else {
      return {
        status: 'healthy',
        details: {
          totalJobs: jobs.length,
          runningJobs: runningJobs.length
        }
      };
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      log.warn('JobScheduler', 'Job Scheduler is not running');
      return;
    }

    const startTime = Date.now();
    try {
      log.info('JobScheduler', 'Stopping Job Scheduler...');
      
      // Clear all intervals
      this.intervals.forEach(interval => clearInterval(interval));
      this.intervals = [];
      
      // Stop all jobs
      await this.messageProcessingJob.stop();
      await this.contentGenerationJob.stop();
      await this.socialMediaPublishingJob.stop();
      
      // Stop health monitoring
      healthService.stopHealthChecks();
      
      this.isRunning = false;
      
      this.updateJobStatus('messageProcessing', 'stopped');
      this.updateJobStatus('contentGeneration', 'stopped');
      this.updateJobStatus('socialMedia', 'stopped');
      
      const duration = Date.now() - startTime;
      log.info('JobScheduler', 'Job Scheduler stopped successfully', { duration });
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      log.error('JobScheduler', 'Error stopping Job Scheduler', { 
        error: error.message, 
        duration 
      });
      throw error;
    }
  }

  // Configuration methods
  updateConfig(newConfig: Partial<JobSchedulerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('📝 Job Scheduler configuration updated');
  }

  getConfig(): JobSchedulerConfig {
    return { ...this.config };
  }

  // Expose job instances for direct access (temporary)
  getMessageProcessingJob() {
    return this.messageProcessingJob;
  }

  getContentGenerationJob() {
    return this.contentGenerationJob;
  }

  getSocialMediaPublishingJob() {
    return this.socialMediaPublishingJob;
  }
}