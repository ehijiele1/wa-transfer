import { JobScheduler } from './jobs/JobScheduler';
import config from './config';

class WhatsAppMonitoringApp {
  private jobScheduler: JobScheduler;
  private isRunning: boolean = false;

  constructor() {
    this.jobScheduler = new JobScheduler();
  }

  async start(): Promise<void> {
    try {
      console.log('🚀 Starting WhatsApp Monitoring Application...');
      console.log('📋 Configuration:', {
        supabase: config.supabase.url ? 'configured' : 'missing',
        whatsapp: { sessionId: config.whatsapp.sessionId },
        monitoring: { groups: config.monitoring.groups },
        ollama: { baseUrl: config.ollama.baseUrl }
      });

      await this.jobScheduler.start();
      this.isRunning = true;
      console.log('✅ WhatsApp Monitoring Application started successfully');
    } catch (error) {
      console.error('❌ Failed to start application:', error);
      throw error;
    }
  }





  // Social Media Management Methods
  async publishToSocialMedia(content: any, platforms: string[], scheduleAt?: Date): Promise<any> {
    try {
      console.log(`📤 Publishing to social media platforms: ${platforms.join(', ')}`);
      
      const socialMediaJob = this.jobScheduler.getSocialMediaPublishingJob();
      const results = await socialMediaJob.publishToSocialMedia(content, platforms, scheduleAt);
      
      return results;
    } catch (error: any) {
      console.error('❌ Error publishing to social media:', error);
      return { success: false, error: error.message };
    }
  }

  async getSocialMediaAnalytics(platform?: string, dateRange?: any): Promise<any> {
    try {
      console.log(`📊 Getting social media analytics for ${platform || 'all platforms'}`);
      
      const socialMediaJob = this.jobScheduler.getSocialMediaPublishingJob();
      if (dateRange) {
        return await socialMediaJob.getAnalytics(platform, dateRange);
      } else {
        return await socialMediaJob.getAnalytics();
      }
    } catch (error: any) {
      console.error('❌ Error getting social media analytics:', error);
      return { success: false, error: error.message };
    }
  }

  async createSocialMediaQueue(platform: string, priority: string): Promise<any> {
    try {
      console.log(`📦 Creating social media queue for ${platform}`);
      
      const socialMediaJob = this.jobScheduler.getSocialMediaPublishingJob();
      return await socialMediaJob.createQueue(platform, priority);
    } catch (error: any) {
      console.error('❌ Error creating social media queue:', error);
      return { success: false, error: error.message };
    }
  }

  async getSocialMediaDashboard(): Promise<any> {
    try {
      console.log('📈 Generating social media dashboard summary');
      
      const socialMediaJob = this.jobScheduler.getSocialMediaPublishingJob();
      return await socialMediaJob.getDashboard();
    } catch (error: any) {
      console.error('❌ Error generating social media dashboard:', error);
      return { success: false, error: error.message };
    }
  }

  async createABTest(testConfig: any): Promise<any> {
    try {
      console.log('🧪 Creating A/B test for social media');
      
      const socialMediaJob = this.jobScheduler.getSocialMediaPublishingJob();
      return await socialMediaJob.createABTest(testConfig);
    } catch (error: any) {
      console.error('❌ Error creating A/B test:', error);
      return { success: false, error: error.message };
    }
  }

  async getABTestResults(testId: string): Promise<any> {
    try {
      console.log(`📊 Getting A/B test results: ${testId}`);
      
      const socialMediaJob = this.jobScheduler.getSocialMediaPublishingJob();
      return await socialMediaJob.getABTestResults(testId);
    } catch (error: any) {
      console.error('❌ Error getting A/B test results:', error);
      return { success: false, error: error.message };
    }
  }

  // Instagram-specific methods for manual control
  async generateInstagramCarousel(propertyId: string): Promise<any> {
    try {
      console.log(`🎨 Generating Instagram carousel for property ${propertyId}...`);
      
      const contentJob = this.jobScheduler.getContentGenerationJob();
      return await contentJob.generateSingleCarousel(propertyId);
    } catch (error: any) {
      console.error('❌ Error generating carousel for property:', error);
      return { success: false, error: error.message };
    }
  }

  async publishInstagramCarousel(carouselId: string): Promise<any> {
    try {
      console.log(`📤 Publishing Instagram carousel ${carouselId}...`);
      
      const contentJob = this.jobScheduler.getContentGenerationJob();
      return await contentJob.publishSingleCarousel(carouselId);
    } catch (error: any) {
      console.error('❌ Error publishing Instagram carousel:', error);
      return { success: false, error: error.message };
    }
  }

  async getInstagramAnalytics(): Promise<any> {
    try {
      console.log('📊 Getting Instagram analytics...');
      
      const contentJob = this.jobScheduler.getContentGenerationJob();
      return await contentJob.getInstagramAnalytics();
    } catch (error: any) {
      console.error('❌ Error getting Instagram analytics:', error);
      return { success: false, error: error.message };
    }
  }

  async batchPublishInstagram(): Promise<any> {
    try {
      console.log('📦 Starting batch Instagram publish...');
      
      const contentJob = this.jobScheduler.getContentGenerationJob();
      return await contentJob.batchPublishCarousels();
    } catch (error: any) {
      console.error('❌ Error in batch Instagram publish:', error);
      return { success: false, error: error.message };
    }
  }

  async stop(): Promise<void> {
    try {
      console.log('🛑 Stopping WhatsApp Monitoring Application...');
      this.isRunning = false;
      
      await this.jobScheduler.stop();
      console.log('✅ WhatsApp Monitoring Application stopped successfully');
    } catch (error: any) {
      console.error('❌ Error stopping application:', error);
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
    console.log('Received SIGINT, shutting down gracefully...');
    await app.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('Received SIGTERM, shutting down gracefully...');
    await app.stop();
    process.exit(0);
  });

  try {
    await app.start();
  } catch (error) {
    console.error('Application failed to start:', error);
    process.exit(1);
  }
}

if (typeof require !== 'undefined' && require.main === module) {
  main();
}

export default WhatsAppMonitoringApp;