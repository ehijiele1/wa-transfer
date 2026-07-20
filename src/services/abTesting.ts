import socialMediaConfig from '../config/socialMedia';
import { PostContent, ATestConfig } from '../types/socialMedia';
import { PlatformAdapterFactory } from './platformAdapters';
import SupabaseService from './supabase';
import { generateId } from '../utils';

export class ABTestingService {
  private supabase: SupabaseService;
  private activeTests: Map<string, ATestConfig> = new Map();

  constructor() {
    this.supabase = new SupabaseService();
  }

  async createABTest(test: Omit<ATestConfig, 'id' | 'status' | 'results'>): Promise<ATestConfig> {
    try {
      console.log(`Creating A/B test: ${test.name}`);

      const abTest: ATestConfig = {
        id: generateId(),
        status: 'draft',
        ...test,
      };

      // Validate test configuration
      await this.validateABTest(abTest);

      // Save to database
      await this.saveABTest(abTest);

      // Add to active tests
      this.activeTests.set(abTest.id, abTest);

      console.log(`A/B test created successfully: ${abTest.id}`);
      return abTest;
    } catch (error) {
      console.error('Error creating A/B test:', error);
      throw error;
    }
  }

  async startABTest(testId: string): Promise<ATestConfig> {
    try {
      console.log(`Starting A/B test: ${testId}`);

      const test = this.activeTests.get(testId) || await this.loadABTestFromDatabase(testId);
      if (!test) {
        throw new Error(`A/B test ${testId} not found`);
      }

      // Validate test can be started
      if (test.status !== 'draft') {
        throw new Error(`Test ${testId} is already in progress or completed`);
      }

      // Update test status
      test.status = 'running';
      test.startDate = new Date();

      // Distribute variants
      await this.distributeVariants(test);

      // Save updated test
      await this.updateABTest(test);

      console.log(`A/B test started successfully: ${testId}`);
      return test;
    } catch (error) {
      console.error('Error starting A/B test:', error);
      throw error;
    }
  }

  async stopABTest(testId: string): Promise<ATestConfig> {
    try {
      console.log(`Stopping A/B test: ${testId}`);

      const test = this.activeTests.get(testId) || await this.loadABTestFromDatabase(testId);
      if (!test) {
        throw new Error(`A/B test ${testId} not found`);
      }

      // Update test status
      test.status = 'completed';
      test.endDate = new Date();

      // Calculate final results
      await this.calculateTestResults(test);

      // Save updated test
      await this.updateABTest(test);

      console.log(`A/B test stopped successfully: ${testId}`);
      return test;
    } catch (error) {
      console.error('Error stopping A/B test:', error);
      throw error;
    }
  }

  async getABTestResults(testId: string): Promise<ATestConfig | null> {
    try {
      const test = this.activeTests.get(testId) || await this.loadABTestFromDatabase(testId);
      if (!test) {
        return null;
      }

      // If test is running, calculate current results
      if (test.status === 'running') {
        await this.calculateTestResults(test);
      }

      return test;
    } catch (error) {
      console.error('Error getting A/B test results:', error);
      return null;
    }
  }

  async getAllABTests(): Promise<ATestConfig[]> {
    try {
      const tests = Array.from(this.activeTests.values());
      
      // If no active tests, load from database
      if (tests.length === 0) {
        return await this.loadAllABTestsFromDatabase();
      }

      return tests;
    } catch (error) {
      console.error('Error getting all A/B tests:', error);
      return [];
    }
  }

  async createVariant(testId: string, variant: { content: PostContent; audience?: string[] }): Promise<string> {
    try {
      console.log(`Creating variant for test: ${testId}`);

      const test = this.activeTests.get(testId) || await this.loadABTestFromDatabase(testId);
      if (!test) {
        throw new Error(`A/B test ${testId} not found`);
      }

      if (test.status !== 'draft') {
        throw new Error(`Cannot modify test ${testId} that is not in draft state`);
      }

      const variantId = generateId();
      test.variants.push({
        id: variantId,
        content: variant.content,
        audience: variant.audience || [],
      });

      await this.updateABTest(test);

      console.log(`Variant created successfully: ${variantId}`);
      return variantId;
    } catch (error) {
      console.error('Error creating variant:', error);
      throw error;
    }
  }

  async getTestRecommendations(testId: string): Promise<any> {
    try {
      console.log(`Getting recommendations for test: ${testId}`);

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
    } catch (error) {
      console.error('Error getting test recommendations:', error);
      throw error;
    }
  }

  private async validateABTest(test: ATestConfig): Promise<void> {
    // Validate test has at least 2 variants
    if (test.variants.length < 2) {
      throw new Error('A/B test must have at least 2 variants');
    }

    // Validate each variant
    for (const variant of test.variants) {
      const adapter = PlatformAdapterFactory.createAdapter(test.platform);
      
      // Create a temporary post content for validation
      const tempContent: PostContent = {
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

    // Validate test duration
    if (test.startDate && test.endDate) {
      const duration = test.endDate.getTime() - test.startDate.getTime();
      if (duration < 24 * 60 * 60 * 1000) { // Less than 24 hours
        throw new Error('Test duration must be at least 24 hours');
      }
    }
  }

  private async distributeVariants(test: ATestConfig): Promise<void> {
    console.log(`Distributing variants for test: ${test.id}`);

    // Create scheduled posts for each variant
    for (const variant of test.variants) {
      try {
        const scheduledAt = new Date(Date.now() + Math.random() * 24 * 60 * 60 * 1000); // Random time within 24 hours
        
        await this.scheduleVariant(test, variant, scheduledAt);
      } catch (error) {
        console.error(`Error scheduling variant ${variant.id}:`, error);
      }
    }
  }

  private async scheduleVariant(test: ATestConfig, variant: any, scheduledAt: Date): Promise<void> {
    // Implementation for scheduling a variant
    console.log(`Scheduling variant ${variant.id} for ${scheduledAt.toISOString()}`);
  }

  private async calculateTestResults(test: ATestConfig): Promise<void> {
    console.log(`Calculating results for test: ${test.id}`);

    // Get metrics for each variant
    for (const variant of test.variants) {
      const metrics = await this.getVariantMetrics(test, variant);
      variant.metrics = metrics;
    }

    // Determine winning variant
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

  private async getVariantMetrics(test: ATestConfig, variant: any): Promise<any> {
    try {
      const adapter = PlatformAdapterFactory.createAdapter(test.platform);
      
      // Get metrics for the variant's content
      const metrics = await adapter.getAnalytics({
        start: test.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        end: test.endDate || new Date(),
      });

      return metrics;
    } catch (error: any) {
      console.error(`Error getting metrics for variant ${variant.id}:`, error);
      return {};
    }
  }

  private getBestVariant(test: ATestConfig): any {
    if (!test.variants || test.variants.length === 0) {
      return null;
    }

    // Calculate engagement rate for each variant
    const variantsWithScores = test.variants.map(variant => {
      const engagement = variant.metrics?.engagement || 0;
      const reach = variant.metrics?.reach || 1;
      const engagementRate = engagement / reach;
      
      return {
        ...variant,
        score: engagementRate,
      };
    });

    // Return variant with highest score
    return variantsWithScores.reduce((best, current) => 
      current.score > best.score ? current : best
    );
  }

  private getWinningContent(test: ATestConfig): any {
    const bestVariant = this.getBestVariant(test);
    return bestVariant?.content || null;
  }

  private getSuggestedImprovements(test: ATestConfig): string[] {
    const improvements: string[] = [];
    
    // Analyze test results for insights
    const bestVariant = this.getBestVariant(test);
    const worstVariant = test.variants.reduce((worst, current) => {
      const currentScore = current.metrics?.engagement || 0;
      const worstScore = worst.metrics?.engagement || 0;
      return currentScore < worstScore ? current : worst;
    });

    if (bestVariant && worstVariant) {
      // Compare content differences
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

  private getNextSteps(test: ATestConfig): string[] {
    const nextSteps: string[] = [];
    
    if (test.status === 'completed') {
      nextSteps.push('Implement winning variant in main content strategy');
      nextSteps.push('Create follow-up tests with refined hypotheses');
      nextSteps.push('Scale successful content to other platforms');
    } else if (test.status === 'running') {
      nextSteps.push('Monitor test progress daily');
      nextSteps.push('Consider extending test duration if needed');
    }

    return nextSteps;
  }

  // Database operations
  private async saveABTest(test: ATestConfig): Promise<void> {
    console.log(`Saving A/B test to database: ${test.id}`);
  }

  private async updateABTest(test: ATestConfig): Promise<void> {
    console.log(`Updating A/B test in database: ${test.id}`);
  }

  private async loadABTestFromDatabase(testId: string): Promise<ATestConfig | null> {
    console.log(`Loading A/B test from database: ${testId}`);
    return null;
  }

  private async loadAllABTestsFromDatabase(): Promise<ATestConfig[]> {
    console.log('Loading all A/B tests from database');
    return [];
  }

  // Utility methods
  async getABTestStatistics(): Promise<any> {
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

  async getTestTemplates(): Promise<any[]> {
    // Return common A/B test templates
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

export default ABTestingService;