"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueProcessors = void 0;
const logger_1 = require("../utils/logger");
class QueueProcessors {
    static async processSchedulePost(job) {
        const { postId, platform, content, scheduledAt } = job.data;
        logger_1.logger.info('Processing scheduled post', { postId, platform });
        const idempotencyKey = `post:${postId}:${scheduledAt}`;
        try {
            const { SocialMediaManager } = await Promise.resolve().then(() => __importStar(require('../services/socialMediaManager')));
            const socialMediaManager = new SocialMediaManager();
            const result = await socialMediaManager.publishContent(content, platform, true);
            logger_1.logger.info('Scheduled post published', { postId, platform, success: true });
            return { success: true, result };
        }
        catch (error) {
            logger_1.logger.error('Failed to process scheduled post', error, { postId, platform });
            throw error;
        }
    }
    static async processGenerateCarousel(job) {
        const { propertyId } = job.data;
        logger_1.logger.info('Processing carousel generation', { propertyId });
        try {
            const InstagramService = (await Promise.resolve().then(() => __importStar(require('../services/instagram')))).default;
            const instagramService = new InstagramService();
            const carousel = await instagramService.generateCarouselForProperty(propertyId);
            logger_1.logger.info('Carousel generated', { propertyId, carouselId: carousel.id });
            return { success: true, carousel };
        }
        catch (error) {
            logger_1.logger.error('Failed to generate carousel', error, { propertyId });
            throw error;
        }
    }
    static async processPublishPost(job) {
        const { postId, platform, content } = job.data;
        logger_1.logger.info('Processing post publish', { postId, platform });
        try {
            const { SocialMediaManager } = await Promise.resolve().then(() => __importStar(require('../services/socialMediaManager')));
            const socialMediaManager = new SocialMediaManager();
            const result = await socialMediaManager.publishContent(content, platform, true);
            logger_1.logger.info('Post published', { postId, platform, success: true });
            return { success: true, result };
        }
        catch (error) {
            logger_1.logger.error('Failed to publish post', error, { postId, platform });
            throw error;
        }
    }
    static setupWorkers(queueManager) {
        queueManager.createWorker('scheduled-posts', async (job) => {
            if (job.name === 'schedule_post') {
                return this.processSchedulePost(job);
            }
            else if (job.name === 'publish_post') {
                return this.processPublishPost(job);
            }
            throw new Error(`Unknown job type: ${job.name}`);
        });
        queueManager.createWorker('instagram-carousels', async (job) => {
            if (job.name === 'generate_carousel') {
                return this.processGenerateCarousel(job);
            }
            throw new Error(`Unknown job type: ${job.name}`);
        });
        logger_1.logger.info('All queue workers initialized');
    }
}
exports.QueueProcessors = QueueProcessors;
//# sourceMappingURL=processors.js.map