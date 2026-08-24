"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.linkedinCircuitBreaker = exports.twitterCircuitBreaker = exports.facebookCircuitBreaker = exports.supabaseCircuitBreaker = exports.instagramCircuitBreaker = exports.ollamaCircuitBreaker = exports.whatsappCircuitBreaker = exports.CircuitBreaker = exports.CircuitState = void 0;
const logger_1 = require("./logger");
var CircuitState;
(function (CircuitState) {
    CircuitState["CLOSED"] = "closed";
    CircuitState["OPEN"] = "open";
    CircuitState["HALF_OPEN"] = "half_open";
})(CircuitState || (exports.CircuitState = CircuitState = {}));
class CircuitBreaker {
    state = CircuitState.CLOSED;
    failures = 0;
    successes = 0;
    options;
    serviceName;
    constructor(serviceName, options = {}) {
        this.serviceName = serviceName;
        this.options = {
            failureThreshold: options.failureThreshold || 5,
            successThreshold: options.successThreshold || 3,
            timeout: options.timeout || 10000,
            resetTimeout: options.resetTimeout || 60000,
        };
    }
    async execute(operation) {
        if (this.state === CircuitState.OPEN) {
            throw new Error(`Circuit breaker is OPEN for ${this.serviceName}. Service unavailable.`);
        }
        try {
            const timeoutError = new Error(`Timeout after ${this.options.timeout}ms`);
            const result = await Promise.race([
                operation(),
                new Promise((_, reject) => {
                    setTimeout(() => reject(timeoutError), this.options.timeout);
                }),
            ]);
            this.onSuccess();
            return result;
        }
        catch (error) {
            this.onFailure();
            throw error;
        }
    }
    onSuccess() {
        this.failures = 0;
        if (this.state === CircuitState.HALF_OPEN) {
            this.successes++;
            if (this.successes >= this.options.successThreshold) {
                this.close();
            }
        }
    }
    onFailure() {
        this.successes = 0;
        this.failures++;
        if (this.failures >= this.options.failureThreshold) {
            this.open();
        }
    }
    open() {
        this.state = CircuitState.OPEN;
        logger_1.logger.warn(`Circuit breaker opened for ${this.serviceName}`, {
            service: this.serviceName,
            state: this.state,
            failureCount: this.failures,
        });
        setTimeout(() => {
            this.halfOpen();
        }, this.options.resetTimeout);
    }
    close() {
        this.state = CircuitState.CLOSED;
        this.failures = 0;
        logger_1.logger.info(`Circuit breaker closed for ${this.serviceName}`, {
            service: this.serviceName,
        });
    }
    halfOpen() {
        this.state = CircuitState.HALF_OPEN;
        logger_1.logger.info(`Circuit breaker half-open for ${this.serviceName}`, {
            service: this.serviceName,
        });
    }
    getState() {
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
exports.CircuitBreaker = CircuitBreaker;
exports.whatsappCircuitBreaker = new CircuitBreaker('whatsapp', {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 15000,
    resetTimeout: 30000,
});
exports.ollamaCircuitBreaker = new CircuitBreaker('ollama', {
    failureThreshold: 5,
    successThreshold: 3,
    timeout: 30000,
    resetTimeout: 60000,
});
exports.instagramCircuitBreaker = new CircuitBreaker('instagram', {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 20000,
    resetTimeout: 45000,
});
exports.supabaseCircuitBreaker = new CircuitBreaker('supabase', {
    failureThreshold: 5,
    successThreshold: 3,
    timeout: 15000,
    resetTimeout: 30000,
});
exports.facebookCircuitBreaker = new CircuitBreaker('facebook', {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 15000,
    resetTimeout: 30000,
});
exports.twitterCircuitBreaker = new CircuitBreaker('twitter', {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 10000,
    resetTimeout: 30000,
});
exports.linkedinCircuitBreaker = new CircuitBreaker('linkedin', {
    failureThreshold: 3,
    successThreshold: 2,
    timeout: 15000,
    resetTimeout: 30000,
});
//# sourceMappingURL=circuitBreaker.js.map