"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpClient = void 0;
exports.getHttpClient = getHttpClient;
const abort_controller_1 = require("abort-controller");
class HttpClient {
    circuitBreakers = new Map();
    defaultTimeout = 15000;
    async fetch(input, init) {
        const url = typeof input === 'string' ? input : input.toString();
        const timeout = init?.timeout || this.defaultTimeout;
        const circuitBreakerName = init?.circuitBreaker;
        if (circuitBreakerName) {
            this.checkCircuitBreaker(circuitBreakerName);
        }
        const controller = new abort_controller_1.AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort();
        }, timeout);
        try {
            const response = await fetch(url, {
                ...init,
                signal: controller.signal,
            });
            if (circuitBreakerName) {
                this.recordSuccess(circuitBreakerName);
            }
            clearTimeout(timeoutId);
            return response;
        }
        catch (error) {
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
    checkCircuitBreaker(name) {
        const state = this.circuitBreakers.get(name);
        if (state?.state === 'open') {
            if (Date.now() >= state.nextAttemptAt) {
                state.state = 'half-open';
                console.log(`🔌 Circuit breaker ${name} moving to half-open state`);
            }
            else {
                throw new Error(`Circuit breaker open for ${name}`);
            }
        }
    }
    recordSuccess(name) {
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
    recordFailure(name) {
        const state = this.circuitBreakers.get(name) || {
            state: 'closed',
            failureCount: 0,
            nextAttemptAt: 0,
        };
        state.failureCount++;
        if (state.failureCount >= 5) {
            state.state = 'open';
            state.nextAttemptAt = Date.now() + 30000;
            console.log(`🔌 Circuit breaker ${name} opened after ${state.failureCount} failures`);
        }
        this.circuitBreakers.set(name, state);
    }
    getCircuitBreakerState(name) {
        return this.circuitBreakers.get(name);
    }
    resetCircuitBreaker(name) {
        this.circuitBreakers.delete(name);
        console.log(`🔌 Circuit breaker ${name} reset`);
    }
}
exports.HttpClient = HttpClient;
function getHttpClient() {
    return new HttpClient();
}
//# sourceMappingURL=httpClient.js.map