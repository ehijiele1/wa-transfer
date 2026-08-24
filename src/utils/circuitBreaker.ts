/**
 * Circuit Breaker Pattern
 * Prevents cascading failures when external providers are unhealthy
 */

import { logger } from './logger';

export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open',
}

export interface CircuitBreakerOptions {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeout: number;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures = 0;
  private successes = 0;
  private readonly options: CircuitBreakerOptions;
  private readonly serviceName: string;

  constructor(serviceName: string, options: Partial<CircuitBreakerOptions> = {}) {
    this.serviceName = serviceName;
    this.options = {
      failureThreshold: options.failureThreshold || 5,
      successThreshold: options.successThreshold || 3,
      timeout: options.timeout || 10000,
      resetTimeout: options.resetTimeout || 60000,
    };
  }

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      throw new Error(`Circuit breaker is OPEN for ${this.serviceName}. Service unavailable.`);
    }

    try {
      const timeoutError = new Error(`Timeout after ${this.options.timeout}ms`);
      const result = await Promise.race([
        operation(),
        new Promise<never>((_, reject) => {
          setTimeout(() => reject(timeoutError), this.options.timeout);
        }),
      ]);

      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failures = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successes++;
      if (this.successes >= this.options.successThreshold) {
        this.close();
      }
    }
  }

  private onFailure(): void {
    this.successes = 0;
    this.failures++;

    if (this.failures >= this.options.failureThreshold) {
      this.open();
    }
  }

  private open(): void {
    this.state = CircuitState.OPEN;
    logger.warn(`Circuit breaker opened for ${this.serviceName}`, {
      service: this.serviceName,
      state: this.state,
      failureCount: this.failures,
    });

    setTimeout(() => {
      this.halfOpen();
    }, this.options.resetTimeout);
  }

  private close(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    logger.info(`Circuit breaker closed for ${this.serviceName}`, {
      service: this.serviceName,
    });
  }

  private halfOpen(): void {
    this.state = CircuitState.HALF_OPEN;
    logger.info(`Circuit breaker half-open for ${this.serviceName}`, {
      service: this.serviceName,
    });
  }

  getState(): CircuitState {
    return this.state;
  }

  getStats() {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
    };
  }
}

// Circuit breakers for each external service
export const whatsappCircuitBreaker = new CircuitBreaker('whatsapp', {
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 15000,
  resetTimeout: 30000,
});

export const ollamaCircuitBreaker = new CircuitBreaker('ollama', {
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 30000,
  resetTimeout: 60000,
});

export const instagramCircuitBreaker = new CircuitBreaker('instagram', {
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 20000,
  resetTimeout: 45000,
});

export const supabaseCircuitBreaker = new CircuitBreaker('supabase', {
  failureThreshold: 5,
  successThreshold: 3,
  timeout: 15000,
  resetTimeout: 30000,
});

export const facebookCircuitBreaker = new CircuitBreaker('facebook', {
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 15000,
  resetTimeout: 30000,
});

export const twitterCircuitBreaker = new CircuitBreaker('twitter', {
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 10000,
  resetTimeout: 30000,
});

export const linkedinCircuitBreaker = new CircuitBreaker('linkedin', {
  failureThreshold: 3,
  successThreshold: 2,
  timeout: 15000,
  resetTimeout: 30000,
});

