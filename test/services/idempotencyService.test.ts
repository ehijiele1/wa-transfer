import { IdempotencyService, executeWithIdempotency, checkDeduplication, markAsProcessed } from '../../src/services/idempotencyService';

describe('IdempotencyService', () => {
  let idempotencyService: IdempotencyService;

  beforeEach(() => {
    idempotencyService = new IdempotencyService({
      ttlSeconds: 60,
      maxRetries: 3,
      cleanupIntervalMs: 1000
    });
  });

  afterEach(() => {
    idempotencyService.shutdown();
  });

  describe('executeWithIdempotency', () => {
    it('should execute operation successfully on first call', async () => {
      const operation = 'test-operation';
      const payload = { test: 'data' };
      const operationFn = jest.fn().mockResolvedValue('success');

      const result = await idempotencyService.executeWithIdempotency(operation, payload, operationFn);

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.cached).toBe(false);
      expect(operationFn).toHaveBeenCalledTimes(1);
    });

    it('should return cached result on second call with same payload', async () => {
      const operation = 'test-operation';
      const payload = { test: 'data' };
      const operationFn = jest.fn().mockResolvedValue('success');

      // First call
      await idempotencyService.executeWithIdempotency(operation, payload, operationFn);
      
      // Second call
      const result = await idempotencyService.executeWithIdempotency(operation, payload, operationFn);

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(result.cached).toBe(true);
      expect(operationFn).toHaveBeenCalledTimes(1); // Should not be called again
    });

    it('should handle operation failure and retry', async () => {
      const operation = 'test-operation';
      const payload = { test: 'data' };
      const operationFn = jest.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockResolvedValue('success');

      const result = await idempotencyService.executeWithIdempotency(operation, payload, operationFn);

      expect(result.success).toBe(true);
      expect(result.data).toBe('success');
      expect(operationFn).toHaveBeenCalledTimes(2);
    });

    it('should fail after max retries', async () => {
      const operation = 'test-operation';
      const payload = { test: 'data' };
      const operationFn = jest.fn().mockRejectedValue(new Error('Persistent failure'));

      const result = await idempotencyService.executeWithIdempotency(operation, payload, operationFn);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Persistent failure');
      expect(operationFn).toHaveBeenCalledTimes(3); // maxRetries
    });
  });

  describe('checkDeduplication', () => {
    it('should allow new unique source', async () => {
      const source = 'whatsapp';
      const sourceId = '12345';
      const dataType = 'message';

      const result = await idempotencyService.checkDeduplication(source, sourceId, dataType);

      expect(result.isDuplicate).toBe(false);
      expect(result.key).toBeDefined();
    });

    it('should detect duplicate source', async () => {
      const source = 'whatsapp';
      const sourceId = '12345';
      const dataType = 'message';

      // First call
      await idempotencyService.checkDeduplication(source, sourceId, dataType);
      
      // Mark as processed
      const dedupKey = (await idempotencyService.checkDeduplication(source, sourceId, dataType)).key;
      if (dedupKey) {
        await idempotencyService.markAsProcessed(dedupKey);
      }

      // Second call should detect duplicate
      const result = await idempotencyService.checkDeduplication(source, sourceId, dataType);

      expect(result.isDuplicate).toBe(true);
      expect(result.key).toBeDefined();
    });

    it('should allow duplicate after expiration', async () => {
      const source = 'whatsapp';
      const sourceId = '12345';
      const dataType = 'message';

      // Create a short-lived deduplication entry
      const shortTtlService = new IdempotencyService({
        deduplicationTtlSeconds: 1 // 1 second
      });

      // First call
      await shortTtlService.checkDeduplication(source, sourceId, dataType);
      
      const dedupKey = (await shortTtlService.checkDeduplication(source, sourceId, dataType)).key;
      if (dedupKey) {
        await shortTtlService.markAsProcessed(dedupKey);
      }

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Second call should allow duplicate after expiration
      const result = await shortTtlService.checkDeduplication(source, sourceId, dataType);

      expect(result.isDuplicate).toBe(false);
      shortTtlService.shutdown();
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      const operation = 'test-operation';
      const payload = { test: 'data' };
      const operationFn = jest.fn().mockResolvedValue('success');

      // Execute some operations
      await idempotencyService.executeWithIdempotency(operation, payload, operationFn);
      await idempotencyService.executeWithIdempotency('different-operation', payload, operationFn);

      const stats = await idempotencyService.getStats();

      expect(stats.idempotencyKeys).toBe(2);
      expect(stats.deduplicationKeys).toBe(0);
      expect(stats.expiredKeys).toBe(0);
      expect(stats.pendingOperations).toBe(0);
    });
  });

  describe('clearExpired', () => {
    it('should clear expired entries', async () => {
      const shortTtlService = new IdempotencyService({
        ttlSeconds: 1 // 1 second
      });

      const operation = 'test-operation';
      const payload = { test: 'data' };
      const operationFn = jest.fn().mockResolvedValue('success');

      // Execute an operation
      await shortTtlService.executeWithIdempotency(operation, payload, operationFn);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1500));

      const clearedCount = await shortTtlService.clearExpired();
      const stats = await shortTtlService.getStats();

      expect(clearedCount).toBe(1);
      expect(stats.idempotencyKeys).toBe(0);
      shortTtlService.shutdown();
    });
  });
});

describe('Convenience Functions', () => {
  it('should work with global idempotency service', async () => {
    const operation = 'test-operation';
    const payload = { test: 'data' };
    const operationFn = jest.fn().mockResolvedValue('success');

    const result = await executeWithIdempotency(operation, payload, operationFn);

    expect(result.success).toBe(true);
    expect(result.data).toBe('success');
  });

  it('should work with global deduplication functions', async () => {
    const source = 'whatsapp';
    const sourceId = '12345';
    const dataType = 'message';

    const result = await checkDeduplication(source, sourceId, dataType);

    expect(result.isDuplicate).toBe(false);
    expect(result.key).toBeDefined();

    if (result.key) {
      await markAsProcessed(result.key);
    }
  });
});