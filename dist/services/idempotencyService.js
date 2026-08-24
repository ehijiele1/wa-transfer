"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.markAsProcessed = exports.checkDeduplication = exports.executeWithIdempotency = exports.idempotencyService = exports.IdempotencyService = void 0;
class IdempotencyService {
    config;
    cache = new Map();
    deduplicationCache = new Map();
    intervals = [];
    constructor(config = {}) {
        this.config = {
            keyPrefix: 'idempotency_',
            ttlSeconds: 3600,
            maxRetries: 3,
            cleanupIntervalMs: 300000,
            enableDeduplication: true,
            deduplicationTtlSeconds: 86400,
            ...config,
        };
        this.startCleanup();
    }
    generateIdempotencyKey(operation, payload) {
        const payloadString = JSON.stringify(payload);
        const payloadHash = this.hashString(payloadString);
        const timestamp = Date.now();
        return `${this.config.keyPrefix}${operation}_${timestamp}_${payloadHash}`;
    }
    generateDeduplicationKey(source, sourceId, dataType) {
        return `dedup_${source}_${sourceId}_${dataType}`;
    }
    hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }
    isExpired(item) {
        return new Date() > item.expiresAt;
    }
    startCleanup() {
        const interval = setInterval(() => {
            this.cleanupExpiredEntries();
        }, this.config.cleanupIntervalMs);
        this.intervals.push(interval);
    }
    cleanupExpiredEntries() {
        for (const [key, value] of this.cache.entries()) {
            if (this.isExpired(value)) {
                this.cache.delete(key);
            }
        }
        for (const [key, value] of this.deduplicationCache.entries()) {
            if (this.isExpired(value)) {
                this.deduplicationCache.delete(key);
            }
        }
    }
    async executeWithIdempotency(operation, payload, operationFn) {
        const idempotencyKey = this.generateIdempotencyKey(operation, payload);
        const cached = this.cache.get(idempotencyKey);
        if (cached && cached.status === 'completed') {
            return {
                success: true,
                data: cached.result,
                idempotencyKey,
                cached: true,
            };
        }
        if (cached && cached.status === 'pending' && cached.retryCount < this.config.maxRetries) {
            const lastAttempt = cached.lastAttemptAt || cached.createdAt;
            const timeSinceLastAttempt = Date.now() - lastAttempt.getTime();
            if (timeSinceLastAttempt > 60000) {
            }
            else {
                return {
                    success: false,
                    error: 'Operation already in progress',
                    idempotencyKey,
                };
            }
        }
        const idempotencyEntry = {
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
            const result = await operationFn();
            const updatedEntry = {
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
        }
        catch (error) {
            const updatedEntry = {
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
    async checkDeduplication(source, sourceId, dataType) {
        if (!this.config.enableDeduplication) {
            return { isDuplicate: false };
        }
        const dedupKey = this.generateDeduplicationKey(source, sourceId, dataType);
        const existing = this.deduplicationCache.get(dedupKey);
        if (existing && existing.processed && !this.isExpired(existing)) {
            return { isDuplicate: true, key: dedupKey };
        }
        const dedupEntry = {
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
    async markAsProcessed(dedupKey) {
        const existing = this.deduplicationCache.get(dedupKey);
        if (existing) {
            existing.processed = true;
            this.deduplicationCache.set(dedupKey, existing);
        }
    }
    async getIdempotencyStatus(key) {
        return this.cache.get(key) || null;
    }
    async getDeduplicationStatus(key) {
        return this.deduplicationCache.get(key) || null;
    }
    async getStats() {
        let expiredCount = 0;
        let pendingCount = 0;
        for (const key of this.cache.values()) {
            if (this.isExpired(key))
                expiredCount++;
            if (key.status === 'pending')
                pendingCount++;
        }
        return {
            idempotencyKeys: this.cache.size,
            deduplicationKeys: this.deduplicationCache.size,
            expiredKeys: expiredCount,
            pendingOperations: pendingCount,
        };
    }
    async clearExpired() {
        let clearedCount = 0;
        for (const [key, value] of this.cache.entries()) {
            if (this.isExpired(value)) {
                this.cache.delete(key);
                clearedCount++;
            }
        }
        for (const [key, value] of this.deduplicationCache.entries()) {
            if (this.isExpired(value)) {
                this.deduplicationCache.delete(key);
                clearedCount++;
            }
        }
        return clearedCount;
    }
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }
    getConfig() {
        return { ...this.config };
    }
    shutdown() {
        this.intervals.forEach(interval => clearInterval(interval));
        this.intervals = [];
    }
}
exports.IdempotencyService = IdempotencyService;
exports.idempotencyService = new IdempotencyService();
const executeWithIdempotency = (operation, payload, operationFn) => exports.idempotencyService.executeWithIdempotency(operation, payload, operationFn);
exports.executeWithIdempotency = executeWithIdempotency;
const checkDeduplication = (source, sourceId, dataType) => exports.idempotencyService.checkDeduplication(source, sourceId, dataType);
exports.checkDeduplication = checkDeduplication;
const markAsProcessed = (dedupKey) => exports.idempotencyService.markAsProcessed(dedupKey);
exports.markAsProcessed = markAsProcessed;
//# sourceMappingURL=idempotencyService.js.map