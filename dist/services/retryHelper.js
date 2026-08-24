"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RetryHelper = void 0;
exports.retryWithBudget = retryWithBudget;
class RetryHelper {
    static async withLinearBackoff(fn, options = {}) {
        const { maxAttempts = 3, baseDelayMs = 1000, maxDelayMs = 30000, jitter = true } = options;
        let lastError;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            }
            catch (error) {
                lastError = error;
                if (attempt === maxAttempts) {
                    break;
                }
                const delay = Math.min(baseDelayMs * attempt, maxDelayMs);
                const actualDelay = jitter ? delay + Math.random() * delay : delay;
                console.log(`⏰ Retry attempt ${attempt}/${maxAttempts} after ${actualDelay}ms: ${error.message}`);
                await this.sleep(actualDelay);
            }
        }
        throw lastError;
    }
    static async withExponentialBackoff(fn, options = {}) {
        const { maxAttempts = 3, baseDelayMs = 1000, maxDelayMs = 30000, jitter = true } = options;
        let lastError;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            }
            catch (error) {
                lastError = error;
                if (attempt === maxAttempts) {
                    break;
                }
                const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs);
                const actualDelay = jitter ? delay + Math.random() * delay : delay;
                console.log(`⏰ Retry attempt ${attempt}/${maxAttempts} after ${actualDelay}ms: ${error.message}`);
                await this.sleep(actualDelay);
            }
        }
        throw lastError;
    }
    static async withBudget(fn, options = {}) {
        const { maxAttempts = 3, baseDelayMs = 1000, maxDelayMs = 30000, jitter = true, budgetMs = 60000 } = options;
        const startTime = Date.now();
        let lastError;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            const elapsed = Date.now() - startTime;
            const remaining = budgetMs - elapsed;
            if (remaining <= 0) {
                throw new Error(`Retry budget exceeded (${budgetMs}ms)`);
            }
            try {
                return await fn();
            }
            catch (error) {
                lastError = error;
                if (attempt === maxAttempts) {
                    break;
                }
                const delay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), maxDelayMs, remaining);
                const actualDelay = jitter ? delay + Math.random() * delay : delay;
                console.log(`⏰ Retry attempt ${attempt}/${maxAttempts} after ${actualDelay}ms: ${error.message}`);
                await this.sleep(actualDelay);
            }
        }
        throw lastError;
    }
    static sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.RetryHelper = RetryHelper;
async function retryWithBudget(fn, options = {}) {
    return RetryHelper.withBudget(fn, options);
}
//# sourceMappingURL=retryHelper.js.map