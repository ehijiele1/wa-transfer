import { Client, LocalAuth, RemoteAuth, Message as WWebMessage } from 'whatsapp-web.js';
import { WhatsAppMessage } from '../types';
import { getInputGuard } from './inputGuard';
import { logger } from '../utils/logger';
import { whatsappCircuitBreaker } from '../utils/circuitBreaker';
import { getGroupManager } from './groupManager';
import { SupabaseSessionStore } from './supabaseAuth';

export class WhatsAppService {
  private client: Client | null = null;
  private messageCallbacks: ((message: WhatsAppMessage) => void)[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private retryDelayMs = 5000;
  private readyTime = 0;
  private tableMissingLogged = false;
  private authenticated = false;
  private pairingTimer: NodeJS.Timeout | null = null;
  private lastCodeAt = 0;
  private pairingNumber = '';

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
      // Session store: 'supabase' (host-independent, survives restarts — required
      // on HF Spaces where local disk is ephemeral) or 'local' (default, plain
      // LocalAuth for local dev). Same Supabase project = same pairing anywhere.
      const sessionStore = (process.env.WA_SESSION_STORE || 'local').toLowerCase();
      const authStrategy =
        sessionStore === 'supabase'
          ? new RemoteAuth({
              clientId: 'wa-transfer',
              store: new SupabaseSessionStore('wa-transfer'),
              backupSyncIntervalMs: 60000,
            })
          : new LocalAuth({
              clientId: 'wa-transfer',
              dataPath: './wwebjs-auth',
            });

      this.client = new Client({
        authStrategy,
        // WhatsApp Web rejects the library's stale default UA (Chrome/101);
        // send a modern UA so the page bootstraps instead of showing
        // "update Chrome".
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
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

      const pairingNumber = (process.env.WHATSAPP_PAIRING_NUMBER || '').replace(/^\+/, '').trim();
      this.pairingNumber = pairingNumber;
      if (pairingNumber) {
        // Pairing codes are requested in the background: the first call can
        // race page load, and WhatsApp rate-limits code issuance, so keep
        // retrying (gently) until the phone links. The 'authenticated'
        // handler stops the loop. The first success also starts the in-page
        // 3-minute rotation that keeps feeding the 'code' handler.
        const requestCode = async (): Promise<boolean> => {
          const code = await this.fetchAndStorePairingCode();
          return code !== null;
        };
        const stopPairingLoop = () => {
          if (this.pairingTimer) {
            clearInterval(this.pairingTimer);
            this.pairingTimer = null;
          }
        };
        // Persistent staleness-driven loop: the in-page 3-minute rotation
        // can die (e.g. socket leaves UNPAIRED after an expired-code attempt
        // on the phone), so re-request whenever no code has been seen for
        // >6 minutes and the phone hasn't linked yet. Stops on authenticated.
        const ensureLoop = () => {
          if (this.pairingTimer || this.authenticated) return;
          this.pairingTimer = setInterval(() => {
            if (this.authenticated) {
              stopPairingLoop();
              return;
            }
            if (Date.now() - this.lastCodeAt > 6 * 60 * 1000) {
              void requestCode();
            }
          }, 5 * 60 * 1000);
        };
        // Stagger the first attempt so the WA Web app can finish loading.
        setTimeout(() => {
          void requestCode().then(() => {
            ensureLoop();
          });
        }, 20000);
      }
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
      if ((process.env.WHATSAPP_PAIRING_NUMBER || '').trim()) return;
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

    (this.client as any).on('code', async (code: string) => {
      this.lastCodeAt = Date.now();
      logger.info(`Pairing code: ${code} — enter on phone: WhatsApp > Linked devices > Link with phone number`);
      try {
        const fs = await import('fs');
        await fs.promises.writeFile('/tmp/pairing-code.txt', code);
        await fs.promises.writeFile('/tmp/qr.txt', code);
        console.log(`[PAIRING_CODE] ${code}`);
      } catch {}
    });

    this.client.on('authenticated', () => {
      this.authenticated = true;
      if (this.pairingTimer) {
        clearInterval(this.pairingTimer);
        this.pairingTimer = null;
      }
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
      this.authenticated = true;
      if (this.pairingTimer) {
        clearInterval(this.pairingTimer);
        this.pairingTimer = null;
      }
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
    if (this.pairingTimer) {
      clearInterval(this.pairingTimer);
      this.pairingTimer = null;
    }
    this.authenticated = false;
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

  isAuthenticated(): boolean {
    return this.authenticated;
  }

  getPairingStatus(): {
    authenticated: boolean;
    ready: boolean;
    pairingNumberSet: boolean;
    lastCodeAt: number;
    lastCodeAgeSec: number | null;
  } {
    return {
      authenticated: this.authenticated,
      ready: this.isReady(),
      pairingNumberSet: this.pairingNumber.length > 0,
      lastCodeAt: this.lastCodeAt,
      lastCodeAgeSec: this.lastCodeAt > 0 ? Math.round((Date.now() - this.lastCodeAt) / 1000) : null,
    };
  }

  private async fetchAndStorePairingCode(): Promise<string | null> {
    if (this.authenticated || !this.client || !this.pairingNumber) return null;
    try {
      const code = (await (this.client as any).requestPairingCode(this.pairingNumber)) as string;
      this.lastCodeAt = Date.now();
      logger.info(`Pairing code generated: ${code} — enter on phone for ${this.pairingNumber}: WhatsApp > Linked devices > Link with phone number`);
      try {
        const fs = await import('fs');
        await fs.promises.writeFile('/tmp/pairing-code.txt', code);
        await fs.promises.writeFile('/tmp/qr.txt', code);
        console.log(`[PAIRING_CODE] ${code}`);
      } catch {}
      return code;
    } catch (e: any) {
      logger.warn('Pairing code request failed, will retry in background', { error: e?.message ?? String(e) });
      return null;
    }
  }

  // On-demand pairing code (e.g. GET /api/pairing/refresh). Returns a fresh
  // code, or null when already linked / unavailable.
  async requestPairingCodeNow(): Promise<{ code: string | null; authenticated: boolean; ready: boolean }> {
    if (this.authenticated || this.isReady()) {
      return { code: null, authenticated: true, ready: this.isReady() };
    }
    const code = await this.fetchAndStorePairingCode();
    return { code, authenticated: this.authenticated, ready: this.isReady() };
  }
}

export const whatsappService = new WhatsAppService();
export default WhatsAppService;
