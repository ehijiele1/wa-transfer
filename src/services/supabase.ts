import { getAnonClient, getAdminClient, adminOnly, type SupabaseClient } from './supabaseClients';
import config from '../config';
import { PropertyListing, Promotion, WhatsAppMessage } from '../types';

class SupabaseService {
  private client: SupabaseClient;

  constructor() {
    // Default to anon client for normal operations
    this.client = getAnonClient();
  }

  // Admin-only methods use the Admin symbol to mark privileged operations
  private getAdminClient = () => getAdminClient();

  async saveMessage(message: WhatsAppMessage): Promise<void> {
    const { error } = await this.client
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
      console.error('Error saving message:', error);
      throw error;
    }
  }

  async savePropertyListing(property: PropertyListing): Promise<void> {
    const { error } = await this.client
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
      console.error('Error saving property listing:', error);
      throw error;
    }
  }

  async savePromotion(promotion: Promotion): Promise<void> {
    const { error } = await this.client
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
      console.error('Error saving promotion:', error);
      throw error;
    }
  }

  async getRecentMessages(limit: number = 100): Promise<WhatsAppMessage[]> {
    const { data, error } = await this.client
      .from('whatsapp_messages')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent messages:', error);
      throw error;
    }

    return data || [];
  }

  async getUnprocessedProperties(): Promise<PropertyListing[]> {
    const { data, error } = await this.client
      .from('property_listings')
      .select('*')
      .eq('processed', false)
      .limit(50);

    if (error) {
      console.error('Error fetching unprocessed properties:', error);
      throw error;
    }

    return data || [];
  }

  async getUnprocessedPromotions(): Promise<Promotion[]> {
    const { data, error } = await this.client
      .from('promotions')
      .select('*')
      .eq('processed', false)
      .limit(50);

    if (error) {
      console.error('Error fetching unprocessed promotions:', error);
      throw error;
    }

    return data || [];
  }

  async updatePropertyAsProcessed(propertyId: string): Promise<void> {
    const { error } = await this.client
      .from('property_listings')
      .update({ processed: true })
      .eq('id', propertyId);

    if (error) {
      console.error('Error updating property as processed:', error);
      throw error;
    }
  }

  async updatePromotionAsProcessed(promotionId: string): Promise<void> {
    const { error } = await this.client
      .from('promotions')
      .update({ processed: true })
      .eq('id', promotionId);

    if (error) {
      console.error('Error updating promotion as processed:', error);
      throw error;
    }
  }

  async searchSimilarProperties(query: string, limit: number = 5): Promise<PropertyListing[]> {
    const { data, error } = await this.client
      .rpc('search_similar_properties', { 
        search_query: query,
        limit_num: limit 
      });

    if (error) {
      console.error('Error searching similar properties:', error);
      throw error;
    }

    return data || [];
  }

  async searchSimilarPromotions(query: string, limit: number = 5): Promise<Promotion[]> {
    const { data, error } = await this.client
      .rpc('search_similar_promotions', { 
        search_query: query,
        limit_num: limit 
      });

    if (error) {
      console.error('Error searching similar promotions:', error);
      throw error;
    }

    return data || [];
  }
}

export default SupabaseService;