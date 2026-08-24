import SupabaseService from '../services/supabase';
import InstagramService from '../services/instagram';
import config from '../config';
import { InstagramCarouselGenerator } from '../services/instagramCarouselGenerator';

export class ContentGenerationJob {
  private supabaseService: SupabaseService;
  private instagramService: InstagramService | null = null;
  private instagramCarouselGenerator: InstagramCarouselGenerator | null = null;
  private isRunning: boolean = false;

  constructor() {
    this.supabaseService = new SupabaseService();
    
    // Initialize Instagram services only if configured
    try {
      this.instagramService = new InstagramService();
      this.instagramCarouselGenerator = new InstagramCarouselGenerator();
    } catch (error: any) {
      console.warn('⚠️ Instagram services not fully configured:', error.message);
    }
  }

  async start(): Promise<void> {
    try {
      console.log('🎨 Starting Content Generation Job...');
      
      if (!this.instagramService || !this.instagramCarouselGenerator) {
        console.log('⚠️ Instagram services not available, content generation will be limited');
      }
      
      this.isRunning = true;
      console.log('✅ Content Generation Job started successfully');
    } catch (error) {
      console.error('❌ Failed to start Content Generation Job:', error);
      throw error;
    }
  }

  async processInstagramContent(): Promise<{ generated: number, failed: number }> {
    if (!this.instagramService || !this.instagramCarouselGenerator) {
      console.log('⚠️ Instagram services not available, skipping content generation');
      return { generated: 0, failed: 0 };
    }

    try {
      console.log('📱 Processing Instagram content...');
      
      // Get unprocessed properties
      const unpublishedProperties = await this.supabaseService.getUnprocessedProperties();
      let generated = 0;
      let failed = 0;

      for (const property of unpublishedProperties) {
        try {
          console.log(`🔄 Generating Instagram carousel for property: ${property.title}`);
          
          // Generate carousel
          const propertyData = await this.supabaseService.getPropertyById(property.id);
          if (!propertyData) {
            throw new Error(`Property ${property.id} not found`);
          }
          const carousel = await this.instagramCarouselGenerator.generateCarousel(propertyData);
          if (!carousel) {
            throw new Error(`Failed to generate carousel for property ${property.id}`);
          }
          
          // Auto-publish if configured (for demo purposes)
          if (config.instagram?.accessToken) {
            console.log(`📤 Auto-publishing carousel for ${property.title}`);
            await this.instagramService.publishCarousel(carousel.id);
          } else {
            console.log('📝 Instagram credentials not configured, carousel saved as draft');
          }
          
          generated++;
        } catch (error) {
          console.error(`❌ Error generating carousel for property ${property.id}:`, error);
          failed++;
        }
      }
      
      console.log(`✅ Instagram content processing completed: ${generated} generated, ${failed} failed`);
      return { generated, failed };
    } catch (error) {
      console.error('❌ Error processing Instagram content:', error);
      throw error;
    }
  }

  async generateSingleCarousel(propertyId: string): Promise<any> {
    if (!this.instagramService || !this.instagramCarouselGenerator) {
      throw new Error('Instagram services not available');
    }

    try {
      console.log(`🎨 Generating Instagram carousel for property ${propertyId}...`);
      
      const propertyData = await this.supabaseService.getPropertyById(propertyId);
      if (!propertyData) {
        return { success: false, error: `Property ${propertyId} not found` };
      }
      const carousel = await this.instagramCarouselGenerator.generateCarousel(propertyData);
      if (!carousel) {
        throw new Error(`Failed to generate carousel for property ${propertyId}`);
      }
      
      console.log(`✅ Generated carousel: ${carousel.id}`);
      return { success: true, carousel_id: carousel.id };
    } catch (error: any) {
      console.error('❌ Error generating carousel for property:', error);
      return { success: false, error: error.message };
    }
  }

  async publishSingleCarousel(carouselId: string): Promise<any> {
    if (!this.instagramService) {
      throw new Error('Instagram service not available');
    }

    try {
      console.log(`📤 Publishing Instagram carousel ${carouselId}...`);
      
      const postResponse = await this.instagramService.publishCarousel(carouselId);
      console.log(`✅ Published carousel: ${postResponse.id}`);
      return { success: true, post: postResponse };
    } catch (error: any) {
      console.error('❌ Error publishing Instagram carousel:', error);
      return { success: false, error: error.message };
    }
  }

  async batchPublishCarousels(): Promise<any> {
    if (!this.instagramService) {
      throw new Error('Instagram service not available');
    }

    try {
      console.log('📦 Starting batch Instagram publish...');
      
      const publishedPosts = await this.instagramService.batchPublishCarousels();
      console.log(`✅ Batch publish completed: ${publishedPosts.length} posts published`);
      
      return { success: true, published_posts: publishedPosts };
    } catch (error: any) {
      console.error('❌ Error in batch Instagram publish:', error);
      return { success: false, error: error.message };
    }
  }

  async getInstagramAnalytics(): Promise<any> {
    if (!this.instagramService) {
      throw new Error('Instagram service not available');
    }

    try {
      console.log('📊 Fetching Instagram analytics...');
      
      const analytics = await this.instagramService.getAnalytics();
      console.log('✅ Instagram analytics retrieved');
      
      return { success: true, analytics };
    } catch (error: any) {
      console.error('❌ Error getting Instagram analytics:', error);
      return { success: false, error: error.message };
    }
  }

  async stop(): Promise<void> {
    try {
      console.log('🛑 Stopping Content Generation Job...');
      this.isRunning = false;
      console.log('✅ Content Generation Job stopped successfully');
    } catch (error: any) {
      console.error('❌ Error stopping Content Generation Job:', error);
      throw error;
    }
  }

  getStatus(): { isRunning: boolean, instagramAvailable: boolean } {
    return { 
      isRunning: this.isRunning, 
      instagramAvailable: !!this.instagramService 
    };
  }
}