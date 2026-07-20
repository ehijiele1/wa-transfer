"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstagramCarouselGenerator = void 0;
const instagram_1 = __importDefault(require("../config/instagram"));
const utils_1 = require("../utils");
const instagramMedia_1 = __importDefault(require("./instagramMedia"));
class InstagramCarouselGenerator {
    mediaService;
    config = instagram_1.default;
    constructor() {
        this.mediaService = new instagramMedia_1.default();
    }
    async generateCarousel(property) {
        try {
            console.log(`Generating carousel for property: ${property.title}`);
            const slides = await this.generateSlides(property);
            const { caption, hashtags } = await this.generateCaptionAndHashtags(property);
            const carousel = {
                id: `carousel_${Date.now()}_${(0, utils_1.generateId)()}`,
                property_id: property.id,
                caption,
                hashtags,
                slides,
                status: 'draft',
                scheduled_at: new Date(),
            };
            console.log(`Carousel generated with ${slides.length} slides`);
            return carousel;
        }
        catch (error) {
            console.error('Error generating carousel:', error);
            throw error;
        }
    }
    async generateSlides(property) {
        const slides = [];
        if (property.images.length > 0) {
            slides.push({
                id: `slide_${Date.now()}_1`,
                type: 'image',
                content: 'Hero image',
                order: 1,
                image_url: property.images[0],
            });
        }
        slides.push({
            id: `slide_${Date.now()}_2`,
            type: 'text',
            content: this.generatePropertyDetailsSlide(property),
            order: 2,
        });
        const additionalImages = property.images.slice(1, this.config.maxCarouselImages - 2);
        additionalImages.forEach((imageUrl, index) => {
            slides.push({
                id: `slide_${Date.now()}_${index + 3}`,
                type: 'image',
                content: `Property image ${index + 2}`,
                order: index + 3,
                image_url: imageUrl,
            });
        });
        slides.push({
            id: `slide_${Date.now()}_${slides.length + 1}`,
            type: 'text',
            content: this.generateContactSlide(),
            order: slides.length + 1,
        });
        return slides;
    }
    generatePropertyDetailsSlide(property) {
        let details = `${property.title}\n\n`;
        if (property.price) {
            details += `💰 Price: ${property.price}\n`;
        }
        if (property.location) {
            details += `📍 Location: ${property.location}\n`;
        }
        if (property.bedrooms) {
            details += `🛏️ Bedrooms: ${property.bedrooms}\n`;
        }
        if (property.bathrooms) {
            details += `🚿 Bathrooms: ${property.bathrooms}\n`;
        }
        if (property.area) {
            details += `📐 Area: ${property.area}\n`;
        }
        if (property.type) {
            details += `🏠 Type: ${property.type.charAt(0).toUpperCase() + property.type.slice(1)}\n`;
        }
        if (property.features.length > 0) {
            details += `\n✨ Features:\n`;
            property.features.forEach(feature => {
                details += `• ${feature}\n`;
            });
        }
        return details.trim();
    }
    generateContactSlide() {
        return `📞 Interested? Contact us for more details!\n\n📱 Call or WhatsApp us\n📧 Email for inquiries\n\n🏢 Your Trusted Real Estate Agency`;
    }
    async generateCaptionAndHashtags(property) {
        try {
            const response = await fetch(`${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/api/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: process.env.OLLAMA_MODEL || 'llama2',
                    prompt: `Generate an engaging Instagram caption for a property listing. Property details:
- Title: ${property.title}
- Location: ${property.location}
- Price: ${property.price || 'Price on request'}
- Type: ${property.type}
- Features: ${property.features.join(', ')}

Requirements:
- Make it engaging and persuasive
- Include relevant hashtags
- Keep it under ${this.config.captionMaxLength} characters
- Use emojis to make it visually appealing
- Focus on lifestyle benefits
- End with a call to action

Return only the caption with hashtags, no explanations.`,
                    stream: false,
                }),
            });
            if (!response.ok) {
                throw new Error(`Ollama request failed: ${response.statusText}`);
            }
            const result = await response.json();
            let caption = result.response.trim();
            const hashtags = this.extractRelevantHashtags(property, caption);
            caption = (0, utils_1.truncateText)(caption, this.config.captionMaxLength);
            return { caption, hashtags: hashtags || [] };
        }
        catch (error) {
            console.error('Error generating caption:', error);
            const fallbackCaption = `${property.title} in ${property.location}. ${property.price ? `Price: ${property.price}` : 'Price on request'}. Contact us for more details!`;
            const hashtags = this.extractRelevantHashtags(property, fallbackCaption) || [];
            return {
                caption: (0, utils_1.truncateText)(fallbackCaption, this.config.captionMaxLength),
                hashtags,
            };
        }
    }
    extractRelevantHashtags(property, caption) {
        const typeHashtags = {
            house: ['#realestate', '#homesforsale', '#dreamhome', '#houseforsale'],
            apartment: ['#apartmentlife', '#rental', '#condoliving', '#urbanliving'],
            commercial: ['#commercialproperty', '#businessspace', '#investment', '#office'],
            land: ['#landforsale', '#realestateinvesting', '#propertydevelopment', '#landinvestment'],
        };
        const locationHashtags = this.generateLocationHashtags(property.location);
        const featureHashtags = property.features.map(feature => {
            switch (feature.toLowerCase()) {
                case 'parking': return '#parking';
                case 'pool': return '#swimmingpool';
                case 'garden': return '#garden';
                case 'balcony': return '#balcony';
                case 'furnished': return '#furnished';
                case 'pet friendly': return '#petfriendly';
                case 'security': return '#security';
                case 'gym': return '#gym';
                case 'air conditioning': return '#airconditioning';
                default: return `#${feature.replace(/\s+/g, '')}`;
            }
        });
        const allHashtags = [
            ...typeHashtags[property.type] || [],
            ...locationHashtags,
            ...featureHashtags,
            ...(0, utils_1.extractHashtags)(caption),
        ];
        const uniqueHashtags = [...new Set(allHashtags)]
            .filter(tag => tag && tag.length > 1 && tag.length < 30)
            .slice(0, this.config.hashtagLimit);
        return uniqueHashtags;
    }
    generateLocationHashtags(location) {
        const hashtags = [];
        const parts = location.split(',').map(part => part.trim());
        if (parts.length > 0 && parts[0]) {
            hashtags.push(`#${parts[0].replace(/\s+/g, '')}`);
        }
        if (parts.length > 1 && parts[1]) {
            hashtags.push(`#${parts[1].replace(/\s+/g, '')}`);
        }
        hashtags.push('#location', '#area', '#neighborhood');
        return hashtags;
    }
    async publishCarousel(carousel) {
        try {
            console.log(`Publishing carousel: ${carousel.id}`);
            const mediaIds = [];
            for (const slide of carousel.slides) {
                if (slide.type === 'image' && slide.image_url) {
                    console.log(`Uploading image for slide: ${slide.id}`);
                    const altText = await this.mediaService.generateAltText(slide.image_url, carousel.caption.split('\n')[0] || 'Property listing');
                    const uploadResponse = await this.mediaService.uploadImage(slide.image_url, `property_${slide.id}.jpg`, altText);
                    mediaIds.push(uploadResponse.id);
                    await this.waitForMediaProcessing(uploadResponse.id);
                }
            }
            const containerResponse = await this.mediaService.createCarouselContainer(mediaIds, carousel.caption);
            return {
                id: containerResponse.id,
                permalink: containerResponse.permalink,
                caption: carousel.caption,
                media_type: 'CAROUSEL',
                status: 'PUBLISHED',
                published_at: new Date().toISOString(),
            };
        }
        catch (error) {
            console.error('Error publishing carousel:', error);
            throw error;
        }
    }
    async waitForMediaProcessing(mediaId, maxAttempts = 10) {
        let attempts = 0;
        while (attempts < maxAttempts) {
            try {
                const status = await this.mediaService.getMediaStatus(mediaId);
                if (status.status === 'ready') {
                    console.log(`Media ${mediaId} is ready`);
                    return;
                }
                console.log(`Waiting for media ${mediaId} to be processed... (attempt ${attempts + 1}/${maxAttempts})`);
                await new Promise(resolve => setTimeout(resolve, 5000));
                attempts++;
            }
            catch (error) {
                console.error(`Error checking media status for ${mediaId}:`, error);
                attempts++;
            }
        }
        throw new Error(`Media ${mediaId} processing timed out after ${maxAttempts} attempts`);
    }
    async scheduleCarousel(carousel, scheduledDate) {
        try {
            console.log(`Scheduling carousel for: ${scheduledDate.toISOString()}`);
            carousel.status = 'scheduled';
            carousel.scheduled_at = scheduledDate;
            return {
                id: `scheduled_${Date.now()}`,
                permalink: '',
                caption: carousel.caption,
                media_type: 'CAROUSEL',
                status: 'SCHEDULED',
                scheduled_at: scheduledDate.toISOString(),
            };
        }
        catch (error) {
            console.error('Error scheduling carousel:', error);
            throw error;
        }
    }
}
exports.InstagramCarouselGenerator = InstagramCarouselGenerator;
exports.default = InstagramCarouselGenerator;
//# sourceMappingURL=instagramCarouselGenerator.js.map