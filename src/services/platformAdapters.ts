import socialMediaConfig from '../config/socialMedia';
import { PostContent, ScheduledPost, PlatformAdapter } from '../types/socialMedia';
import { generateId, createExponentialBackoff } from '../utils';

export abstract class BasePlatformAdapter implements PlatformAdapter {
  public config: any;

  constructor(config: any) {
    this.config = config;
  }

  abstract platform: 'facebook' | 'twitter' | 'linkedin';
  abstract publish(content: PostContent): Promise<any>;
  abstract schedule(content: PostContent, scheduledAt: Date): Promise<any>;
  abstract getPostMetrics(postId: string): Promise<any>;
  abstract getAnalytics(dateRange: { start: Date; end: Date }): Promise<any>;

  validateContent(content: PostContent): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check content length
    if (content.content.length > this.config.maxTextLength) {
      errors.push(`Content exceeds maximum length of ${this.config.maxTextLength} characters`);
    }

    // Check media limits
    if (content.mediaUrls.length > this.config.maxImagesPerPost) {
      errors.push(`Exceeds maximum images per post: ${this.config.maxImagesPerPost}`);
    }

    // Validate hashtags
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

  protected async uploadMedia(mediaUrl: string, filename: string): Promise<string> {
    // Base implementation - to be overridden by specific platforms
    throw new Error('Media upload not implemented for this platform');
  }

  protected formatContent(content: PostContent): string {
    let formatted = content.content;

    // Add hashtags
    if (content.hashtags.length > 0) {
      formatted += '\n\n' + content.hashtags.join(' ');
    }

    // Add mentions
    if (content.mentions.length > 0) {
      formatted += '\n\n' + content.mentions.map(mention => `@${mention}`).join(' ');
    }

    return formatted;
  }

  protected async handleError(error: any, operation: string): Promise<never> {
    console.error(`Error in ${operation} for ${this.platform}:`, error);
    
    // Retry logic for common errors
    if (error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      throw new Error(`Network error in ${operation}. Please check your connection.`);
    }

    if (error.code === 'ECONNRESET' || error.code === 'ECONNREFUSED') {
      throw new Error(`Connection error in ${operation}. Platform service may be unavailable.`);
    }

    throw error;
  }
}

export class FacebookAdapter extends BasePlatformAdapter {
  platform = 'facebook' as const;

  constructor() {
    super(socialMediaConfig.facebook);
  }

  async publish(content: PostContent): Promise<any> {
    try {
      const validation = this.validateContent(content);
      if (!validation.valid) {
        throw new Error(`Content validation failed: ${validation.errors.join(', ')}`);
      }

      const formattedContent = this.formatContent(content);

      // Upload media if present
      let mediaAttachments: string[] = [];
      for (const mediaUrl of content.mediaUrls) {
        try {
          const mediaId = await this.uploadMedia(mediaUrl, `facebook_${Date.now()}.jpg`);
          mediaAttachments.push(mediaId);
        } catch (error) {
          console.warn(`Failed to upload media ${mediaUrl}:`, error);
        }
      }

      // Create post
      const postData: any = {
        message: formattedContent,
        published: true,
      };

      if (mediaAttachments.length > 0) {
        postData.attached_media = mediaAttachments.map(id => ({ media_fbid: id }));
      }

      const response = await fetch(
        `https://graph.facebook.com/${this.config.graphApiVersion}/${this.config.pageId}/feed`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(postData),
        }
      );

      if (!response.ok) {
        const errorData: unknown = await response.json();
        const errorMessage = (errorData as any)?.error?.message || response.statusText;
        throw new Error(`Facebook API error: ${errorMessage}`);
      }

      const result: unknown = await response.json();
      return {
        postId: (result as any).id,
        url: `https://facebook.com/${this.config.pageId}/posts/${(result as any).id}`,
        publishedAt: new Date().toISOString(),
      };
    } catch (error) {
      return this.handleError(error, 'publish');
    }
  }

  async schedule(content: PostContent, scheduledAt: Date): Promise<any> {
    try {
      const validation = this.validateContent(content);
      if (!validation.valid) {
        throw new Error(`Content validation failed: ${validation.errors.join(', ')}`);
      }

      const formattedContent = this.formatContent(content);

      // Create scheduled post
      const postData: any = {
        message: formattedContent,
        published: false,
        scheduled_publish_time: Math.floor(scheduledAt.getTime() / 1000),
      };

      const response = await fetch(
        `https://graph.facebook.com/${this.config.graphApiVersion}/${this.config.pageId}/feed`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(postData),
        }
      );

      if (!response.ok) {
        const errorData: unknown = await response.json();
        const errorMessage = (errorData as any)?.error?.message || response.statusText;
        throw new Error(`Facebook API error: ${errorMessage}`);
      }

      const result: unknown = await response.json();
      return {
        postId: (result as any).id,
        scheduledAt: scheduledAt.toISOString(),
        status: 'scheduled',
      };
    } catch (error) {
      return this.handleError(error, 'schedule');
    }
  }

  async getPostMetrics(postId: string): Promise<any> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/${this.config.graphApiVersion}/${postId}/insights`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get post metrics: ${response.statusText}`);
      }

      const data: unknown = await response.json();
      return {
        postId,
        metrics: (data as any)?.data || [],
        fetchedAt: new Date().toISOString(),
      };
    } catch (error) {
      return this.handleError(error, 'getPostMetrics');
    }
  }

  async getAnalytics(dateRange: { start: Date; end: Date }): Promise<any> {
    try {
      const response = await fetch(
        `https://graph.facebook.com/${this.config.graphApiVersion}/${this.config.pageId}/insights`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get analytics: ${response.statusText}`);
      }

      const data: unknown = await response.json();
      return {
        platform: 'facebook',
        dateRange,
        metrics: (data as any)?.data || [],
        fetchedAt: new Date().toISOString(),
      };
    } catch (error) {
      return this.handleError(error, 'getAnalytics');
    }
  }

  protected override async uploadMedia(mediaUrl: string, filename: string): Promise<string> {
    try {
      const response = await fetch(mediaUrl);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const formData = new FormData();
      formData.append('source', buffer, filename);
      formData.append('published', 'false');

      const uploadResponse = await fetch(
        `https://graph.facebook.com/${this.config.graphApiVersion}/${this.config.pageId}/photos`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
          },
          body: formData,
        }
      );

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload media: ${uploadResponse.statusText}`);
      }

      const result: unknown = await uploadResponse.json();
      return (result as any).id;
    } catch (error: any) {
      throw new Error(`Media upload failed: ${error.message}`);
    }
  }
}

export class TwitterAdapter extends BasePlatformAdapter {
  platform = 'twitter' as const;

  constructor() {
    super(socialMediaConfig.twitter);
  }

  async publish(content: PostContent): Promise<any> {
    try {
      const validation = this.validateContent(content);
      if (!validation.valid) {
        throw new Error(`Content validation failed: ${validation.errors.join(', ')}`);
      }

      const formattedContent = this.formatContent(content);

      // Twitter API v2 endpoint for creating tweet
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
        const errorData: unknown = await response.json();
        const errorMessage = (errorData as any)?.error?.message || response.statusText;
        throw new Error(`Facebook API error: ${errorMessage}`);
      }

      const result: unknown = await response.json();
      return {
        tweetId: (result as any)?.data?.id,
        url: `https://twitter.com/user/status/${(result as any)?.data?.id}`,
        publishedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      return this.handleError(error, 'publish');
    }
  }

  async schedule(content: PostContent, scheduledAt: Date): Promise<any> {
    try {
      // Twitter doesn't support native scheduling for free tier
      // We'll store the scheduled post and handle it manually
      const scheduledPost: any = {
        content,
        scheduledAt,
        status: 'scheduled',
        createdAt: new Date(),
      };

      // Store in database or queue for later processing
      return {
        scheduleId: generateId(),
        scheduledAt: scheduledAt.toISOString(),
        status: 'pending',
        message: 'Post scheduled for manual publishing',
      };
    } catch (error: any) {
      return this.handleError(error, 'schedule');
    }
  }

  async getPostMetrics(tweetId: string): Promise<any> {
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

      const data: any = await response.json();
      return {
        tweetId,
        metrics: data.data || {},
        fetchedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      return this.handleError(error, 'getPostMetrics');
    }
  }

  async getAnalytics(dateRange: { start: Date; end: Date }): Promise<any> {
    try {
      // Twitter API doesn't provide comprehensive analytics for free tier
      // Return basic structure for now
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
    } catch (error: any) {
      return this.handleError(error, 'getAnalytics');
    }
  }
}

export class LinkedInAdapter extends BasePlatformAdapter {
  platform = 'linkedin' as const;

  constructor() {
    super(socialMediaConfig.linkedin);
  }

  async publish(content: PostContent): Promise<any> {
    try {
      const validation = this.validateContent(content);
      if (!validation.valid) {
        throw new Error(`Content validation failed: ${validation.errors.join(', ')}`);
      }

      const formattedContent = this.formatContent(content);

      // LinkedIn API endpoint for creating post
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
        const errorData: unknown = await response.json();
        const errorMessage = (errorData as any)?.message || response.statusText;
        throw new Error(`LinkedIn API error: ${errorMessage}`);
      }

      const result: unknown = await response.json();
      return {
        postId: (result as any)?.id,
        url: `https://linkedin.com/feed/update/${(result as any)?.id}`,
        publishedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      return this.handleError(error, 'publish');
    }
  }

  async schedule(content: PostContent, scheduledAt: Date): Promise<any> {
    try {
      // LinkedIn doesn't support native scheduling
      // Store for manual processing
      const scheduledPost: any = {
        content,
        scheduledAt,
        status: 'scheduled',
        createdAt: new Date(),
      };

      return {
        scheduleId: generateId(),
        scheduledAt: scheduledAt.toISOString(),
        status: 'pending',
        message: 'Post scheduled for manual publishing',
      };
    } catch (error: any) {
      return this.handleError(error, 'schedule');
    }
  }

  async getPostMetrics(postId: string): Promise<any> {
    try {
      // LinkedIn API for getting post metrics
      const response = await fetch(`https://api.linkedin.com/v2/activities/${postId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to get post metrics: ${response.statusText}`);
      }

      const data: any = await response.json();
      return {
        postId,
        metrics: data || {},
        fetchedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      return this.handleError(error, 'getPostMetrics');
    }
  }

  async getAnalytics(dateRange: { start: Date; end: Date }): Promise<any> {
    try {
      // LinkedIn API for organization analytics
      const response = await fetch(
        `https://api.linkedin.com/v2/organizationAnalytics?q=organizationalUpdateAnalytics&start=${Math.floor(dateRange.start.getTime() / 1000)}&end=${Math.floor(dateRange.end.getTime() / 1000)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${this.config.accessToken}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get analytics: ${response.statusText}`);
      }

      const data: unknown = await response.json();
      return {
        platform: 'linkedin',
        dateRange,
        metrics: (data as any)?.elements || [],
        fetchedAt: new Date().toISOString(),
      };
    } catch (error: any) {
      return this.handleError(error, 'getAnalytics');
    }
  }
}

export class PlatformAdapterFactory {
  static createAdapter(platform: 'facebook' | 'twitter' | 'linkedin'): PlatformAdapter {
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

export default PlatformAdapterFactory;