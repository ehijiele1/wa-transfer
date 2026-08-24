/**
 * Input Validation Layer
 * Validates and quarantines untrusted content before AI/publishing pipeline
 */

import { WhatsAppMessage } from '../types';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  quarantined: boolean;
}

export class InputValidator {
  private maxMessageLength = 10000;
  private maxMediaSizeBytes = 10 * 1024 * 1024; // 10MB
  private allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
  private allowedVideoTypes = ['video/mp4', 'video/quicktime'];
  private blockedDomains = ['localhost', '127.0.0.1', '0.0.0.0', '169.254.169.254'];

  validateMessage(message: WhatsAppMessage): ValidationResult {
    const errors: string[] = [];

    // Validate ID
    if (!message.id || message.id.length === 0) {
      errors.push('Message ID is required');
    }

    // Validate sender
    if (!message.from || !this.isValidPhoneNumber(message.from)) {
      errors.push('Invalid sender phone number');
    }

    // Validate timestamp
    if (!message.timestamp || message.timestamp <= 0) {
      errors.push('Invalid message timestamp');
    }

    // Validate message type
    if (!message.type || !['text', 'image', 'video', 'document'].includes(message.type)) {
      errors.push('Invalid message type');
    }

    // Validate content
    if (message.type === 'text' && message.message?.conversation) {
      if (message.message.conversation.length > this.maxMessageLength) {
        errors.push(`Message exceeds maximum length of ${this.maxMessageLength} characters`);
      }
      if (this.containsSuspiciousContent(message.message.conversation)) {
        errors.push('Message contains suspicious content');
      }
    }

    // Validate media URLs
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

  private isValidPhoneNumber(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
  }

  private isSafeUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      
      // Check blocked domains
      if (this.blockedDomains.includes(urlObj.hostname)) {
        return false;
      }

      // Only allow HTTPS
      if (urlObj.protocol !== 'https:') {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  private containsSuspiciousContent(text: string): boolean {
    const suspiciousPatterns = [
      /<script[^>]*>/i,
      /javascript:/i,
      /on\w+\s*=/i,
      /data:/i,
      /vbscript:/i,
    ];

    return suspiciousPatterns.some(pattern => pattern.test(text));
  }

  private isHighRisk(errors: string[]): boolean {
    const highRiskKeywords = ['suspicious', 'unsafe', 'blocked', 'invalid'];
    return errors.some(error => highRiskKeywords.some(keyword => error.toLowerCase().includes(keyword)));
  }

  validateText(text: string): ValidationResult {
    const errors: string[] = [];

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

  sanitizeText(text: string): string {
    return text
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+/gi, '');
  }

  validateUrl(url: string): boolean {
    return this.isSafeUrl(url);
  }
}

export const inputValidator = new InputValidator();