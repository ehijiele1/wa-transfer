import { WhatsAppMessage } from '../types';
export interface ValidationResult {
    valid: boolean;
    errors: string[];
    quarantined: boolean;
}
export declare class InputValidator {
    private maxMessageLength;
    private maxMediaSizeBytes;
    private allowedImageTypes;
    private allowedVideoTypes;
    private blockedDomains;
    validateMessage(message: WhatsAppMessage): ValidationResult;
    private isValidPhoneNumber;
    private isSafeUrl;
    private containsSuspiciousContent;
    private isHighRisk;
    validateText(text: string): ValidationResult;
    sanitizeText(text: string): string;
    validateUrl(url: string): boolean;
}
export declare const inputValidator: InputValidator;
//# sourceMappingURL=inputValidator.d.ts.map