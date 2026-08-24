export declare class UrlGuard {
    private readonly ALLOWED_DOMAINS;
    private readonly BLOCKED_IP_RANGES;
    validateUrl(url: string): void;
    sanitizeUrlForLogging(url: string): string;
    getAllowedDomains(): string[];
    addTemporaryDomain(domain: string, ttlMs?: number): void;
}
export declare function getUrlGuard(): UrlGuard;
//# sourceMappingURL=urlGuard.d.ts.map