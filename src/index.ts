import { JobScheduler } from './jobs/JobScheduler';
import config from './config';
import { logger } from './utils/logger';
import { healthChecker } from './api/health';

class WhatsAppMonitoringApp {
  private jobScheduler: JobScheduler;
  private isRunning: boolean = false;

  constructor() {
    this.jobScheduler = new JobScheduler();
  }

  async start(): Promise<void> {
    try {
      logger.info('🚀 Starting WhatsApp Monitoring Application...');
      logger.info('📋 Configuration', {
        supabase: config.supabase.url ? 'configured' : 'missing',
        whatsapp: { sessionId: config.whatsapp.sessionId },
        monitoring: { groups: config.monitoring.groups },
        ollama: { baseUrl: config.ollama.baseUrl }
      });

      await this.jobScheduler.start();
      this.isRunning = true;
      logger.info('✅ WhatsApp Monitoring Application started successfully');
    } catch (error) {
      logger.error('❌ Failed to start application', error as Error);
      throw error;
    }
  }




  // Social Media Management Methods
  async publishToSocialMedia(content: any, platforms: string[], scheduleAt?: Date): Promise<any> {
    try {
      logger.info(`📤 Publishing to social media platforms: ${platforms.join(', ')}`);
      
      const socialMediaJob = this.jobScheduler.getSocialMediaPublishingJob();
      const results = await socialMediaJob.publishToSocialMedia(content, platforms, scheduleAt);
      
      return results;
    } catch (error: any) {
      logger.error('❌ Error publishing to social media', error, { platforms });
      return { success: false, error: error.message };
    }
  }

  async getSocialMediaAnalytics(platform?: string, dateRange?: any): Promise<any> {
    try {
      logger.info(`📊 Getting social media analytics for ${platform || 'all platforms'}`);
      
      const socialMediaJob = this.jobScheduler.getSocialMediaPublishingJob();
      if (dateRange) {
        return await socialMediaJob.getAnalytics(platform, dateRange);
      } else {
        return await socialMediaJob.getAnalytics();
      }
    } catch (error: any) {
      logger.error('❌ Error getting social media analytics', error, { ...(platform ? { platform } : {}), dateRange });
      return { success: false, error: error.message };
    }
  }

  async createSocialMediaQueue(platform: string, priority: string): Promise<any> {
    try {
      logger.info(`📦 Creating social media queue for ${platform}`);
      
      const socialMediaJob = this.jobScheduler.getSocialMediaPublishingJob();
      return await socialMediaJob.createQueue(platform, priority);
    } catch (error: any) {
      logger.error('❌ Error creating social media queue', error, { platform, priority });
      return { success: false, error: error.message };
    }
  }

  async getSocialMediaDashboard(): Promise<any> {
    try {
      logger.info('📈 Generating social media dashboard summary');
      
      const socialMediaJob = this.jobScheduler.getSocialMediaPublishingJob();
      return await socialMediaJob.getDashboard();
    } catch (error: any) {
      logger.error('❌ Error generating social media dashboard', error);
      return { success: false, error: error.message };
    }
  }

  async createABTest(testConfig: any): Promise<any> {
    try {
      logger.info('🧪 Creating A/B test for social media');
      
      const socialMediaJob = this.jobScheduler.getSocialMediaPublishingJob();
      return await socialMediaJob.createABTest(testConfig);
    } catch (error: any) {
      logger.error('❌ Error creating A/B test', error, { testConfig });
      return { success: false, error: error.message };
    }
  }

  async getABTestResults(testId: string): Promise<any> {
    try {
      logger.info(`📊 Getting A/B test results: ${testId}`);
      
      const socialMediaJob = this.jobScheduler.getSocialMediaPublishingJob();
      return await socialMediaJob.getABTestResults(testId);
    } catch (error: any) {
      logger.error('❌ Error getting A/B test results', error, { testId });
      return { success: false, error: error.message };
    }
  }

  // Instagram-specific methods for manual control
  async generateInstagramCarousel(propertyId: string): Promise<any> {
    try {
      logger.info(`🎨 Generating Instagram carousel for property ${propertyId}...`);
      
      const contentJob = this.jobScheduler.getContentGenerationJob();
      return await contentJob.generateSingleCarousel(propertyId);
    } catch (error: any) {
      logger.error('❌ Error generating carousel for property', error, { propertyId });
      return { success: false, error: error.message };
    }
  }

  async publishInstagramCarousel(carouselId: string): Promise<any> {
    try {
      logger.info(`📤 Publishing Instagram carousel ${carouselId}...`);
      
      const contentJob = this.jobScheduler.getContentGenerationJob();
      return await contentJob.publishSingleCarousel(carouselId);
    } catch (error: any) {
      logger.error('❌ Error publishing Instagram carousel', error, { carouselId });
      return { success: false, error: error.message };
    }
  }

  async getInstagramAnalytics(): Promise<any> {
    try {
      logger.info('📊 Getting Instagram analytics...');
      
      const contentJob = this.jobScheduler.getContentGenerationJob();
      return await contentJob.getInstagramAnalytics();
    } catch (error: any) {
      logger.error('❌ Error getting Instagram analytics', error);
      return { success: false, error: error.message };
    }
  }

  async batchPublishInstagram(): Promise<any> {
    try {
      logger.info('📦 Starting batch Instagram publish...');
      
      const contentJob = this.jobScheduler.getContentGenerationJob();
      return await contentJob.batchPublishCarousels();
    } catch (error: any) {
      logger.error('❌ Error in batch Instagram publish', error);
      return { success: false, error: error.message };
    }
  }

  async stop(): Promise<void> {
    try {
      logger.info('🛑 Stopping WhatsApp Monitoring Application...');
      this.isRunning = false;
      
      await this.jobScheduler.stop();
      logger.info('✅ WhatsApp Monitoring Application stopped successfully');
    } catch (error: any) {
      logger.error('❌ Error stopping application', error);
      throw error;
    }
  }

  // Health and status methods
  getStatus(): { isRunning: boolean, jobs: any } {
    return {
      isRunning: this.isRunning,
      jobs: this.jobScheduler.getJobStatus()
    };
  }

  getHealth(): any {
    return this.jobScheduler.getHealth();
  }

  async getSystemHealth(): Promise<any> {
    return await healthChecker.checkHealth();
  }

  // Manual job execution methods
  async executeMessageProcessing(): Promise<any> {
    return await this.jobScheduler.executeMessageProcessing();
  }

  async executeContentGeneration(): Promise<any> {
    return await this.jobScheduler.executeContentGeneration();
  }

  async executeSocialMediaProcessing(): Promise<any> {
    return await this.jobScheduler.executeSocialMediaProcessing();
  }
}

async function main() {
  const app = new WhatsAppMonitoringApp();
  
  process.on('SIGINT', async () => {
    logger.info('Received SIGINT, shutting down gracefully...');
    await app.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM, shutting down gracefully...');
    await app.stop();
    process.exit(0);
  });

  try {
    await app.start();
  } catch (error) {
    logger.error('Application failed to start', error as Error);
    process.exit(1);
  }
}

if (typeof require !== 'undefined' && require.main === module) {
  main();
}

export default WhatsAppMonitoringApp;