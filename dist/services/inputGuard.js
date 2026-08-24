"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InputGuard = void 0;
exports.getInputGuard = getInputGuard;
class InputGuard {
    MAX_TEXT_LENGTH = 4000;
    MAX_MEDIA_SIZE = 25 * 1024 * 1024;
    CONTROL_CHARS_REGEX = /[\x00-\x1F\x7F]/g;
    MIN_VALID_CHARS = 3;
    validateMessage(message) {
        const textContent = this.extractTextContent(message.message);
        if (textContent && textContent.length > this.MAX_TEXT_LENGTH) {
            throw new Error(`Message text exceeds maximum length of ${this.MAX_TEXT_LENGTH} characters`);
        }
        if (this.CONTROL_CHARS_REGEX.test(textContent)) {
            throw new Error('Message contains control characters - potential injection attempt');
        }
        const hasValidChars = textContent.replace(/\s/g, '').length >= this.MIN_VALID_CHARS;
        const hasMedia = message.type !== 'text' || message.message?.imageMessage?.url ||
            message.message?.videoMessage?.url || message.message?.documentMessage?.url;
        if (!hasValidChars && !hasMedia) {
            throw new Error('Message appears to be empty or contains insufficient valid content');
        }
        const injectionKeywords = [
            'ignore previous instructions',
            'disregard previous',
            'forget previous',
            'start over',
            'reset instructions',
            'override system',
            'bypass security',
            'ignore safety',
            'disable safety',
            'turn off safety'
        ];
        const lowerText = textContent.toLowerCase();
        const hasInjectionAttempt = injectionKeywords.some(keyword => lowerText.includes(keyword));
        if (hasInjectionAttempt) {
            throw new Error('Message contains potential prompt injection attempt');
        }
    }
    extractTextContent(message) {
        if (!message)
            return '';
        if (message.conversation)
            return message.conversation;
        if (message.imageMessage?.caption)
            return message.imageMessage.caption;
        if (message.videoMessage?.caption)
            return message.videoMessage.caption;
        if (message.documentMessage?.caption)
            return message.documentMessage.caption;
        return '';
    }
    async quarantine(reason, message) {
        const textContent = this.extractTextContent(message.message);
        console.log(`🔒 Quarantined message ${message.id}: ${reason}`);
        console.log(`   From: ${message.from}, Content: ${textContent.substring(0, 100)}...`);
    }
}
exports.InputGuard = InputGuard;
function getInputGuard() {
    return new InputGuard();
}
//# sourceMappingURL=inputGuard.js.map