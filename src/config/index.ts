import dotenv from 'dotenv';
import { Config } from '../types';
import instagramConfig from './instagram';
import socialMediaConfig from './socialMedia';

dotenv.config();

const config: Config = {
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
  instagram: instagramConfig,
  socialMedia: socialMediaConfig,
  monitoring: {
    groups: process.env.MONITORING_GROUPS?.split(',') || [],
    maxMessagesPerGroup: parseInt(process.env.MAX_MESSAGES_PER_GROUP || '100'),
    messageProcessingIntervalMs: parseInt(process.env.MESSAGE_PROCESSING_INTERVAL_MS || '30000'),
  },
};

export default config;