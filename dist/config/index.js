"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const instagram_1 = __importDefault(require("./instagram"));
const socialMedia_1 = __importDefault(require("./socialMedia"));
dotenv_1.default.config();
const config = {
    supabase: {
        url: process.env.SUPABASE_URL || '',
        key: process.env.SUPABASE_ANON_KEY || '',
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    },
    whatsapp: {
        sessionId: process.env.WHATSAPP_SESSION_ID || 'default',
        retryDelayMs: parseInt(process.env.WHATSAPP_RETRY_DELAY_MS || '5000'),
        maxRetries: parseInt(process.env.WHATSAPP_MAX_RETRIES || '3'),
    },
    ollama: {
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
        model: process.env.OLLAMA_MODEL || 'llama2',
    },
    instagram: instagram_1.default,
    socialMedia: socialMedia_1.default,
    monitoring: {
        groups: process.env.MONITORING_GROUPS?.split(',') || [],
        maxMessagesPerGroup: parseInt(process.env.MAX_MESSAGES_PER_GROUP || '100'),
        messageProcessingIntervalMs: parseInt(process.env.MESSAGE_PROCESSING_INTERVAL_MS || '30000'),
        contentGenerationIntervalMs: parseInt(process.env.CONTENT_GENERATION_INTERVAL_MS || '300000'),
        socialMediaIntervalMs: parseInt(process.env.SOCIAL_MEDIA_INTERVAL_MS || '60000'),
    },
};
exports.default = config;
//# sourceMappingURL=index.js.map