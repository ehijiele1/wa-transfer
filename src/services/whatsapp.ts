import { makeWASocket, DisconnectReason } from 'baileys';
import config from '../config';
import { WhatsAppMessage } from '../types';
import SupabaseService from './supabase';

export class WhatsAppService {
  private socket: any;
  private supabase: SupabaseService;
  private messageCallbacks: ((message: WhatsAppMessage) => void)[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = config.whatsapp.maxRetries;

  constructor() {
    this.supabase = new SupabaseService();
  }

  async connect(): Promise<void> {
    try {
      const authState = this.loadAuthState();
      const saveState = this.saveAuthState;

      this.socket = makeWASocket({
        auth: authState,
        printQRInTerminal: true,
        browser: ['WhatsApp Business Intelligence', 'Chrome', '4.0.0'],
      });

      this.setupEventHandlers();
      this.saveAuthState = saveState;

      console.log('WhatsApp client connected successfully');
    } catch (error) {
      console.error('Failed to connect to WhatsApp:', error);
      throw error;
    }
  }

  private loadAuthState(): any {
    try {
      const fs = require('fs');
      const path = require('path');
      const credsPath = path.join(`creds/${config.whatsapp.sessionId}-creds.json`);
      
      if (fs.existsSync(credsPath)) {
        return JSON.parse(fs.readFileSync(credsPath, 'utf8'));
      }
    } catch (error) {
      console.log('No existing auth state found, will generate new one');
    }
    
    return {};
  }

  private setupEventHandlers(): void {
    this.socket.ev.on('connection.update', (update: any) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log('QR Code generated - scan with WhatsApp Web');
      }

      if (connection === 'close') {
        const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
        
        if (shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          console.log(`Connection closed, attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
          setTimeout(() => this.connect(), config.whatsapp.retryDelayMs);
        } else {
          console.error('Max reconnection attempts reached or logged out');
        }
      } else if (connection === 'open') {
        this.reconnectAttempts = 0;
        console.log('WhatsApp connection established');
        this.monitorGroups();
      }
    });

    this.socket.ev.on('messages.upsert', (messageUpdate: any) => {
      const messages = messageUpdate.messages;
      for (const message of messages) {
        this.processMessage(message);
      }
    });
  }

  private async processMessage(message: any): Promise<void> {
    try {
      const whatsappMessage: WhatsAppMessage = {
        id: message.key.id,
        from: message.key.remoteJid,
        to: message.key.fromMe ? message.key.remoteJid : 'me',
        timestamp: message.messageTimestamp,
        type: this.getMessageType(message),
        message: this.extractMessageContent(message),
        metadata: this.extractMetadata(message),
      };

      await this.supabase.saveMessage(whatsappMessage);

      for (const callback of this.messageCallbacks) {
        callback(whatsappMessage);
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  }

  private getMessageType(message: any): 'text' | 'image' | 'video' | 'document' {
    if (message.message?.conversation) return 'text';
    if (message.message?.imageMessage) return 'image';
    if (message.message?.videoMessage) return 'video';
    if (message.message?.documentMessage) return 'document';
    return 'text';
  }

  private extractMessageContent(message: any): any {
    if (message.message?.conversation) {
      return { conversation: message.message.conversation };
    }
    if (message.message?.imageMessage) {
      return {
        imageMessage: {
          caption: message.message.imageMessage.caption,
          url: message.message.imageMessage.url,
        }
      };
    }
    if (message.message?.videoMessage) {
      return {
        videoMessage: {
          caption: message.message.videoMessage.caption,
          url: message.message.videoMessage.url,
        }
      };
    }
    if (message.message?.documentMessage) {
      return {
        documentMessage: {
          caption: message.message.documentMessage.caption,
          url: message.message.documentMessage.url,
        }
      };
    }
    return {};
  }

  private extractMetadata(message: any): any {
    const metadata: any = {};
    
    if (message.key.remoteJid.includes('@g.us')) {
      metadata.groupMetadata = {
        subject: message.message?.groupMetadata?.subject || 'Unknown Group',
        description: message.message?.groupMetadata?.description || '',
        participants: message.message?.groupMetadata?.participants || [],
      };
    }
    
    return metadata;
  }

  private async monitorGroups(): Promise<void> {
    try {
      const groups = config.monitoring.groups;
      
      for (const group of groups) {
        try {
          const groupInfo = await this.socket.groupMetadata(group);
          console.log(`Monitoring group: ${groupInfo.subject} (${group})`);
        } catch (error) {
          console.error(`Failed to get group info for ${group}:`, error);
        }
      }
    } catch (error) {
      console.error('Error monitoring groups:', error);
    }
  }

  private saveAuthState: (state: any) => void = () => {};

  onMessage(callback: (message: WhatsAppMessage) => void): void {
    this.messageCallbacks.push(callback);
  }

  async disconnect(): Promise<void> {
    if (this.socket) {
      await this.socket.logout();
      this.socket.ev.removeAllListeners();
      console.log('WhatsApp client disconnected');
    }
  }
}

export default WhatsAppService;