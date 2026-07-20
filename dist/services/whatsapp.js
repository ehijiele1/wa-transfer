"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppService = void 0;
const baileys_1 = require("baileys");
const config_1 = __importDefault(require("../config"));
const supabase_1 = __importDefault(require("./supabase"));
class WhatsAppService {
    socket;
    supabase;
    messageCallbacks = [];
    reconnectAttempts = 0;
    maxReconnectAttempts = config_1.default.whatsapp.maxRetries;
    constructor() {
        this.supabase = new supabase_1.default();
    }
    async connect() {
        try {
            const authState = this.loadAuthState();
            const saveState = this.saveAuthState;
            this.socket = (0, baileys_1.makeWASocket)({
                auth: authState,
                printQRInTerminal: true,
                browser: ['WhatsApp Business Intelligence', 'Chrome', '4.0.0'],
            });
            this.setupEventHandlers();
            this.saveAuthState = saveState;
            console.log('WhatsApp client connected successfully');
        }
        catch (error) {
            console.error('Failed to connect to WhatsApp:', error);
            throw error;
        }
    }
    loadAuthState() {
        try {
            const fs = require('fs');
            const path = require('path');
            const credsPath = path.join(`creds/${config_1.default.whatsapp.sessionId}-creds.json`);
            if (fs.existsSync(credsPath)) {
                return JSON.parse(fs.readFileSync(credsPath, 'utf8'));
            }
        }
        catch (error) {
            console.log('No existing auth state found, will generate new one');
        }
        return {};
    }
    setupEventHandlers() {
        this.socket.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect, qr } = update;
            if (qr) {
                console.log('QR Code generated - scan with WhatsApp Web');
            }
            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== baileys_1.DisconnectReason.loggedOut;
                if (shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
                    this.reconnectAttempts++;
                    console.log(`Connection closed, attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
                    setTimeout(() => this.connect(), config_1.default.whatsapp.retryDelayMs);
                }
                else {
                    console.error('Max reconnection attempts reached or logged out');
                }
            }
            else if (connection === 'open') {
                this.reconnectAttempts = 0;
                console.log('WhatsApp connection established');
                this.monitorGroups();
            }
        });
        this.socket.ev.on('messages.upsert', (messageUpdate) => {
            const messages = messageUpdate.messages;
            for (const message of messages) {
                this.processMessage(message);
            }
        });
    }
    async processMessage(message) {
        try {
            const whatsappMessage = {
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
        }
        catch (error) {
            console.error('Error processing message:', error);
        }
    }
    getMessageType(message) {
        if (message.message?.conversation)
            return 'text';
        if (message.message?.imageMessage)
            return 'image';
        if (message.message?.videoMessage)
            return 'video';
        if (message.message?.documentMessage)
            return 'document';
        return 'text';
    }
    extractMessageContent(message) {
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
    extractMetadata(message) {
        const metadata = {};
        if (message.key.remoteJid.includes('@g.us')) {
            metadata.groupMetadata = {
                subject: message.message?.groupMetadata?.subject || 'Unknown Group',
                description: message.message?.groupMetadata?.description || '',
                participants: message.message?.groupMetadata?.participants || [],
            };
        }
        return metadata;
    }
    async monitorGroups() {
        try {
            const groups = config_1.default.monitoring.groups;
            for (const group of groups) {
                try {
                    const groupInfo = await this.socket.groupMetadata(group);
                    console.log(`Monitoring group: ${groupInfo.subject} (${group})`);
                }
                catch (error) {
                    console.error(`Failed to get group info for ${group}:`, error);
                }
            }
        }
        catch (error) {
            console.error('Error monitoring groups:', error);
        }
    }
    saveAuthState = () => { };
    onMessage(callback) {
        this.messageCallbacks.push(callback);
    }
    async disconnect() {
        if (this.socket) {
            await this.socket.logout();
            this.socket.ev.removeAllListeners();
            console.log('WhatsApp client disconnected');
        }
    }
}
exports.WhatsAppService = WhatsAppService;
exports.default = WhatsAppService;
//# sourceMappingURL=whatsapp.js.map