import { WhatsAppMessage } from '../types';
export interface MessageClassification {
    type: 'property' | 'promotion' | 'conversation' | 'unknown';
    confidence: number;
    extractedData?: any;
}
export declare class MessageProcessor {
    private supabase;
    constructor();
    classifyMessage(message: WhatsAppMessage): Promise<MessageClassification>;
    private extractTextFromMessage;
    private classifyWithOllama;
    private extractPropertyData;
    private extractPromotionData;
    private extractTitle;
    private extractLocation;
    private extractPrice;
    private extractBedrooms;
    private extractBathrooms;
    private extractArea;
    private extractPropertyType;
    private extractFeatures;
    private extractImages;
    private extractPromotionTitle;
    private extractDiscount;
    private extractTerms;
}
export default MessageProcessor;
//# sourceMappingURL=messageProcessor.d.ts.map