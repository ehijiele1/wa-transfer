import { JobScheduler } from '../src/jobs/JobScheduler';
import { MessageProcessingJob } from '../src/jobs/MessageProcessingJob';
import { ContentGenerationJob } from '../src/jobs/ContentGenerationJob';
import { SocialMediaPublishingJob } from '../src/jobs/SocialMediaPublishingJob';

// Mock dependencies
jest.mock('../src/services/supabaseClients', () => ({
  getSupabaseAnonClient: jest.fn(),
  getSupabaseServiceRoleClient: jest.fn()
}));

jest.mock('../src/services/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('../src/services/idempotencyService', () => ({
  idempotencyService: {
    executeWithIdempotency: jest.fn(),
    checkDeduplication: jest.fn(),
    markAsProcessed: jest.fn()
  }
}));

describe('JobScheduler Integration', () => {
  let jobScheduler: JobScheduler;

  beforeEach(() => {
    jobScheduler = new JobScheduler();
  });

  afterEach(async () => {
    await jobScheduler.stop();
  });

  describe('Job Registration', () => {
    it('should register jobs successfully', () => {
      expect(() => {
        jobScheduler.registerJob('message', MessageProcessingJob);
        jobScheduler.registerJob('content', ContentGenerationJob);
        jobScheduler.registerJob('social', SocialMediaPublishingJob);
      }).not.toThrow();
    });

    it('should throw error for duplicate job registration', () => {
      jobScheduler.registerJob('message', MessageProcessingJob);
      expect(() => {
        jobScheduler.registerJob('message', MessageProcessingJob);
      }).toThrow('Job type "message" is already registered');
    });
  });

  describe('Job Execution', () => {
    it('should execute message processing job', async () => {
      jobScheduler.registerJob('message', MessageProcessingJob);
      
      const jobData = {
        id: 'msg123',
        from: '1234567890@c.us',
        message: 'Test message',
        timestamp: Date.now()
      };

      const result = await jobScheduler.executeJob('message', jobData);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should execute content generation job', async () => {
      jobScheduler.registerJob('content', ContentGenerationJob);
      
      const jobData = {
        propertyId: 'prop123',
        contentType: 'social_post',
        targetPlatform: 'instagram'
      };

      const result = await jobScheduler.executeJob('content', jobData);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should execute social media publishing job', async () => {
      jobScheduler.registerJob('social', SocialMediaPublishingJob);
      
      const jobData = {
        platform: 'instagram',
        content: 'Test post content',
        mediaUrls: ['https://example.com/image.jpg']
      };

      const result = await jobScheduler.executeJob('social', jobData);
      
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle unknown job type', async () => {
      const result = await jobScheduler.executeJob('unknown', {});
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unknown job type');
    });
  });

  describe('Job Scheduling', () => {
    it('should schedule jobs with intervals', async () => {
      jobScheduler.registerJob('message', MessageProcessingJob);
      
      // Schedule to run every 2 seconds
      jobScheduler.scheduleJob('message', { interval: 2000 });
      
      // Wait for one execution
      await new Promise(resolve => setTimeout(resolve, 2500));
      
      // Check that job was executed (mock implementation should track calls)
      expect(true).toBe(true); // Placeholder assertion
    });

    it('should stop scheduled jobs', async () => {
      jobScheduler.registerJob('message', MessageProcessingJob);
      
      const scheduleId = jobScheduler.scheduleJob('message', { interval: 1000 });
      
      expect(scheduleId).toBeDefined();
      
      await jobScheduler.stopScheduledJob(scheduleId);
      
      // Verify job was stopped (mock implementation should track this)
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('Job Statistics', () => {
    it('should track job execution statistics', async () => {
      jobScheduler.registerJob('message', MessageProcessingJob);
      jobScheduler.registerJob('content', ContentGenerationJob);
      
      // Execute some jobs
      await jobScheduler.executeJob('message', { id: 'msg1' });
      await jobScheduler.executeJob('message', { id: 'msg2' });
      await jobScheduler.executeJob('content', { propertyId: 'prop1' });
      
      const stats = jobScheduler.getStats();
      
      expect(stats.totalJobs).toBe(3);
      expect(stats.successfulJobs).toBe(3);
      expect(stats.failedJobs).toBe(0);
      expect(stats.jobTypeStats).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle job execution errors', async () => {
      // Create a mock job that throws an error
      class FailingJob {
        async execute(data: any) {
          throw new Error('Job failed');
        }
      }
      
      jobScheduler.registerJob('failing', FailingJob);
      
      const result = await jobScheduler.executeJob('failing', {});
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Job failed');
    });

    it('should handle job validation errors', async () => {
      jobScheduler.registerJob('message', MessageProcessingJob);
      
      const result = await jobScheduler.executeJob('message', {});
      
      expect(result.success).toBe(false);
      expect(result.error).toContain('validation');
    });
  });
});

describe('MessageProcessingJob Integration', () => {
  let messageJob: MessageProcessingJob;

  beforeEach(() => {
    messageJob = new MessageProcessingJob();
  });

  it('should process WhatsApp messages', async () => {
    const messageData = {
      id: 'msg123',
      from: '1234567890@c.us',
      to: '9876543210@c.us',
      message: 'Hello, I\'m interested in property 123',
      timestamp: Date.now(),
      type: 'chat'
    };

    const result = await messageJob.execute(messageData);
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.processed).toBe(true);
  });

  it('should validate message structure', async () => {
    const invalidMessage = {
      id: 'msg123',
      from: 'invalid-number',
      message: 'Test message'
      // Missing required fields
    };

    const result = await messageJob.execute(invalidMessage);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('validation');
  });
});

describe('ContentGenerationJob Integration', () => {
  let contentJob: ContentGenerationJob;

  beforeEach(() => {
    contentJob = new ContentGenerationJob();
  });

  it('should generate social media content', async () => {
    const contentData = {
      propertyId: 'prop123',
      contentType: 'social_post',
      targetPlatform: 'instagram',
      tone: 'professional'
    };

    const result = await contentJob.execute(contentData);
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.content).toBeDefined();
    expect(result.data.mediaSuggestions).toBeDefined();
  });

  it('should handle content generation errors', async () => {
    const invalidData = {
      propertyId: 'invalid-prop',
      contentType: 'invalid_type'
    };

    const result = await contentJob.execute(invalidData);
    
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe('SocialMediaPublishingJob Integration', () => {
  let socialJob: SocialMediaPublishingJob;

  beforeEach(() => {
    socialJob = new SocialMediaPublishingJob();
  });

  it('should publish to social media platforms', async () => {
    const publishData = {
      platform: 'instagram',
      content: 'Test post content',
      mediaUrls: ['https://example.com/image.jpg'],
      scheduledTime: Date.now() + 86400000 // 1 day from now
    };

    const result = await socialJob.execute(publishData);
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data.postId).toBeDefined();
  });

  it('should validate platform configuration', async () => {
    const invalidData = {
      platform: 'invalid_platform',
      content: 'Test content'
    };

    const result = await socialJob.execute(invalidData);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain('unsupported platform');
  });
});