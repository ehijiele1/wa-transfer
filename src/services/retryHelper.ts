/**
 * Unified retry helper with configurable strategies
 */
export class RetryHelper {
  /**
   * Retry with linear backoff
   */
  static async withLinearBackoff<T>(
    fn: () => Promise<T>,
    options: {
      maxAttempts?: number;
      baseDelayMs?: number;
      maxDelayMs?: number;
      jitter?: boolean;
    } = {}
  ): Promise<T> {
    const {
      maxAttempts = 3,
      baseDelayMs = 1000,
      maxDelayMs = 30000,
      jitter = true
    } = options;

    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        
        if (attempt === maxAttempts) {
          break;
        }

        const delay = Math.min(
          baseDelayMs * attempt,
          maxDelayMs
        );

        const actualDelay = jitter ? delay + Math.random() * delay : delay;

        console.log(`⏰ Retry attempt ${attempt}/${maxAttempts} after ${actualDelay}ms: ${error.message}`);
        
        await this.sleep(actualDelay);
      }
    }

    throw lastError!;
  }

  /**
   * Retry with exponential backoff
   */
  static async withExponentialBackoff<T>(
    fn: () => Promise<T>,
    options: {
      maxAttempts?: number;
      baseDelayMs?: number;
      maxDelayMs?: number;
      jitter?: boolean;
    } = {}
  ): Promise<T> {
    const {
      maxAttempts = 3,
      baseDelayMs = 1000,
      maxDelayMs = 30000,
      jitter = true
    } = options;

    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        
        if (attempt === maxAttempts) {
          break;
        }

        const delay = Math.min(
          baseDelayMs * Math.pow(2, attempt - 1),
          maxDelayMs
        );

        const actualDelay = jitter ? delay + Math.random() * delay : delay;

        console.log(`⏰ Retry attempt ${attempt}/${maxAttempts} after ${actualDelay}ms: ${error.message}`);
        
        await this.sleep(actualDelay);
      }
    }

    throw lastError!;
  }

  /**
   * Retry with budget (stop if total time exceeds budget)
   */
  static async withBudget<T>(
    fn: () => Promise<T>,
    options: {
      maxAttempts?: number;
      baseDelayMs?: number;
      maxDelayMs?: number;
      jitter?: boolean;
      budgetMs?: number;
    } = {}
  ): Promise<T> {
    const {
      maxAttempts = 3,
      baseDelayMs = 1000,
      maxDelayMs = 30000,
      jitter = true,
      budgetMs = 60000 // 1 minute budget
    } = options;

    const startTime = Date.now();
    let lastError: Error;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      // Check if we're within budget
      const elapsed = Date.now() - startTime;
      const remaining = budgetMs - elapsed;
      
      if (remaining <= 0) {
        throw new Error(`Retry budget exceeded (${budgetMs}ms)`);
      }

      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        
        if (attempt === maxAttempts) {
          break;
        }

        const delay = Math.min(
          baseDelayMs * Math.pow(2, attempt - 1),
          maxDelayMs,
          remaining // Don't exceed remaining budget
        );

        const actualDelay = jitter ? delay + Math.random() * delay : delay;

        console.log(`⏰ Retry attempt ${attempt}/${maxAttempts} after ${actualDelay}ms: ${error.message}`);
        
        await this.sleep(actualDelay);
      }
    }

    throw lastError!;
  }

  /**
   * Simple sleep function
   */
  static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Retry with budget function (backward compatibility)
 */
export async function retryWithBudget<T>(
  fn: () => Promise<T>,
  options: {
    attempts?: number;
    baseMs?: number;
    maxMs?: number;
    jitter?: boolean;
    budgetMs?: number;
  } = {}
): Promise<T> {
  return RetryHelper.withBudget(fn, options);
}