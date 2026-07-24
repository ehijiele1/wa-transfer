import { Client, LocalAuth, Message as WWebMessage } from 'whatsapp-web.js';
import { WhatsAppMessage } from '../types';
import SupabaseService from './supabase';

export class WhatsAppService {
  private client: Client | null = null;
  private supabase: SupabaseService;
  private messageCallbacks: ((message: WhatsAppMessage) => void)[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private retryDelayMs = 5000;

  constructor() {
    this.supabase = new SupabaseService();
  }

  async connect(): Promise<void> {
    try {
      this.client = new Client({
        authStrategy: new LocalAuth({
          clientId: 'wa-transfer',
          dataPath: './wwebjs-auth',
        }),
        puppeteer: {
          args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
          headless: true,
        },
      });

      this.setupEventHandlers();
      await this.client.initialize();
      console.log('WhatsApp client connected successfully');
    } catch (error) {
      console.error('Failed to connect to WhatsApp:', error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('qr', (qr: string) => {
      console.log('QR Code generated - scan with WhatsApp Web');
    });

    this.client.on('authenticated', () => {
      console.log('WhatsApp authenticated');
    });

    this.client.on('auth_failure', (msg: string) => {
      console.error('WhatsApp auth failure:', msg);
    });

    this.client.on('ready', () => {
      this.reconnectAttempts = 0;
      console.log('WhatsApp connection established');
      this.monitorGroups();
    });

    this.client.on('disconnected', async (reason: string) => {
      console.log('WhatsApp disconnected:', reason);

      if (reason !== 'LOGGED_OUT' && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        setTimeout(() => this.connect(), this.retryDelayMs);
      } else {
        console.error('Max reconnection attempts reached or logged out');
      }
    });

    this.client.on('message', async (message: WWebMessage) => {
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

      await this.supabase.saveMessage(whatsappMessage);

      for (const callback of this.messageCallbacks) {
        callback(whatsappMessage);
      }
    } catch (error) {
      console.error('Error processing message:', error);
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

  private async monitorGroups(): Promise<void> {
    console.log('WhatsApp client ready, monitoring configured groups');
  }

  onMessage(callback: (message: WhatsAppMessage) => void): void {
    this.messageCallbacks.push(callback);
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      this.client.removeAllListeners();
      await this.client.destroy();
      this.client = null;
      console.log('WhatsApp client disconnected');
    }
  }
}

export default WhatsAppService;
