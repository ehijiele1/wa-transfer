import config from '../config';

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

  constructor() {
    this.baseUrl = config.ollama.baseUrl;
    this.model = config.ollama.model;
  }

  async chat(messages: ChatMessage[], options: ChatOptions = {}): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages,
        stream: false,
        options: {
          temperature: options.temperature ?? 0.7,
        },
        ...(options.format ? { format: options.format } : {}),
      }),
    });

    const data = await response.json();
    return data.message?.content || '';
  }

  async generate(prompt: string, options: GenerateOptions = {}): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: false,
        options: {
          temperature: options.temperature ?? 0.7,
        },
        ...(options.format ? { format: options.format } : {}),
      }),
    });

    const data = await response.json();
    return data.response || '';
  }

  async embed(text: string): Promise<number[]> {
    const response = await fetch(`${this.baseUrl}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        input: text,
      }),
    });

    const data = await response.json();
    return data.embeddings?.[0] || [];
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
