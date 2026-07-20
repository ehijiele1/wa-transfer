import { PropertyListing, Promotion, WhatsAppMessage } from '../types';
declare class SupabaseService {
    private client;
    constructor();
    private getServiceClient;
    saveMessage(message: WhatsAppMessage): Promise<void>;
    savePropertyListing(property: PropertyListing): Promise<void>;
    savePromotion(promotion: Promotion): Promise<void>;
    getRecentMessages(limit?: number): Promise<WhatsAppMessage[]>;
    getUnprocessedProperties(): Promise<PropertyListing[]>;
    getUnprocessedPromotions(): Promise<Promotion[]>;
    updatePropertyAsProcessed(propertyId: string): Promise<void>;
    updatePromotionAsProcessed(promotionId: string): Promise<void>;
    searchSimilarProperties(query: string, limit?: number): Promise<PropertyListing[]>;
    searchSimilarPromotions(query: string, limit?: number): Promise<Promotion[]>;
}
export default SupabaseService;
//# sourceMappingURL=supabase.d.ts.map