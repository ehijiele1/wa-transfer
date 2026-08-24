"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inputValidator = exports.InputValidator = void 0;
class InputValidator {
    maxMessageLength = 10000;
    maxMediaSizeBytes = 10 * 1024 * 1024;
    allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
    allowedVideoTypes = ['video/mp4', 'video/quicktime'];
    blockedDomains = ['localhost', '127.0.0.1', '0.0.0.0', '169.254.169.254'];
    validateMessage(message) {
        const errors = [];
        if (!message.id || message.id.length === 0) {
            errors.push('Message ID is required');
        }
        if (!message.from || !this.isValidPhoneNumber(message.from)) {
            errors.push('Invalid sender phone number');
        }
        if (!message.timestamp || message.timestamp <= 0) {
            errors.push('Invalid message timestamp');
        }
        if (!message.type || !['text', 'image', 'video', 'document'].includes(message.type)) {
            errors.push('Invalid message type');
        }
        if (message.type === 'text' && message.message?.conversation) {
            if (message.message.conversation.length > this.maxMessageLength) {
                errors.push(`Message exceeds maximum length of ${this.maxMessageLength} characters`);
            }
            if (this.containsSuspiciousContent(message.message.conversation)) {
                errors.push('Message contains suspicious content');
            }
        }
        if (message.message?.imageMessage?.url) {
            if (!this.isSafeUrl(message.message.imageMessage.url)) {
                errors.push('Image URL points to blocked or unsafe host');
            }
        }
        return {
            valid: errors.length === 0,
            errors,
            quarantined: errors.length > 0 && this.isHighRisk(errors),
        };
    }
    isValidPhoneNumber(phone) {
        const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
        return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
    }
    isSafeUrl(url) {
        try {
            const urlObj = new URL(url);
            if (this.blockedDomains.includes(urlObj.hostname)) {
                return false;
            }
            if (urlObj.protocol !== 'https:') {
                return false;
            }
            return true;
        }
        catch {
            return false;
        }
    }
    containsSuspiciousContent(text) {
        const suspiciousPatterns = [
            /<script[^>]*>/i,
            /javascript:/i,
            /on\w+\s*=/i,
            /data:/i,
            /vbscript:/i,
        ];
        return suspiciousPatterns.some(pattern => pattern.test(text));
    }
    isHighRisk(errors) {
        const highRiskKeywords = ['suspicious', 'unsafe', 'blocked', 'invalid'];
        return errors.some(error => highRiskKeywords.some(keyword => error.toLowerCase().includes(keyword)));
    }
    validateText(text) {
        const errors = [];
        if (text.length > this.maxMessageLength) {
            errors.push(`Message exceeds maximum length of ${this.maxMessageLength} characters`);
        }
        if (this.containsSuspiciousContent(text)) {
            errors.push('Message contains suspicious content');
        }
        return {
            valid: errors.length === 0,
            errors,
            quarantined: errors.length > 0 && this.isHighRisk(errors),
        };
    }
    sanitizeText(text) {
        return text
            .replace(/[<>]/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+/gi, '');
    }
    validateUrl(url) {
        return this.isSafeUrl(url);
    }
}
exports.InputValidator = InputValidator;
exports.inputValidator = new InputValidator();
//# sourceMappingURL=inputValidator.js.map