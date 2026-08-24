"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiters = exports.RateLimiter = void 0;
class RateLimiter {
    maxTokens;
    tokensPerSecond;
    name;
    tokens;
    lastRefillTime;
    queue = [];
    processing = false;
    constructor(config) {
        this.maxTokens = config.maxTokens;
        this.tokensPerSecond = config.tokensPerSecond;
        this.name = config.name || 'default';
        this.tokens = config.maxTokens;
        this.lastRefillTime = Date.now();
    }
    refill() {
        const now = Date.now();
        const elapsedSeconds = (now - this.lastRefillTime) / 1000;
        const tokensToAdd = elapsedSeconds * this.tokensPerSecond;
        this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
        this.lastRefillTime = now;
    }
    tryConsumeToken() {
        this.refill();
        if (this.tokens >= 1) {
            this.tokens -= 1;
            return true;
        }
        return false;
    }
    async waitForToken(timeoutMs = 30000) {
        if (this.tryConsumeToken()) {
            return;
        }
        return new Promise((resolve, reject) => {
            this.queue.push({ resolve, reject });
            if (!this.processing) {
                this.processing = true;
                this.processQueue();
            }
            if (timeoutMs > 0) {
                setTimeout(() => {
                    const index = this.queue.findIndex(item => item.resolve === resolve);
                    if (index !== -1) {
                        this.queue.splice(index, 1);
                        reject(new Error(`Rate limiter timeout: ${this.name}`));
                    }
                }, timeoutMs);
            }
        });
    }
    async processQueue() {
        while (this.queue.length > 0) {
            const waitTime = this.getWaitTime();
            if (waitTime > 0) {
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
            while (this.queue.length > 0 && this.tryConsumeToken()) {
                const item = this.queue.shift();
                if (item) {
                    item.resolve();
                }
            }
        }
        this.processing = false;
    }
    getWaitTime() {
        this.refill();
        if (this.tokens >= 1) {
            return 0;
        }
        return Math.ceil((1 / this.tokensPerSecond) * 1000);
    }
    getStatus() {
        this.refill();
        return {
            tokens: this.tokens,
            maxTokens: this.maxTokens,
            queueLength: this.queue.length,
            name: this.name,
        };
    }
    reset() {
        this.tokens = this.maxTokens;
        this.lastRefillTime = Date.now();
        this.queue = [];
        this.processing = false;
    }
}
exports.RateLimiter = RateLimiter;
exports.rateLimiters = {
    facebook: new RateLimiter({ maxTokens: 10, tokensPerSecond: 1, name: 'facebook' }),
    twitter: new RateLimiter({ maxTokens: 15, tokensPerSecond: 2, name: 'twitter' }),
    linkedin: new RateLimiter({ maxTokens: 10, tokensPerSecond: 1, name: 'linkedin' }),
    instagram: new RateLimiter({ maxTokens: 5, tokensPerSecond: 0.5, name: 'instagram' }),
    ollama: new RateLimiter({ maxTokens: 20, tokensPerSecond: 5, name: 'ollama' }),
    whatsapp: new RateLimiter({ maxTokens: 30, tokensPerSecond: 10, name: 'whatsapp' }),
};
exports.default = RateLimiter;
//# sourceMappingURL=rateLimiter.js.map