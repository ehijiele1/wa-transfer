"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageProcessor = void 0;
const supabase_1 = __importDefault(require("./supabase"));
class MessageProcessor {
    supabase;
    constructor() {
        this.supabase = new supabase_1.default();
    }
    async classifyMessage(message) {
        const text = this.extractTextFromMessage(message);
        if (!text || text.length < 10) {
            return {
                type: 'unknown',
                confidence: 0.1,
            };
        }
        const classification = await this.classifyWithOllama(text);
        if (classification.type === 'property') {
            const propertyData = this.extractPropertyData(text, message);
            return {
                type: 'property',
                confidence: classification.confidence,
                extractedData: propertyData,
            };
        }
        if (classification.type === 'promotion') {
            const promotionData = this.extractPromotionData(text, message);
            return {
                type: 'promotion',
                confidence: classification.confidence,
                extractedData: promotionData,
            };
        }
        return {
            type: classification.type,
            confidence: classification.confidence,
        };
    }
    extractTextFromMessage(message) {
        if (message.message?.conversation) {
            return message.message.conversation;
        }
        if (message.message?.imageMessage?.caption) {
            return message.message.imageMessage.caption;
        }
        if (message.message?.videoMessage?.caption) {
            return message.message.videoMessage.caption;
        }
        if (message.message?.documentMessage?.caption) {
            return message.message.documentMessage.caption;
        }
        return '';
    }
    async classifyWithOllama(text) {
        try {
            const response = await fetch(`${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: process.env.OLLAMA_MODEL || 'llama2',
                    prompt: `Classify the following WhatsApp message from a real estate group. Return JSON with:
{
  "type": "property" | "promotion" | "conversation" | "unknown",
  "confidence": number (0-1),
  "reason": "brief explanation"
}

Message: "${text}"

Classification rules:
- PROPERTY: Contains property details like price, location, bedrooms, bathrooms, area, type (house/apartment/commercial/land)
- PROMOTION: Contains discounts, special offers, limited time deals, promotional language
- CONVERSATION: General chat, greetings, questions not related to properties or promotions
- UNKNOWN: Unclear or spam content

Example outputs:
{"type": "property", "confidence": 0.95, "reason": "Contains price, location, and property specifications"}
{"type": "promotion", "confidence": 0.88, "reason": "Contains discount offer and promotional language"}
{"type": "conversation", "confidence": 0.7, "reason": "General conversation about real estate market"}
{"type": "unknown", "confidence": 0.2, "reason": "Unclear message with no clear purpose"}`,
                    stream: false,
                }),
            });
            if (!response.ok) {
                throw new Error(`Ollama request failed: ${response.statusText}`);
            }
            const result = await response.json();
            const responseText = result.response;
            try {
                const classification = JSON.parse(responseText);
                return {
                    type: classification.type,
                    confidence: classification.confidence,
                };
            }
            catch (parseError) {
                console.error('Failed to parse Ollama response:', parseError);
                return {
                    type: 'unknown',
                    confidence: 0.1,
                };
            }
        }
        catch (error) {
            console.error('Error calling Ollama:', error);
            return {
                type: 'unknown',
                confidence: 0.1,
            };
        }
    }
    extractPropertyData(text, message) {
        const propertyData = {
            id: `prop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: this.extractTitle(text),
            description: text,
            location: this.extractLocation(text),
            price: this.extractPrice(text),
            bedrooms: this.extractBedrooms(text),
            bathrooms: this.extractBathrooms(text),
            area: this.extractArea(text),
            type: this.extractPropertyType(text),
            features: this.extractFeatures(text),
            images: this.extractImages(message),
            source: 'whatsapp',
            sourceGroup: message.metadata?.groupMetadata?.subject || 'unknown',
            timestamp: message.timestamp,
            processed: false,
        };
        return propertyData;
    }
    extractPromotionData(text, message) {
        const promotionData = {
            id: `promo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: this.extractPromotionTitle(text),
            description: text,
            discount: this.extractDiscount(text),
            terms: this.extractTerms(text),
            source: 'whatsapp',
            sourceGroup: message.metadata?.groupMetadata?.subject || 'unknown',
            timestamp: message.timestamp,
            processed: false,
        };
        return promotionData;
    }
    extractTitle(text) {
        const lines = text.split('\n');
        const firstLine = lines[0] || '';
        if (firstLine.toLowerCase().includes('sale') || firstLine.toLowerCase().includes('rent')) {
            return firstLine;
        }
        if (firstLine.toLowerCase().includes('house') || firstLine.toLowerCase().includes('apartment')) {
            return firstLine;
        }
        return 'Property Listing';
    }
    extractLocation(text) {
        const locationKeywords = ['location', 'area', 'city', 'neighborhood', 'district', 'address', 'in'];
        const lines = text.toLowerCase().split('\n');
        for (const line of lines) {
            for (const keyword of locationKeywords) {
                if (line.includes(keyword)) {
                    const parts = line.split(keyword);
                    if (parts.length > 1 && parts[1]) {
                        const location = parts[1].trim().split(',')[0];
                        if (location) {
                            return location.trim();
                        }
                    }
                }
            }
        }
        return 'Unknown Location';
    }
    extractPrice(text) {
        const pricePattern = /(?:price|rent|sale|cost|amount)[:\s]*\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/gi;
        const match = text.match(pricePattern);
        if (match) {
            return match[0].replace(/[^\d$,.]/g, '');
        }
        return undefined;
    }
    extractBedrooms(text) {
        const bedroomPattern = /(\d+)\s*(?:bedroom|bed|br)/gi;
        const match = text.match(bedroomPattern);
        if (match && match[0]) {
            const number = match[0].match(/\d+/);
            return number ? parseInt(number[0]) : undefined;
        }
        return undefined;
    }
    extractBathrooms(text) {
        const bathroomPattern = /(\d+)\s*(?:bathroom|bath|ba)/gi;
        const match = text.match(bathroomPattern);
        if (match && match[0]) {
            const number = match[0].match(/\d+/);
            return number ? parseInt(number[0]) : undefined;
        }
        return undefined;
    }
    extractArea(text) {
        const areaPattern = /(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:sqft|square feet|square meter|m²|ft²)/gi;
        const match = text.match(areaPattern);
        if (match) {
            return match[0];
        }
        return undefined;
    }
    extractPropertyType(text) {
        const lowerText = text.toLowerCase();
        if (lowerText.includes('house') || lowerText.includes('home')) {
            return 'house';
        }
        if (lowerText.includes('apartment') || lowerText.includes('flat') || lowerText.includes('condo')) {
            return 'apartment';
        }
        if (lowerText.includes('commercial') || lowerText.includes('office') || lowerText.includes('shop')) {
            return 'commercial';
        }
        if (lowerText.includes('land') || lowerText.includes('plot') || lowerText.includes('plot')) {
            return 'land';
        }
        return 'house';
    }
    extractFeatures(text) {
        const features = [];
        const featureKeywords = [
            'parking', 'pool', 'garden', 'balcony', 'terrace', 'furnished',
            'unfurnished', 'pet friendly', 'security', 'gym', 'elevator',
            'air conditioning', 'heating', 'fireplace', 'basement', 'attic'
        ];
        const lowerText = text.toLowerCase();
        for (const keyword of featureKeywords) {
            if (lowerText.includes(keyword)) {
                features.push(keyword);
            }
        }
        return features;
    }
    extractImages(message) {
        const images = [];
        if (message.message?.imageMessage?.url) {
            images.push(message.message.imageMessage.url);
        }
        return images;
    }
    extractPromotionTitle(text) {
        const lines = text.split('\n');
        const firstLine = lines[0] || '';
        if (firstLine.toLowerCase().includes('special') || firstLine.toLowerCase().includes('offer')) {
            return firstLine;
        }
        if (firstLine.toLowerCase().includes('discount') || firstLine.toLowerCase().includes('deal')) {
            return firstLine;
        }
        return 'Special Promotion';
    }
    extractDiscount(text) {
        const discountPattern = /(?:discount|off|deal|offer)[:\s]*(\d+%|\$\d+)/gi;
        const match = text.match(discountPattern);
        if (match) {
            return match[0];
        }
        return undefined;
    }
    extractTerms(text) {
        const terms = [];
        const lines = text.split('\n');
        for (const line of lines) {
            if (line.length > 20 &&
                (line.includes('terms') || line.includes('conditions') || line.includes('valid') ||
                    line.includes('until') || line.includes('expires'))) {
                terms.push(line.trim());
            }
        }
        return terms.join(' ') || 'Terms and conditions apply';
    }
}
exports.MessageProcessor = MessageProcessor;
exports.default = MessageProcessor;
//# sourceMappingURL=messageProcessor.js.map