export interface FetchOptions extends RequestInit {
    timeoutMs?: number;
}
export declare function fetchWithTimeout(url: string, options?: FetchOptions, timeoutMs?: number): Promise<Response>;
export declare function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage?: string): Promise<T>;
//# sourceMappingURL=fetchWithTimeout.d.ts.map