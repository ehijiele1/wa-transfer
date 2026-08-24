/**
 * Token Bucket Rate Limiter
 * 
 * Limits the rate of API calls to external services.
 * Each bucket has a maximum capacity (maxTokens) and a refill rate (tokensPerSecond).
 * 
 * Usage:
 *   const limiter = new RateLimiter({ maxTokens: 10, tokensPerSecond: 1 });
 *   await limiter.waitForToken(); // Blocks until a token is available
 */

export interface RateLimiterConfig {
  maxTokens: number;
  tokensPerSecond: number;
  name?: string;
}

export class RateLimiter {
  private maxTokens: number;
  private tokensPerSecond: number;
  private name: string;
  private tokens: number;
  private lastRefillTime: number;
  private queue: Array<{ resolve: () => void; reject: (err: Error) => void }> = [];
  private processing = false;

  constructor(config: RateLimiterConfig) {
    this.maxTokens = config.maxTokens;
    this.tokensPerSecond = config.tokensPerSecond;
    this.name = config.name || 'default';
    this.tokens = config.maxTokens;
    this.lastRefillTime = Date.now();
  }

  /**
   * Refill tokens based on elapsed time since last refill
   */
  private refill(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefillTime) / 1000;
    const tokensToAdd = elapsedSeconds * this.tokensPerSecond;
    
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefillTime = now;
  }

  /**
   * Try to consume a token. Returns true if a token was available.
   */
  private tryConsumeToken(): boolean {
    this.refill();
    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }
    return false;
  }

  /**
   * Wait for a token to become available.
   * Resolves when a token is consumed, or rejects if the timeout is exceeded.
   */
  async waitForToken(timeoutMs: number = 30000): Promise<void> {
    if (this.tryConsumeToken()) {
      return;
    }

    return new Promise((resolve, reject) => {
      this.queue.push({ resolve, reject });
      
      if (!this.processing) {
        this.processing = true;
        this.processQueue();
      }

      // Timeout
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

  /**
   * Process the queue of waiting requests
   */
  private async processQueue(): Promise<void> {
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

  /**
   * Calculate how long to wait before the next token is available
   */
  private getWaitTime(): number {
    this.refill();
    if (this.tokens >= 1) {
      return 0;
    }
    // Time until at least 1 token is available
    return Math.ceil((1 / this.tokensPerSecond) * 1000);
  }

  /**
   * Get current rate limiter status
   */
  getStatus(): { tokens: number; maxTokens: number; queueLength: number; name: string } {
    this.refill();
    return {
      tokens: this.tokens,
      maxTokens: this.maxTokens,
      queueLength: this.queue.length,
      name: this.name,
    };
  }

  /**
   * Reset the rate limiter to its initial state
   */
  reset(): void {
    this.tokens = this.maxTokens;
    this.lastRefillTime = Date.now();
    this.queue = [];
    this.processing = false;
  }
}

/**
 * Pre-configured rate limiters for each platform
 */
export const rateLimiters = {
  facebook: new RateLimiter({ maxTokens: 10, tokensPerSecond: 1, name: 'facebook' }),
  twitter: new RateLimiter({ maxTokens: 15, tokensPerSecond: 2, name: 'twitter' }),
  linkedin: new RateLimiter({ maxTokens: 10, tokensPerSecond: 1, name: 'linkedin' }),
  instagram: new RateLimiter({ maxTokens: 5, tokensPerSecond: 0.5, name: 'instagram' }),
  ollama: new RateLimiter({ maxTokens: 20, tokensPerSecond: 5, name: 'ollama' }),
  whatsapp: new RateLimiter({ maxTokens: 30, tokensPerSecond: 10, name: 'whatsapp' }),
};

export default RateLimiter;