"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const whatsapp_1 = __importDefault(require("./services/whatsapp"));
const supabase_1 = __importDefault(require("./services/supabase"));
const messageProcessor_1 = __importDefault(require("./services/messageProcessor"));
const instagram_1 = __importDefault(require("./services/instagram"));
const socialMediaManager_1 = __importDefault(require("./services/socialMediaManager"));
const config_1 = __importDefault(require("./config"));
class WhatsAppMonitoringApp {
    whatsappService;
    supabaseService;
    messageProcessor;
    instagramService = null;
    socialMediaManager = null;
    isRunning = false;
    constructor() {
        this.whatsappService = new whatsapp_1.default();
        this.supabaseService = new supabase_1.default();
        this.messageProcessor = new messageProcessor_1.default();
        try {
            this.instagramService = new instagram_1.default();
            this.socialMediaManager = new socialMediaManager_1.default();
        }
        catch (error) {
            console.warn('Social media services not fully configured:', error.message);
        }
    }
    async start() {
        try {
            console.log('Starting WhatsApp Monitoring Application...');
            console.log('Configuration:', {
                supabase: config_1.default.supabase.url ? 'configured' : 'missing',
                whatsapp: { sessionId: config_1.default.whatsapp.sessionId },
                monitoring: { groups: config_1.default.monitoring.groups },
                ollama: { baseUrl: config_1.default.ollama.baseUrl }
            });
            await this.whatsappService.connect();
            this.setupMessageHandlers();
            this.isRunning = true;
            console.log('WhatsApp Monitoring Application started successfully');
            this.startPeriodicProcessing();
        }
        catch (error) {
            console.error('Failed to start application:', error);
            throw error;
        }
    }
    setupMessageHandlers() {
        this.whatsappService.onMessage(async (message) => {
            try {
                console.log(`Processing message from ${message.from}: ${message.message?.conversation?.substring(0, 100) || 'Media message'}`);
                const classification = await this.messageProcessor.classifyMessage(message);
                if (classification.type === 'property' && classification.extractedData) {
                    console.log(`Property detected: ${classification.extractedData.title}`);
                    await this.supabaseService.savePropertyListing(classification.extractedData);
                }
                else if (classification.type === 'promotion' && classification.extractedData) {
                    console.log(`Promotion detected: ${classification.extractedData.title}`);
                    await this.supabaseService.savePromotion(classification.extractedData);
                }
                else {
                    console.log(`Message classified as: ${classification.type} (confidence: ${classification.confidence})`);
                }
            }
            catch (error) {
                console.error('Error processing message:', error);
            }
        });
    }
    async startPeriodicProcessing() {
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
            }
            catch (error) {
                console.error('Error in periodic processing:', error);
            }
        }, config_1.default.monitoring.messageProcessingIntervalMs);
    }
    async processExistingMessages() {
        try {
            console.log('Fetching recent messages...');
            const messages = await this.supabaseService.getRecentMessages(50);
            for (const message of messages) {
                const classification = await this.messageProcessor.classifyMessage(message);
                if (classification.type === 'property' && classification.extractedData) {
                    await this.supabaseService.savePropertyListing(classification.extractedData);
                }
                else if (classification.type === 'promotion' && classification.extractedData) {
                    await this.supabaseService.savePromotion(classification.extractedData);
                }
            }
            console.log(`Processed ${messages.length} existing messages`);
        }
        catch (error) {
            console.error('Error processing existing messages:', error);
        }
    }
    async processUnprocessedListings() {
        try {
            console.log('Processing unprocessed property listings...');
            const properties = await this.supabaseService.getUnprocessedProperties();
            for (const property of properties) {
                console.log(`Processing property: ${property.title}`);
                await this.supabaseService.updatePropertyAsProcessed(property.id);
            }
            console.log(`Processed ${properties.length} property listings`);
        }
        catch (error) {
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
        }
        catch (error) {
            console.error('Error processing unprocessed promotions:', error);
        }
    }
    async processInstagramContent() {
        try {
            console.log('Processing Instagram content...');
            const unpublishedProperties = await this.supabaseService.getUnprocessedProperties();
            for (const property of unpublishedProperties) {
                try {
                    console.log(`Generating Instagram carousel for property: ${property.title}`);
                    const carousel = await this.instagramService?.generateCarouselForProperty(property.id);
                    if (!carousel) {
                        throw new Error(`Failed to generate carousel for property ${property.id}`);
                    }
                    if (config_1.default.instagram?.accessToken) {
                        console.log(`Auto-publishing carousel for ${property.title}`);
                        await this.instagramService?.publishCarousel(carousel.id);
                    }
                    else {
                        console.log('Instagram credentials not configured, carousel saved as draft');
                    }
                }
                catch (error) {
                    console.error(`Error generating carousel for property ${property.id}:`, error);
                }
            }
            console.log('Instagram content processing completed');
        }
        catch (error) {
            console.error('Error processing Instagram content:', error);
        }
    }
    async processSocialMediaQueues() {
        try {
            console.log('Processing social media queues...');
            if (this.socialMediaManager) {
                await this.socialMediaManager.processQueues();
            }
            console.log('Social media queue processing completed');
        }
        catch (error) {
            console.error('Error processing social media queues:', error);
        }
    }
    async publishToSocialMedia(content, platforms, scheduleAt) {
        try {
            console.log(`Publishing to social media platforms: ${platforms.join(', ')}`);
            if (!this.socialMediaManager) {
                throw new Error('Social media manager not initialized');
            }
            const results = await this.socialMediaManager.crossPlatformPublish(content, platforms, scheduleAt);
            return results;
        }
        catch (error) {
            console.error('Error publishing to social media:', error);
            return { success: false, error: error.message };
        }
    }
    async getSocialMediaAnalytics(platform, dateRange) {
        try {
            console.log(`Getting social media analytics for ${platform || 'all platforms'}`);
            if (!this.socialMediaManager) {
                throw new Error('Social media manager not initialized');
            }
            if (dateRange) {
                return await this.socialMediaManager.getPlatformAnalytics(platform || 'all', dateRange);
            }
            else {
                const last30Days = {
                    start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                    end: new Date(),
                };
                return await this.socialMediaManager?.getCrossPlatformAnalytics(last30Days);
            }
        }
        catch (error) {
            console.error('Error getting social media analytics:', error);
            return { success: false, error: error.message };
        }
    }
    async createSocialMediaQueue(platform, priority) {
        try {
            console.log(`Creating social media queue for ${platform}`);
            if (!this.socialMediaManager) {
                throw new Error('Social media manager not initialized');
            }
            return await this.socialMediaManager.createQueue(platform, priority);
        }
        catch (error) {
            console.error('Error creating social media queue:', error);
            return { success: false, error: error.message };
        }
    }
    async getSocialMediaDashboard() {
        try {
            console.log('Generating social media dashboard summary');
            if (!this.socialMediaManager) {
                throw new Error('Social media manager not initialized');
            }
            return await this.socialMediaManager.getDashboardSummary();
        }
        catch (error) {
            console.error('Error generating social media dashboard:', error);
            return { success: false, error: error.message };
        }
    }
    async createABTest(testConfig) {
        try {
            console.log('Creating A/B test for social media');
            if (!this.socialMediaManager) {
                throw new Error('Social media manager not initialized');
            }
            return await this.socialMediaManager.createABTest(testConfig);
        }
        catch (error) {
            console.error('Error creating A/B test:', error);
            return { success: false, error: error.message };
        }
    }
    async getABTestResults(testId) {
        try {
            console.log(`Getting A/B test results: ${testId}`);
            if (!this.socialMediaManager) {
                throw new Error('Social media manager not initialized');
            }
            return await this.socialMediaManager.getABTestResults(testId);
        }
        catch (error) {
            console.error('Error getting A/B test results:', error);
            return { success: false, error: error.message };
        }
    }
    async generateInstagramCarousel(propertyId) {
        try {
            if (!this.instagramService) {
                throw new Error('Instagram service not initialized');
            }
            const carousel = await this.instagramService.generateCarouselForProperty(propertyId);
            return { success: true, carousel_id: carousel.id };
        }
        catch (error) {
            console.error('❌ Error generating carousel for property:', error);
            return { success: false, error: error.message };
        }
    }
    async publishInstagramCarousel(carouselId) {
        try {
            if (!this.instagramService) {
                throw new Error('Instagram service not initialized');
            }
            const postResponse = await this.instagramService.publishCarousel(carouselId);
            return { success: true, post: postResponse };
        }
        catch (error) {
            console.error('Error publishing Instagram carousel:', error);
            return { success: false, error: error.message };
        }
    }
    async getInstagramAnalytics() {
        try {
            if (!this.instagramService) {
                throw new Error('Instagram service not initialized');
            }
            const analytics = await this.instagramService.getAnalytics();
            return { success: true, analytics };
        }
        catch (error) {
            console.error('Error getting Instagram analytics:', error);
            return { success: false, error: error.message };
        }
    }
    async batchPublishInstagram() {
        try {
            if (!this.instagramService) {
                throw new Error('Instagram service not initialized');
            }
            const publishedPosts = await this.instagramService.batchPublishCarousels();
            return { success: true, published_posts: publishedPosts };
        }
        catch (error) {
            console.error('Error in batch Instagram publish:', error);
            return { success: false, error: error.message };
        }
    }
    async stop() {
        try {
            console.log('Stopping WhatsApp Monitoring Application...');
            this.isRunning = false;
            await this.whatsappService.disconnect();
            console.log('WhatsApp Monitoring Application stopped successfully');
        }
        catch (error) {
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
    }
    catch (error) {
        console.error('Application failed to start:', error);
        process.exit(1);
    }
}
if (typeof require !== 'undefined' && require.main === module) {
    main();
}
exports.default = WhatsAppMonitoringApp;
//# sourceMappingURL=index.js.map