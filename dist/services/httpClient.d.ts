export declare class HttpClient {
    private circuitBreakers;
    private defaultTimeout;
    fetch(input: string | URL, init?: RequestInit & {
        timeout?: number;
        circuitBreaker?: string;
    }): Promise<Response>;
    private checkCircuitBreaker;
    private recordSuccess;
    private recordFailure;
    getCircuitBreakerState(name: string): CircuitBreakerState | undefined;
    resetCircuitBreaker(name: string): void;
}
interface CircuitBreakerState {
    state: 'closed' | 'open' | 'half-open';
    failureCount: number;
    nextAttemptAt: number;
}
export declare function getHttpClient(): HttpClient;
export {};
//# sourceMappingURL=httpClient.d.ts.map