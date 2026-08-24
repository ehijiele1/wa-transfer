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

export class IdempotencyService {
  private config: IdempotencyConfig;
  private cache: Map<string, IdempotencyKey> = new Map();
  private deduplicationCache: Map<string, DeduplicationKey> = new Map();
  private intervals: NodeJS.Timeout[] = [];

  constructor(config: Partial<IdempotencyConfig> = {}) {
    this.config = {
      keyPrefix: 'idempotency_',
      ttlSeconds: 3600, // 1 hour
      maxRetries: 3,
      cleanupIntervalMs: 300000, // 5 minutes
      enableDeduplication: true,
      deduplicationTtlSeconds: 86400, // 24 hours
      ...config,
    };

    this.startCleanup();
  }

  private generateIdempotencyKey(operation: string, payload: any): string {
    const payloadString = JSON.stringify(payload);
    const payloadHash = this.hashString(payloadString);
    const timestamp = Date.now();
    return `${this.config.keyPrefix}${operation}_${timestamp}_${payloadHash}`;
  }

  private generateDeduplicationKey(source: string, sourceId: string, dataType: string): string {
    return `dedup_${source}_${sourceId}_${dataType}`;
  }

  private hashString(str: string): string {
    // Simple hash function for demo purposes
    // In production, use a proper hashing library like crypto
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private isExpired(item: IdempotencyKey | DeduplicationKey): boolean {
    return new Date() > item.expiresAt;
  }

  private startCleanup(): void {
    const interval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, this.config.cleanupIntervalMs);

    this.intervals.push(interval);
  }

  private cleanupExpiredEntries(): void {
    // Clean up expired idempotency keys
    for (const [key, value] of this.cache.entries()) {
      if (this.isExpired(value)) {
        this.cache.delete(key);
      }
    }

    // Clean up expired deduplication keys
    for (const [key, value] of this.deduplicationCache.entries()) {
      if (this.isExpired(value)) {
        this.deduplicationCache.delete(key);
      }
    }
  }

  async executeWithIdempotency<T>(
    operation: string,
    payload: any,
    operationFn: () => Promise<T>
  ): Promise<OperationResult> {
    const idempotencyKey = this.generateIdempotencyKey(operation, payload);
    
    // Check if we have a cached result
    const cached = this.cache.get(idempotencyKey);
    if (cached && cached.status === 'completed') {
      return {
        success: true,
        data: cached.result,
        idempotencyKey,
        cached: true,
      };
    }

    // Check if operation is already in progress
    if (cached && cached.status === 'pending' && cached.retryCount < this.config.maxRetries) {
      // Check if it's been too long since last attempt
      const lastAttempt = cached.lastAttemptAt || cached.createdAt;
      const timeSinceLastAttempt = Date.now() - lastAttempt.getTime();
      
      if (timeSinceLastAttempt > 60000) { // 1 minute timeout
        // Allow retry
      } else {
        return {
          success: false,
          error: 'Operation already in progress',
          idempotencyKey,
        };
      }
    }

    // Mark as pending
    const idempotencyEntry: IdempotencyKey = {
      id: idempotencyKey,
      operation,
      payloadHash: this.hashString(JSON.stringify(payload)),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.ttlSeconds * 1000),
      status: 'pending',
      retryCount: 0,
    };

    this.cache.set(idempotencyKey, idempotencyEntry);

    try {
      // Execute the operation
      const result = await operationFn();
      
      // Update cache with successful result
      const updatedEntry: IdempotencyKey = {
        ...idempotencyEntry,
        status: 'completed',
        result,
        retryCount: idempotencyEntry.retryCount + 1,
        lastAttemptAt: new Date(),
      };
      
      this.cache.set(idempotencyKey, updatedEntry);
      
      return {
        success: true,
        data: result,
        idempotencyKey,
      };
    } catch (error) {
      // Update cache with failure
      const updatedEntry: IdempotencyKey = {
        ...idempotencyEntry,
        status: 'failed',
        retryCount: idempotencyEntry.retryCount + 1,
        lastAttemptAt: new Date(),
      };
      
      this.cache.set(idempotencyKey, updatedEntry);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        idempotencyKey,
      };
    }
  }

  async checkDeduplication(
    source: string,
    sourceId: string,
    dataType: DeduplicationKey['dataType']
  ): Promise<{ isDuplicate: boolean; key?: string }> {
    if (!this.config.enableDeduplication) {
      return { isDuplicate: false };
    }

    const dedupKey = this.generateDeduplicationKey(source, sourceId, dataType);
    const existing = this.deduplicationCache.get(dedupKey);

    if (existing && existing.processed && !this.isExpired(existing)) {
      return { isDuplicate: true, key: dedupKey };
    }

    // Create new deduplication entry
    const dedupEntry: DeduplicationKey = {
      id: dedupKey,
      source,
      sourceId,
      dataType,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + this.config.deduplicationTtlSeconds * 1000),
      processed: false,
    };

    this.deduplicationCache.set(dedupKey, dedupEntry);

    return { isDuplicate: false, key: dedupKey };
  }

  async markAsProcessed(dedupKey: string): Promise<void> {
    const existing = this.deduplicationCache.get(dedupKey);
    if (existing) {
      existing.processed = true;
      this.deduplicationCache.set(dedupKey, existing);
    }
  }

  async getIdempotencyStatus(key: string): Promise<IdempotencyKey | null> {
    return this.cache.get(key) || null;
  }

  async getDeduplicationStatus(key: string): Promise<DeduplicationKey | null> {
    return this.deduplicationCache.get(key) || null;
  }

  async getStats(): Promise<{
    idempotencyKeys: number;
    deduplicationKeys: number;
    expiredKeys: number;
    pendingOperations: number;
  }> {
    let expiredCount = 0;
    let pendingCount = 0;

    for (const key of this.cache.values()) {
      if (this.isExpired(key)) expiredCount++;
      if (key.status === 'pending') pendingCount++;
    }

    return {
      idempotencyKeys: this.cache.size,
      deduplicationKeys: this.deduplicationCache.size,
      expiredKeys: expiredCount,
      pendingOperations: pendingCount,
    };
  }

  async clearExpired(): Promise<number> {
    let clearedCount = 0;
    
    // Clear expired idempotency keys
    for (const [key, value] of this.cache.entries()) {
      if (this.isExpired(value)) {
        this.cache.delete(key);
        clearedCount++;
      }
    }

    // Clear expired deduplication keys
    for (const [key, value] of this.deduplicationCache.entries()) {
      if (this.isExpired(value)) {
        this.deduplicationCache.delete(key);
        clearedCount++;
      }
    }

    return clearedCount;
  }

  updateConfig(newConfig: Partial<IdempotencyConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): IdempotencyConfig {
    return { ...this.config };
  }

  shutdown(): void {
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals = [];
  }
}

// Global instance
export const idempotencyService = new IdempotencyService();

// Convenience functions
export const executeWithIdempotency = <T>(
  operation: string,
  payload: any,
  operationFn: () => Promise<T>
) => idempotencyService.executeWithIdempotency(operation, payload, operationFn);

export const checkDeduplication = (
  source: string,
  sourceId: string,
  dataType: DeduplicationKey['dataType']
) => idempotencyService.checkDeduplication(source, sourceId, dataType);

export const markAsProcessed = (dedupKey: string) => idempotencyService.markAsProcessed(dedupKey);