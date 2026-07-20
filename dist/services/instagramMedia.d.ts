import { InstagramMediaUploadResponse } from '../types/instagram';
export declare class InstagramMediaService {
    private config;
    uploadImage(imageUrl: string, filename: string, altText?: string): Promise<InstagramMediaUploadResponse>;
    private uploadMediaContainer;
    createCarouselContainer(slideIds: string[], caption: string): Promise<{
        id: string;
        permalink: string;
    }>;
    private publishCarousel;
    getMediaStatus(mediaId: string): Promise<any>;
    validateImageDimensions(imageUrl: string): Promise<{
        width: number;
        height: number;
    }>;
    optimizeImage(imageUrl: string, quality?: 'high' | 'medium' | 'low'): Promise<string>;
    generateAltText(imageUrl: string, propertyTitle: string): Promise<string>;
}
export default InstagramMediaService;
//# sourceMappingURL=instagramMedia.d.ts.map