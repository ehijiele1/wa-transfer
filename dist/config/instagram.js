"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const instagramConfig = {
    accessToken: process.env.INSTAGRAM_ACCESS_TOKEN || '',
    accountId: process.env.INSTAGRAM_ACCOUNT_ID || '',
    graphApiVersion: process.env.INSTAGRAM_GRAPH_API_VERSION || 'v18.0',
    maxCarouselImages: parseInt(process.env.INSTAGRAM_MAX_CAROUSEL_IMAGES || '8'),
    imageQuality: (process.env.INSTAGRAM_IMAGE_QUALITY || 'high'),
    captionMaxLength: parseInt(process.env.INSTAGRAM_CAPTION_MAX_LENGTH || '2200'),
    hashtagLimit: parseInt(process.env.INSTAGRAM_HASHTAG_LIMIT || '30'),
};
exports.default = instagramConfig;
//# sourceMappingURL=instagram.js.map