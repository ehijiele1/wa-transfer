import { InstagramCarousel, InstagramPostResponse } from '../types/instagram';
import { PropertyListing } from '../types';
declare class InstagramService {
    private client;
    private mediaService;
    private carouselGenerator;
    constructor();
    private getServiceClient;
    saveCarousel(carousel: InstagramCarousel): Promise<void>;
    getCarousel(carouselId: string): Promise<InstagramCarousel | null>;
    getDraftCarousels(): Promise<InstagramCarousel[]>;
    getPublishedCarousels(): Promise<InstagramCarousel[]>;
    getUnpublishedProperties(): Promise<PropertyListing[]>;
    generateCarouselForProperty(propertyId: string): Promise<InstagramCarousel>;
    publishCarousel(carouselId: string): Promise<InstagramPostResponse>;
    scheduleCarousel(carouselId: string, scheduledDate: Date): Promise<InstagramPostResponse>;
    batchPublishCarousels(): Promise<InstagramPostResponse[]>;
    getAnalytics(): Promise<any>;
    deleteCarousel(carouselId: string): Promise<void>;
}
export default InstagramService;
//# sourceMappingURL=instagram.d.ts.map