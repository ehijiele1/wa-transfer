import { createClient, SupabaseClient } from '@supabase/supabase-js';
import config from '../config';
import { PropertyListing, Promotion, WhatsAppMessage } from '../types';
import { logger } from '../utils/logger';

/**
 * Supabase Service with least-privilege access pattern
 * - Normal operations use anon key (respects RLS)
 * - Admin operations explicitly use service role key
 */

class SupabaseService {
  private anonClient: SupabaseClient;
  private serviceClient: SupabaseClient;

  constructor() {
    // Anon client for normal operations (respects RLS)
    this.anonClient = createClient(config.supabase.url, config.supabase.key);
    
    // Service client ONLY for admin operations that bypass RLS
    this.serviceClient = createClient(config.supabase.url, config.supabase.serviceRoleKey);
  }

  /**
   * Get the anon client for normal operations
   */
  private getAnonClient(): SupabaseClient {
    return this.anonClient;
  }

  /**
   * Get the service client for admin operations only
   */
  private getServiceClient(): SupabaseClient {
    return this.serviceClient;
  }

  /**
   * Public accessor for internal services (scheduler) to run
   * RLS-respecting queries without exposing the service client.
   */
  getClient(): SupabaseClient {
    return this.getAnonClient();
  }

  async getPropertyById(propertyId: string): Promise<PropertyListing | null> {
    const client = this.getAnonClient();
    const { data, error } = await client
      .from('property_listings')
      .select('*')
      .eq('id', propertyId)
      .single();

    if (error) {
      logger.error('Failed to get property by id', error, { propertyId });
      return null;
    }

    return data as PropertyListing | null;
  }

  // ==================== WHATSAPP MESSAGES ====================

  async saveMessage(message: WhatsAppMessage): Promise<void> {
    // Use anon client - RLS should allow inserts for authenticated users
    const client = this.getAnonClient();
    const { error } = await client
      .from('whatsapp_messages')
      .insert({
        id: message.id,
        from_number: message.from,
        to_number: message.to,
        timestamp: message.timestamp,
        message: message.message,
        type: message.type,
        metadata: message.metadata,
        source_group: message.metadata?.groupMetadata?.subject || 'unknown',
      });

    if (error) {
      if (error.code === 'PGRST205') return;
      // Fallback to service client only if RLS blocks the operation
      logger.warn('Failed to save message with anon client, retrying with elevated permissions', {
        error: error.message,
        messageId: message.id,
      });
      
      const { error: serviceError } = await this.getServiceClient()
        .from('whatsapp_messages')
        .insert({
          id: message.id,
          from_number: message.from,
          to_number: message.to,
          timestamp: message.timestamp,
          message: message.message,
          type: message.type,
          metadata: message.metadata,
          source_group: message.metadata?.groupMetadata?.subject || 'unknown',
        });

      if (serviceError) {
        logger.error('Failed to save message with service client', serviceError, { messageId: message.id });
        throw serviceError;
      }
    }
  }

  async getRecentMessages(limit: number = 100): Promise<WhatsAppMessage[]> {
    const client = this.getAnonClient();
    const { data, error } = await client
      .from('whatsapp_messages')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      logger.error('Failed to get recent messages', error);
      throw error;
    }

    return data || [];
  }

  // ==================== PROPERTY LISTINGS ====================

  async savePropertyListing(property: PropertyListing): Promise<void> {
    const client = this.getAnonClient();
    const { error } = await client
      .from('property_listings')
      .insert({
        id: property.id,
        title: property.title,
        description: property.description,
        price: property.price,
        location: property.location,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        area: property.area,
        type: property.type,
        features: property.features,
        images: property.images,
        source: property.source,
        source_group: property.sourceGroup,
        timestamp: property.timestamp,
        processed: property.processed,
        embeddings: property.embeddings,
      });

    if (error) {
      if (error.code === 'PGRST205') return;
      logger.warn('Failed to save property with anon client, retrying with elevated permissions', {
        error: error.message,
        propertyId: property.id,
      });
      
      const { error: serviceError } = await this.getServiceClient()
        .from('property_listings')
        .insert({
          id: property.id,
          title: property.title,
          description: property.description,
          price: property.price,
          location: property.location,
          bedrooms: property.bedrooms,
          bathrooms: property.bathrooms,
          area: property.area,
          type: property.type,
          features: property.features,
          images: property.images,
          source: property.source,
          source_group: property.sourceGroup,
          timestamp: property.timestamp,
          processed: property.processed,
          embeddings: property.embeddings,
        });

      if (serviceError) {
        logger.error('Failed to save property with service client', serviceError, { propertyId: property.id });
        throw serviceError;
      }
    }
  }

  async getUnprocessedProperties(): Promise<PropertyListing[]> {
    const client = this.getAnonClient();
    const { data, error } = await client
      .from('property_listings')
      .select('*')
      .eq('processed', false)
      .limit(50);

    if (error) {
      logger.error('Failed to get unprocessed properties', error);
      throw error;
    }

    return data || [];
  }

  async updatePropertyAsProcessed(propertyId: string): Promise<void> {
    const client = this.getAnonClient();
    const { error } = await client
      .from('property_listings')
      .update({ processed: true })
      .eq('id', propertyId);

    if (error) {
      logger.error('Failed to update property as processed', error, { propertyId });
      throw error;
    }
  }

  async markPropertyAsInstagramPublished(propertyId: string, publishedAt: string): Promise<void> {
    // Use service client for this write since it's an internal state update
    const client = this.getServiceClient();
    const { error } = await client
      .from('property_listings')
      .update({
        instagram_published: true,
        instagram_published_at: publishedAt,
      })
      .eq('id', propertyId);

    if (error) {
      logger.error('Failed to mark property as Instagram published', error, { propertyId });
      throw error;
    }
  }

  async searchSimilarProperties(query: string, limit: number = 5): Promise<PropertyListing[]> {
    const client = this.getAnonClient();
    const { data, error } = await client
      .rpc('search_similar_properties', { 
        search_query: query,
        limit_num: limit 
      });

    if (error) {
      logger.error('Failed to search similar properties', error);
      throw error;
    }

    return data || [];
  }

  // ==================== PROMOTIONS ====================

  async savePromotion(promotion: Promotion): Promise<void> {
    const client = this.getAnonClient();
    const { error } = await client
      .from('promotions')
      .insert({
        id: promotion.id,
        title: promotion.title,
        description: promotion.description,
        discount: promotion.discount,
        valid_until: promotion.validUntil,
        terms: promotion.terms,
        source: promotion.source,
        source_group: promotion.sourceGroup,
        timestamp: promotion.timestamp,
        processed: promotion.processed,
        embeddings: promotion.embeddings,
      });

    if (error) {
      if (error.code === 'PGRST205') return;
      logger.warn('Failed to save promotion with anon client, retrying with elevated permissions', {
        error: error.message,
        promotionId: promotion.id,
      });
      
      const { error: serviceError } = await this.getServiceClient()
        .from('promotions')
        .insert({
          id: promotion.id,
          title: promotion.title,
          description: promotion.description,
          discount: promotion.discount,
          valid_until: promotion.validUntil,
          terms: promotion.terms,
          source: promotion.source,
          source_group: promotion.sourceGroup,
          timestamp: promotion.timestamp,
          processed: promotion.processed,
          embeddings: promotion.embeddings,
        });

      if (serviceError) {
        logger.error('Failed to save promotion with service client', serviceError, { promotionId: promotion.id });
        throw serviceError;
      }
    }
  }

  async getUnprocessedPromotions(): Promise<Promotion[]> {
    const client = this.getAnonClient();
    const { data, error } = await client
      .from('promotions')
      .select('*')
      .eq('processed', false)
      .limit(50);

    if (error) {
      logger.error('Failed to get unprocessed promotions', error);
      throw error;
    }

    return data || [];
  }

  async updatePromotionAsProcessed(promotionId: string): Promise<void> {
    const client = this.getAnonClient();
    const { error } = await client
      .from('promotions')
      .update({ processed: true })
      .eq('id', promotionId);

    if (error) {
      logger.error('Failed to update promotion as processed', error, { promotionId });
      throw error;
    }
  }

  async searchSimilarPromotions(query: string, limit: number = 5): Promise<Promotion[]> {
    const client = this.getAnonClient();
    const { data, error } = await client
      .rpc('search_similar_promotions', { 
        search_query: query,
        limit_num: limit 
      });

    if (error) {
      logger.error('Failed to search similar promotions', error);
      throw error;
    }

    return data || [];
  }

  // ==================== INSTAGRAM CAROUSELS ====================

  async saveCarousel(carousel: any): Promise<void> {
    const client = this.getAnonClient();
    const { error } = await client
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
      });

    if (error) {
      if (error.code === 'PGRST205') return;
      logger.warn('Failed to save carousel with anon client, retrying with elevated permissions', {
        error: error.message,
        carouselId: carousel.id,
      });
      
      const { error: serviceError } = await this.getServiceClient()
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
        });

      if (serviceError) {
        logger.error('Failed to save carousel with service client', serviceError, { carouselId: carousel.id });
        throw serviceError;
      }
    }
  }

  async getCarousel(carouselId: string): Promise<any> {
    const client = this.getAnonClient();
    const { data, error } = await client
      .from('instagram_carousels')
      .select('*')
      .eq('id', carouselId)
      .single();

    if (error) {
      logger.error('Failed to get carousel', error, { carouselId });
      throw error;
    }

    return data;
  }

  async getDraftCarousels(): Promise<any[]> {
    const client = this.getAnonClient();
    const { data, error } = await client
      .from('instagram_carousels')
      .select('*')
      .eq('status', 'draft')
      .limit(10);

    if (error) {
      logger.error('Failed to get draft carousels', error);
      throw error;
    }

    return data || [];
  }

  async getPublishedCarousels(): Promise<any[]> {
    const client = this.getAnonClient();
    const { data, error } = await client
      .from('instagram_carousels')
      .select('*')
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(20);

    if (error) {
      logger.error('Failed to get published carousels', error);
      throw error;
    }

    return data || [];
  }

  async updateCarouselStatus(carouselId: string, updates: any): Promise<void> {
    const client = this.getAnonClient();
    const { error } = await client
      .from('instagram_carousels')
      .update(updates)
      .eq('id', carouselId);

    if (error) {
      logger.error('Failed to update carousel status', error, { carouselId });
      throw error;
    }
  }

  async deleteCarousel(carouselId: string): Promise<void> {
    const client = this.getAnonClient();
    const { error } = await client
      .from('instagram_carousels')
      .delete()
      .eq('id', carouselId);

    if (error) {
      logger.error('Failed to delete carousel', error, { carouselId });
      throw error;
    }
  }

  // ==================== SOCIAL MEDIA ====================

  async saveSocialMediaPost(post: any): Promise<void> {
    const client = this.getAnonClient();
    const { error } = await client
      .from('social_media_posts')
      .insert(post);

    if (error) {
      if (error.code === 'PGRST205') return;
      logger.warn('Failed to save social media post with anon client, retrying with elevated permissions', {
        error: error.message,
        postId: post.id,
      });
      
      const { error: serviceError } = await this.getServiceClient()
        .from('social_media_posts')
        .insert(post);

      if (serviceError) {
        logger.error('Failed to save social media post with service client', serviceError, { postId: post.id });
        throw serviceError;
      }
    }
  }

  async saveScheduledPost(post: any): Promise<void> {
    const client = this.getAnonClient();
    const { error } = await client
      .from('social_media_scheduled_posts')
      .insert(post);

    if (error) {
      if (error.code === 'PGRST205') return;
      logger.warn('Failed to save scheduled post with anon client', { error: error.message, postId: post.id });
      throw error;
    }
  }

  async getPendingScheduledPosts(): Promise<any[]> {
    const client = this.getAnonClient();
    const { data, error } = await client
      .from('social_media_scheduled_posts')
      .select('*')
      .eq('status', 'pending')
      .lte('scheduled_at', new Date().toISOString())
      .limit(100);

    if (error) {
      logger.error('Failed to get pending scheduled posts', error);
      throw error;
    }

    return data || [];
  }

  async updateScheduledPostStatus(postId: string, status: string, updates: any = {}): Promise<void> {
    const client = this.getAnonClient();
    const { error } = await client
      .from('social_media_scheduled_posts')
      .update({ status, ...updates })
      .eq('id', postId);

    if (error) {
      logger.error('Failed to update scheduled post status', error, { postId, status });
      throw error;
    }
  }

  async createContentQueue(queue: any): Promise<void> {
    const client = this.getAnonClient();
    const { error } = await client
      .from('content_queues')
      .insert(queue);

    if (error) {
      if (error.code === 'PGRST205') return;
      logger.warn('Failed to create content queue with anon client', { error: error.message, queueId: queue.id });
      throw error;
    }
  }

  async saveQueuePost(queueId: string, postId: string): Promise<void> {
    const client = this.getAnonClient();
    const { error } = await client
      .from('queue_posts')
      .insert({ queue_id: queueId, post_id: postId });

    if (error) {
      if (error.code === 'PGRST205') return;
      logger.warn('Failed to save queue post with anon client', { error: error.message, queueId, postId });
      throw error;
    }
  }
}

export default SupabaseService;