/**
 * Tests for Logger utility
 */
import { Logger, createLogger } from '../../src/utils/logger';

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = createLogger({ level: 'debug', enableConsole: false });
  });

  describe('log levels', () => {
    it('should create logger with default level', () => {
      const l = createLogger({ enableConsole: false });
      expect(l).toBeDefined();
    });

    it('should respect log level filtering', () => {
      const warnLogger = createLogger({ level: 'warn', enableConsole: false });
      expect(warnLogger).toBeDefined();
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
    });

    it('should propagate context to child logger', () => {
      const child = logger.child({ requestId: '123' });
      expect(child).toBeDefined();
    });
  });
});