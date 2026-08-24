"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ABTestingService = void 0;
const platformAdapters_1 = require("./platformAdapters");
const supabase_1 = __importDefault(require("./supabase"));
const utils_1 = require("../utils");
const logger_1 = require("../utils/logger");
class ABTestingService {
    supabase;
    activeTests = new Map();
    constructor() {
        this.supabase = new supabase_1.default();
    }
    async createABTest(test) {
        try {
            logger_1.logger.info(`Creating A/B test`, { testName: test.name });
            const abTest = {
                id: (0, utils_1.generateId)(),
                status: 'draft',
                ...test,
            };
            await this.validateABTest(abTest);
            await this.saveABTest(abTest);
            this.activeTests.set(abTest.id, abTest);
            logger_1.logger.info(`A/B test created successfully`, { testId: abTest.id });
            return abTest;
        }
        catch (error) {
            logger_1.logger.error('Error creating A/B test', error);
            throw error;
        }
    }
    async startABTest(testId) {
        try {
            logger_1.logger.info(`Starting A/B test`, { testId });
            const test = this.activeTests.get(testId) || await this.loadABTestFromDatabase(testId);
            if (!test) {
                throw new Error(`A/B test ${testId} not found`);
            }
            if (test.status !== 'draft') {
                throw new Error(`Test ${testId} is already in progress or completed`);
            }
            test.status = 'running';
            test.startDate = new Date();
            await this.distributeVariants(test);
            await this.updateABTest(test);
            logger_1.logger.info(`A/B test started successfully`, { testId });
            return test;
        }
        catch (error) {
            logger_1.logger.error('Error starting A/B test', error, { testId });
            throw error;
        }
    }
    async stopABTest(testId) {
        try {
            logger_1.logger.info(`Stopping A/B test`, { testId });
            const test = this.activeTests.get(testId) || await this.loadABTestFromDatabase(testId);
            if (!test) {
                throw new Error(`A/B test ${testId} not found`);
            }
            test.status = 'completed';
            test.endDate = new Date();
            await this.calculateTestResults(test);
            await this.updateABTest(test);
            logger_1.logger.info(`A/B test stopped successfully`, { testId });
            return test;
        }
        catch (error) {
            logger_1.logger.error('Error stopping A/B test', error, { testId });
            throw error;
        }
    }
    async getABTestResults(testId) {
        try {
            const test = this.activeTests.get(testId) || await this.loadABTestFromDatabase(testId);
            if (!test) {
                return null;
            }
            if (test.status === 'running') {
                await this.calculateTestResults(test);
            }
            return test;
        }
        catch (error) {
            logger_1.logger.error('Error getting A/B test results', error, { testId });
            return null;
        }
    }
    async getAllABTests() {
        try {
            const tests = Array.from(this.activeTests.values());
            if (tests.length === 0) {
                return await this.loadAllABTestsFromDatabase();
            }
            return tests;
        }
        catch (error) {
            logger_1.logger.error('Error getting all A/B tests', error);
            return [];
        }
    }
    async createVariant(testId, variant) {
        try {
            logger_1.logger.info(`Creating variant for test`, { testId });
            const test = this.activeTests.get(testId) || await this.loadABTestFromDatabase(testId);
            if (!test) {
                throw new Error(`A/B test ${testId} not found`);
            }
            if (test.status !== 'draft') {
                throw new Error(`Cannot modify test ${testId} that is not in draft state`);
            }
            const variantId = (0, utils_1.generateId)();
            test.variants.push({
                id: variantId,
                content: variant.content,
                audience: variant.audience || [],
            });
            await this.updateABTest(test);
            logger_1.logger.info(`Variant created successfully`, { variantId });
            return variantId;
        }
        catch (error) {
            logger_1.logger.error('Error creating variant', error, { testId });
            throw error;
        }
    }
    async getTestRecommendations(testId) {
        try {
            logger_1.logger.info(`Getting recommendations for test`, { testId });
            const test = this.activeTests.get(testId) || await this.loadABTestFromDatabase(testId);
            if (!test) {
                throw new Error(`A/B test ${testId} not found`);
            }
            if (test.status !== 'completed') {
                throw new Error(`Test ${testId} is not completed yet`);
            }
            const recommendations = {
                bestVariant: this.getBestVariant(test),
                winningContent: this.getWinningContent(test),
                suggestedImprovements: this.getSuggestedImprovements(test),
                nextSteps: this.getNextSteps(test),
            };
            return recommendations;
        }
        catch (error) {
            logger_1.logger.error('Error getting test recommendations', error, { testId });
            throw error;
        }
    }
    async validateABTest(test) {
        if (test.variants.length < 2) {
            throw new Error('A/B test must have at least 2 variants');
        }
        for (const variant of test.variants) {
            const adapter = platformAdapters_1.PlatformAdapterFactory.createAdapter(test.platform);
            const tempContent = {
                id: variant.id,
                platform: test.platform,
                type: variant.content.type,
                title: variant.content.title,
                content: variant.content.content,
                mediaUrls: variant.content.mediaUrls,
                hashtags: variant.content.hashtags,
                mentions: variant.content.mentions,
                status: 'draft'
            };
            const validation = adapter.validateContent(tempContent);
            if (!validation.valid) {
                throw new Error(`Variant validation failed: ${validation.errors.join(', ')}`);
            }
        }
        if (test.startDate && test.endDate) {
            const duration = test.endDate.getTime() - test.startDate.getTime();
            if (duration < 24 * 60 * 60 * 1000) {
                throw new Error('Test duration must be at least 24 hours');
            }
        }
    }
    async distributeVariants(test) {
        logger_1.logger.info(`Distributing variants for test`, { testId: test.id });
        for (const variant of test.variants) {
            try {
                const scheduledAt = new Date(Date.now() + Math.random() * 24 * 60 * 60 * 1000);
                await this.scheduleVariant(test, variant, scheduledAt);
            }
            catch (error) {
                logger_1.logger.error(`Error scheduling variant`, error, { variantId: variant.id });
            }
        }
    }
    async scheduleVariant(test, variant, scheduledAt) {
        logger_1.logger.debug(`Scheduling variant`, { variantId: variant.id, scheduledAt: scheduledAt.toISOString() });
    }
    async calculateTestResults(test) {
        logger_1.logger.info(`Calculating results for test`, { testId: test.id });
        for (const variant of test.variants) {
            const metrics = await this.getVariantMetrics(test, variant);
            variant.metrics = metrics;
        }
        const bestVariant = this.getBestVariant(test);
        if (bestVariant) {
            test.results = test.results || [];
            test.results.push({
                variantId: bestVariant.id,
                engagement: bestVariant.metrics?.engagement || 0,
                reach: bestVariant.metrics?.reach || 0,
                clicks: bestVariant.metrics?.clicks || 0,
            });
        }
    }
    async getVariantMetrics(test, variant) {
        try {
            const adapter = platformAdapters_1.PlatformAdapterFactory.createAdapter(test.platform);
            const metrics = await adapter.getAnalytics({
                start: test.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                end: test.endDate || new Date(),
            });
            return metrics;
        }
        catch (error) {
            logger_1.logger.error(`Error getting metrics for variant`, error, { variantId: variant.id });
            return {};
        }
    }
    getBestVariant(test) {
        if (!test.variants || test.variants.length === 0) {
            return null;
        }
        const variantsWithScores = test.variants.map(variant => {
            const engagement = variant.metrics?.engagement || 0;
            const reach = variant.metrics?.reach || 1;
            const engagementRate = engagement / reach;
            return {
                ...variant,
                score: engagementRate,
            };
        });
        return variantsWithScores.reduce((best, current) => current.score > best.score ? current : best);
    }
    getWinningContent(test) {
        const bestVariant = this.getBestVariant(test);
        return bestVariant?.content || null;
    }
    getSuggestedImprovements(test) {
        const improvements = [];
        const bestVariant = this.getBestVariant(test);
        const worstVariant = test.variants.reduce((worst, current) => {
            const currentScore = current.metrics?.engagement || 0;
            const worstScore = worst.metrics?.engagement || 0;
            return currentScore < worstScore ? current : worst;
        });
        if (bestVariant && worstVariant) {
            const bestContent = bestVariant.content.content;
            const worstContent = worstVariant.content.content;
            if (bestContent.length > worstContent.length) {
                improvements.push('Longer content tends to perform better');
            }
            if (bestVariant.content.hashtags.length > worstVariant.content.hashtags.length) {
                improvements.push('More hashtags may improve engagement');
            }
        }
        return improvements;
    }
    getNextSteps(test) {
        const nextSteps = [];
        if (test.status === 'completed') {
            nextSteps.push('Implement winning variant in main content strategy');
            nextSteps.push('Create follow-up tests with refined hypotheses');
            nextSteps.push('Scale successful content to other platforms');
        }
        else if (test.status === 'running') {
            nextSteps.push('Monitor test progress daily');
            nextSteps.push('Consider extending test duration if needed');
        }
        return nextSteps;
    }
    async saveABTest(test) {
        logger_1.logger.debug(`Saving A/B test to database`, { testId: test.id });
    }
    async updateABTest(test) {
        logger_1.logger.debug(`Updating A/B test in database`, { testId: test.id });
    }
    async loadABTestFromDatabase(testId) {
        logger_1.logger.debug(`Loading A/B test from database`, { testId });
        return null;
    }
    async loadAllABTestsFromDatabase() {
        logger_1.logger.debug('Loading all A/B tests from database');
        return [];
    }
    async getABTestStatistics() {
        const tests = await this.getAllABTests();
        const stats = {
            totalTests: tests.length,
            runningTests: tests.filter(t => t.status === 'running').length,
            completedTests: tests.filter(t => t.status === 'completed').length,
            draftTests: tests.filter(t => t.status === 'draft').length,
            totalVariants: tests.reduce((sum, test) => sum + test.variants.length, 0),
            averageVariantsPerTest: tests.length > 0 ? tests.reduce((sum, test) => sum + test.variants.length, 0) / tests.length : 0,
        };
        return stats;
    }
    async getTestTemplates() {
        return [
            {
                name: 'Headline Test',
                description: 'Test different headlines for the same content',
                platform: 'facebook',
                variants: [
                    {
                        content: {
                            title: 'Exciting Property Available',
                            content: 'Check out this amazing property...',
                        }
                    },
                    {
                        content: {
                            title: 'Limited Time Offer',
                            content: 'Don\'t miss out on this incredible deal...',
                        }
                    }
                ]
            },
            {
                name: 'Image Test',
                description: 'Test different images for the same property',
                platform: 'instagram',
                variants: [
                    {
                        content: {
                            title: 'Property Exterior',
                            content: 'Beautiful home with great curb appeal...',
                        }
                    },
                    {
                        content: {
                            title: 'Property Interior',
                            content: 'Stunning interior with modern finishes...',
                        }
                    }
                ]
            }
        ];
    }
}
exports.ABTestingService = ABTestingService;
exports.default = ABTestingService;
//# sourceMappingURL=abTesting.js.map