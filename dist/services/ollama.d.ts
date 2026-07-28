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
declare class OllamaService {
    private baseUrl;
    private model;
    constructor();
    chat(messages: ChatMessage[], options?: ChatOptions): Promise<string>;
    generate(prompt: string, options?: GenerateOptions): Promise<string>;
    embed(text: string): Promise<number[]>;
    generateSocialPost(listing: {
        title?: string;
        description?: string;
        price?: string;
        location?: string;
        features?: string[];
    }, platform: 'instagram' | 'twitter' | 'facebook' | 'linkedin'): Promise<string>;
}
export default OllamaService;
//# sourceMappingURL=ollama.d.ts.map