"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
const config_1 = __importDefault(require("../config"));
class SupabaseService {
    client;
    constructor() {
        this.client = (0, supabase_js_1.createClient)(config_1.default.supabase.url, config_1.default.supabase.key);
    }
    getServiceClient() {
        return (0, supabase_js_1.createClient)(config_1.default.supabase.url, config_1.default.supabase.serviceRoleKey);
    }
    async saveMessage(message) {
        const serviceClient = this.getServiceClient();
        const { error } = await serviceClient
            .from('whatsapp_messages')
            .insert({
            id: message.id,
            from: message.from,
            to: message.to,
            timestamp: message.timestamp,
            message: message.message,
            type: message.type,
            metadata: message.metadata,
            source_group: message.metadata?.groupMetadata?.subject || 'unknown',
        });
        if (error) {
            console.error('Error saving message:', error);
            throw error;
        }
    }
    async savePropertyListing(property) {
        const serviceClient = this.getServiceClient();
        const { error } = await serviceClient
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
            console.error('Error saving property listing:', error);
            throw error;
        }
    }
    async savePromotion(promotion) {
        const serviceClient = this.getServiceClient();
        const { error } = await serviceClient
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
            console.error('Error saving promotion:', error);
            throw error;
        }
    }
    async getRecentMessages(limit = 100) {
        const serviceClient = this.getServiceClient();
        const { data, error } = await serviceClient
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
    async getUnprocessedProperties() {
        const serviceClient = this.getServiceClient();
        const { data, error } = await serviceClient
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
    async getUnprocessedPromotions() {
        const serviceClient = this.getServiceClient();
        const { data, error } = await serviceClient
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
    async updatePropertyAsProcessed(propertyId) {
        const serviceClient = this.getServiceClient();
        const { error } = await serviceClient
            .from('property_listings')
            .update({ processed: true })
            .eq('id', propertyId);
        if (error) {
            console.error('Error updating property as processed:', error);
            throw error;
        }
    }
    async updatePromotionAsProcessed(promotionId) {
        const serviceClient = this.getServiceClient();
        const { error } = await serviceClient
            .from('promotions')
            .update({ processed: true })
            .eq('id', promotionId);
        if (error) {
            console.error('Error updating promotion as processed:', error);
            throw error;
        }
    }
    async searchSimilarProperties(query, limit = 5) {
        const serviceClient = this.getServiceClient();
        const { data, error } = await serviceClient
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
    async searchSimilarPromotions(query, limit = 5) {
        const serviceClient = this.getServiceClient();
        const { data, error } = await serviceClient
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
exports.default = SupabaseService;
//# sourceMappingURL=supabase.js.map