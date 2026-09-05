import { InputGuard } from '../../src/services/inputGuard';

describe('InputGuard', () => {
  let inputGuard: InputGuard;

  beforeEach(() => {
    inputGuard = new InputGuard();
  });

  describe('validateMessage', () => {
    it('should validate a valid message', () => {
      const message = {
        id: '123',
        from: '1234567890@c.us',
        to: '9876543210@c.us',
        message: 'Hello, this is a test message',
        timestamp: Date.now(),
        type: 'chat'
      };

      const result = inputGuard.validateMessage(message);
      expect(result.isValid).toBe(true);
      expect(result.quarantined).toBe(false);
    });

    it('should quarantine messages with suspicious patterns', () => {
      const message = {
        id: '123',
        from: '1234567890@c.us',
        to: '9876543210@c.us',
        message: 'GET http://malicious-site.com/admin',
        timestamp: Date.now(),
        type: 'chat'
      };

      const result = inputGuard.validateMessage(message);
      expect(result.isValid).toBe(false);
      expect(result.quarantined).toBe(true);
      expect(result.reason).toContain('HTTP request');
    });

    it('should quarantine messages with SQL injection patterns', () => {
      const message = {
        id: '123',
        from: '1234567890@c.us',
        to: '9876543210@c.us',
        message: "SELECT * FROM users WHERE id = 1 OR '1'='1'",
        timestamp: Date.now(),
        type: 'chat'
      };

      const result = inputGuard.validateMessage(message);
      expect(result.isValid).toBe(false);
      expect(result.quarantined).toBe(true);
      expect(result.reason).toContain('SQL injection');
    });

    it('should quarantine messages with XSS patterns', () => {
      const message = {
        id: '123',
        from: '1234567890@c.us',
        to: '9876543210@c.us',
        message: '<script>alert("xss")</script>',
        timestamp: Date.now(),
        type: 'chat'
      };

      const result = inputGuard.validateMessage(message);
      expect(result.isValid).toBe(false);
      expect(result.quarantined).toBe(true);
      expect(result.reason).toContain('XSS');
    });

    it('should quarantine messages with excessive length', () => {
      const longMessage = 'a'.repeat(5000);
      const message = {
        id: '123',
        from: '1234567890@c.us',
        to: '9876543210@c.us',
        message: longMessage,
        timestamp: Date.now(),
        type: 'chat'
      };

      const result = inputGuard.validateMessage(message);
      expect(result.isValid).toBe(false);
      expect(result.quarantined).toBe(true);
      expect(result.reason).toContain('exceeds maximum length');
    });

    it('should quarantine messages with invalid WhatsApp format', () => {
      const message = {
        id: '123',
        from: 'invalid-number',
        to: '9876543210@c.us',
        message: 'Test message',
        timestamp: Date.now(),
        type: 'chat'
      };

      const result = inputGuard.validateMessage(message);
      expect(result.isValid).toBe(false);
      expect(result.quarantined).toBe(true);
      expect(result.reason).toContain('invalid WhatsApp format');
    });
  });

  describe('validatePropertyData', () => {
    it('should validate valid property data', () => {
      const property = {
        id: 'prop123',
        address: '123 Main St',
        price: 250000,
        bedrooms: 3,
        bathrooms: 2,
        type: 'house'
      };

      const result = inputGuard.validateProperty(property);
      expect(result.isValid).toBe(true);
      expect(result.quarantined).toBe(false);
    });

    it('should quarantine property with negative price', () => {
      const property = {
        id: 'prop123',
        address: '123 Main St',
        price: -1000,
        bedrooms: 3,
        bathrooms: 2,
        type: 'house'
      };

      const result = inputGuard.validateProperty(property);
      expect(result.isValid).toBe(false);
      expect(result.quarantined).toBe(true);
      expect(result.reason).toContain('negative price');
    });

    it('should quarantine property with invalid bedroom count', () => {
      const property = {
        id: 'prop123',
        address: '123 Main St',
        price: 250000,
        bedrooms: 0,
        bathrooms: 2,
        type: 'house'
      };

      const result = inputGuard.validateProperty(property);
      expect(result.isValid).toBe(false);
      expect(result.quarantined).toBe(true);
      expect(result.reason).toContain('invalid bedroom count');
    });
  });

  describe('validatePromotion', () => {
    it('should validate valid promotion', () => {
      const promotion = {
        id: 'promo123',
        title: 'Summer Sale',
        description: 'Get 20% off all properties',
        discount: 20,
        validUntil: Date.now() + 86400000 // 1 day from now
      };

      const result = inputGuard.validatePromotion(promotion);
      expect(result.isValid).toBe(true);
      expect(result.quarantined).toBe(false);
    });

    it('should quarantine promotion with negative discount', () => {
      const promotion = {
        id: 'promo123',
        title: 'Invalid Sale',
        description: 'Get -20% off all properties',
        discount: -20,
        validUntil: Date.now() + 86400000
      };

      const result = inputGuard.validatePromotion(promotion);
      expect(result.isValid).toBe(false);
      expect(result.quarantined).toBe(true);
      expect(result.reason).toContain('negative discount');
    });

    it('should quarantine promotion with expired date', () => {
      const promotion = {
        id: 'promo123',
        title: 'Expired Sale',
        description: 'Get 20% off all properties',
        discount: 20,
        validUntil: Date.now() - 86400000 // 1 day ago
      };

      const result = inputGuard.validatePromotion(promotion);
      expect(result.isValid).toBe(false);
      expect(result.quarantined).toBe(true);
      expect(result.reason).toContain('expired date');
    });
  });

  describe('getStats', () => {
    it('should return validation statistics', () => {
      // Test some validations
      inputGuard.validateMessage({
        id: '123',
        from: '1234567890@c.us',
        to: '9876543210@c.us',
        message: 'Valid message',
        timestamp: Date.now(),
        type: 'chat'
      });

      inputGuard.validateMessage({
        id: '456',
        from: '1234567890@c.us',
        to: '9876543210@c.us',
        message: '<script>alert("xss")</script>',
        timestamp: Date.now(),
        type: 'chat'
      });

      const stats = inputGuard.getStats();
      expect(stats.totalValidated).toBe(2);
      expect(stats.totalQuarantined).toBe(1);
      expect(stats.quarantineReasons).toBeDefined();
    });
  });

  describe('resetStats', () => {
    it('should reset validation statistics', () => {
      // Do some validations first
      inputGuard.validateMessage({
        id: '123',
        from: '1234567890@c.us',
        to: '9876543210@c.us',
        message: 'Test message',
        timestamp: Date.now(),
        type: 'chat'
      });

      inputGuard.resetStats();
      const stats = inputGuard.getStats();
      expect(stats.totalValidated).toBe(0);
      expect(stats.totalQuarantined).toBe(0);
    });
  });
});