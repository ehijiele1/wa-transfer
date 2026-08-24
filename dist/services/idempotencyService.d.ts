export interface IdempotencyKey {
    id: string;
    operation: string;
    payloadHash: string;
    createdAt: Date;
    expiresAt: Date;
    status: 'pending' | 'completed' | 'failed' | 'expired';
    result?: any;
    retryCount: number;
    lastAttemptAt?: Date;
}
export interface DeduplicationKey {
    id: string;
    source: string;
    sourceId: string;
    dataType: 'message' | 'property' | 'promotion' | 'social_post';
    createdAt: Date;
    expiresAt: Date;
    processed: boolean;
}
export interface IdempotencyConfig {
    keyPrefix: string;
    ttlSeconds: number;
    maxRetries: number;
    cleanupIntervalMs: number;
    enableDeduplication: boolean;
    deduplicationTtlSeconds: number;
}
export interface OperationResult {
    success: boolean;
    data?: any;
    error?: string;
    idempotencyKey?: string;
    deduplicationKey?: string;
    cached?: boolean;
}
export declare class IdempotencyService {
    private config;
    private cache;
    private deduplicationCache;
    private intervals;
    constructor(config?: Partial<IdempotencyConfig>);
    private generateIdempotencyKey;
    private generateDeduplicationKey;
    private hashString;
    private isExpired;
    private startCleanup;
    private cleanupExpiredEntries;
    executeWithIdempotency<T>(operation: string, payload: any, operationFn: () => Promise<T>): Promise<OperationResult>;
    checkDeduplication(source: string, sourceId: string, dataType: DeduplicationKey['dataType']): Promise<{
        isDuplicate: boolean;
        key?: string;
    }>;
    markAsProcessed(dedupKey: string): Promise<void>;
    getIdempotencyStatus(key: string): Promise<IdempotencyKey | null>;
    getDeduplicationStatus(key: string): Promise<DeduplicationKey | null>;
    getStats(): Promise<{
        idempotencyKeys: number;
        deduplicationKeys: number;
        expiredKeys: number;
        pendingOperations: number;
    }>;
    clearExpired(): Promise<number>;
    updateConfig(newConfig: Partial<IdempotencyConfig>): void;
    getConfig(): IdempotencyConfig;
    shutdown(): void;
}
export declare const idempotencyService: IdempotencyService;
export declare const executeWithIdempotency: <T>(operation: string, payload: any, operationFn: () => Promise<T>) => Promise<OperationResult>;
export declare const checkDeduplication: (source: string, sourceId: string, dataType: DeduplicationKey["dataType"]) => Promise<{
    isDuplicate: boolean;
    key?: string;
}>;
export declare const markAsProcessed: (dedupKey: string) => Promise<void>;
//# sourceMappingURL=idempotencyService.d.ts.map