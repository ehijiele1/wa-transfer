import { createClient, SupabaseClient } from '@supabase/supabase-js';
import config from '../config';
import { InstagramCarousel, InstagramPostResponse, InstagramSlide } from '../types/instagram';
import { PropertyListing } from '../types';
import InstagramMediaService from './instagramMedia';
import InstagramCarouselGenerator from './instagramCarouselGenerator';
import { generateId, formatDate } from '../utils';

class InstagramService {
  private client: SupabaseClient;
  private mediaService: InstagramMediaService;
  private carouselGenerator: InstagramCarouselGenerator;

  constructor() {
    this.client = createClient(config.supabase.url, config.supabase.key);
    this.mediaService = new InstagramMediaService();
    this.carouselGenerator = new InstagramCarouselGenerator();
  }

  private getServiceClient() {
    return createClient(config.supabase.url, config.supabase.serviceRoleKey);
  }

  async saveCarousel(carousel: InstagramCarousel): Promise<void> {
    const serviceClient = this.getServiceClient();
    const { error } = await serviceClient
      .from('instagram_carousels')
      .insert({
        id: carousel.id,
        property_id: carousel.property_id,
        caption: carousel.caption,
        hashtags: carousel.hashtags,
        slides: carousel.slides,
        status: carousel.status,
        scheduled_at: carousel.scheduled_at,
        published_at: carousel.published_at,
        media_container_id: carousel.media_container_id,
        permalink: carousel.permalink,
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error('Error saving carousel:', error);
      throw error;
    }
  }

  async getCarousel(carouselId: string): Promise<InstagramCarousel | null> {
    const serviceClient = this.getServiceClient();
    const { data, error } = await serviceClient
      .from('instagram_carousels')
      .select('*')
      .eq('id', carouselId)
      .single();

    if (error) {
      console.error('Error fetching carousel:', error);
      throw error;
    }

    return data;
  }

  async getDraftCarousels(): Promise<InstagramCarousel[]> {
    const serviceClient = this.getServiceClient();
    const { data, error } = await serviceClient
      .from('instagram_carousels')
      .select('*')
      .eq('status', 'draft')
      .limit(10);

    if (error) {
      console.error('Error fetching draft carousels:', error);
      throw error;
    }

    return data || [];
  }

  async getPublishedCarousels(): Promise<InstagramCarousel[]> {
    const serviceClient = this.getServiceClient();
    const { data, error } = await serviceClient
      .from('instagram_carousels')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching published carousels:', error);
      throw error;
    }

    return data || [];
  }

  async getUnpublishedProperties(): Promise<PropertyListing[]> {
    const serviceClient = this.getServiceClient();
    const { data, error } = await serviceClient
      .from('property_listings')
      .select('*')
      .eq('processed', true)
      .eq('instagram_published', false)
      .limit(5);

    if (error) {
      console.error('Error fetching unpublished properties:', error);
      throw error;
    }

    return data || [];
  }

  async generateCarouselForProperty(propertyId: string): Promise<InstagramCarousel> {
    try {
      // Get property details
      const serviceClient = this.getServiceClient();
      const { data: property, error } = await serviceClient
        .from('property_listings')
        .select('*')
        .eq('id', propertyId)
        .single();

      if (error) {
        throw new Error(`Property not found: ${error.message}`);
      }

      // Generate carousel
      const carousel = await this.carouselGenerator.generateCarousel(property);
      
      // Save to database
      await this.saveCarousel(carousel);
      
      console.log(`Generated carousel for property ${propertyId}: ${carousel.id}`);
      return carousel;
    } catch (error) {
      console.error('Error generating carousel for property:', error);
      throw error;
    }
  }

  async publishCarousel(carouselId: string): Promise<InstagramPostResponse> {
    try {
      // Get carousel from database
      const carousel = await this.getCarousel(carouselId);
      
      if (!carousel) {
        throw new Error(`Carousel not found: ${carouselId}`);
      }

      console.log(`Publishing carousel: ${carouselId}`);
      
      // Publish to Instagram
      const postResponse = await this.carouselGenerator.publishCarousel(carousel);
      
      // Update database with publishing result
      const serviceClient = this.getServiceClient();
      const { error } = await serviceClient
        .from('instagram_carousels')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          permalink: postResponse.permalink,
          media_container_id: postResponse.id,
        })
        .eq('id', carouselId);

      if (error) {
        console.error('Error updating carousel status:', error);
        throw error;
      }

      // Mark property as published on Instagram
      await serviceClient
        .from('property_listings')
        .update({ instagram_published: true })
        .eq('id', carousel.property_id);

      console.log(`Carousel published successfully: ${postResponse.permalink}`);
      return postResponse;
    } catch (error) {
      console.error('Error publishing carousel:', error);
      throw error;
    }
  }

  async scheduleCarousel(carouselId: string, scheduledDate: Date): Promise<InstagramPostResponse> {
    try {
      // Get carousel from database
      const carousel = await this.getCarousel(carouselId);
      
      if (!carousel) {
        throw new Error(`Carousel not found: ${carouselId}`);
      }

      console.log(`Scheduling carousel: ${carouselId} for ${scheduledDate.toISOString()}`);
      
      // Schedule with Instagram
      const scheduleResponse = await this.carouselGenerator.scheduleCarousel(carousel, scheduledDate);
      
      // Update database with scheduling result
      const serviceClient = this.getServiceClient();
      const { error } = await serviceClient
        .from('instagram_carousels')
        .update({
          status: 'scheduled',
          scheduled_at: scheduledDate.toISOString(),
        })
        .eq('id', carouselId);

      if (error) {
        console.error('Error updating carousel schedule:', error);
        throw error;
      }

      console.log(`Carousel scheduled successfully for ${formatDate(scheduledDate)}`);
      return scheduleResponse;
    } catch (error) {
      console.error('Error scheduling carousel:', error);
      throw error;
    }
  }

  async batchPublishCarousels(): Promise<InstagramPostResponse[]> {
    try {
      const unpublishedProperties = await this.getUnpublishedProperties();
      const publishedPosts: InstagramPostResponse[] = [];
      
      console.log(`Found ${unpublishedProperties.length} unpublished properties`);
      
      for (const property of unpublishedProperties) {
        try {
          console.log(`Processing property: ${property.title}`);
          
          // Generate carousel
          const carousel = await this.generateCarouselForProperty(property.id);
          
          // Publish carousel
          const postResponse = await this.publishCarousel(carousel.id);
          
          publishedPosts.push(postResponse);
          
          // Add delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 5000));
          
        } catch (error) {
          console.error(`Error processing property ${property.id}:`, error);
          // Continue with next property
        }
      }
      
      console.log(`Successfully published ${publishedPosts.length} carousels`);
      return publishedPosts;
    } catch (error) {
      console.error('Error in batch publish:', error);
      throw error;
    }
  }

  async getAnalytics(): Promise<any> {
    try {
      const serviceClient = this.getServiceClient();
      
      // Get total carousels
      const { count: totalCarousels } = await serviceClient
        .from('instagram_carousels')
        .select('*', { count: 'exact', head: true });
      
      // Get published carousels
      const { count: publishedCarousels } = await serviceClient
        .from('instagram_carousels')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published');
      
      // Get scheduled carousels
      const { count: scheduledCarousels } = await serviceClient
        .from('instagram_carousels')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'scheduled');
      
      // Get recent posts
      const { data: recentPosts } = await serviceClient
        .from('instagram_carousels')
        .select('permalink, published_at, caption')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(10);
      
      return {
        total_carousels: totalCarousels || 0,
        published_carousels: publishedCarousels || 0,
        scheduled_carousels: scheduledCarousels || 0,
        draft_carousels: (totalCarousels || 0) - (publishedCarousels || 0) - (scheduledCarousels || 0),
        recent_posts: recentPosts || [],
      };
    } catch (error) {
      console.error('Error getting analytics:', error);
      throw error;
    }
  }

  async deleteCarousel(carouselId: string): Promise<void> {
    try {
      const serviceClient = this.getServiceClient();
      const { error } = await serviceClient
        .from('instagram_carousels')
        .delete()
        .eq('id', carouselId);

      if (error) {
        console.error('Error deleting carousel:', error);
        throw error;
      }

      console.log(`Carousel deleted: ${carouselId}`);
    } catch (error) {
      console.error('Error deleting carousel:', error);
      throw error;
    }
  }
}

export default InstagramService;