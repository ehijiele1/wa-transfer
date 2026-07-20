"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PlatformAdapterFactory = exports.LinkedInAdapter = exports.TwitterAdapter = exports.FacebookAdapter = exports.BasePlatformAdapter = void 0;
const socialMedia_1 = __importDefault(require("../config/socialMedia"));
const utils_1 = require("../utils");
class BasePlatformAdapter {
    config;
    constructor(config) {
        this.config = config;
    }
    validateContent(content) {
        const errors = [];
        if (content.content.length > this.config.maxTextLength) {
            errors.push(`Content exceeds maximum length of ${this.config.maxTextLength} characters`);
        }
        if (content.mediaUrls.length > this.config.maxImagesPerPost) {
            errors.push(`Exceeds maximum images per post: ${this.config.maxImagesPerPost}`);
        }
        content.hashtags.forEach(tag => {
            if (!tag.startsWith('#') || tag.length > 50) {
                errors.push(`Invalid hashtag format: ${tag}`);
            }
        });
        return {
            valid: errors.length === 0,
            errors,
        };
    }
    async uploadMedia(mediaUrl, filename) {
        throw new Error('Media upload not implemented for this platform');
    }
    formatContent(content) {
        let formatted = content.content;
        if (content.hashtags.length > 0) {
            formatted += '\n\n' + content.hashtags.join(' ');
        }
        if (content.mentions.length > 0) {
            formatted += '\n\n' + content.mentions.map(mention => `@${mention}`).join(' ');
        }
        return formatted;
    }
    async handleError(error, operation) {
        console.error(`Error in ${operation} for ${this.platform}:`, error);
        if (error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
            throw new Error(`Network error in ${operation}. Please check your connection.`);
        }
        if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED') {
            throw new Error(`Connection error in ${operation}. Platform service may be unavailable.`);
        }
        throw error;
    }
}
exports.BasePlatformAdapter = BasePlatformAdapter;
class FacebookAdapter extends BasePlatformAdapter {
    platform = 'facebook';
    constructor() {
        super(socialMedia_1.default.facebook);
    }
    async publish(content) {
        try {
            const validation = this.validateContent(content);
            if (!validation.valid) {
                throw new Error(`Content validation failed: ${validation.errors.join(', ')}`);
            }
            const formattedContent = this.formatContent(content);
            let mediaAttachments = [];
            for (const mediaUrl of content.mediaUrls) {
                try {
                    const mediaId = await this.uploadMedia(mediaUrl, `facebook_${Date.now()}.jpg`);
                    mediaAttachments.push(mediaId);
                }
                catch (error) {
                    console.warn(`Failed to upload media ${mediaUrl}:`, error);
                }
            }
            const postData = {
                message: formattedContent,
                published: true,
            };
            if (mediaAttachments.length > 0) {
                postData.attached_media = mediaAttachments.map(id => ({ media_fbid: id }));
            }
            const response = await fetch(`https://graph.facebook.com/${this.config.graphApiVersion}/${this.config.pageId}/feed`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(postData),
            });
            if (!response.ok) {
                const errorData = await response.json();
                const errorMessage = errorData?.error?.message || response.statusText;
                throw new Error(`Facebook API error: ${errorMessage}`);
            }
            const result = await response.json();
            return {
                postId: result.id,
                url: `https://facebook.com/${this.config.pageId}/posts/${result.id}`,
                publishedAt: new Date().toISOString(),
            };
        }
        catch (error) {
            return this.handleError(error, 'publish');
        }
    }
    async schedule(content, scheduledAt) {
        try {
            const validation = this.validateContent(content);
            if (!validation.valid) {
                throw new Error(`Content validation failed: ${validation.errors.join(', ')}`);
            }
            const formattedContent = this.formatContent(content);
            const postData = {
                message: formattedContent,
                published: false,
                scheduled_publish_time: Math.floor(scheduledAt.getTime() / 1000),
            };
            const response = await fetch(`https://graph.facebook.com/${this.config.graphApiVersion}/${this.config.pageId}/feed`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(postData),
            });
            if (!response.ok) {
                const errorData = await response.json();
                const errorMessage = errorData?.error?.message || response.statusText;
                throw new Error(`Facebook API error: ${errorMessage}`);
            }
            const result = await response.json();
            return {
                postId: result.id,
                scheduledAt: scheduledAt.toISOString(),
                status: 'scheduled',
            };
        }
        catch (error) {
            return this.handleError(error, 'schedule');
        }
    }
    async getPostMetrics(postId) {
        try {
            const response = await fetch(`https://graph.facebook.com/${this.config.graphApiVersion}/${postId}/insights`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.config.accessToken}`,
                },
            });
            if (!response.ok) {
                throw new Error(`Failed to get post metrics: ${response.statusText}`);
            }
            const data = await response.json();
            return {
                postId,
                metrics: data?.data || [],
                fetchedAt: new Date().toISOString(),
            };
        }
        catch (error) {
            return this.handleError(error, 'getPostMetrics');
        }
    }
    async getAnalytics(dateRange) {
        try {
            const response = await fetch(`https://graph.facebook.com/${this.config.graphApiVersion}/${this.config.pageId}/insights`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.config.accessToken}`,
                },
            });
            if (!response.ok) {
                throw new Error(`Failed to get analytics: ${response.statusText}`);
            }
            const data = await response.json();
            return {
                platform: 'facebook',
                dateRange,
                metrics: data?.data || [],
                fetchedAt: new Date().toISOString(),
            };
        }
        catch (error) {
            return this.handleError(error, 'getAnalytics');
        }
    }
    async uploadMedia(mediaUrl, filename) {
        try {
            const response = await fetch(mediaUrl);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            const formData = new FormData();
            formData.append('source', buffer, filename);
            formData.append('published', 'false');
            const uploadResponse = await fetch(`https://graph.facebook.com/${this.config.graphApiVersion}/${this.config.pageId}/photos`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.accessToken}`,
                },
                body: formData,
            });
            if (!uploadResponse.ok) {
                throw new Error(`Failed to upload media: ${uploadResponse.statusText}`);
            }
            const result = await uploadResponse.json();
            return result.id;
        }
        catch (error) {
            throw new Error(`Media upload failed: ${error.message}`);
        }
    }
}
exports.FacebookAdapter = FacebookAdapter;
class TwitterAdapter extends BasePlatformAdapter {
    platform = 'twitter';
    constructor() {
        super(socialMedia_1.default.twitter);
    }
    async publish(content) {
        try {
            const validation = this.validateContent(content);
            if (!validation.valid) {
                throw new Error(`Content validation failed: ${validation.errors.join(', ')}`);
            }
            const formattedContent = this.formatContent(content);
            const response = await fetch('https://api.twitter.com/2/tweets', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.bearerToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: formattedContent,
                }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                const errorMessage = errorData?.error?.message || response.statusText;
                throw new Error(`Facebook API error: ${errorMessage}`);
            }
            const result = await response.json();
            return {
                tweetId: result?.data?.id,
                url: `https://twitter.com/user/status/${result?.data?.id}`,
                publishedAt: new Date().toISOString(),
            };
        }
        catch (error) {
            return this.handleError(error, 'publish');
        }
    }
    async schedule(content, scheduledAt) {
        try {
            const scheduledPost = {
                content,
                scheduledAt,
                status: 'scheduled',
                createdAt: new Date(),
            };
            return {
                scheduleId: (0, utils_1.generateId)(),
                scheduledAt: scheduledAt.toISOString(),
                status: 'pending',
                message: 'Post scheduled for manual publishing',
            };
        }
        catch (error) {
            return this.handleError(error, 'schedule');
        }
    }
    async getPostMetrics(tweetId) {
        try {
            const response = await fetch(`https://api.twitter.com/2/tweets/${tweetId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.config.bearerToken}`,
                },
            });
            if (!response.ok) {
                throw new Error(`Failed to get tweet metrics: ${response.statusText}`);
            }
            const data = await response.json();
            return {
                tweetId,
                metrics: data.data || {},
                fetchedAt: new Date().toISOString(),
            };
        }
        catch (error) {
            return this.handleError(error, 'getPostMetrics');
        }
    }
    async getAnalytics(dateRange) {
        try {
            return {
                platform: 'twitter',
                dateRange,
                metrics: {
                    totalTweets: 0,
                    totalEngagement: 0,
                    averageEngagementRate: 0,
                },
                fetchedAt: new Date().toISOString(),
            };
        }
        catch (error) {
            return this.handleError(error, 'getAnalytics');
        }
    }
}
exports.TwitterAdapter = TwitterAdapter;
class LinkedInAdapter extends BasePlatformAdapter {
    platform = 'linkedin';
    constructor() {
        super(socialMedia_1.default.linkedin);
    }
    async publish(content) {
        try {
            const validation = this.validateContent(content);
            if (!validation.valid) {
                throw new Error(`Content validation failed: ${validation.errors.join(', ')}`);
            }
            const formattedContent = this.formatContent(content);
            const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.config.accessToken}`,
                    'Content-Type': 'application/json',
                    'X-Restli-Protocol-Version': '2.0.0',
                },
                body: JSON.stringify({
                    author: `urn:li:person:${this.config.pageId}`,
                    lifecycleState: 'PUBLISHED',
                    specificContent: {
                        'com.linkedin.ugc.ShareContent': {
                            shareCommentary: {
                                text: formattedContent,
                            },
                            shareMediaCategory: 'NONE',
                        },
                    },
                    visibility: {
                        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
                    },
                }),
            });
            if (!response.ok) {
                const errorData = await response.json();
                const errorMessage = errorData?.message || response.statusText;
                throw new Error(`LinkedIn API error: ${errorMessage}`);
            }
            const result = await response.json();
            return {
                postId: result?.id,
                url: `https://linkedin.com/feed/update/${result?.id}`,
                publishedAt: new Date().toISOString(),
            };
        }
        catch (error) {
            return this.handleError(error, 'publish');
        }
    }
    async schedule(content, scheduledAt) {
        try {
            const scheduledPost = {
                content,
                scheduledAt,
                status: 'scheduled',
                createdAt: new Date(),
            };
            return {
                scheduleId: (0, utils_1.generateId)(),
                scheduledAt: scheduledAt.toISOString(),
                status: 'pending',
                message: 'Post scheduled for manual publishing',
            };
        }
        catch (error) {
            return this.handleError(error, 'schedule');
        }
    }
    async getPostMetrics(postId) {
        try {
            const response = await fetch(`https://api.linkedin.com/v2/activities/${postId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.config.accessToken}`,
                },
            });
            if (!response.ok) {
                throw new Error(`Failed to get post metrics: ${response.statusText}`);
            }
            const data = await response.json();
            return {
                postId,
                metrics: data || {},
                fetchedAt: new Date().toISOString(),
            };
        }
        catch (error) {
            return this.handleError(error, 'getPostMetrics');
        }
    }
    async getAnalytics(dateRange) {
        try {
            const response = await fetch(`https://api.linkedin.com/v2/organizationAnalytics?q=organizationalUpdateAnalytics&start=${Math.floor(dateRange.start.getTime() / 1000)}&end=${Math.floor(dateRange.end.getTime() / 1000)}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.config.accessToken}`,
                },
            });
            if (!response.ok) {
                throw new Error(`Failed to get analytics: ${response.statusText}`);
            }
            const data = await response.json();
            return {
                platform: 'linkedin',
                dateRange,
                metrics: data?.elements || [],
                fetchedAt: new Date().toISOString(),
            };
        }
        catch (error) {
            return this.handleError(error, 'getAnalytics');
        }
    }
}
exports.LinkedInAdapter = LinkedInAdapter;
class PlatformAdapterFactory {
    static createAdapter(platform) {
        switch (platform) {
            case 'facebook':
                return new FacebookAdapter();
            case 'twitter':
                return new TwitterAdapter();
            case 'linkedin':
                return new LinkedInAdapter();
            default:
                throw new Error(`Unsupported platform: ${platform}`);
        }
    }
}
exports.PlatformAdapterFactory = PlatformAdapterFactory;
exports.default = PlatformAdapterFactory;
//# sourceMappingURL=platformAdapters.js.map