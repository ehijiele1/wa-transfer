"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageProcessingJob = void 0;
const whatsapp_1 = __importDefault(require("../services/whatsapp"));
const supabase_1 = __importDefault(require("../services/supabase"));
const messageProcessor_1 = __importDefault(require("../services/messageProcessor"));
const inputGuard_1 = require("../services/inputGuard");
const logger_1 = require("../services/logger");
class MessageProcessingJob {
    whatsappService;
    supabaseService;
    messageProcessor;
    inputGuard;
    isRunning = false;
    constructor() {
        this.whatsappService = new whatsapp_1.default();
        this.supabaseService = new supabase_1.default();
        this.messageProcessor = new messageProcessor_1.default();
        this.inputGuard = (0, inputGuard_1.getInputGuard)();
    }
    async start() {
        const startTime = Date.now();
        try {
            logger_1.log.info('MessageProcessingJob', 'Starting Message Processing Job');
            await this.whatsappService.connect();
            this.setupMessageHandlers();
            this.isRunning = true;
            const duration = Date.now() - startTime;
            logger_1.log.info('MessageProcessingJob', 'Message Processing Job started successfully', { duration });
        }
        catch (error) {
            const duration = Date.now() - startTime;
            logger_1.log.error('MessageProcessingJob', 'Failed to start Message Processing Job', { error: error instanceof Error ? error.message : String(error), duration });
            throw error;
        }
    }
    setupMessageHandlers() {
        this.whatsappService.onMessage(async (message) => {
            if (!this.isRunning)
                return;
            try {
                await this.processMessage(message);
            }
            catch (error) {
                console.error('❌ Error processing message:', error);
            }
        });
    }
    async processMessage(message) {
        try {
            this.inputGuard.validateMessage(message);
        }
        catch (validationError) {
            await this.inputGuard.quarantine(validationError.message, message);
            return;
        }
        const messageText = message.message?.conversation || 'Media message';
        console.log(`📨 Processing message from ${message.from}: ${messageText.substring(0, 100)}`);
        const classification = await this.messageProcessor.classifyMessage(message);
        if (classification.type === 'property' && classification.extractedData) {
            console.log(`🏠 Property detected: ${classification.extractedData.title}`);
            await this.supabaseService.savePropertyListing(classification.extractedData);
        }
        else if (classification.type === 'promotion' && classification.extractedData) {
            console.log(`🎯 Promotion detected: ${classification.extractedData.title}`);
            await this.supabaseService.savePromotion(classification.extractedData);
        }
        else {
            console.log(`💬 Message classified as: ${classification.type} (confidence: ${classification.confidence})`);
        }
    }
    async processBatchMessages(limit = 50) {
        try {
            console.log(`🔄 Processing batch of up to ${limit} existing messages...`);
            const messages = await this.supabaseService.getRecentMessages(limit);
            let processed = 0;
            let failed = 0;
            for (const message of messages) {
                try {
                    await this.processMessage(message);
                    processed++;
                }
                catch (error) {
                    console.error(`❌ Failed to process message ${message.id}:`, error);
                    failed++;
                }
            }
            console.log(`✅ Batch processing completed: ${processed} processed, ${failed} failed`);
            return { processed, failed };
        }
        catch (error) {
            logger_1.log.error('MessageProcessingJob', 'Error in batch message processing', {
                error: error instanceof Error ? error.message : String(error)
            });
            throw error;
        }
    }
    async processUnprocessedListings() {
        const startTime = Date.now();
        try {
            logger_1.log.info('MessageProcessingJob', 'Processing unprocessed property listings...');
            const properties = await this.supabaseService.getUnprocessedProperties();
            let processedProperties = 0;
            let failedProperties = 0;
            for (const property of properties) {
                try {
                    logger_1.log.info('MessageProcessingJob', `Processing property: ${property.title}`, {
                        propertyId: property.id
                    });
                    await this.supabaseService.updatePropertyAsProcessed(property.id);
                    processedProperties++;
                }
                catch (error) {
                    failedProperties++;
                    logger_1.log.error('MessageProcessingJob', `Error processing property ${property.id}`, {
                        error: error instanceof Error ? error.message : String(error),
                        propertyTitle: property.title
                    });
                }
            }
            logger_1.log.info('MessageProcessingJob', `Processed ${processedProperties} property listings`, {
                total: properties.length,
                processed: processedProperties,
                failed: failedProperties,
                duration: Date.now() - startTime
            });
            try {
                logger_1.log.info('MessageProcessingJob', 'Processing unprocessed promotions...');
                const promotions = await this.supabaseService.getUnprocessedPromotions();
                let processedPromotions = 0;
                let failedPromotions = 0;
                for (const promotion of promotions) {
                    try {
                        logger_1.log.info('MessageProcessingJob', `Processing promotion: ${promotion.title}`, {
                            promotionId: promotion.id
                        });
                        await this.supabaseService.updatePromotionAsProcessed(promotion.id);
                        processedPromotions++;
                    }
                    catch (error) {
                        failedPromotions++;
                        logger_1.log.error('MessageProcessingJob', `Error processing promotion ${promotion.id}`, {
                            error: error instanceof Error ? error.message : String(error),
                            promotionTitle: promotion.title
                        });
                    }
                }
                logger_1.log.info('MessageProcessingJob', `Processed ${processedPromotions} promotions`, {
                    total: promotions.length,
                    processed: processedPromotions,
                    failed: failedPromotions,
                    duration: Date.now() - startTime
                });
                return {
                    properties: processedProperties,
                    promotions: processedPromotions
                };
            }
            catch (error) {
                logger_1.log.error('MessageProcessingJob', 'Error processing unprocessed promotions', {
                    error: error instanceof Error ? error.message : String(error)
                });
                throw error;
            }
        }
        catch (error) {
            logger_1.log.error('MessageProcessingJob', 'Error processing unprocessed listings', {
                error: error instanceof Error ? error.message : String(error),
                duration: Date.now() - startTime
            });
            throw error;
        }
    }
    async stop() {
        const startTime = Date.now();
        try {
            logger_1.log.info('MessageProcessingJob', 'Stopping Message Processing Job...');
            this.isRunning = false;
            await this.whatsappService.disconnect();
            const duration = Date.now() - startTime;
            logger_1.log.info('MessageProcessingJob', 'Message Processing Job stopped successfully', { duration });
        }
        catch (error) {
            const duration = Date.now() - startTime;
            logger_1.log.error('MessageProcessingJob', 'Error stopping Message Processing Job', {
                error: error.message,
                duration
            });
            throw error;
        }
    }
    getStatus() {
        return { isRunning: this.isRunning };
    }
}
exports.MessageProcessingJob = MessageProcessingJob;
//# sourceMappingURL=MessageProcessingJob.js.map