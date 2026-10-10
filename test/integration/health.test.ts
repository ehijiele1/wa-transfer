import { HealthService } from '../../src/services/healthService';
import { OperationalMonitor, operationalMonitor } from '../../src/services/operationalMonitor';
import { getAnonClient } from '../../src/services/supabaseClients';

afterAll(() => {
  // The module-level singleton starts interval-based checks on import.
  operationalMonitor.shutdown();
});

// Mock dependencies
jest.mock('../../src/services/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    monitorHealth: jest.fn()
  }
}));

jest.mock('../../src/services/supabaseClients', () => ({
  getAnonClient: jest.fn(() => ({
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

  afterEach(() => {
    healthService.stopHealthChecks();
  });

  it('produces a health report with overall status and summary', async () => {
    const report = await healthService.getHealthReport();
    expect(['healthy', 'degraded', 'unhealthy']).toContain(report.overall);
    expect(report.timestamp).toBeInstanceOf(Date);
    expect(typeof report.summary.uptime).toBe('number');
  });

  it('reports liveness for a running process', () => {
    const liveness = healthService.getLiveness();
    expect(liveness.status).toBe('alive');
    expect(liveness.uptime).toBeGreaterThanOrEqual(0);
  });

  it('aggregates readiness checks including critical ones', async () => {
    const readiness = await healthService.getReadiness();
    const names = readiness.checks.map((c: { name: string }) => c.name);
    expect(names).toEqual(expect.arrayContaining([
      'Database Connection', 'WhatsApp Service', 'Configuration'
    ]));
  });

  it('marks readiness as not_ready when the database check fails', async () => {
    (getAnonClient as jest.Mock).mockImplementationOnce(() => ({
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: null, error: { message: 'connection refused' } })
      }))
    }));
    const readiness = await healthService.getReadiness();
    expect(readiness.status).toBe('not_ready');
    const dbCheck = readiness.checks.find((c: { name: string }) => c.name === 'Database Connection');
    expect(dbCheck?.passed).toBe(false);
  });

  it('surfaces throwing checks as failed with their message', async () => {
    healthService.addReadinessCheck('boom', jest.fn().mockRejectedValue(new Error('kaboom')));
    const readiness = await healthService.getReadiness();
    const failed = readiness.checks.find((c: { name: string }) => c.name === 'boom');
    expect(failed?.passed).toBe(false);
    expect(failed?.message).toContain('kaboom');
  });

  it('exposes uptime and component metrics', () => {
    const metrics = healthService.getHealthMetrics();
    expect(metrics.uptime).toBeGreaterThanOrEqual(0);
    expect(metrics.totalComponents).toBeGreaterThanOrEqual(0);
  });
});

describe('OperationalMonitor', () => {
  let monitor: OperationalMonitor;

  beforeEach(() => {
    monitor = new OperationalMonitor({ healthCheckIntervalMs: 3600000 });
  });

  afterEach(() => {
    monitor.shutdown();
  });

  it('records request metrics and exposes them', () => {
    monitor.recordRequest('instagram-api', 120, true);
    monitor.recordRequest('instagram-api', 300, false);
    const names = monitor.getMetrics('instagram-api').map(m => m.metric);
    expect(names).toContain('request_count');
    expect(names).toContain('error_count');
    expect(names).toContain('response_time');
  });

  it('summarizes overall status from component health', () => {
    const summary = monitor.getSystemSummary();
    expect(['healthy', 'degraded', 'unhealthy']).toContain(summary.overallStatus);
  });

  it('accepts configuration updates', () => {
    monitor.updateConfig({ metricsRetentionHours: 48 });
    expect(monitor.getMetrics()).toBeInstanceOf(Array);
  });
});
