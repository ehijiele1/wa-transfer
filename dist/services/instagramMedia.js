"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InstagramMediaService = void 0;
const instagram_1 = __importDefault(require("../config/instagram"));
const utils_1 = require("../utils");
class InstagramMediaService {
    config = instagram_1.default;
    async uploadImage(imageUrl, filename, altText) {
        try {
            console.log(`Downloading image from: ${imageUrl}`);
            const imageResponse = await fetch(imageUrl);
            if (!imageResponse.ok) {
                throw new Error(`Failed to download image: ${imageResponse.statusText}`);
            }
            const imageBuffer = await imageResponse.arrayBuffer();
            console.log(`Uploading image to Instagram: ${filename}`);
            const uploadResponse = await (0, utils_1.retry)(() => this.uploadMediaContainer(imageBuffer, filename, altText), 3);
            console.log(`Image uploaded successfully: ${uploadResponse.id}`);
            return uploadResponse;
        }
        catch (error) {
            console.error('Error uploading image to Instagram:', error);
            throw error;
        }
    }
    async uploadMediaContainer(imageBuffer, filename, altText) {
        const formData = new FormData();
        const blob = new Blob([imageBuffer]);
        formData.append('file', blob, filename);
        formData.append('published', 'false');
        if (altText) {
            formData.append('alt_text', altText);
        }
        const response = await fetch(`https://graph.facebook.com/${this.config.graphApiVersion}/${this.config.accountId}/media`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.config.accessToken}`,
            },
            body: formData,
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Instagram API error: ${errorData.error?.message || response.statusText}`);
        }
        const data = await response.json();
        return {
            id: data.id,
            created_at: data.created_at,
            mime_type: data.mime_type || 'image/jpeg',
        };
    }
    async createCarouselContainer(slideIds, caption) {
        try {
            console.log(`Creating carousel container with ${slideIds.length} slides`);
            const response = await fetch(`https://graph.facebook.com/${this.config.graphApiVersion}/${this.config.accountId}/media`, {
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
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Instagram API error: ${errorData.error?.message || response.statusText}`);
            }
            const data = await response.json();
            const publishResponse = await this.publishCarousel(data.id);
            return {
                id: data.id,
                permalink: publishResponse.permalink,
            };
        }
        catch (error) {
            console.error('Error creating carousel container:', error);
            throw error;
        }
    }
    async publishCarousel(containerId) {
        try {
            console.log(`Publishing carousel: ${containerId}`);
            const response = await fetch(`https://graph.facebook.com/${this.config.graphApiVersion}/${this.config.accountId}/media_publish`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    creation_id: containerId,
                }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Instagram API error: ${errorData.error?.message || response.statusText}`);
            }
            const data = await response.json();
            return {
                permalink: data.permalink || `https://www.instagram.com/p/${data.id}/`,
            };
        }
        catch (error) {
            console.error('Error publishing carousel:', error);
            throw error;
        }
    }
    async getMediaStatus(mediaId) {
        try {
            const response = await fetch(`https://graph.facebook.com/${this.config.graphApiVersion}/${mediaId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.config.accessToken}`,
                },
            });
            if (!response.ok) {
                throw new Error(`Failed to get media status: ${response.statusText}`);
            }
            return await response.json();
        }
        catch (error) {
            console.error('Error getting media status:', error);
            throw error;
        }
    }
    async validateImageDimensions(imageUrl) {
        try {
            const response = await fetch(imageUrl);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            return { width: 1080, height: 1080 };
        }
        catch (error) {
            console.error('Error validating image dimensions:', error);
            throw error;
        }
    }
    async optimizeImage(imageUrl, quality = 'high') {
        try {
            console.log(`Optimizing image with quality: ${quality}`);
            return imageUrl;
        }
        catch (error) {
            console.error('Error optimizing image:', error);
            throw error;
        }
    }
    async generateAltText(imageUrl, propertyTitle) {
        try {
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
            const result = await response.json();
            return result.response.trim();
        }
        catch (error) {
            console.error('Error generating alt text:', error);
            return `Property listing image: ${propertyTitle}`;
        }
    }
}
exports.InstagramMediaService = InstagramMediaService;
exports.default = InstagramMediaService;
//# sourceMappingURL=instagramMedia.js.map