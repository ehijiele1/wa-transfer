"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UrlGuard = void 0;
exports.getUrlGuard = getUrlGuard;
class UrlGuard {
    ALLOWED_DOMAINS = [
        'lookaside.fbsbx.com',
        'scontent.cdninstagram.com',
        'video.twimg.com',
        'pbs.twimg.com',
        'supabase.co',
        'localhost',
        '127.0.0.1'
    ];
    BLOCKED_IP_RANGES = [
        /^10\./,
        /^172\.(1[6-9]|2[0-9]|3[01])\./,
        /^192\.168\./,
        /^127\./,
        /^169\.254\./,
        /^::1$/,
        /^fc00:/,
    ];
    validateUrl(url) {
        if (!url || typeof url !== 'string') {
            throw new Error('URL is required and must be a string');
        }
        try {
            const parsedUrl = new URL(url);
            if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
                throw new Error(`URL must use HTTP or HTTPS protocol: ${url}`);
            }
            if (parsedUrl.hostname) {
                const isIp = /^[\d.]+$/.test(parsedUrl.hostname);
                if (isIp) {
                    const isBlocked = this.BLOCKED_IP_RANGES.some(regex => regex.test(parsedUrl.hostname));
                    if (isBlocked) {
                        throw new Error(`URL contains blocked IP address: ${parsedUrl.hostname}`);
                    }
                }
                else {
                    const isAllowed = this.ALLOWED_DOMAINS.some(domain => parsedUrl.hostname.endsWith(domain) || parsedUrl.hostname === domain);
                    if (!isAllowed) {
                        throw new Error(`URL domain not in allowlist: ${parsedUrl.hostname}`);
                    }
                }
            }
            if (url.includes('@') || url.includes(' ')) {
                throw new Error('URL contains suspicious characters');
            }
        }
        catch (error) {
            if (error instanceof Error && error.message.includes('Invalid URL')) {
                throw new Error(`Invalid URL format: ${url}`);
            }
            throw error;
        }
    }
    sanitizeUrlForLogging(url) {
        try {
            const parsedUrl = new URL(url);
            return `${parsedUrl.protocol}//${parsedUrl.hostname}${parsedUrl.pathname}`;
        }
        catch {
            return '[invalid-url]';
        }
    }
    getAllowedDomains() {
        return [...this.ALLOWED_DOMAINS];
    }
    addTemporaryDomain(domain, ttlMs = 300000) {
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
exports.UrlGuard = UrlGuard;
function getUrlGuard() {
    return new UrlGuard();
}
//# sourceMappingURL=urlGuard.js.map