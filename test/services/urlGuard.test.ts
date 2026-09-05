import { URLGuard } from '../../src/services/urlGuard';

describe('URLGuard', () => {
  let urlGuard: URLGuard;

  beforeEach(() => {
    urlGuard = new URLGuard();
  });

  describe('sanitizeURL', () => {
    it('should allow safe URLs', () => {
      const url = 'https://example.com/path';
      const result = urlGuard.sanitizeURL(url);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedUrl).toBe(url);
    });

    it('should block localhost URLs', () => {
      const url = 'http://localhost:8080/admin';
      const result = urlGuard.sanitizeURL(url);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('localhost');
    });

    it('should block private IP addresses', () => {
      const url = 'http://192.168.1.1:8080/admin';
      const result = urlGuard.sanitizeURL(url);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('private IP');
    });

    it('should block loopback addresses', () => {
      const url = 'http://127.0.0.1:8080/admin';
      const result = urlGuard.sanitizeURL(url);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('loopback');
    });

    it('should allow whitelisted domains', () => {
      urlGuard.addToAllowlist(['trusted-site.com']);
      const url = 'https://trusted-site.com/path';
      const result = urlGuard.sanitizeURL(url);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedUrl).toBe(url);
    });

    it('should block non-whitelisted domains when allowlist is enabled', () => {
      urlGuard.addToAllowlist(['trusted-site.com']);
      urlGuard.setAllowlistOnly(true);
      const url = 'https://malicious-site.com/path';
      const result = urlGuard.sanitizeURL(url);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('not in allowlist');
    });

    it('should remove dangerous URL parameters', () => {
      const url = 'https://example.com/path?data=<script>alert("xss")>&token=secret';
      const result = urlGuard.sanitizeURL(url);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedUrl).not.toContain('<script>');
      expect(result.sanitizedUrl).not.toContain('token=secret');
    });

    it('should handle malformed URLs', () => {
      const url = 'not-a-valid-url';
      const result = urlGuard.sanitizeURL(url);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('invalid URL');
    });
  });

  describe('validateRequest', () => {
    it('should allow safe HTTP requests', () => {
      const request = {
        url: 'https://api.example.com/data',
        method: 'GET',
        headers: {
          'User-Agent': 'wa-transfer-agent'
        }
      };

      const result = urlGuard.validateRequest(request);
      expect(result.isValid).toBe(true);
      expect(result.sanitizedUrl).toBe(request.url);
    });

    it('should block requests to localhost', () => {
      const request = {
        url: 'http://localhost:8080/api',
        method: 'POST',
        headers: {
          'User-Agent': 'wa-transfer-agent'
        }
      };

      const result = urlGuard.validateRequest(request);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('localhost');
    });

    it('should block requests with suspicious headers', () => {
      const request = {
        url: 'https://api.example.com/data',
        method: 'GET',
        headers: {
          'User-Agent': 'wa-transfer-agent',
          'X-Forwarded-For': '192.168.1.1'
        }
      };

      const result = urlGuard.validateRequest(request);
      expect(result.isValid).toBe(false);
      expect(result.reason).toContain('suspicious headers');
    });

    it('should allow requests with custom headers', () => {
      urlGuard.addAllowedHeader('X-Custom-Header');
      const request = {
        url: 'https://api.example.com/data',
        method: 'GET',
        headers: {
          'User-Agent': 'wa-transfer-agent',
          'X-Custom-Header': 'custom-value'
        }
      };

      const result = urlGuard.validateRequest(request);
      expect(result.isValid).toBe(true);
    });
  });

  describe('addToAllowlist', () => {
    it('should add domains to allowlist', () => {
      urlGuard.addToAllowlist(['example.com', 'trusted-site.com']);
      const url = 'https://example.com/path';
      const result = urlGuard.sanitizeURL(url);
      expect(result.isValid).toBe(true);
    });

    it('should handle duplicate allowlist entries', () => {
      urlGuard.addToAllowlist(['example.com']);
      urlGuard.addToAllowlist(['example.com']); // Duplicate
      const url = 'https://example.com/path';
      const result = urlGuard.sanitizeURL(url);
      expect(result.isValid).toBe(true);
    });
  });

  describe('removeFromAllowlist', () => {
    it('should remove domains from allowlist', () => {
      urlGuard.addToAllowlist(['example.com']);
      urlGuard.removeFromAllowlist(['example.com']);
      const url = 'https://example.com/path';
      const result = urlGuard.sanitizeURL(url);
      expect(result.isValid).toBe(false);
    });
  });

  describe('setAllowlistOnly', () => {
    it('should enable allowlist-only mode', () => {
      urlGuard.addToAllowlist(['trusted-site.com']);
      urlGuard.setAllowlistOnly(true);
      
      const allowedUrl = 'https://trusted-site.com/path';
      const blockedUrl = 'https://example.com/path';
      
      expect(urlGuard.sanitizeURL(allowedUrl).isValid).toBe(true);
      expect(urlGuard.sanitizeURL(blockedUrl).isValid).toBe(false);
    });
  });

  describe('addAllowedHeader', () => {
    it('should add allowed headers', () => {
      urlGuard.addAllowedHeader('X-Custom-Header');
      const request = {
        url: 'https://api.example.com/data',
        method: 'GET',
        headers: {
          'User-Agent': 'wa-transfer-agent',
          'X-Custom-Header': 'custom-value'
        }
      };

      const result = urlGuard.validateRequest(request);
      expect(result.isValid).toBe(true);
    });
  });

  describe('removeAllowedHeader', () => {
    it('should remove allowed headers', () => {
      urlGuard.addAllowedHeader('X-Custom-Header');
      urlGuard.removeAllowedHeader('X-Custom-Header');
      
      const request = {
        url: 'https://api.example.com/data',
        method: 'GET',
        headers: {
          'User-Agent': 'wa-transfer-agent',
          'X-Custom-Header': 'custom-value'
        }
      };

      const result = urlGuard.validateRequest(request);
      expect(result.isValid).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return URL validation statistics', () => {
      // Test some validations
      urlGuard.sanitizeURL('https://example.com/path');
      urlGuard.sanitizeURL('http://localhost:8080/admin');
      urlGuard.validateRequest({
        url: 'https://api.example.com/data',
        method: 'GET',
        headers: { 'User-Agent': 'wa-transfer-agent' }
      });

      const stats = urlGuard.getStats();
      expect(stats.totalValidated).toBe(3);
      expect(stats.totalBlocked).toBe(1);
      expect(stats.blockedReasons).toBeDefined();
    });

    it('should reset statistics', () => {
      urlGuard.sanitizeURL('https://example.com/path');
      urlGuard.resetStats();
      const stats = urlGuard.getStats();
      expect(stats.totalValidated).toBe(0);
      expect(stats.totalBlocked).toBe(0);
    });
  });

  describe('reset', () => {
    it('should reset all configuration', () => {
      urlGuard.addToAllowlist(['example.com']);
      urlGuard.addAllowedHeader('X-Custom-Header');
      urlGuard.setAllowlistOnly(true);
      
      urlGuard.reset();
      
      expect(urlGuard.sanitizeURL('https://example.com/path').isValid).toBe(false);
      expect(urlGuard.validateRequest({
        url: 'https://api.example.com/data',
        method: 'GET',
        headers: { 'X-Custom-Header': 'value' }
      }).isValid).toBe(false);
      expect(urlGuard.isAllowlistOnly()).toBe(false);
    });
  });
});