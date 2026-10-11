"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = __importDefault(require("../config"));
const httpClient_1 = require("./httpClient");
const logger_1 = require("../utils/logger");
const fetchWithTimeout_1 = require("../utils/fetchWithTimeout");
const circuitBreaker_1 = require("../utils/circuitBreaker");
class OllamaService {
    baseUrl;
    model;
    provider;
    apiKey;
    httpClient;
    constructor() {
        this.baseUrl = config_1.default.ollama.baseUrl;
        this.model = config_1.default.ollama.model;
        this.provider = config_1.default.ollama.provider;
        this.apiKey = config_1.default.ollama.apiKey;
        this.httpClient = (0, httpClient_1.getHttpClient)();
    }
    async chatCompletions(messages, temperature, jsonFormat) {
        const response = await (0, fetchWithTimeout_1.fetchWithTimeout)(`${this.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify({
                model: this.model,
                messages,
                temperature,
                stream: false,
                ...(jsonFormat ? { response_format: { type: 'json_object' } } : {}),
            }),
        }, 60000);
        if (!response.ok) {
            const body = await response.text().catch(() => '');
            throw new Error(`LLM chat/completions failed: ${response.statusText} ${body.slice(0, 200)}`);
        }
        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
    }
    async chat(messages, options = {}) {
        return circuitBreaker_1.ollamaCircuitBreaker.execute(async () => {
            const temperature = options.temperature ?? 0.7;
            if (this.provider === 'openai-compatible') {
                logger_1.logger.debug('Calling LLM chat (openai-compatible)', {
                    model: this.model,
                    messageCount: messages.length,
                });
                return this.chatCompletions(messages, temperature, options.format === 'json');
            }
            logger_1.logger.debug('Calling Ollama chat', { model: this.model, messageCount: messages.length });
            const response = await (0, fetchWithTimeout_1.fetchWithTimeout)(`${this.baseUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.model,
                    messages,
                    stream: false,
                    options: {
                        temperature,
                    },
                    ...(options.format ? { format: options.format } : {}),
                }),
            }, 30000);
            if (!response.ok) {
                throw new Error(`Ollama chat failed: ${response.statusText}`);
            }
            const data = await response.json();
            return data.message?.content || '';
        });
    }
    async generate(prompt, options = {}) {
        return circuitBreaker_1.ollamaCircuitBreaker.execute(async () => {
            const temperature = options.temperature ?? 0.7;
            if (this.provider === 'openai-compatible') {
                logger_1.logger.debug('Calling LLM generate (openai-compatible)', {
                    model: this.model,
                    promptLength: prompt.length,
                });
                return this.chatCompletions([{ role: 'user', content: prompt }], temperature, options.format === 'json');
            }
            logger_1.logger.debug('Calling Ollama generate', { model: this.model, promptLength: prompt.length });
            const response = await (0, fetchWithTimeout_1.fetchWithTimeout)(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: this.model,
                    prompt,
                    stream: false,
                    options: {
                        temperature,
                    },
                    ...(options.format ? { format: options.format } : {}),
                }),
            }, 30000);
            if (!response.ok) {
                throw new Error(`Ollama generate failed: ${response.statusText}`);
            }
            const data = await response.json();
            return data.response || '';
        });
    }
    async embed(text) {
        if (this.provider === 'openai-compatible') {
            logger_1.logger.debug('Skipping embeddings: not supported by openai-compatible provider', {
                textLength: text.length,
            });
            return [];
        }
        return circuitBreaker_1.ollamaCircuitBreaker.execute(async () => {
            logger_1.logger.debug('Calling Ollama embed', { model: 'nomic-embed-text', textLength: text.length });
            const response = await (0, fetchWithTimeout_1.fetchWithTimeout)(`${this.baseUrl}/api/embed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'nomic-embed-text',
                    input: text,
                }),
            }, 30000);
            if (!response.ok) {
                throw new Error(`Ollama embed failed: ${response.statusText}`);
            }
            const data = await response.json();
            return data.embeddings?.[0] || [];
        });
    }
    async generateSocialPost(listing, platform) {
        const platformGuides = {
            instagram: '2-3 lines with emojis, hashtags. Max 2200 chars.',
            twitter: 'Under 280 characters. Hashtags ok.',
            facebook: '1-2 paragraphs. Professional but friendly tone.',
            linkedin: 'Professional tone. Highlight investment value. 2-3 paragraphs.',
        };
        const props = [
            listing.title && `Title: ${listing.title}`,
            listing.description && `Description: ${listing.description}`,
            listing.price && `Price: ${listing.price}`,
            listing.location && `Location: ${listing.location}`,
            listing.features?.length && `Features: ${listing.features.join(', ')}`,
        ].filter(Boolean).join('\n');
        return this.chat([
            { role: 'system', content: `You are a real estate social media manager. Generate a ${platform} post. Format: ${platformGuides[platform]}. Do not use markdown.` },
            { role: 'user', content: `Generate a ${platform} post for this property:\n${props}` },
        ], { temperature: 0.8 });
    }
}
exports.default = OllamaService;
//# sourceMappingURL=ollama.js.map