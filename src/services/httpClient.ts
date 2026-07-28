import { AbortController } from 'abort-controller';

/**
 * HTTP client wrapper with timeouts and circuit breaker pattern
 */
export class HttpClient {
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private defaultTimeout = 15000; // 15 seconds

  /**
   * Fetch with timeout and circuit breaker
   */
  async fetch(
    input: string | URL,
    init?: RequestInit & { timeout?: number; circuitBreaker?: string }
  ): Promise<Response> {
    const url = typeof input === 'string' ? input : input.toString();
    const timeout = init?.timeout || this.defaultTimeout;
    const circuitBreakerName = init?.circuitBreaker;

    // Apply circuit breaker if specified
    if (circuitBreakerName) {
      this.checkCircuitBreaker(circuitBreakerName);
    }

    // Create abort controller for timeout
    const controller = new AbortController() as any;
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      // Update circuit breaker state on success
      if (circuitBreakerName) {
        this.recordSuccess(circuitBreakerName);
      }

      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      // Update circuit breaker state on failure
      if (circuitBreakerName) {
        this.recordFailure(circuitBreakerName);
      }

      clearTimeout(timeoutId);
      
      if (error?.name === 'AbortError' || error?.name === 'TimeoutError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      throw error;
    }
  }

  /**
   * Check if circuit breaker is open
   */
  private checkCircuitBreaker(name: string): void {
    const state = this.circuitBreakers.get(name);
    if (state?.state === 'open') {
      if (Date.now() >= state.nextAttemptAt) {
        // Move to half-open state
        state.state = 'half-open';
        console.log(`🔌 Circuit breaker ${name} moving to half-open state`);
      } else {
        throw new Error(`Circuit breaker open for ${name}`);
      }
    }
  }

  /**
   * Record a success for circuit breaker
   */
  private recordSuccess(name: string): void {
    const state = this.circuitBreakers.get(name) || {
      state: 'closed',
      failureCount: 0,
      nextAttemptAt: 0,
    };

    if (state.state === 'half-open') {
      state.state = 'closed';
      state.failureCount = 0;
      console.log(`🔌 Circuit breaker ${name} closed after success`);
    }

    this.circuitBreakers.set(name, state);
  }

  /**
   * Record a failure for circuit breaker
   */
  private recordFailure(name: string): void {
    const state = this.circuitBreakers.get(name) || {
      state: 'closed',
      failureCount: 0,
      nextAttemptAt: 0,
    };

    state.failureCount++;

    if (state.failureCount >= 5) { // Threshold for opening circuit
      state.state = 'open';
      state.nextAttemptAt = Date.now() + 30000; // 30 second cooldown
      console.log(`🔌 Circuit breaker ${name} opened after ${state.failureCount} failures`);
    }

    this.circuitBreakers.set(name, state);
  }

  /**
   * Get circuit breaker state for debugging
   */
  getCircuitBreakerState(name: string): CircuitBreakerState | undefined {
    return this.circuitBreakers.get(name);
  }

  /**
   * Reset circuit breaker
   */
  resetCircuitBreaker(name: string): void {
    this.circuitBreakers.delete(name);
    console.log(`🔌 Circuit breaker ${name} reset`);
  }
}

/**
 * Circuit breaker state
 */
interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half-open';
  failureCount: number;
  nextAttemptAt: number;
}

/**
 * Factory function to get HTTP client instance
 */
export function getHttpClient(): HttpClient {
  return new HttpClient();
}