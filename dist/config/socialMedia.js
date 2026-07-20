"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const socialMediaConfig = {
    facebook: {
        accessToken: process.env.FACEBOOK_ACCESS_TOKEN || '',
        pageId: process.env.FACEBOOK_PAGE_ID || '',
        graphApiVersion: process.env.FACEBOOK_GRAPH_API_VERSION || 'v18.0',
        postTypes: ['text', 'image', 'video', 'link'],
        maxTextLength: parseInt(process.env.FACEBOOK_MAX_TEXT_LENGTH || '63206'),
        maxImagesPerPost: parseInt(process.env.FACEBOOK_MAX_IMAGES_PER_POST || '10'),
        maxVideosPerPost: parseInt(process.env.FACEBOOK_MAX_VIDEOS_PER_POST || '1'),
    },
    twitter: {
        bearerToken: process.env.TWITTER_BEARER_TOKEN || '',
        apiKey: process.env.TWITTER_API_KEY || '',
        apiSecret: process.env.TWITTER_API_SECRET || '',
        accessToken: process.env.TWITTER_ACCESS_TOKEN || '',
        accessSecret: process.env.TWITTER_ACCESS_SECRET || '',
        maxTextLength: parseInt(process.env.TWITTER_MAX_TEXT_LENGTH || '280'),
        maxImagesPerTweet: parseInt(process.env.TWITTER_MAX_IMAGES_PER_TWEET || '4'),
        maxVideosPerTweet: parseInt(process.env.TWITTER_MAX_VIDEOS_PER_TWEET || '1'),
    },
    linkedin: {
        accessToken: process.env.LINKEDIN_ACCESS_TOKEN || '',
        clientId: process.env.LINKEDIN_CLIENT_ID || '',
        clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
        maxTextLength: parseInt(process.env.LINKEDIN_MAX_TEXT_LENGTH || '3000'),
        maxImagesPerPost: parseInt(process.env.LINKEDIN_MAX_IMAGES_PER_POST || '9'),
    },
};
exports.default = socialMediaConfig;
//# sourceMappingURL=socialMedia.js.map