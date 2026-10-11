import config from '../config';
import { getHttpClient } from './httpClient';
import { RetryHelper } from './retryHelper';
import { logger } from '../utils/logger';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { ollamaCircuitBreaker } from '../utils/circuitBreaker';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  temperature?: number;
  maxTokens?: number;
  format?: 'json';
}

export interface GenerateOptions {
  temperature?: number;
  format?: 'json';
}

class OllamaService {
  private baseUrl: string;
  private model: string;
  private provider: 'ollama' | 'openai-compatible';
  private apiKey: string;
  private httpClient: any;

  constructor() {
    this.baseUrl = config.ollama.baseUrl;
    this.model = config.ollama.model;
    this.provider = config.ollama.provider;
    this.apiKey = config.ollama.apiKey;
    this.httpClient = getHttpClient();
  }

  /**
   * Call an OpenAI-compatible chat/completions endpoint (e.g. NVIDIA NIM).
   * baseUrl must include the version path, e.g. https://integrate.api.nvidia.com/v1
   */
  private async chatCompletions(
    messages: ChatMessage[],
    temperature: number,
    jsonFormat: boolean
  ): Promise<string> {
    const response = await fetchWithTimeout(`${this.baseUrl}/chat/completions`, {
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

    const data: any = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
    return ollamaCircuitBreaker.execute(async () => {
      const temperature = options.temperature ?? 0.7;

      if (this.provider === 'openai-compatible') {
        logger.debug('Calling LLM chat (openai-compatible)', {
          model: this.model,
          messageCount: messages.length,
        });
        return this.chatCompletions(messages, temperature, options.format === 'json');
      }

      logger.debug('Calling Ollama chat', { model: this.model, messageCount: messages.length });
      
      const response = await fetchWithTimeout(`${this.baseUrl}/api/chat`, {
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

      const data: any = await response.json();
      return data.message?.content || '';
    });
  }

  async generate(prompt: string, options: GenerateOptions = {}): Promise<string> {
    return ollamaCircuitBreaker.execute(async () => {
      const temperature = options.temperature ?? 0.7;

      if (this.provider === 'openai-compatible') {
        logger.debug('Calling LLM generate (openai-compatible)', {
          model: this.model,
          promptLength: prompt.length,
        });
        return this.chatCompletions(
          [{ role: 'user', content: prompt }],
          temperature,
          options.format === 'json'
        );
      }

      logger.debug('Calling Ollama generate', { model: this.model, promptLength: prompt.length });
      
      const response = await fetchWithTimeout(`${this.baseUrl}/api/generate`, {
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

      const data: any = await response.json();
      return data.response || '';
    });
  }

  async embed(text: string): Promise<number[]> {
    // Embeddings are Ollama-only; with an openai-compatible provider we skip
    // them gracefully (embeddings are optional metadata on listings).
    if (this.provider === 'openai-compatible') {
      logger.debug('Skipping embeddings: not supported by openai-compatible provider', {
        textLength: text.length,
      });
      return [];
    }
    return ollamaCircuitBreaker.execute(async () => {
      logger.debug('Calling Ollama embed', { model: 'nomic-embed-text', textLength: text.length });
      
      const response = await fetchWithTimeout(`${this.baseUrl}/api/embed`, {
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

      const data: any = await response.json();
      return data.embeddings?.[0] || [];
    });
  }

  async generateSocialPost(listing: {
    title?: string;
    description?: string;
    price?: string;
    location?: string;
    features?: string[];
  }, platform: 'instagram' | 'twitter' | 'facebook' | 'linkedin'): Promise<string> {
    const platformGuides: Record<string, string> = {
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

export default OllamaService;
