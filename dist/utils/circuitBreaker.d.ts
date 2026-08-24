export declare enum CircuitState {
    CLOSED = "closed",
    OPEN = "open",
    HALF_OPEN = "half_open"
}
export interface CircuitBreakerOptions {
    failureThreshold: number;
    successThreshold: number;
    timeout: number;
    resetTimeout: number;
}
export declare class CircuitBreaker {
    private state;
    private failures;
    private successes;
    private readonly options;
    private readonly serviceName;
    constructor(serviceName: string, options?: Partial<CircuitBreakerOptions>);
    execute<T>(operation: () => Promise<T>): Promise<T>;
    private onSuccess;
    private onFailure;
    private open;
    private close;
    private halfOpen;
    getState(): CircuitState;
    getStats(): {
        state: CircuitState;
        failures: number;
        successes: number;
    };
}
export declare const whatsappCircuitBreaker: CircuitBreaker;
export declare const ollamaCircuitBreaker: CircuitBreaker;
export declare const instagramCircuitBreaker: CircuitBreaker;
export declare const supabaseCircuitBreaker: CircuitBreaker;
export declare const facebookCircuitBreaker: CircuitBreaker;
export declare const twitterCircuitBreaker: CircuitBreaker;
export declare const linkedinCircuitBreaker: CircuitBreaker;
//# sourceMappingURL=circuitBreaker.d.ts.map