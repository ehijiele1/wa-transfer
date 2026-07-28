/**
 * URL validation and security service
 * Prevents SSRF attacks and ensures only trusted domains are accessed
 */
export class UrlGuard {
  // Allowlist of trusted domains for media downloads
  private readonly ALLOWED_DOMAINS = [
    'lookaside.fbsbx.com',      // Facebook media
    'scontent.cdninstagram.com', // Instagram media
    'video.twimg.com',          // Twitter media
    'pbs.twimg.com',            // Twitter media
    'supabase.co',              // Supabase storage
    'localhost',                // Local development
    '127.0.0.1'                 // Local development
  ];

  // Private IP ranges to block (SSRF protection)
  private readonly BLOCKED_IP_RANGES = [
    /^10\./,                    // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12
    /^192\.168\./,              // 192.168.0.0/16
    /^127\./,                   // 127.0.0.0/8 (localhost already handled but double protection)
    /^169\.254\./,              // 169.254.0.0/16 (link-local)
    /^::1$/,                    // IPv6 localhost
    /^fc00:/,                   // IPv6 unique local addresses
  ];

  /**
   * Validate a URL before making external requests
   * @throws Error if URL is invalid or potentially harmful
   */
  validateUrl(url: string): void {
    if (!url || typeof url !== 'string') {
      throw new Error('URL is required and must be a string');
    }

    try {
      const parsedUrl = new URL(url);
      
      // Check for protocol
      if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
        throw new Error(`URL must use HTTP or HTTPS protocol: ${url}`);
      }

      // Check for IP addresses (block private ranges)
      if (parsedUrl.hostname) {
        // Check if it's an IP address
        const isIp = /^[\d.]+$/.test(parsedUrl.hostname);
        
        if (isIp) {
          // Check blocked IP ranges
          const isBlocked = this.BLOCKED_IP_RANGES.some(regex => 
            regex.test(parsedUrl.hostname)
          );
          
          if (isBlocked) {
            throw new Error(`URL contains blocked IP address: ${parsedUrl.hostname}`);
          }
        } else {
          // Check allowed domains
          const isAllowed = this.ALLOWED_DOMAINS.some(domain => 
            parsedUrl.hostname.endsWith(domain) || parsedUrl.hostname === domain
          );
          
          if (!isAllowed) {
            throw new Error(`URL domain not in allowlist: ${parsedUrl.hostname}`);
          }
        }
      }

      // Check for common SSRF patterns
      if (url.includes('@') || url.includes(' ')) {
        throw new Error('URL contains suspicious characters');
      }

    } catch (error) {
      if (error instanceof Error && error.message.includes('Invalid URL')) {
        throw new Error(`Invalid URL format: ${url}`);
      }
      throw error;
    }
  }

  /**
   * Sanitize a URL for logging (remove sensitive parts)
   */
  sanitizeUrlForLogging(url: string): string {
    try {
      const parsedUrl = new URL(url);
      // Remove query parameters and fragments for logging
      return `${parsedUrl.protocol}//${parsedUrl.hostname}${parsedUrl.pathname}`;
    } catch {
      return '[invalid-url]';
    }
  }

  /**
   * Get the allowed domains list (for configuration)
   */
  getAllowedDomains(): string[] {
    return [...this.ALLOWED_DOMAINS];
  }

  /**
   * Add a temporary domain to allowlist (for testing or emergency)
   */
  addTemporaryDomain(domain: string, ttlMs: number = 300000): void {
    console.log(`⚠️  Adding temporary domain to allowlist: ${domain} (TTL: ${ttlMs}ms)`);
    this.ALLOWED_DOMAINS.push(domain);
    
    if (ttlMs > 0) {
      setTimeout(() => {
        const index = this.ALLOWED_DOMAINS.indexOf(domain);
        if (index > -1) {
          this.ALLOWED_DOMAINS.splice(index, 1);
          console.log(`⏰ Removed temporary domain from allowlist: ${domain}`);
        }
      }, ttlMs);
    }
  }
}

/**
 * Factory function to get URL guard instance
 */
export function getUrlGuard(): UrlGuard {
  return new UrlGuard();
}