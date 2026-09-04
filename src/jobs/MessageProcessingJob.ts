import { whatsappService } from '../services/whatsapp';
import SupabaseService from '../services/supabase';
import MessageProcessor, { MessageClassification } from '../services/messageProcessor';
import { getInputGuard } from '../services/inputGuard';
import { groupManager } from '../services/groupManager';
import { WhatsAppMessage } from '../types';
import { log } from '../services/logger';
import { logger } from '../utils/logger';
import WhatsAppService from '../services/whatsapp';

export class MessageProcessingJob {
  private whatsappService: WhatsAppService;
  private supabaseService: SupabaseService;
  private messageProcessor: MessageProcessor;
  private inputGuard: any;
  private isRunning: boolean = false;

  constructor() {
    this.whatsappService = whatsappService;
    this.supabaseService = new SupabaseService();
    this.messageProcessor = new MessageProcessor();
    this.inputGuard = getInputGuard();
  }

  async start(): Promise<void> {
    const startTime = Date.now();
    try {
      log.info('MessageProcessingJob', 'Starting Message Processing Job');
      // Warm up the group cache before connecting WhatsApp
      try {
        await groupManager.refreshCache();
        log.info('MessageProcessingJob', 'Group cache warmed up');
      } catch (e) {
        log.warn('MessageProcessingJob', 'Failed to warm up group cache; will lazy-load', {
          error: e instanceof Error ? e.message : String(e),
        });
      }
      await this.whatsappService.connect();
      this.setupMessageHandlers();
      this.isRunning = true;
      const duration = Date.now() - startTime;
      log.info('MessageProcessingJob', 'Message Processing Job started successfully', { duration });
    } catch (error) {
      const duration = Date.now() - startTime;
      log.error('MessageProcessingJob', 'Failed to start Message Processing Job', { error: error instanceof Error ? error.message : String(error), duration });
      throw error;
    }
  }

  private setupMessageHandlers(): void {
    this.whatsappService.onMessage(async (message: WhatsAppMessage) => {
      if (!this.isRunning) return;

      try {
        await this.processMessage(message);
      } catch (error) {
        console.error('❌ Error processing message:', error);
      }
    });
  }

  private async processMessage(message: WhatsAppMessage): Promise<void> {
    // Defense-in-depth: verify group is monitored before any processing
    const isGroup = message.from.endsWith('@g.us');
    if (isGroup) {
      const monitored = await groupManager.isMonitoredAsync(message.from);
      if (!monitored) {
        logger.debug('MessageProcessingJob: skipping non-monitored group', {
          groupId: message.from,
          messageId: message.id,
        });
        return;
      }
    }

    // Validate message before processing
    try {
      this.inputGuard.validateMessage(message);
    } catch (validationError: any) {
      await this.inputGuard.quarantine(validationError.message, message);
      return; // Skip callbacks for quarantined messages
    }

      const messageText = message.message?.conversation || 'Media message';
      console.log(`📨 Processing message from ${message.from}: ${messageText.substring(0, 100)}`);
    
    const classification = await this.messageProcessor.classifyMessage(message);
    
    if (classification.type === 'property' && classification.extractedData) {
      console.log(`🏠 Property detected: ${classification.extractedData.title}`);
      await this.supabaseService.savePropertyListing(classification.extractedData);
    } else if (classification.type === 'promotion' && classification.extractedData) {
      console.log(`🎯 Promotion detected: ${classification.extractedData.title}`);
      await this.supabaseService.savePromotion(classification.extractedData);
    } else {
      console.log(`💬 Message classified as: ${classification.type} (confidence: ${classification.confidence})`);
    }
  }

  async processBatchMessages(limit: number = 50): Promise<{ processed: number, failed: number }> {
    try {
      console.log(`🔄 Processing batch of up to ${limit} existing messages...`);
      const messages = await this.supabaseService.getRecentMessages(limit);
      
      let processed = 0;
      let failed = 0;

      for (const message of messages) {
        try {
          await this.processMessage(message);
          processed++;
        } catch (error) {
          console.error(`❌ Failed to process message ${message.id}:`, error);
          failed++;
        }
      }
      
      console.log(`✅ Batch processing completed: ${processed} processed, ${failed} failed`);
      return { processed, failed };
    } catch (error) {
      log.error('MessageProcessingJob', 'Error in batch message processing', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }

  async processUnprocessedListings(): Promise<{ properties: number, promotions: number }> {
    const startTime = Date.now();
    try {
      log.info('MessageProcessingJob', 'Processing unprocessed property listings...');
      const properties = await this.supabaseService.getUnprocessedProperties();
      
      let processedProperties = 0;
      let failedProperties = 0;
      
      for (const property of properties) {
        try {
          log.info('MessageProcessingJob', `Processing property: ${property.title}`, { 
            propertyId: property.id 
          });
          await this.supabaseService.updatePropertyAsProcessed(property.id);
          processedProperties++;
        } catch (error) {
          failedProperties++;
          log.error('MessageProcessingJob', `Error processing property ${property.id}`, { 
            error: error instanceof Error ? error.message : String(error),
            propertyTitle: property.title 
          });
        }
      }
      
      log.info('MessageProcessingJob', `Processed ${processedProperties} property listings`, { 
        total: properties.length,
        processed: processedProperties,
        failed: failedProperties,
        duration: Date.now() - startTime 
      });
      
      try {
        log.info('MessageProcessingJob', 'Processing unprocessed promotions...');
        const promotions = await this.supabaseService.getUnprocessedPromotions();
        
        let processedPromotions = 0;
        let failedPromotions = 0;
        
        for (const promotion of promotions) {
          try {
            log.info('MessageProcessingJob', `Processing promotion: ${promotion.title}`, { 
              promotionId: promotion.id 
            });
            await this.supabaseService.updatePromotionAsProcessed(promotion.id);
            processedPromotions++;
          } catch (error) {
            failedPromotions++;
            log.error('MessageProcessingJob', `Error processing promotion ${promotion.id}`, { 
              error: error instanceof Error ? error.message : String(error),
              promotionTitle: promotion.title 
            });
          }
        }
        
        log.info('MessageProcessingJob', `Processed ${processedPromotions} promotions`, { 
          total: promotions.length,
          processed: processedPromotions,
          failed: failedPromotions,
          duration: Date.now() - startTime 
        });
        
        return { 
          properties: processedProperties, 
          promotions: processedPromotions 
        };
      } catch (error) {
        log.error('MessageProcessingJob', 'Error processing unprocessed promotions', { 
          error: error instanceof Error ? error.message : String(error) 
        });
        throw error;
      }
    } catch (error) {
      log.error('MessageProcessingJob', 'Error processing unprocessed listings', { 
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime 
      });
      throw error;
    }
  }

  async stop(): Promise<void> {
    const startTime = Date.now();
    try {
      log.info('MessageProcessingJob', 'Stopping Message Processing Job...');
      this.isRunning = false;
      await this.whatsappService.disconnect();
      const duration = Date.now() - startTime;
      log.info('MessageProcessingJob', 'Message Processing Job stopped successfully', { duration });
    } catch (error: any) {
      const duration = Date.now() - startTime;
      log.error('MessageProcessingJob', 'Error stopping Message Processing Job', { 
        error: error.message, 
        duration 
      });
      throw error;
    }
  }

  getStatus(): { isRunning: boolean } {
    return { isRunning: this.isRunning };
  }
}