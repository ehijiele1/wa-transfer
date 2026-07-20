export function generateId(): string {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

export function sanitizeText(text: string): string {
  return text.replace(/[<>]/g, '');
}

export function extractUrls(text: string): string[] {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delay: number = 1000
): Promise<T> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    
    const attempt = () => {
      attempts++;
      fn()
        .then(resolve)
        .catch((error) => {
          if (attempts < maxAttempts) {
            setTimeout(attempt, delay * attempts);
          } else {
            reject(error);
          }
        });
    };
    
    attempt();
  });
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat().format(num);
}

export function formatCurrency(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(date);
}

export function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function calculateReadingTime(text: string): number {
  const wordsPerMinute = 200;
  const wordCount = text.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
}

export function extractHashtags(text: string): string[] {
  const hashtagRegex = /#\w+/g;
  return text.match(hashtagRegex) || [];
}

export function removeHashtags(text: string): string {
  return text.replace(/#\w+/g, '').trim();
}

export function extractMentions(text: string): string[] {
  const mentionRegex = /@\w+/g;
  return text.match(mentionRegex) || [];
}

export function removeMentions(text: string): string {
  return text.replace(/@\w+/g, '').trim();
}

export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

export function isValidPrice(price: string): boolean {
  const priceRegex = /^\$?\d+(?:,\d{3})*(?:\.\d{2})?$/;
  return priceRegex.test(price);
}

export function extractPriceNumber(price: string): number {
  const cleanPrice = price.replace(/[^\d.]/g, '');
  return parseFloat(cleanPrice) || 0;
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function createExponentialBackoff(
  baseDelay: number = 1000,
  maxDelay: number = 30000,
  factor: number = 2
) {
  return (attempt: number): number => {
    const delay = Math.min(baseDelay * Math.pow(factor, attempt), maxDelay);
    return delay + Math.random() * delay * 0.1; // Add jitter
  };
}

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)
    ),
  ]);
}