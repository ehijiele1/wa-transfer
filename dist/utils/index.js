"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateId = generateId;
exports.formatTimestamp = formatTimestamp;
exports.sanitizeText = sanitizeText;
exports.extractUrls = extractUrls;
exports.truncateText = truncateText;
exports.isValidEmail = isValidEmail;
exports.isValidUrl = isValidUrl;
exports.debounce = debounce;
exports.throttle = throttle;
exports.retry = retry;
exports.capitalize = capitalize;
exports.formatNumber = formatNumber;
exports.formatCurrency = formatCurrency;
exports.formatDate = formatDate;
exports.formatTime = formatTime;
exports.calculateReadingTime = calculateReadingTime;
exports.extractHashtags = extractHashtags;
exports.removeHashtags = removeHashtags;
exports.extractMentions = extractMentions;
exports.removeMentions = removeMentions;
exports.isValidPhone = isValidPhone;
exports.isValidPrice = isValidPrice;
exports.extractPriceNumber = extractPriceNumber;
exports.sleep = sleep;
exports.createExponentialBackoff = createExponentialBackoff;
exports.withTimeout = withTimeout;
function generateId() {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
function formatTimestamp(timestamp) {
    return new Date(timestamp).toISOString();
}
function sanitizeText(text) {
    return text.replace(/[<>]/g, '');
}
function extractUrls(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.match(urlRegex) || [];
}
function truncateText(text, maxLength) {
    if (text.length <= maxLength)
        return text;
    return text.substring(0, maxLength - 3) + '...';
}
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
function isValidUrl(url) {
    try {
        new URL(url);
        return true;
    }
    catch {
        return false;
    }
}
function debounce(func, wait) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}
function throttle(func, limit) {
    let inThrottle;
    return (...args) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => (inThrottle = false), limit);
        }
    };
}
function retry(fn, maxAttempts = 3, delay = 1000) {
    return new Promise((resolve, reject) => {
        let attempts = 0;
        const attempt = () => {
            attempts++;
            fn()
                .then(resolve)
                .catch((error) => {
                if (attempts < maxAttempts) {
                    setTimeout(attempt, delay * attempts);
                }
                else {
                    reject(error);
                }
            });
        };
        attempt();
    });
}
function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}
function formatNumber(num) {
    return new Intl.NumberFormat().format(num);
}
function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency,
    }).format(amount);
}
function formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(date);
}
function formatTime(date) {
    return new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
    }).format(date);
}
function calculateReadingTime(text) {
    const wordsPerMinute = 200;
    const wordCount = text.split(/\s+/).length;
    return Math.ceil(wordCount / wordsPerMinute);
}
function extractHashtags(text) {
    const hashtagRegex = /#\w+/g;
    return text.match(hashtagRegex) || [];
}
function removeHashtags(text) {
    return text.replace(/#\w+/g, '').trim();
}
function extractMentions(text) {
    const mentionRegex = /@\w+/g;
    return text.match(mentionRegex) || [];
}
function removeMentions(text) {
    return text.replace(/@\w+/g, '').trim();
}
function isValidPhone(phone) {
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}
function isValidPrice(price) {
    const priceRegex = /^\$?\d+(?:,\d{3})*(?:\.\d{2})?$/;
    return priceRegex.test(price);
}
function extractPriceNumber(price) {
    const cleanPrice = price.replace(/[^\d.]/g, '');
    return parseFloat(cleanPrice) || 0;
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
function createExponentialBackoff(baseDelay = 1000, maxDelay = 30000, factor = 2) {
    return (attempt) => {
        const delay = Math.min(baseDelay * Math.pow(factor, attempt), maxDelay);
        return delay + Math.random() * delay * 0.1;
    };
}
function withTimeout(promise, timeoutMs) {
    return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error(`Operation timed out after ${timeoutMs}ms`)), timeoutMs)),
    ]);
}
//# sourceMappingURL=index.js.map