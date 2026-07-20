import { InstagramCarousel, InstagramPostResponse } from '../types/instagram';
import { PropertyListing } from '../types';
export declare class InstagramCarouselGenerator {
    private mediaService;
    private config;
    constructor();
    generateCarousel(property: PropertyListing): Promise<InstagramCarousel>;
    private generateSlides;
    private generatePropertyDetailsSlide;
    private generateContactSlide;
    private generateCaptionAndHashtags;
    private extractRelevantHashtags;
    private generateLocationHashtags;
    publishCarousel(carousel: InstagramCarousel): Promise<InstagramPostResponse>;
    private waitForMediaProcessing;
    scheduleCarousel(carousel: InstagramCarousel, scheduledDate: Date): Promise<InstagramPostResponse>;
}
export default InstagramCarouselGenerator;
//# sourceMappingURL=instagramCarouselGenerator.d.ts.map