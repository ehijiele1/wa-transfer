"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.whatsappService = exports.WhatsAppService = void 0;
const whatsapp_web_js_1 = require("whatsapp-web.js");
const inputGuard_1 = require("./inputGuard");
const logger_1 = require("../utils/logger");
const groupManager_1 = require("./groupManager");
const supabaseAuth_1 = require("./supabaseAuth");
class WhatsAppService {
    client = null;
    messageCallbacks = [];
    reconnectAttempts = 0;
    maxReconnectAttempts = 3;
    retryDelayMs = 5000;
    readyTime = 0;
    tableMissingLogged = false;
    authenticated = false;
    pairingTimer = null;
    lastCodeAt = 0;
    pairingNumber = '';
    constructor() { }
    async connect() {
        if (this.client) {
            logger_1.logger.info('WhatsApp client already connected, skipping');
            return;
        }
        try {
            const fs = await Promise.resolve().then(() => __importStar(require('fs')));
            const path = await Promise.resolve().then(() => __importStar(require('path')));
            const sessionDir = path.join('./wwebjs-auth', 'session-wa-transfer');
            for (const f of ['SingletonLock', 'SingletonSocket', 'SingletonCookie']) {
                try {
                    await fs.promises.unlink(path.join(sessionDir, f));
                }
                catch { }
            }
        }
        catch { }
        try {
            const sessionStore = (process.env.WA_SESSION_STORE || 'local').toLowerCase();
            const authStrategy = sessionStore === 'supabase'
                ? new whatsapp_web_js_1.RemoteAuth({
                    clientId: 'wa-transfer',
                    store: new supabaseAuth_1.SupabaseSessionStore('wa-transfer'),
                    backupSyncIntervalMs: 60000,
                })
                : new whatsapp_web_js_1.LocalAuth({
                    clientId: 'wa-transfer',
                    dataPath: './wwebjs-auth',
                });
            this.client = new whatsapp_web_js_1.Client({
                authStrategy,
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
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
            logger_1.logger.info('WhatsApp client connected successfully');
            const pairingNumber = (process.env.WHATSAPP_PAIRING_NUMBER || '').replace(/^\+/, '').trim();
            this.pairingNumber = pairingNumber;
            if (pairingNumber) {
                const requestCode = async () => {
                    const code = await this.fetchAndStorePairingCode();
                    return code !== null;
                };
                const stopPairingLoop = () => {
                    if (this.pairingTimer) {
                        clearInterval(this.pairingTimer);
                        this.pairingTimer = null;
                    }
                };
                const ensureLoop = () => {
                    if (this.pairingTimer || this.authenticated)
                        return;
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
                setTimeout(() => {
                    void requestCode().then(() => {
                        ensureLoop();
                    });
                }, 20000);
            }
        }
        catch (error) {
            logger_1.logger.error('Failed to connect to WhatsApp', error);
            if (this.client) {
                try {
                    await this.client.destroy();
                }
                catch { }
                this.client = null;
            }
            throw error;
        }
    }
    setupEventHandlers() {
        if (!this.client)
            return;
        this.client.on('qr', async (qr) => {
            if ((process.env.WHATSAPP_PAIRING_NUMBER || '').trim())
                return;
            logger_1.logger.info('QR Code generated - scan with WhatsApp Web');
            try {
                const fs = await Promise.resolve().then(() => __importStar(require('fs')));
                await fs.promises.writeFile('/tmp/qr.txt', qr);
                const qrcode = require('qrcode');
                await qrcode.toFile('/tmp/qr.png', qr, { width: 340, margin: 2 });
                console.log('[QR] saved to /tmp/qr.png and /tmp/qr.txt — scan now (refreshes ~every 20s)');
            }
            catch {
                console.log('[QRDATA] ' + qr);
            }
        });
        this.client.on('code', async (code) => {
            this.lastCodeAt = Date.now();
            logger_1.logger.info(`Pairing code: ${code} — enter on phone: WhatsApp > Linked devices > Link with phone number`);
            try {
                const fs = await Promise.resolve().then(() => __importStar(require('fs')));
                await fs.promises.writeFile('/tmp/pairing-code.txt', code);
                await fs.promises.writeFile('/tmp/qr.txt', code);
                console.log(`[PAIRING_CODE] ${code}`);
            }
            catch { }
        });
        this.client.on('authenticated', () => {
            this.authenticated = true;
            if (this.pairingTimer) {
                clearInterval(this.pairingTimer);
                this.pairingTimer = null;
            }
            logger_1.logger.info('WhatsApp authenticated');
        });
        this.client.on('auth_failure', (msg) => {
            logger_1.logger.error('WhatsApp auth failure', new Error(msg));
        });
        this.client.on('loading_screen', (percent, message) => {
            logger_1.logger.info('WhatsApp loading_screen', { percent, message });
        });
        this.client.on('change_state', (state) => {
            logger_1.logger.info('WhatsApp change_state', { state });
        });
        this.client.on('remote_session_saved', () => {
            logger_1.logger.info('WhatsApp remote_session_saved');
        });
        this.client.on('ready', async () => {
            this.readyTime = Date.now();
            this.authenticated = true;
            if (this.pairingTimer) {
                clearInterval(this.pairingTimer);
                this.pairingTimer = null;
            }
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
            const isGroup = message.from.endsWith('@g.us');
            if (isGroup) {
                const groupManager = (0, groupManager_1.getGroupManager)();
                const messageText = (message.body || '').trim();
                if (groupManager.isTriggerMessage(messageText)) {
                    await this.handleTriggerMessage(message);
                    return;
                }
                const monitored = await groupManager.isMonitoredAsync(message.from);
                if (!monitored) {
                    logger_1.logger.debug('Ignoring message from non-monitored group', {
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
    async handleTriggerMessage(message) {
        try {
            const groupId = message.from;
            const groupManager = (0, groupManager_1.getGroupManager)();
            const chat = await message.getChat();
            const groupName = chat.name || null;
            const authorId = message.author || null;
            const result = await groupManager.registerGroup(groupId, groupName, authorId);
            if (result.success) {
                logger_1.logger.info('WATM trigger received — group registered (silent)', {
                    groupId,
                    groupName,
                    wasAlreadyRegistered: result.wasAlreadyRegistered,
                    registeredBy: authorId,
                });
            }
            else {
                logger_1.logger.error('Failed to register group from WATM trigger', undefined, {
                    groupId,
                    error: result.error,
                });
            }
        }
        catch (error) {
            logger_1.logger.error('Error handling WATM trigger message', error, {
                groupId: message.from,
            });
        }
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
        if (this.pairingTimer) {
            clearInterval(this.pairingTimer);
            this.pairingTimer = null;
        }
        this.authenticated = false;
        if (this.client) {
            this.client.removeAllListeners();
            await this.client.destroy();
            this.client = null;
            logger_1.logger.info('WhatsApp client disconnected');
        }
    }
    async getGroups() {
        if (!this.client)
            throw new Error('WhatsApp client not initialized');
        if (!this.client.info)
            throw new Error('WhatsApp not ready yet — try again in 30 seconds');
        const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout fetching groups — WhatsApp still syncing, try again')), 15000));
        const chats = (await Promise.race([this.client.getChats(), timeout]));
        return chats.filter((c) => c.isGroup).map((g) => ({ name: g.name, id: g.id._serialized }));
    }
    isReady() {
        return !!(this.client && this.client.info);
    }
    isAuthenticated() {
        return this.authenticated;
    }
    getPairingStatus() {
        return {
            authenticated: this.authenticated,
            ready: this.isReady(),
            pairingNumberSet: this.pairingNumber.length > 0,
            lastCodeAt: this.lastCodeAt,
            lastCodeAgeSec: this.lastCodeAt > 0 ? Math.round((Date.now() - this.lastCodeAt) / 1000) : null,
        };
    }
    async fetchAndStorePairingCode() {
        if (this.authenticated || !this.client || !this.pairingNumber)
            return null;
        try {
            const code = (await this.client.requestPairingCode(this.pairingNumber));
            this.lastCodeAt = Date.now();
            logger_1.logger.info(`Pairing code generated: ${code} — enter on phone for ${this.pairingNumber}: WhatsApp > Linked devices > Link with phone number`);
            try {
                const fs = await Promise.resolve().then(() => __importStar(require('fs')));
                await fs.promises.writeFile('/tmp/pairing-code.txt', code);
                await fs.promises.writeFile('/tmp/qr.txt', code);
                console.log(`[PAIRING_CODE] ${code}`);
            }
            catch { }
            return code;
        }
        catch (e) {
            logger_1.logger.warn('Pairing code request failed, will retry in background', { error: e?.message ?? String(e) });
            return null;
        }
    }
    async requestPairingCodeNow() {
        if (this.authenticated || this.isReady()) {
            return { code: null, authenticated: true, ready: this.isReady() };
        }
        const code = await this.fetchAndStorePairingCode();
        return { code, authenticated: this.authenticated, ready: this.isReady() };
    }
}
exports.WhatsAppService = WhatsAppService;
exports.whatsappService = new WhatsAppService();
exports.default = WhatsAppService;
//# sourceMappingURL=whatsapp.js.map