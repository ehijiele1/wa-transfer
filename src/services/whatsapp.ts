import { Client, LocalAuth, Message as WWebMessage } from 'whatsapp-web.js';
import { WhatsAppMessage } from '../types';
import { getInputGuard } from './inputGuard';
import { logger } from '../utils/logger';
import { whatsappCircuitBreaker } from '../utils/circuitBreaker';
import { getGroupManager } from './groupManager';

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
    if (this.client) {
      logger.info('WhatsApp client already connected, skipping');
      return;
    }
    // Clear stale Chromium profile locks from previous crashed runs
    try {
      const fs = await import('fs');
      const path = await import('path');
      const sessionDir = path.join('./wwebjs-auth', 'session-wa-transfer');
      for (const f of ['SingletonLock', 'SingletonSocket', 'SingletonCookie']) {
        try { await fs.promises.unlink(path.join(sessionDir, f)); } catch {}
      }
    } catch {}
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
            '--disable-crash-reporter',
            '--crash-dumps-dir=/tmp',
          ],
          headless: true,
          protocolTimeout: 300000,
        },
      });

      this.setupEventHandlers();
      await this.client.initialize();
      logger.info('WhatsApp client connected successfully');
    } catch (error) {
      logger.error('Failed to connect to WhatsApp', error as Error);
      if (this.client) {
        try { await this.client.destroy(); } catch {}
        this.client = null;
      }
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    this.client.on('qr', async (qr: string) => {
      logger.info('QR Code generated - scan with WhatsApp Web');
      try {
        const fs = await import('fs');
        await fs.promises.writeFile('/tmp/qr.txt', qr);
        const qrcode = require('qrcode') as any;
        await qrcode.toFile('/tmp/qr.png', qr, { width: 340, margin: 2 });
        console.log('[QR] saved to /tmp/qr.png and /tmp/qr.txt — scan now (refreshes ~every 20s)');
      } catch {
        console.log('[QRDATA] ' + qr);
      }
    });

    this.client.on('authenticated', () => {
      logger.info('WhatsApp authenticated');
    });

    this.client.on('auth_failure', (msg: string) => {
      logger.error('WhatsApp auth failure', new Error(msg));
    });

    this.client.on('loading_screen', (percent: number, message: string) => {
      logger.info('WhatsApp loading_screen', { percent, message });
    });

    this.client.on('change_state', (state: string) => {
      logger.info('WhatsApp change_state', { state });
    });

    this.client.on('remote_session_saved', () => {
      logger.info('WhatsApp remote_session_saved');
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

      const isGroup = message.from.endsWith('@g.us');
      if (isGroup) {
        const groupManager = getGroupManager();

        const messageText = (message.body || '').trim();
        if (groupManager.isTriggerMessage(messageText)) {
          await this.handleTriggerMessage(message);
          return;
        }

        const monitored = await groupManager.isMonitoredAsync(message.from);
        if (!monitored) {
          logger.debug('Ignoring message from non-monitored group', {
            groupId: message.from,
            messageId: message.id._serialized,
          });
          return;
        }

        await groupManager.incrementMessageCount(message.from);
      }

      await this.processMessage(message);
    });
  }

  private async handleTriggerMessage(message: WWebMessage): Promise<void> {
    try {
      const groupId = message.from;
      const groupManager = getGroupManager();

      const chat = await message.getChat();
      const groupName = (chat as any).name || null;
      const authorId = message.author || null;

      const result = await groupManager.registerGroup(groupId, groupName, authorId);

      if (result.success) {
        logger.info('WATM trigger received — group registered (silent)', {
          groupId,
          groupName,
          wasAlreadyRegistered: result.wasAlreadyRegistered,
          registeredBy: authorId,
        });
      } else {
        logger.error('Failed to register group from WATM trigger', undefined, {
          groupId,
          error: result.error,
        });
      }
    } catch (error) {
      logger.error('Error handling WATM trigger message', error as Error, {
        groupId: message.from,
      });
    }
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

  async getGroups(): Promise<Array<{ name: string; id: string }>> {
    if (!this.client) throw new Error('WhatsApp client not initialized');
    if (!(this.client as any).info) throw new Error('WhatsApp not ready yet — try again in 30 seconds');
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout fetching groups — WhatsApp still syncing, try again')), 15000)
    );
    const chats = (await Promise.race([this.client.getChats(), timeout])) as any[];
    return chats.filter((c: any) => c.isGroup).map((g: any) => ({ name: g.name, id: g.id._serialized }));
  }

  isReady(): boolean {
    return !!(this.client && (this.client as any).info);
  }
}

export const whatsappService = new WhatsAppService();
export default WhatsAppService;
