"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppService = void 0;
const whatsapp_web_js_1 = require("whatsapp-web.js");
class WhatsAppService {
    client = null;
    messageCallbacks = [];
    reconnectAttempts = 0;
    maxReconnectAttempts = 3;
    retryDelayMs = 5000;
    readyTime = 0;
    tableMissingLogged = false;
    constructor() { }
    async connect() {
        try {
            this.client = new whatsapp_web_js_1.Client({
                authStrategy: new whatsapp_web_js_1.LocalAuth({
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
            console.log('WhatsApp client connected successfully');
        }
        catch (error) {
            console.error('Failed to connect to WhatsApp:', error);
            throw error;
        }
    }
    setupEventHandlers() {
        if (!this.client)
            return;
        this.client.on('qr', (qr) => {
            console.log('QR Code generated - scan with WhatsApp Web');
        });
        this.client.on('authenticated', () => {
            console.log('WhatsApp authenticated');
        });
        this.client.on('auth_failure', (msg) => {
            console.error('WhatsApp auth failure:', msg);
        });
        this.client.on('ready', async () => {
            this.readyTime = Date.now();
            this.reconnectAttempts = 0;
            console.log('WhatsApp connection established');
            setTimeout(async () => {
                try {
                    const chats = await this.client.getChats();
                    const groups = chats.filter(c => c.isGroup);
                    console.log('=== AVAILABLE GROUPS (' + groups.length + ') ===');
                    for (const g of groups) {
                        console.log(g.name + ': ' + g.id._serialized);
                    }
                    console.log('=== END GROUPS ===');
                }
                catch (e) {
                    console.log('Group listing unavailable: ' + e.message);
                }
            }, 15000);
        });
        this.client.on('disconnected', async (reason) => {
            console.log('WhatsApp disconnected:', reason);
            if (reason !== 'LOGGED_OUT' && this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
                setTimeout(() => this.connect(), this.retryDelayMs);
            }
            else {
                console.error('Max reconnection attempts reached or logged out');
            }
        });
        this.client.on('message_create', async (message) => {
            if (message.fromMe)
                return;
            if (this.readyTime > 0 && message.timestamp * 1000 < this.readyTime - 5000)
                return;
            await this.processMessage(message);
        });
    }
    async processMessage(message) {
        try {
            const chat = await message.getChat();
            const whatsappMessage = {
                id: message.id._serialized,
                from: message.from,
                to: message.author || message.from,
                timestamp: message.timestamp,
                type: this.getMessageType(message),
                message: await this.extractMessageContent(message),
                metadata: this.extractMetadata(message, chat),
            };
            for (const callback of this.messageCallbacks) {
                callback(whatsappMessage);
            }
        }
        catch (error) {
            if (error?.message?.includes('Target closed'))
                return;
            console.error('Error processing message:', error);
        }
    }
    getMessageType(message) {
        if (message.hasMedia) {
            if (message.type === 'image')
                return 'image';
            if (message.type === 'video')
                return 'video';
            if (message.type === 'document')
                return 'document';
        }
        return 'text';
    }
    async extractMessageContent(message) {
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
            }
            catch {
                return {};
            }
        }
        if (message.body) {
            return { conversation: message.body };
        }
        return {};
    }
    extractMetadata(message, chat) {
        const metadata = {};
        if (message.from.endsWith('@g.us')) {
            metadata.groupMetadata = {
                subject: chat.name || 'Unknown Group',
                description: chat.description || '',
                participants: [],
            };
        }
        return metadata;
    }
    onMessage(callback) {
        this.messageCallbacks.push(callback);
    }
    async disconnect() {
        if (this.client) {
            this.client.removeAllListeners();
            await this.client.destroy();
            this.client = null;
            console.log('WhatsApp client disconnected');
        }
    }
}
exports.WhatsAppService = WhatsAppService;
exports.default = WhatsAppService;
//# sourceMappingURL=whatsapp.js.map