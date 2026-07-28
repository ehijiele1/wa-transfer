import { WhatsAppMessage } from '../types';

/**
 * Input validation and quarantine service
 * Ensures untrusted WhatsApp content doesn't compromise the system
 */
export class InputGuard {
  private readonly MAX_TEXT_LENGTH = 4000; // 4KB
  private readonly MAX_MEDIA_SIZE = 25 * 1024 * 1024; // 25MB
  private readonly CONTROL_CHARS_REGEX = /[\x00-\x1F\x7F]/g;
  private readonly MIN_VALID_CHARS = 3;

  /**
   * Validate a WhatsApp message before processing
   * @throws Error if message is invalid or potentially harmful
   */
  validateMessage(message: WhatsAppMessage): void {
    // Extract text content from message object
    const textContent = this.extractTextContent(message.message);
    
    // Check text length
    if (textContent && textContent.length > this.MAX_TEXT_LENGTH) {
      throw new Error(`Message text exceeds maximum length of ${this.MAX_TEXT_LENGTH} characters`);
    }

    // Check for control characters (potential injection attempts)
    if (this.CONTROL_CHARS_REGEX.test(textContent)) {
      throw new Error('Message contains control characters - potential injection attempt');
    }

    // Ensure message has at least some valid content
    const hasValidChars = textContent.replace(/\s/g, '').length >= this.MIN_VALID_CHARS;
    const hasMedia = message.type !== 'text' || message.message?.imageMessage?.url || 
                     message.message?.videoMessage?.url || message.message?.documentMessage?.url;
    
    if (!hasValidChars && !hasMedia) {
      throw new Error('Message appears to be empty or contains insufficient valid content');
    }

    // Check for obvious prompt injection attempts
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

  /**
   * Extract text content from WhatsApp message object
   */
  private extractTextContent(message: any): string {
    if (!message) return '';
    
    if (message.conversation) return message.conversation;
    if (message.imageMessage?.caption) return message.imageMessage.caption;
    if (message.videoMessage?.caption) return message.videoMessage.caption;
    if (message.documentMessage?.caption) return message.documentMessage.caption;
    
    return '';
  }

  /**
   * Quarantine a message that failed validation
   * @param reason Why the message was quarantined
   * @param message The original message data
   */
  async quarantine(reason: string, message: WhatsAppMessage): Promise<void> {
    // In a real implementation, this would save to a quarantine table
    const textContent = this.extractTextContent(message.message);
    console.log(`🔒 Quarantined message ${message.id}: ${reason}`);
    console.log(`   From: ${message.from}, Content: ${textContent.substring(0, 100)}...`);
    
    // For now, we'll just log, but in production this would:
    // 1. Save to quarantined_messages table
    // 2. Send alert to monitoring system
    // 3. Potentially block the sender temporarily
  }
}

/**
 * Factory function to get input guard instance
 */
export function getInputGuard(): InputGuard {
  return new InputGuard();
}