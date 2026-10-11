import { SupabaseClient } from '@supabase/supabase-js';
import { PropertyListing } from '../types';
export interface WebsiteContentDraft {
    slug: string;
    name: string;
    kind: 'product' | 'post' | 'media-kit';
    url: string | null;
    pillar: string;
    status: 'pending';
    platforms: string[];
    image_url: string | null;
    captions: {
        description: string;
        price?: string;
        location: string;
        type: PropertyListing['type'];
        bedrooms?: number;
        bathrooms?: number;
        area?: string;
        features: string[];
        images: string[];
        provenance: {
            listing_id: string;
            source: string;
            source_group: string;
        };
    };
    created_at: string;
}
export declare const HANDOFF_STATUS: "pending";
export declare const HANDOFF_PILLAR: "whatsapp-ingest";
export declare function mapPropertyToContentItem(property: PropertyListing): WebsiteContentDraft;
export declare class WebsiteHandoffService {
    private client;
    constructor(client: SupabaseClient);
    handoff(property: PropertyListing): Promise<boolean>;
}
//# sourceMappingURL=websiteHandoff.d.ts.map