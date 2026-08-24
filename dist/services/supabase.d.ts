import { SupabaseClient } from '@supabase/supabase-js';
import { PropertyListing, Promotion, WhatsAppMessage } from '../types';
declare class SupabaseService {
    private anonClient;
    private serviceClient;
    constructor();
    private getAnonClient;
    private getServiceClient;
    getClient(): SupabaseClient;
    getPropertyById(propertyId: string): Promise<PropertyListing | null>;
    saveMessage(message: WhatsAppMessage): Promise<void>;
    getRecentMessages(limit?: number): Promise<WhatsAppMessage[]>;
    savePropertyListing(property: PropertyListing): Promise<void>;
    getUnprocessedProperties(): Promise<PropertyListing[]>;
    updatePropertyAsProcessed(propertyId: string): Promise<void>;
    markPropertyAsInstagramPublished(propertyId: string, publishedAt: string): Promise<void>;
    searchSimilarProperties(query: string, limit?: number): Promise<PropertyListing[]>;
    savePromotion(promotion: Promotion): Promise<void>;
    getUnprocessedPromotions(): Promise<Promotion[]>;
    updatePromotionAsProcessed(promotionId: string): Promise<void>;
    searchSimilarPromotions(query: string, limit?: number): Promise<Promotion[]>;
    saveCarousel(carousel: any): Promise<void>;
    getCarousel(carouselId: string): Promise<any>;
    getDraftCarousels(): Promise<any[]>;
    getPublishedCarousels(): Promise<any[]>;
    updateCarouselStatus(carouselId: string, updates: any): Promise<void>;
    deleteCarousel(carouselId: string): Promise<void>;
    saveSocialMediaPost(post: any): Promise<void>;
    saveScheduledPost(post: any): Promise<void>;
    getPendingScheduledPosts(): Promise<any[]>;
    updateScheduledPostStatus(postId: string, status: string, updates?: any): Promise<void>;
    createContentQueue(queue: any): Promise<void>;
    saveQueuePost(queueId: string, postId: string): Promise<void>;
}
export default SupabaseService;
//# sourceMappingURL=supabase.d.ts.map