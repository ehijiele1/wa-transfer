export declare class RetryHelper {
    static withLinearBackoff<T>(fn: () => Promise<T>, options?: {
        maxAttempts?: number;
        baseDelayMs?: number;
        maxDelayMs?: number;
        jitter?: boolean;
    }): Promise<T>;
    static withExponentialBackoff<T>(fn: () => Promise<T>, options?: {
        maxAttempts?: number;
        baseDelayMs?: number;
        maxDelayMs?: number;
        jitter?: boolean;
    }): Promise<T>;
    static withBudget<T>(fn: () => Promise<T>, options?: {
        maxAttempts?: number;
        baseDelayMs?: number;
        maxDelayMs?: number;
        jitter?: boolean;
        budgetMs?: number;
    }): Promise<T>;
    static sleep(ms: number): Promise<void>;
}
export declare function retryWithBudget<T>(fn: () => Promise<T>, options?: {
    attempts?: number;
    baseMs?: number;
    maxMs?: number;
    jitter?: boolean;
    budgetMs?: number;
}): Promise<T>;
//# sourceMappingURL=retryHelper.d.ts.map