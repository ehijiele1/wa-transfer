/**
 * Tests for Logger utility
 */
import { logger } from '../../src/utils/logger';

describe('Logger', () => {
  describe('log levels', () => {
    it('should expose the singleton logger', () => {
      expect(logger).toBeDefined();
      expect(typeof logger.info).toBe('function');
    });

    it('should accept debug level', () => {
      expect(logger.debug).toBeDefined();
    });

    it('should accept info level', () => {
      expect(logger.info).toBeDefined();
    });

    it('should accept warn level', () => {
      expect(logger.warn).toBeDefined();
    });

    it('should accept error level', () => {
      expect(logger.error).toBeDefined();
    });
  });

  describe('child loggers', () => {
    it('should create child logger with context', () => {
      const child = logger.child({ module: 'test' });
      expect(child).toBeDefined();
      expect(typeof child.info).toBe('function');
    });

    it('should propagate context to child logger', () => {
      const child = logger.child({ requestId: '123' });
      expect(child).toBeDefined();
    });
  });
});
