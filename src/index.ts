import WhatsAppService from './services/whatsapp';
import SupabaseService from './services/supabase';
import MessageProcessor, { MessageClassification } from './services/messageProcessor';
import InstagramService from './services/instagram';
import SocialMediaManager from './services/socialMediaManager';
import config from './config';

class WhatsAppMonitoringApp {
  private whatsappService: WhatsAppService;
  private supabaseService: SupabaseService;
  private messageProcessor: MessageProcessor;
  private instagramService: InstagramService | null = null;
  private socialMediaManager: SocialMediaManager | null = null;
  private isRunning: boolean = false;

  constructor() {
    this.whatsappService = new WhatsAppService();
    this.supabaseService = new SupabaseService();
    this.messageProcessor = new MessageProcessor();
    
    // Initialize optional services only if configured
    try {
      this.instagramService = new InstagramService();
      this.socialMediaManager = new SocialMediaManager();
    } catch (error: any) {
      console.warn('Social media services not fully configured:', error.message);
    }
  }

  async start(): Promise<void> {
    try {
      console.log('Starting WhatsApp Monitoring Application...');
      console.log('Configuration:', {
        supabase: config.supabase.url ? 'configured' : 'missing',
        whatsapp: { sessionId: config.whatsapp.sessionId },
        monitoring: { groups: config.monitoring.groups },
        ollama: { baseUrl: config.ollama.baseUrl }
      });

      await this.whatsappService.connect();
      this.setupMessageHandlers();
      
      this.isRunning = true;
      console.log('WhatsApp Monitoring Application started successfully');
      
      this.startPeriodicProcessing();
    } catch (error) {
      console.error('Failed to start application:', error);
      throw error;
    }
  }

  private setupMessageHandlers(): void {
    this.whatsappService.onMessage(async (message: any) => {
      try {
        console.log(`Processing message from ${message.from}: ${message.message?.conversation?.substring(0, 100) || 'Media message'}`);
        
        const classification = await this.messageProcessor.classifyMessage(message);
        
        if (classification.type === 'property' && classification.extractedData) {
          console.log(`Property detected: ${classification.extractedData.title}`);
          await this.supabaseService.savePropertyListing(classification.extractedData);
        } else if (classification.type === 'promotion' && classification.extractedData) {
          console.log(`Promotion detected: ${classification.extractedData.title}`);
          await this.supabaseService.savePromotion(classification.extractedData);
        } else {
          console.log(`Message classified as: ${classification.type} (confidence: ${classification.confidence})`);
        }
      } catch (error) {
        console.error('Error processing message:', error);
      }
    });
  }

  private async startPeriodicProcessing(): Promise<void> {
    console.log('Starting periodic message processing...');
    
    const processInterval = setInterval(async () => {
      if (!this.isRunning) {
        clearInterval(processInterval);
        return;
      }

      try {
        await this.processExistingMessages();
        await this.processUnprocessedListings();
        await this.processInstagramContent();
        await this.processSocialMediaQueues();
      } catch (error) {
        console.error('Error in periodic processing:', error);
      }
    }, config.monitoring.messageProcessingIntervalMs);
  }

  private async processExistingMessages(): Promise<void> {
    try {
      console.log('Fetching recent messages...');
      const messages = await this.supabaseService.getRecentMessages(50);
      
      for (const message of messages) {
        const classification = await this.messageProcessor.classifyMessage(message);
        
        if (classification.type === 'property' && classification.extractedData) {
          await this.supabaseService.savePropertyListing(classification.extractedData);
        } else if (classification.type === 'promotion' && classification.extractedData) {
          await this.supabaseService.savePromotion(classification.extractedData);
        }
      }
      
      console.log(`Processed ${messages.length} existing messages`);
    } catch (error) {
      console.error('Error processing existing messages:', error);
    }
  }

  private async processUnprocessedListings(): Promise<void> {
    try {
      console.log('Processing unprocessed property listings...');
      const properties = await this.supabaseService.getUnprocessedProperties();
      
      for (const property of properties) {
        console.log(`Processing property: ${property.title}`);
        await this.supabaseService.updatePropertyAsProcessed(property.id);
      }
      
      console.log(`Processed ${properties.length} property listings`);
    } catch (error) {
      console.error('Error processing unprocessed properties:', error);
    }

    try {
      console.log('Processing unprocessed promotions...');
      const promotions = await this.supabaseService.getUnprocessedPromotions();
      
      for (const promotion of promotions) {
        console.log(`Processing promotion: ${promotion.title}`);
        await this.supabaseService.updatePromotionAsProcessed(promotion.id);
      }
      
      console.log(`Processed ${promotions.length} promotions`);
    } catch (error) {
      console.error('Error processing unprocessed promotions:', error);
    }
  }

  private async processInstagramContent(): Promise<void> {
    try {
      console.log('Processing Instagram content...');
      
      // Generate carousels for unpublished properties
      const unpublishedProperties = await this.supabaseService.getUnprocessedProperties();
      
      for (const property of unpublishedProperties) {
        try {
          console.log(`Generating Instagram carousel for property: ${property.title}`);
          
          // Generate carousel
          const carousel = await this.instagramService?.generateCarouselForProperty(property.id);
          if (!carousel) {
            throw new Error(`Failed to generate carousel for property ${property.id}`);
          }
          
          // Auto-publish if configured (for demo purposes)
          if (config.instagram?.accessToken) {
            console.log(`Auto-publishing carousel for ${property.title}`);
            await this.instagramService?.publishCarousel(carousel.id);
          } else {
            console.log('Instagram credentials not configured, carousel saved as draft');
          }
          
        } catch (error) {
          console.error(`Error generating carousel for property ${property.id}:`, error);
        }
      }
      
      console.log('Instagram content processing completed');
    } catch (error) {
      console.error('Error processing Instagram content:', error);
    }
  }

  private async processSocialMediaQueues(): Promise<void> {
    try {
      console.log('Processing social media queues...');
      
      // Process scheduled posts
      if (this.socialMediaManager) {
        await this.socialMediaManager.processQueues();
      }
      
      console.log('Social media queue processing completed');
    } catch (error) {
      console.error('Error processing social media queues:', error);
    }
  }

  // Social Media Management Methods
  async publishToSocialMedia(content: any, platforms: string[], scheduleAt?: Date): Promise<any> {
    try {
      console.log(`Publishing to social media platforms: ${platforms.join(', ')}`);
      
      if (!this.socialMediaManager) {
        throw new Error('Social media manager not initialized');
      }
      
      const results = await this.socialMediaManager.crossPlatformPublish(
        content,
        platforms as any,
        scheduleAt
      );
      
      return results;
    } catch (error: any) {
      console.error('Error publishing to social media:', error);
      return { success: false, error: error.message };
    }
  }

  async getSocialMediaAnalytics(platform?: string, dateRange?: any): Promise<any> {
    try {
      console.log(`Getting social media analytics for ${platform || 'all platforms'}`);
      
      if (!this.socialMediaManager) {
        throw new Error('Social media manager not initialized');
      }
      
      if (dateRange) {
        return await this.socialMediaManager.getPlatformAnalytics(
          platform as any || 'all',
          dateRange
        );
      } else {
        const last30Days = {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date(),
        };
        return await this.socialMediaManager?.getCrossPlatformAnalytics(last30Days);
      }
    } catch (error: any) {
      console.error('Error getting social media analytics:', error);
      return { success: false, error: error.message };
    }
  }

  async createSocialMediaQueue(platform: string, priority: string): Promise<any> {
    try {
      console.log(`Creating social media queue for ${platform}`);
      
      if (!this.socialMediaManager) {
        throw new Error('Social media manager not initialized');
      }
      
      return await this.socialMediaManager.createQueue(
        platform as any,
        priority as any
      );
    } catch (error: any) {
      console.error('Error creating social media queue:', error);
      return { success: false, error: error.message };
    }
  }

  async getSocialMediaDashboard(): Promise<any> {
    try {
      console.log('Generating social media dashboard summary');
      
      if (!this.socialMediaManager) {
        throw new Error('Social media manager not initialized');
      }
      
      return await this.socialMediaManager.getDashboardSummary();
    } catch (error: any) {
      console.error('Error generating social media dashboard:', error);
      return { success: false, error: error.message };
    }
  }

  async createABTest(testConfig: any): Promise<any> {
    try {
      console.log('Creating A/B test for social media');
      
      if (!this.socialMediaManager) {
        throw new Error('Social media manager not initialized');
      }
      
      return await this.socialMediaManager.createABTest(testConfig);
    } catch (error: any) {
      console.error('Error creating A/B test:', error);
      return { success: false, error: error.message };
    }
  }

  async getABTestResults(testId: string): Promise<any> {
    try {
      console.log(`Getting A/B test results: ${testId}`);
      
      if (!this.socialMediaManager) {
        throw new Error('Social media manager not initialized');
      }
      
      return await this.socialMediaManager.getABTestResults(testId);
    } catch (error: any) {
      console.error('Error getting A/B test results:', error);
      return { success: false, error: error.message };
    }
  }

  // Instagram-specific methods for manual control
  async generateInstagramCarousel(propertyId: string): Promise<any> {
    try {
      if (!this.instagramService) {
        throw new Error('Instagram service not initialized');
      }
      
      const carousel = await this.instagramService.generateCarouselForProperty(propertyId);
      return { success: true, carousel_id: carousel.id };
    } catch (error: any) {
      console.error('❌ Error generating carousel for property:', error);
      return { success: false, error: error.message };
    }
  }

  async publishInstagramCarousel(carouselId: string): Promise<any> {
    try {
      if (!this.instagramService) {
        throw new Error('Instagram service not initialized');
      }
      
      const postResponse = await this.instagramService.publishCarousel(carouselId);
      return { success: true, post: postResponse };
    } catch (error: any) {
      console.error('Error publishing Instagram carousel:', error);
      return { success: false, error: error.message };
    }
  }

  async getInstagramAnalytics(): Promise<any> {
    try {
      if (!this.instagramService) {
        throw new Error('Instagram service not initialized');
      }
      
      const analytics = await this.instagramService.getAnalytics();
      return { success: true, analytics };
    } catch (error: any) {
      console.error('Error getting Instagram analytics:', error);
      return { success: false, error: error.message };
    }
  }

  async batchPublishInstagram(): Promise<any> {
    try {
      if (!this.instagramService) {
        throw new Error('Instagram service not initialized');
      }
      
      const publishedPosts = await this.instagramService.batchPublishCarousels();
      return { success: true, published_posts: publishedPosts };
    } catch (error: any) {
      console.error('Error in batch Instagram publish:', error);
      return { success: false, error: error.message };
    }
  }

  async stop(): Promise<void> {
    try {
      console.log('Stopping WhatsApp Monitoring Application...');
      this.isRunning = false;
      
      await this.whatsappService.disconnect();
      console.log('WhatsApp Monitoring Application stopped successfully');
    } catch (error: any) {
      console.error('Error stopping application:', error);
      throw error;
    }
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