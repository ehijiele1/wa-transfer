export interface Config {
    supabase: {
        url: string;
        key: string;
        serviceRoleKey: string;
    };
    whatsapp: {
        sessionId: string;
        retryDelayMs: number;
        maxRetries: number;
    };
    ollama: {
        baseUrl: string;
        model: string;
    };
    instagram: {
        accessToken: string;
        accountId: string;
        graphApiVersion: string;
        maxCarouselImages: number;
        imageQuality: 'high' | 'medium' | 'low';
        captionMaxLength: number;
        hashtagLimit: number;
    };
    socialMedia: {
        facebook: {
            accessToken: string;
            pageId: string;
            graphApiVersion: string;
            postTypes: string[];
            maxTextLength: number;
            maxImagesPerPost: number;
            maxVideosPerPost: number;
        };
        twitter: {
            bearerToken: string;
            apiKey: string;
            apiSecret: string;
            accessToken: string;
            accessSecret: string;
            maxTextLength: number;
            maxImagesPerTweet: number;
            maxVideosPerTweet: number;
        };
        linkedin: {
            accessToken: string;
            clientId: string;
            clientSecret: string;
            maxTextLength: number;
            maxImagesPerPost: number;
        };
    };
    monitoring: {
        groups: string[];
        maxMessagesPerGroup: number;
        messageProcessingIntervalMs: number;
    };
}
export interface WhatsAppMessage {
    id: string;
    from: string;
    to: string;
    timestamp: number;
    message: {
        conversation?: string;
        imageMessage?: {
            caption?: string;
            url: string;
        };
        videoMessage?: {
            caption?: string;
            url: string;
        };
        documentMessage?: {
            caption?: string;
            url: string;
        };
    };
    type: 'text' | 'image' | 'video' | 'document';
    metadata?: {
        groupMetadata?: {
            subject?: string;
            description?: string;
            participants?: string[];
        };
    };
}
export interface PropertyListing {
    id: string;
    title: string;
    description: string;
    price?: string;
    location: string;
    bedrooms?: number;
    bathrooms?: number;
    area?: string;
    type: 'house' | 'apartment' | 'commercial' | 'land';
    features: string[];
    images: string[];
    source: string;
    sourceGroup: string;
    timestamp: number;
    processed: boolean;
    embeddings?: number[];
}
export interface Promotion {
    id: string;
    title: string;
    description: string;
    discount?: string;
    validUntil?: Date;
    terms: string;
    source: string;
    sourceGroup: string;
    timestamp: number;
    processed: boolean;
    embeddings?: number[];
}
export interface InstagramCarousel {
    id: string;
    propertyId: string;
    slides: InstagramSlide[];
    caption: string;
    hashtags: string[];
    status: 'draft' | 'published' | 'scheduled';
    scheduledAt?: Date;
    publishedAt?: Date;
}
export interface InstagramSlide {
    id: string;
    type: 'image' | 'text';
    content: string;
    order: number;
    media_id?: string;
    image_url?: string;
    text_content?: string;
}
//# sourceMappingURL=index.d.ts.map