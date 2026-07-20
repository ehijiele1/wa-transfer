import dotenv from 'dotenv';
import { InstagramConfig } from '../types/instagram';

dotenv.config();

const instagramConfig: InstagramConfig = {
  accessToken: process.env.INSTAGRAM_ACCESS_TOKEN || '',
  accountId: process.env.INSTAGRAM_ACCOUNT_ID || '',
  graphApiVersion: process.env.INSTAGRAM_GRAPH_API_VERSION || 'v18.0',
  maxCarouselImages: parseInt(process.env.INSTAGRAM_MAX_CAROUSEL_IMAGES || '8'),
  imageQuality: (process.env.INSTAGRAM_IMAGE_QUALITY || 'high') as 'high' | 'medium' | 'low',
  captionMaxLength: parseInt(process.env.INSTAGRAM_CAPTION_MAX_LENGTH || '2200'),
  hashtagLimit: parseInt(process.env.INSTAGRAM_HASHTAG_LIMIT || '30'),
};

export default instagramConfig;