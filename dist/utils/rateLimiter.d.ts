export interface RateLimiterConfig {
    maxTokens: number;
    tokensPerSecond: number;
    name?: string;
}
export declare class RateLimiter {
    private maxTokens;
    private tokensPerSecond;
    private name;
    private tokens;
    private lastRefillTime;
    private queue;
    private processing;
    constructor(config: RateLimiterConfig);
    private refill;
    private tryConsumeToken;
    waitForToken(timeoutMs?: number): Promise<void>;
    private processQueue;
    private getWaitTime;
    getStatus(): {
        tokens: number;
        maxTokens: number;
        queueLength: number;
        name: string;
    };
    reset(): void;
}
export declare const rateLimiters: {
    facebook: RateLimiter;
    twitter: RateLimiter;
    linkedin: RateLimiter;
    instagram: RateLimiter;
    ollama: RateLimiter;
    whatsapp: RateLimiter;
};
export default RateLimiter;
//# sourceMappingURL=rateLimiter.d.ts.map