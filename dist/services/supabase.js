"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
const config_1 = __importDefault(require("../config"));
const logger_1 = require("../utils/logger");
class SupabaseService {
    anonClient;
    serviceClient;
    constructor() {
        this.anonClient = (0, supabase_js_1.createClient)(config_1.default.supabase.url, config_1.default.supabase.key);
        this.serviceClient = (0, supabase_js_1.createClient)(config_1.default.supabase.url, config_1.default.supabase.serviceRoleKey);
    }
    getAnonClient() {
        return this.anonClient;
    }
    getServiceClient() {
        return this.serviceClient;
    }
    getClient() {
        return this.getAnonClient();
    }
    async getPropertyById(propertyId) {
        const client = this.getAnonClient();
        const { data, error } = await client
            .from('property_listings')
            .select('*')
            .eq('id', propertyId)
            .single();
        if (error) {
            logger_1.logger.error('Failed to get property by id', error, { propertyId });
            return null;
        }
        return data;
    }
    async saveMessage(message) {
        const client = this.getAnonClient();
        const { error } = await client
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
            if (error.code === 'PGRST205')
                return;
            logger_1.logger.warn('Failed to save message with anon client, retrying with elevated permissions', {
                error: error.message,
                messageId: message.id,
            });
            const { error: serviceError } = await this.getServiceClient()
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
            if (serviceError) {
                logger_1.logger.error('Failed to save message with service client', serviceError, { messageId: message.id });
                throw serviceError;
            }
        }
    }
    async getRecentMessages(limit = 100) {
        const client = this.getAnonClient();
        const { data, error } = await client
            .from('whatsapp_messages')
            .select('*')
            .order('timestamp', { ascending: false })
            .limit(limit);
        if (error) {
            logger_1.logger.error('Failed to get recent messages', error);
            throw error;
        }
        return data || [];
    }
    async savePropertyListing(property) {
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
            if (error.code === 'PGRST205')
                return;
            logger_1.logger.warn('Failed to save property with anon client, retrying with elevated permissions', {
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
                logger_1.logger.error('Failed to save property with service client', serviceError, { propertyId: property.id });
                throw serviceError;
            }
        }
    }
    async getUnprocessedProperties() {
        const client = this.getAnonClient();
        const { data, error } = await client
            .from('property_listings')
            .select('*')
            .eq('processed', false)
            .limit(50);
        if (error) {
            logger_1.logger.error('Failed to get unprocessed properties', error);
            throw error;
        }
        return data || [];
    }
    async updatePropertyAsProcessed(propertyId) {
        const client = this.getAnonClient();
        const { error } = await client
            .from('property_listings')
            .update({ processed: true })
            .eq('id', propertyId);
        if (error) {
            logger_1.logger.error('Failed to update property as processed', error, { propertyId });
            throw error;
        }
    }
    async markPropertyAsInstagramPublished(propertyId, publishedAt) {
        const client = this.getServiceClient();
        const { error } = await client
            .from('property_listings')
            .update({
            instagram_published: true,
            instagram_published_at: publishedAt,
        })
            .eq('id', propertyId);
        if (error) {
            logger_1.logger.error('Failed to mark property as Instagram published', error, { propertyId });
            throw error;
        }
    }
    async searchSimilarProperties(query, limit = 5) {
        const client = this.getAnonClient();
        const { data, error } = await client
            .rpc('search_similar_properties', {
            search_query: query,
            limit_num: limit
        });
        if (error) {
            logger_1.logger.error('Failed to search similar properties', error);
            throw error;
        }
        return data || [];
    }
    async savePromotion(promotion) {
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
            if (error.code === 'PGRST205')
                return;
            logger_1.logger.warn('Failed to save promotion with anon client, retrying with elevated permissions', {
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
                logger_1.logger.error('Failed to save promotion with service client', serviceError, { promotionId: promotion.id });
                throw serviceError;
            }
        }
    }
    async getUnprocessedPromotions() {
        const client = this.getAnonClient();
        const { data, error } = await client
            .from('promotions')
            .select('*')
            .eq('processed', false)
            .limit(50);
        if (error) {
            logger_1.logger.error('Failed to get unprocessed promotions', error);
            throw error;
        }
        return data || [];
    }
    async updatePromotionAsProcessed(promotionId) {
        const client = this.getAnonClient();
        const { error } = await client
            .from('promotions')
            .update({ processed: true })
            .eq('id', promotionId);
        if (error) {
            logger_1.logger.error('Failed to update promotion as processed', error, { promotionId });
            throw error;
        }
    }
    async searchSimilarPromotions(query, limit = 5) {
        const client = this.getAnonClient();
        const { data, error } = await client
            .rpc('search_similar_promotions', {
            search_query: query,
            limit_num: limit
        });
        if (error) {
            logger_1.logger.error('Failed to search similar promotions', error);
            throw error;
        }
        return data || [];
    }
    async saveCarousel(carousel) {
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
            if (error.code === 'PGRST205')
                return;
            logger_1.logger.warn('Failed to save carousel with anon client, retrying with elevated permissions', {
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
                logger_1.logger.error('Failed to save carousel with service client', serviceError, { carouselId: carousel.id });
                throw serviceError;
            }
        }
    }
    async getCarousel(carouselId) {
        const client = this.getAnonClient();
        const { data, error } = await client
            .from('instagram_carousels')
            .select('*')
            .eq('id', carouselId)
            .single();
        if (error) {
            logger_1.logger.error('Failed to get carousel', error, { carouselId });
            throw error;
        }
        return data;
    }
    async getDraftCarousels() {
        const client = this.getAnonClient();
        const { data, error } = await client
            .from('instagram_carousels')
            .select('*')
            .eq('status', 'draft')
            .limit(10);
        if (error) {
            logger_1.logger.error('Failed to get draft carousels', error);
            throw error;
        }
        return data || [];
    }
    async getPublishedCarousels() {
        const client = this.getAnonClient();
        const { data, error } = await client
            .from('instagram_carousels')
            .select('*')
            .eq('status', 'published')
            .order('published_at', { ascending: false })
            .limit(20);
        if (error) {
            logger_1.logger.error('Failed to get published carousels', error);
            throw error;
        }
        return data || [];
    }
    async updateCarouselStatus(carouselId, updates) {
        const client = this.getAnonClient();
        const { error } = await client
            .from('instagram_carousels')
            .update(updates)
            .eq('id', carouselId);
        if (error) {
            logger_1.logger.error('Failed to update carousel status', error, { carouselId });
            throw error;
        }
    }
    async deleteCarousel(carouselId) {
        const client = this.getAnonClient();
        const { error } = await client
            .from('instagram_carousels')
            .delete()
            .eq('id', carouselId);
        if (error) {
            logger_1.logger.error('Failed to delete carousel', error, { carouselId });
            throw error;
        }
    }
    async saveSocialMediaPost(post) {
        const client = this.getAnonClient();
        const { error } = await client
            .from('social_media_posts')
            .insert(post);
        if (error) {
            if (error.code === 'PGRST205')
                return;
            logger_1.logger.warn('Failed to save social media post with anon client, retrying with elevated permissions', {
                error: error.message,
                postId: post.id,
            });
            const { error: serviceError } = await this.getServiceClient()
                .from('social_media_posts')
                .insert(post);
            if (serviceError) {
                logger_1.logger.error('Failed to save social media post with service client', serviceError, { postId: post.id });
                throw serviceError;
            }
        }
    }
    async saveScheduledPost(post) {
        const client = this.getAnonClient();
        const { error } = await client
            .from('social_media_scheduled_posts')
            .insert(post);
        if (error) {
            if (error.code === 'PGRST205')
                return;
            logger_1.logger.warn('Failed to save scheduled post with anon client', { error: error.message, postId: post.id });
            throw error;
        }
    }
    async getPendingScheduledPosts() {
        const client = this.getAnonClient();
        const { data, error } = await client
            .from('social_media_scheduled_posts')
            .select('*')
            .eq('status', 'pending')
            .lte('scheduled_at', new Date().toISOString())
            .limit(100);
        if (error) {
            logger_1.logger.error('Failed to get pending scheduled posts', error);
            throw error;
        }
        return data || [];
    }
    async updateScheduledPostStatus(postId, status, updates = {}) {
        const client = this.getAnonClient();
        const { error } = await client
            .from('social_media_scheduled_posts')
            .update({ status, ...updates })
            .eq('id', postId);
        if (error) {
            logger_1.logger.error('Failed to update scheduled post status', error, { postId, status });
            throw error;
        }
    }
    async createContentQueue(queue) {
        const client = this.getAnonClient();
        const { error } = await client
            .from('content_queues')
            .insert(queue);
        if (error) {
            if (error.code === 'PGRST205')
                return;
            logger_1.logger.warn('Failed to create content queue with anon client', { error: error.message, queueId: queue.id });
            throw error;
        }
    }
    async saveQueuePost(queueId, postId) {
        const client = this.getAnonClient();
        const { error } = await client
            .from('queue_posts')
            .insert({ queue_id: queueId, post_id: postId });
        if (error) {
            if (error.code === 'PGRST205')
                return;
            logger_1.logger.warn('Failed to save queue post with anon client', { error: error.message, queueId, postId });
            throw error;
        }
    }
}
exports.default = SupabaseService;
//# sourceMappingURL=supabase.js.map