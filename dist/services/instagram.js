"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@supabase/supabase-js");
const config_1 = __importDefault(require("../config"));
const instagramMedia_1 = __importDefault(require("./instagramMedia"));
const instagramCarouselGenerator_1 = __importDefault(require("./instagramCarouselGenerator"));
const utils_1 = require("../utils");
const logger_1 = require("../utils/logger");
class InstagramService {
    client;
    mediaService;
    carouselGenerator;
    constructor() {
        this.client = (0, supabase_js_1.createClient)(config_1.default.supabase.url, config_1.default.supabase.key);
        this.mediaService = new instagramMedia_1.default();
        this.carouselGenerator = new instagramCarouselGenerator_1.default();
    }
    getServiceClient() {
        return (0, supabase_js_1.createClient)(config_1.default.supabase.url, config_1.default.supabase.serviceRoleKey);
    }
    async saveCarousel(carousel) {
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
            logger_1.logger.error('Error saving carousel', error);
            throw error;
        }
    }
    async getCarousel(carouselId) {
        const serviceClient = this.getServiceClient();
        const { data, error } = await serviceClient
            .from('instagram_carousels')
            .select('*')
            .eq('id', carouselId)
            .single();
        if (error) {
            logger_1.logger.error('Error fetching carousel', error);
            throw error;
        }
        return data;
    }
    async getDraftCarousels() {
        const serviceClient = this.getServiceClient();
        const { data, error } = await serviceClient
            .from('instagram_carousels')
            .select('*')
            .eq('status', 'draft')
            .limit(10);
        if (error) {
            logger_1.logger.error('Error fetching draft carousels', error);
            throw error;
        }
        return data || [];
    }
    async getPublishedCarousels() {
        const serviceClient = this.getServiceClient();
        const { data, error } = await serviceClient
            .from('instagram_carousels')
            .select('*')
            .eq('status', 'published')
            .order('published_at', { ascending: false })
            .limit(20);
        if (error) {
            logger_1.logger.error('Error fetching published carousels', error);
            throw error;
        }
        return data || [];
    }
    async getUnpublishedProperties() {
        const serviceClient = this.getServiceClient();
        const { data, error } = await serviceClient
            .from('property_listings')
            .select('*')
            .eq('processed', true)
            .eq('instagram_published', false)
            .limit(5);
        if (error) {
            logger_1.logger.error('Error fetching unpublished properties', error);
            throw error;
        }
        return data || [];
    }
    async generateCarouselForProperty(propertyId) {
        try {
            const serviceClient = this.getServiceClient();
            const { data: property, error } = await serviceClient
                .from('property_listings')
                .select('*')
                .eq('id', propertyId)
                .single();
            if (error) {
                throw new Error(`Property not found: ${error.message}`);
            }
            const carousel = await this.carouselGenerator.generateCarousel(property);
            await this.saveCarousel(carousel);
            logger_1.logger.info(`Generated carousel for property ${propertyId}`, { carouselId: carousel.id });
            return carousel;
        }
        catch (error) {
            logger_1.logger.error('Error generating carousel for property', error, { propertyId });
            throw error;
        }
    }
    async publishCarousel(carouselId) {
        try {
            const carousel = await this.getCarousel(carouselId);
            if (!carousel) {
                throw new Error(`Carousel not found: ${carouselId}`);
            }
            logger_1.logger.info(`Publishing carousel`, { carouselId });
            const postResponse = await this.carouselGenerator.publishCarousel(carousel);
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
                logger_1.logger.error('Error updating carousel status', error, { carouselId });
                throw error;
            }
            await serviceClient
                .from('property_listings')
                .update({ instagram_published: true })
                .eq('id', carousel.property_id);
            logger_1.logger.info('Carousel published successfully', { carouselId, permalink: postResponse.permalink });
            return postResponse;
        }
        catch (error) {
            logger_1.logger.error('Error publishing carousel', error, { carouselId });
            throw error;
        }
    }
    async scheduleCarousel(carouselId, scheduledDate) {
        try {
            const carousel = await this.getCarousel(carouselId);
            if (!carousel) {
                throw new Error(`Carousel not found: ${carouselId}`);
            }
            logger_1.logger.info(`Scheduling carousel`, { carouselId, scheduledDate: scheduledDate.toISOString() });
            const scheduleResponse = await this.carouselGenerator.scheduleCarousel(carousel, scheduledDate);
            const serviceClient = this.getServiceClient();
            const { error } = await serviceClient
                .from('instagram_carousels')
                .update({
                status: 'scheduled',
                scheduled_at: scheduledDate.toISOString(),
            })
                .eq('id', carouselId);
            if (error) {
                logger_1.logger.error('Error updating carousel schedule', error, { carouselId });
                throw error;
            }
            logger_1.logger.info('Carousel scheduled successfully', { carouselId, formattedDate: (0, utils_1.formatDate)(scheduledDate) });
            return scheduleResponse;
        }
        catch (error) {
            logger_1.logger.error('Error scheduling carousel', error, { carouselId });
            throw error;
        }
    }
    async batchPublishCarousels() {
        try {
            const unpublishedProperties = await this.getUnpublishedProperties();
            const publishedPosts = [];
            logger_1.logger.info(`Found ${unpublishedProperties.length} unpublished properties`);
            for (const property of unpublishedProperties) {
                try {
                    logger_1.logger.info(`Processing property`, { propertyId: property.id, title: property.title });
                    const carousel = await this.generateCarouselForProperty(property.id);
                    const postResponse = await this.publishCarousel(carousel.id);
                    publishedPosts.push(postResponse);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
                catch (error) {
                    logger_1.logger.error(`Error processing property`, error, { propertyId: property.id });
                }
            }
            logger_1.logger.info(`Successfully published carousels`, { count: publishedPosts.length });
            return publishedPosts;
        }
        catch (error) {
            logger_1.logger.error('Error in batch publish', error);
            throw error;
        }
    }
    async getAnalytics() {
        try {
            const serviceClient = this.getServiceClient();
            const { count: totalCarousels } = await serviceClient
                .from('instagram_carousels')
                .select('*', { count: 'exact', head: true });
            const { count: publishedCarousels } = await serviceClient
                .from('instagram_carousels')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'published');
            const { count: scheduledCarousels } = await serviceClient
                .from('instagram_carousels')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'scheduled');
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
        }
        catch (error) {
            logger_1.logger.error('Error getting analytics', error);
            throw error;
        }
    }
    async deleteCarousel(carouselId) {
        try {
            const serviceClient = this.getServiceClient();
            const { error } = await serviceClient
                .from('instagram_carousels')
                .delete()
                .eq('id', carouselId);
            if (error) {
                logger_1.logger.error('Error deleting carousel', error, { carouselId });
                throw error;
            }
            logger_1.logger.info('Carousel deleted', { carouselId });
        }
        catch (error) {
            logger_1.logger.error('Error deleting carousel', error, { carouselId });
            throw error;
        }
    }
}
exports.default = InstagramService;
//# sourceMappingURL=instagram.js.map