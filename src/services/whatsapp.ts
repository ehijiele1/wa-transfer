import { Client, LocalAuth, Message as WWebMessage } from 'whatsapp-web.js';
import { WhatsAppMessage } from '../types';
import { getInputGuard } from './inputGuard';
import { logger } from '../utils/logger';
import { whatsappCircuitBreaker } from '../utils/circuitBreaker';

export class WhatsAppService {
  private client: Client | null = null;
  private messageCallbacks: ((message: WhatsAppMessage) => void)[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private retryDelayMs = 5000;
  private readyTime = 0;
  private tableMissingLogged = false;

  constructor() {}

  async connect(): Promise<void> {
    try {
      this.client = new Client({
        authStrategy: new LocalAuth({
          clientId: 'wa-transfer',
          dataPath: './wwebjs-auth',
        }),
        puppeteer: {
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--user-data-dir=/tmp/chrome-profile',
          ],
          headless: true,
        },
      });

      this.setupEventHandlers();
      await this.client.initialize();
      logger.info('WhatsApp client connected successfully');
    } catch (error) {
      logger.error('Failed to connect to WhatsApp', error as Error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('qr', (qr: string) => {
      logger.info('QR Code generated - scan with WhatsApp Web');
    });

    this.client.on('authenticated', () => {
      logger.info('WhatsApp authenticated');
    });

    this.client.on('auth_failure', (msg: string) => {
      logger.error('WhatsApp auth failure', new Error(msg));
    });

    this.client.on('ready', async () => {
      this.readyTime = Date.now();
      this.reconnectAttempts = 0;
      logger.info('WhatsApp connection established');

      setTimeout(async () => {
        try {
          const chats = await this.client!.getChats();
          const groups = chats.filter(c => c.isGroup);
          logger.info('Available groups', { count: groups.length });
          for (const g of groups) {
            logger.info('Group found', { name: g.name, id: g.id._serialized });
          }
        } catch (e: any) {
          logger.warn('Group listing unavailable', { error: e.message });
        }
      }, 15000);
    });

    this.client.on('disconnected', async (reason: string) => {
      logger.warn('WhatsApp disconnected', { reason });

      if (reason !== 'LOGGED_OUT' && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        logger.info(`Attempting to reconnect`, { attempt: this.reconnectAttempts, max: this.maxReconnectAttempts });
        setTimeout(() => this.connect(), this.retryDelayMs);
      } else {
        logger.error('Max reconnection attempts reached or logged out');
      }
    });

    this.client.on('message_create', async (message: WWebMessage) => {
      if (message.fromMe) return;
      if (this.readyTime > 0 && message.timestamp * 1000 < this.readyTime - 5000) return;
      await this.processMessage(message);
    });
  }

  private async processMessage(message: WWebMessage): Promise<void> {
    try {
      const chat = await message.getChat();
      const whatsappMessage: WhatsAppMessage = {
        id: message.id._serialized,
        from: message.from,
        to: message.author || message.from,
        timestamp: message.timestamp,
        type: this.getMessageType(message),
        message: await this.extractMessageContent(message),
        metadata: this.extractMetadata(message, chat),
      };

      // Validate message before processing
      const inputGuard = getInputGuard();
      try {
        inputGuard.validateMessage(whatsappMessage);
      } catch (validationError: any) {
        await inputGuard.quarantine(validationError.message, whatsappMessage);
        return; // Skip callbacks for quarantined messages
      }

      for (const callback of this.messageCallbacks) {
        callback(whatsappMessage);
      }
    } catch (error: any) {
      if (error?.message?.includes('Target closed')) return;
      logger.error('Error processing message', error);
    }
  }

  private getMessageType(message: WWebMessage): 'text' | 'image' | 'video' | 'document' {
    if (message.hasMedia) {
      if (message.type === 'image') return 'image';
      if (message.type === 'video') return 'video';
      if (message.type === 'document') return 'document';
    }
    return 'text';
  }

  private async extractMessageContent(message: WWebMessage): Promise<any> {
    if (message.hasMedia) {
      try {
        const media = await message.downloadMedia();
        return {
          [`${message.type}Message`]: {
            caption: message.body || '',
            url: media.data,
            mimetype: media.mimetype,
            filename: media.filename,
          },
        };
      } catch {
        return {};
      }
    }
    if (message.body) {
      return { conversation: message.body };
    }
    return {};
  }

  private extractMetadata(message: WWebMessage, chat: any): any {
    const metadata: any = {};

    if (message.from.endsWith('@g.us')) {
      metadata.groupMetadata = {
        subject: chat.name || 'Unknown Group',
        description: chat.description || '',
        participants: [],
      };
    }

    return metadata;
  }

  onMessage(callback: (message: WhatsAppMessage) => void): void {
    this.messageCallbacks.push(callback);
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      this.client.removeAllListeners();
      await this.client.destroy();
      this.client = null;
      logger.info('WhatsApp client disconnected');
    }
  }
}

export default WhatsAppService;
