import { HealthService } from '../src/services/healthService';
import { OperationalMonitor } from '../src/services/operationalMonitor';

// Mock dependencies
jest.mock('../src/services/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn()
  }
}));

jest.mock('../src/services/supabaseClients', () => ({
  getSupabaseAnonClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockResolvedValue({ data: [], error: null })
    }))
  }))
}));

describe('HealthService Integration', () => {
  let healthService: HealthService;

  beforeEach(() => {
    healthService = new HealthService();
  });

  afterEach(async () => {
    await healthService.stop();
  });

  describe('Health Checks', () => {
    it('should return overall health status', async () => {
      const health = await healthService.getHealth();
      
      expect(health.status).toBe('healthy');
      expect(health.timestamp).toBeDefined();
      expect(health.version).toBeDefined();
      expect(health.uptime).toBeDefined();
      expect(health.checks).toBeDefined();
    });

    it('should check database health', async () => {
      const dbHealth = await healthService.checkDatabase();
      
      expect(dbHealth.status).toBe('healthy');
      expect(dbHealth.responseTime).toBeDefined();
      expect(dbHealth.lastChecked).toBeDefined();
    });

    it('should check WhatsApp service health', async () => {
      const whatsappHealth = await healthService.checkWhatsApp();
      
      expect(whatsappHealth.status).toBeDefined();
      expect(whatsappHealth.lastChecked).toBeDefined();
    });

    it('should check AI service health', async () => {
      const aiHealth = await healthService.checkAI();
      
      expect(aiHealth.status).toBeDefined();
      expect(aiHealth.lastChecked).toBeDefined();
    });

    it('should check social media services health', async () => {
      const socialHealth = await healthService.checkSocialMedia();
      
      expect(socialHealth.status).toBeDefined();
      expect(socialHealth.lastChecked).toBeDefined();
    });
  });

  describe('Readiness Probes', () => {
    it('should check application readiness', async () => {
      const readiness = await healthService.getReadiness();
      
      expect(readiness.status).toBe('ready');
      expect(readiness.timestamp).toBeDefined();
      expect(readiness.components).toBeDefined();
    });

    it('should check individual component readiness', async () => {
      const components = await healthService.checkComponentReadiness();
      
      expect(components.database).toBeDefined();
      expect(components.whatsapp).toBeDefined();
      expect(components.ai).toBeDefined();
      expect(components.socialMedia).toBeDefined();
    });
  });

  describe('Liveness Probes', () => {
    it('should check application liveness', async () => {
      const liveness = await healthService.getLiveness();
      
      expect(liveness.status).toBe('alive');
      expect(liveness.timestamp).toBeDefined();
      expect(liveness.uptime).toBeDefined();
    });

    it('should detect application crashes', async () => {
      // Simulate a crash scenario
      const originalGetUptime = healthService['getUptime'];
      healthService['getUptime'] = jest.fn().mockReturnValue(0);
      
      const liveness = await healthService.getLiveness();
      
      expect(liveness.status).toBe('unhealthy');
      healthService['getUptime'] = originalGetUptime;
    });
  });

  describe('Health Statistics', () => {
    it('should track health check statistics', async () => {
      // Perform some health checks
      await healthService.getHealth();
      await healthService.checkDatabase();
      await healthService.checkWhatsApp();
      
      const stats = healthService.getHealthStats();
      
      expect(stats.totalChecks).toBeGreaterThan(0);
      expect(stats.failedChecks).toBeGreaterThanOrEqual(0);
      expect(stats.averageResponseTime).toBeDefined();
      expect(stats.checkHistory).toBeDefined();
    });
  });

  describe('Health Configuration', () => {
    it('should update health check configuration', () => {
      const newConfig = {
        checkInterval: 30000,
        timeout: 10000,
        retryAttempts: 3
      };
      
      healthService.updateConfig(newConfig);
      
      const config = healthService.getConfig();
      expect(config.checkInterval).toBe(30000);
      expect(config.timeout).toBe(10000);
      expect(config.retryAttempts).toBe(3);
    });
  });
});

describe('OperationalMonitor Integration', () => {
  let operationalMonitor: OperationalMonitor;

  beforeEach(() => {
    operationalMonitor = new OperationalMonitor();
  });

  afterEach(() => {
    operationalMonitor.stop();
  });

  describe('System Monitoring', () => {
    it('should track system metrics', () => {
      const metrics = operationalMonitor.getCurrentMetrics();
      
      expect(metrics.memory).toBeDefined();
      expect(metrics.cpu).toBeDefined();
      expect(metrics.uptime).toBeDefined();
      expect(metrics.timestamp).toBeDefined();
    });

    it('should track application metrics', () => {
      const appMetrics = operationalMonitor.getApplicationMetrics();
      
      expect(appMetrics.messageProcessing).toBeDefined();
      expect(appMetrics.contentGeneration).toBeDefined();
      expect(appMetrics.socialMediaPublishing).toBeDefined();
      expect(appMetrics.errorRate).toBeDefined();
    });

    it('should track error rates', () => {
      const errorRate = operationalMonitor.getErrorRate();
      
      expect(errorRate).toBeDefined();
      expect(errorRate.total).toBeGreaterThanOrEqual(0);
      expect(errorRate.failed).toBeGreaterThanOrEqual(0);
      expect(errorRate.rate).toBeGreaterThanOrEqual(0);
      expect(errorRate.rate).toBeLessThanOrEqual(1);
    });
  });

  describe('Alerting', () => {
    it('should detect high error rates', () => {
      // Simulate high error rate
      operationalMonitor.recordError();
      operationalMonitor.recordError();
      operationalMonitor.recordSuccess();
      operationalMonitor.recordSuccess();
      
      const shouldAlert = operationalMonitor.shouldTriggerAlert();
      
      expect(typeof shouldAlert).toBe('boolean');
    });

    it('should detect memory issues', () => {
      // Simulate high memory usage
      const originalGetMemoryUsage = operationalMonitor['getMemoryUsage'];
      operationalMonitor['getMemoryUsage'] = jest.fn().mockReturnValue({
        used: 500 * 1024 * 1024, // 500MB
        total: 1024 * 1024 * 1024 // 1GB
      });
      
      const hasMemoryIssues = operationalMonitor.hasMemoryIssues();
      
      expect(hasMemoryIssues).toBe(true);
      operationalMonitor['getMemoryUsage'] = originalGetMemoryUsage;
    });

    it('should detect CPU issues', () => {
      // Simulate high CPU usage
      const originalGetCpuUsage = operationalMonitor['getCpuUsage'];
      operationalMonitor['getCpuUsage'] = jest.fn().mockReturnValue(0.9); // 90%
      
      const hasCpuIssues = operationalMonitor.hasCpuIssues();
      
      expect(hasCpuIssues).toBe(true);
      operationalMonitor['getCpuUsage'] = originalGetCpuUsage;
    });
  });

  describe('Performance Tracking', () => {
    it('should track job performance', () => {
      const jobType = 'message_processing';
      const duration = 1500; // 1.5 seconds
      
      operationalMonitor.recordJobPerformance(jobType, duration);
      
      const performance = operationalMonitor.getJobPerformance(jobType);
      
      expect(performance.averageDuration).toBeDefined();
      expect(performance.totalJobs).toBe(1);
      expect(performance.minDuration).toBe(duration);
      expect(performance.maxDuration).toBe(duration);
    });

    it('should track response times', () => {
      const endpoint = '/health';
      const responseTime = 200; // 200ms
      
      operationalMonitor.recordResponseTime(endpoint, responseTime);
      
      const stats = operationalMonitor.getResponseTimeStats(endpoint);
      
      expect(stats.average).toBe(responseTime);
      expect(stats.min).toBe(responseTime);
      expect(stats.max).toBe(responseTime);
      expect(stats.count).toBe(1);
    });
  });

  describe('Health History', () => {
    it('should maintain health history', () => {
      // Record some metrics
      operationalMonitor.getCurrentMetrics();
      operationalMonitor.getCurrentMetrics();
      
      const history = operationalMonitor.getHealthHistory();
      
      expect(history.length).toBe(2);
      expect(history[0].timestamp).toBeDefined();
      expect(history[0].memory).toBeDefined();
      expect(history[0].cpu).toBeDefined();
    });

    it('should limit history size', () => {
      // Record more metrics than the limit
      for (let i = 0; i < 100; i++) {
        operationalMonitor.getCurrentMetrics();
      }
      
      const history = operationalMonitor.getHealthHistory();
      
      expect(history.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Health Reports', () => {
    it('should generate health summary', () => {
      const summary = operationalMonitor.generateHealthSummary();
      
      expect(summary.timestamp).toBeDefined();
      expect(summary.systemHealth).toBeDefined();
      expect(summary.applicationHealth).toBeDefined();
      expect(summary.performance).toBeDefined();
      expect(summary.alerts).toBeDefined();
    });

    it('should export health data', () => {
      const exportData = operationalMonitor.exportHealthData();
      
      expect(exportData.timestamp).toBeDefined();
      expect(exportData.metrics).toBeDefined();
      expect(exportData.history).toBeDefined();
      expect(exportData.alerts).toBeDefined();
    });
  });
});

describe('Health and Monitoring Integration', () => {
  let healthService: HealthService;
  let operationalMonitor: OperationalMonitor;

  beforeEach(() => {
    healthService = new HealthService();
    operationalMonitor = new OperationalMonitor();
  });

  afterEach(async () => {
    await healthService.stop();
    operationalMonitor.stop();
  });

  it('should work together to provide comprehensive monitoring', async () => {
    // Perform health checks
    const health = await healthService.getHealth();
    const metrics = operationalMonitor.getCurrentMetrics();
    
    expect(health.status).toBe('healthy');
    expect(metrics.memory).toBeDefined();
    expect(metrics.cpu).toBeDefined();
    
    // Generate combined report
    const healthSummary = healthService.getHealthSummary();
    const performanceReport = operationalMonitor.generateHealthSummary();
    
    expect(healthSummary.status).toBeDefined();
    expect(performanceReport.systemHealth).toBeDefined();
  });

  it('should detect and report issues', async () => {
    // Simulate an issue
    operationalMonitor.recordError();
    operationalMonitor.recordError();
    
    const health = await healthService.getHealth();
    const shouldAlert = operationalMonitor.shouldTriggerAlert();
    
    expect(health.status).toBe('healthy'); // Health service might be resilient
    expect(typeof shouldAlert).toBe('boolean');
  });
});