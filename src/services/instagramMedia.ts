import instagramConfig from '../config/instagram';
import { InstagramMedia, InstagramMediaUploadResponse } from '../types/instagram';
import { retry } from '../utils';

export class InstagramMediaService {
  private config = instagramConfig;

  async uploadImage(imageUrl: string, filename: string, altText?: string): Promise<InstagramMediaUploadResponse> {
    try {
      console.log(`Downloading image from: ${imageUrl}`);
      
      // Download the image
      const imageResponse = await fetch(imageUrl);
      if (!imageResponse.ok) {
        throw new Error(`Failed to download image: ${imageResponse.statusText}`);
      }

      const imageBuffer = await imageResponse.arrayBuffer();
      
      console.log(`Uploading image to Instagram: ${filename}`);
      
      // Upload to Instagram media container
      const uploadResponse = await retry(() => this.uploadMediaContainer(imageBuffer, filename, altText), 3);
      
      console.log(`Image uploaded successfully: ${uploadResponse.id}`);
      return uploadResponse;
    } catch (error) {
      console.error('Error uploading image to Instagram:', error);
      throw error;
    }
  }

  private async uploadMediaContainer(imageBuffer: ArrayBuffer, filename: string, altText?: string): Promise<InstagramMediaUploadResponse> {
    const formData = new FormData();
    const blob = new Blob([imageBuffer]);
    
    formData.append('file', blob, filename);
    formData.append('published', 'false');
    
    if (altText) {
      formData.append('alt_text', altText);
    }

    const response = await fetch(
      `https://graph.facebook.com/${this.config.graphApiVersion}/${this.config.accountId}/media`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
        },
        body: formData,
      }
    );

      if (!response.ok) {
        const errorData: any = await response.json();
        throw new Error(`Instagram API error: ${errorData.error?.message || response.statusText}`);
      }

      const data: any = await response.json();
      return {
        id: data.id,
        created_at: data.created_at,
        mime_type: data.mime_type || 'image/jpeg',
      };
  }

  async createCarouselContainer(slideIds: string[], caption: string): Promise<{ id: string, permalink: string }> {
    try {
      console.log(`Creating carousel container with ${slideIds.length} slides`);
      
      const response = await fetch(
        `https://graph.facebook.com/${this.config.graphApiVersion}/${this.config.accountId}/media`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            media_type: 'CAROUSEL',
            children: slideIds.join(','),
            caption: caption.substring(0, this.config.captionMaxLength),
            published: 'false',
          }),
        }
      );

      if (!response.ok) {
        const errorData: any = await response.json();
        throw new Error(`Instagram API error: ${errorData.error?.message || response.statusText}`);
      }

      const data: any = await response.json();
      
      // Publish the carousel
      const publishResponse = await this.publishCarousel(data.id);
      
      return {
        id: data.id,
        permalink: publishResponse.permalink,
      };
    } catch (error) {
      console.error('Error creating carousel container:', error);
      throw error;
    }
  }

  private async publishCarousel(containerId: string): Promise<{ permalink: string }> {
    try {
      console.log(`Publishing carousel: ${containerId}`);
      
      const response = await fetch(
        `https://graph.facebook.com/${this.config.graphApiVersion}/${this.config.accountId}/media_publish`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            creation_id: containerId,
          }),
        }
      );

      if (!response.ok) {
        const errorData: any = await response.json();
        throw new Error(`Instagram API error: ${errorData.error?.message || response.statusText}`);
      }

      const data: any = await response.json();
      
      return {
        permalink: data.permalink || `https://www.instagram.com/p/${data.id}/`,
      };
    } catch (error) {
      console.error('Error publishing carousel:', error);
      throw error;
    }
  }

  async getMediaStatus(mediaId: string): Promise<any> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/${this.config.graphApiVersion}/${mediaId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get media status: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting media status:', error);
      throw error;
    }
  }

  async validateImageDimensions(imageUrl: string): Promise<{ width: number; height: number }> {
    try {
      // For Node.js environment, we'll use a different approach
      // In a browser environment, you would use the Image element
      const response = await fetch(imageUrl);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      
      // For now, return default dimensions
      // In a real implementation, you would use a library like sharp to get dimensions
      return { width: 1080, height: 1080 };
    } catch (error) {
      console.error('Error validating image dimensions:', error);
      throw error;
    }
  }

  async optimizeImage(imageUrl: string, quality: 'high' | 'medium' | 'low' = 'high'): Promise<string> {
    try {
      console.log(`Optimizing image with quality: ${quality}`);
      
      // For now, we'll just return the original URL
      // In a real implementation, you would use a service like Cloudinary or Sharp to optimize images
      return imageUrl;
    } catch (error) {
      console.error('Error optimizing image:', error);
      throw error;
    }
  }

  async generateAltText(imageUrl: string, propertyTitle: string): Promise<string> {
    try {
      // Use Ollama to generate descriptive alt text
      const response = await fetch(`${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.OLLAMA_MODEL || 'llama2',
          prompt: `Generate a descriptive alt text for an image of a property listing. The property is: ${propertyTitle}. Return only the alt text, no explanations.`,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama request failed: ${response.statusText}`);
      }

      const result: any = await response.json();
      return result.response.trim();
    } catch (error) {
      console.error('Error generating alt text:', error);
      // Fallback to simple description
      return `Property listing image: ${propertyTitle}`;
    }
  }
}

export default InstagramMediaService;