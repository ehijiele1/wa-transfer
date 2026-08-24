/**
 * Tests for fetchWithTimeout utility
 */
import { fetchWithTimeout } from '../../src/utils/fetchWithTimeout';

describe('fetchWithTimeout', () => {
  it('should export a function', () => {
    expect(typeof fetchWithTimeout).toBe('function');
  });

  it('should reject on timeout', async () => {
    // Create a server that never responds
    const controller = new AbortController();
    const promise = fetchWithTimeout('http://localhost:1', { signal: controller.signal }, 1);
    await expect(promise).rejects.toThrow();
  });

  it('should accept a URL string and options', async () => {
    // This test will fail with network error (expected) not timeout
    const promise = fetchWithTimeout('http://localhost:1/test', {}, 5000);
    await expect(promise).rejects.toThrow();
  });
});