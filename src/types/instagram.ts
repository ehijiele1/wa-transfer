export interface InstagramConfig {
  accessToken: string;
  accountId: string;
  graphApiVersion: string;
  maxCarouselImages: number;
  imageQuality: 'high' | 'medium' | 'low';
  captionMaxLength: number;
  hashtagLimit: number;
}

export interface InstagramMedia {
  id: string;
  url: string;
  type: 'image' | 'video';
  width: number;
  height: number;
  filename: string;
  size: number;
  alt_text?: string;
}

export interface InstagramCarousel {
  id: string;
  property_id: string;
  caption: string;
  hashtags: string[];
  slides: InstagramSlide[];
  status: 'draft' | 'published' | 'scheduled';
  scheduled_at?: Date;
  published_at?: Date;
  media_container_id?: string;
  permalink?: string;
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

export interface InstagramPostResponse {
  id: string;
  permalink: string;
  caption: string;
  media_type: 'CAROUSEL';
  status: 'PUBLISHED' | 'SCHEDULED';
  published_at?: string;
  scheduled_at?: string;
}

export interface InstagramMediaUploadResponse {
  id: string;
  created_at: string;
  mime_type: string;
}