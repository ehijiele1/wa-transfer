"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppService = void 0;
const whatsapp_web_js_1 = require("whatsapp-web.js");
const inputGuard_1 = require("./inputGuard");
const logger_1 = require("../utils/logger");
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
            logger_1.logger.info('WhatsApp client connected successfully');
        }
        catch (error) {
            logger_1.logger.error('Failed to connect to WhatsApp', error);
            throw error;
        }
    }
    setupEventHandlers() {
        if (!this.client)
            return;
        this.client.on('qr', (qr) => {
            logger_1.logger.info('QR Code generated - scan with WhatsApp Web');
        });
        this.client.on('authenticated', () => {
            logger_1.logger.info('WhatsApp authenticated');
        });
        this.client.on('auth_failure', (msg) => {
            logger_1.logger.error('WhatsApp auth failure', new Error(msg));
        });
        this.client.on('ready', async () => {
            this.readyTime = Date.now();
            this.reconnectAttempts = 0;
            logger_1.logger.info('WhatsApp connection established');
            setTimeout(async () => {
                try {
                    const chats = await this.client.getChats();
                    const groups = chats.filter(c => c.isGroup);
                    logger_1.logger.info('Available groups', { count: groups.length });
                    for (const g of groups) {
                        logger_1.logger.info('Group found', { name: g.name, id: g.id._serialized });
                    }
                }
                catch (e) {
                    logger_1.logger.warn('Group listing unavailable', { error: e.message });
                }
            }, 15000);
        });
        this.client.on('disconnected', async (reason) => {
            logger_1.logger.warn('WhatsApp disconnected', { reason });
            if (reason !== 'LOGGED_OUT' && this.reconnectAttempts < this.maxReconnectAttempts) {
                this.reconnectAttempts++;
                logger_1.logger.info(`Attempting to reconnect`, { attempt: this.reconnectAttempts, max: this.maxReconnectAttempts });
                setTimeout(() => this.connect(), this.retryDelayMs);
            }
            else {
                logger_1.logger.error('Max reconnection attempts reached or logged out');
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
            const inputGuard = (0, inputGuard_1.getInputGuard)();
            try {
                inputGuard.validateMessage(whatsappMessage);
            }
            catch (validationError) {
                await inputGuard.quarantine(validationError.message, whatsappMessage);
                return;
            }
            for (const callback of this.messageCallbacks) {
                callback(whatsappMessage);
            }
        }
        catch (error) {
            if (error?.message?.includes('Target closed'))
                return;
            logger_1.logger.error('Error processing message', error);
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
            logger_1.logger.info('WhatsApp client disconnected');
        }
    }
}
exports.WhatsAppService = WhatsAppService;
exports.default = WhatsAppService;
//# sourceMappingURL=whatsapp.js.map