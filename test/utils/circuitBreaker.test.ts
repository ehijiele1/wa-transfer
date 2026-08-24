/**
 * Tests for Circuit Breaker utility
 */
import { CircuitBreaker } from '../../src/utils/circuitBreaker';

describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker;

  beforeEach(() => {
    breaker = new CircuitBreaker({ failureThreshold: 3, resetTimeoutMs: 1000, name: 'test' });
  });

  describe('initial state', () => {
    it('should start in CLOSED state', () => {
      expect(breaker.getState()).toBe('CLOSED');
    });
  });

  describe('successful execution', () => {
    it('should execute function successfully', async () => {
      const result = await breaker.execute(async () => 'success');
      expect(result).toBe('success');
    });

    it('should remain CLOSED after success', async () => {
      await breaker.execute(async () => 'ok');
      expect(breaker.getState()).toBe('CLOSED');
    });
  });

  describe('failure handling', () => {
    it('should open after threshold failures', async () => {
      for (let i = 0; i < 3; i++) {
        try {
          await breaker.execute(async () => { throw new Error('fail'); });
        } catch (e) {
          // expected
        }
      }
      expect(breaker.getState()).toBe('OPEN');
    });

    it('should reject immediately when OPEN', async () => {
      for (let i = 0; i < 3; i++) {
        try { await breaker.execute(async () => { throw new Error('fail'); }); } catch (e) {}
      }
      await expect(breaker.execute(async () => 'should not run')).rejects.toThrow();
    });
  });
});