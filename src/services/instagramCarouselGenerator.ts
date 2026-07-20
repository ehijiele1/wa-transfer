import instagramConfig from '../config/instagram';
import { InstagramCarousel, InstagramSlide, InstagramPostResponse } from '../types/instagram';
import { PropertyListing } from '../types';
import { generateId, extractHashtags, truncateText } from '../utils';
import InstagramMediaService from './instagramMedia';

export class InstagramCarouselGenerator {
  private mediaService: InstagramMediaService;
  private config = instagramConfig;

  constructor() {
    this.mediaService = new InstagramMediaService();
  }

  async generateCarousel(property: PropertyListing): Promise<InstagramCarousel> {
    try {
      console.log(`Generating carousel for property: ${property.title}`);
      
      // Generate slides
      const slides = await this.generateSlides(property);
      
      // Generate caption and hashtags
      const { caption, hashtags } = await this.generateCaptionAndHashtags(property);
      
      // Create carousel object
      const carousel: InstagramCarousel = {
        id: `carousel_${Date.now()}_${generateId()}`,
        property_id: property.id,
        caption,
        hashtags,
        slides,
        status: 'draft',
        scheduled_at: new Date(),
      };
      
      console.log(`Carousel generated with ${slides.length} slides`);
      return carousel;
    } catch (error) {
      console.error('Error generating carousel:', error);
      throw error;
    }
  }

  private async generateSlides(property: PropertyListing): Promise<InstagramSlide[]> {
    const slides: InstagramSlide[] = [];
    
    // Slide 1: Hero image with property title
    if (property.images.length > 0) {
      slides.push({
        id: `slide_${Date.now()}_1`,
        type: 'image',
        content: 'Hero image',
        order: 1,
        image_url: property.images[0],
      } as InstagramSlide);
    }
    
    // Slide 2: Property details
    slides.push({
      id: `slide_${Date.now()}_2`,
      type: 'text',
      content: this.generatePropertyDetailsSlide(property),
      order: 2,
    });
    
    // Slides 3-6: Additional property images
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
    
    // Final slide: Contact information and CTA
    slides.push({
      id: `slide_${Date.now()}_${slides.length + 1}`,
      type: 'text',
      content: this.generateContactSlide(),
      order: slides.length + 1,
    });
    
    return slides;
  }

  private generatePropertyDetailsSlide(property: PropertyListing): string {
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

  private generateContactSlide(): string {
    return `📞 Interested? Contact us for more details!\n\n📱 Call or WhatsApp us\n📧 Email for inquiries\n\n🏢 Your Trusted Real Estate Agency`;
  }

  private async generateCaptionAndHashtags(property: PropertyListing): Promise<{ caption: string; hashtags: string[] }> {
    try {
      // Use Ollama to generate engaging caption
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

      const result: any = await response.json();
      let caption = result.response.trim();
      
      // Extract hashtags from the caption
      const hashtags = this.extractRelevantHashtags(property, caption);
      
      // Ensure caption length is within limits
      caption = truncateText(caption, this.config.captionMaxLength);
      
      return { caption, hashtags: hashtags || [] };
    } catch (error) {
      console.error('Error generating caption:', error);
      // Fallback caption
      const fallbackCaption = `${property.title} in ${property.location}. ${property.price ? `Price: ${property.price}` : 'Price on request'}. Contact us for more details!`;
      const hashtags = this.extractRelevantHashtags(property, fallbackCaption) || [];
      
      return {
        caption: truncateText(fallbackCaption, this.config.captionMaxLength),
        hashtags,
      };
    }
  }

  private extractRelevantHashtags(property: PropertyListing, caption: string): string[] {
    // Property type hashtags
    const typeHashtags = {
      house: ['#realestate', '#homesforsale', '#dreamhome', '#houseforsale'],
      apartment: ['#apartmentlife', '#rental', '#condoliving', '#urbanliving'],
      commercial: ['#commercialproperty', '#businessspace', '#investment', '#office'],
      land: ['#landforsale', '#realestateinvesting', '#propertydevelopment', '#landinvestment'],
    };
    
    // Location hashtags (extract from property.location)
    const locationHashtags = this.generateLocationHashtags(property.location);
    
    // Feature hashtags
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
    
    // Combine all hashtags
    const allHashtags = [
      ...typeHashtags[property.type] || [],
      ...locationHashtags,
      ...featureHashtags,
      ...extractHashtags(caption),
    ];
    
    // Remove duplicates and limit to configured number
      const uniqueHashtags = [...new Set(allHashtags)]
        .filter(tag => tag && tag.length > 1 && tag.length < 30) // Valid hashtag length
        .slice(0, this.config.hashtagLimit);
    
    return uniqueHashtags;
  }

  private generateLocationHashtags(location: string): string[] {
    const hashtags = [];
    
    // Split location into parts
    const parts = location.split(',').map(part => part.trim());
    
    // Add city hashtag
    if (parts.length > 0 && parts[0]) {
      hashtags.push(`#${parts[0].replace(/\s+/g, '')}`);
    }
    
    // Add area/neighborhood hashtag
    if (parts.length > 1 && parts[1]) {
      hashtags.push(`#${parts[1].replace(/\s+/g, '')}`);
    }
    
    // Add general location hashtags
    hashtags.push('#location', '#area', '#neighborhood');
    
    return hashtags;
  }

  async publishCarousel(carousel: InstagramCarousel): Promise<InstagramPostResponse> {
    try {
      console.log(`Publishing carousel: ${carousel.id}`);
      
      // Upload all images and get media IDs
      const mediaIds: string[] = [];
      
      for (const slide of carousel.slides) {
        if (slide.type === 'image' && slide.image_url) {
          console.log(`Uploading image for slide: ${slide.id}`);
          
          const altText = await this.mediaService.generateAltText(
            slide.image_url, 
            carousel.caption.split('\n')[0] || 'Property listing'
          );
          
          const uploadResponse = await this.mediaService.uploadImage(
            slide.image_url!,
            `property_${slide.id}.jpg`,
            altText
          );
          
          mediaIds.push(uploadResponse.id);
          
          // Wait for media to be processed
          await this.waitForMediaProcessing(uploadResponse.id);
        }
      }
      
      // Create carousel container
      const containerResponse = await this.mediaService.createCarouselContainer(
        mediaIds,
        carousel.caption
      );
      
      return {
        id: containerResponse.id,
        permalink: containerResponse.permalink,
        caption: carousel.caption,
        media_type: 'CAROUSEL',
        status: 'PUBLISHED',
        published_at: new Date().toISOString(),
      };
    } catch (error) {
      console.error('Error publishing carousel:', error);
      throw error;
    }
  }

  private async waitForMediaProcessing(mediaId: string, maxAttempts: number = 10): Promise<void> {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const status = await this.mediaService.getMediaStatus(mediaId);
        
        if (status.status === 'ready') {
          console.log(`Media ${mediaId} is ready`);
          return;
        }
        
        console.log(`Waiting for media ${mediaId} to be processed... (attempt ${attempts + 1}/${maxAttempts})`);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        attempts++;
      } catch (error) {
        console.error(`Error checking media status for ${mediaId}:`, error);
        attempts++;
      }
    }
    
    throw new Error(`Media ${mediaId} processing timed out after ${maxAttempts} attempts`);
  }

  async scheduleCarousel(carousel: InstagramCarousel, scheduledDate: Date): Promise<InstagramPostResponse> {
    try {
      console.log(`Scheduling carousel for: ${scheduledDate.toISOString()}`);
      
      // For now, we'll just set the scheduled date and return a mock response
      // In a real implementation, you would use Instagram's scheduling API
      
      carousel.status = 'scheduled';
      carousel.scheduled_at = scheduledDate;
      
      return {
        id: `scheduled_${Date.now()}`,
        permalink: '', // Will be populated after publishing
        caption: carousel.caption,
        media_type: 'CAROUSEL',
        status: 'SCHEDULED',
        scheduled_at: scheduledDate.toISOString(),
      };
    } catch (error) {
      console.error('Error scheduling carousel:', error);
      throw error;
    }
  }
}

export default InstagramCarouselGenerator;