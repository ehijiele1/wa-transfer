import { healthService, getHealth, getLiveness, getReadiness, getHealthMetrics } from './healthService';
import { logger } from './logger';
import { createServer, IncomingMessage, ServerResponse } from 'http';

export interface HealthServerConfig {
  port: number;
  host: string;
  enableCors: boolean;
  logRequests: boolean;
}

export class HealthServer {
  private config: HealthServerConfig;
  private server: any = null;
  private intervals: NodeJS.Timeout[] = [];

  constructor(config: Partial<HealthServerConfig> = {}) {
    this.config = {
      // Bind all interfaces by default: inside containers the server must be
      // reachable via IPv4 (localhost would bind ::1 only and break health probes)
      port: Number(process.env.HEALTH_SERVER_PORT) || 3001,
      host: process.env.HEALTH_SERVER_HOST || '0.0.0.0',
      enableCors: true,
      logRequests: true,
      ...config,
    };
  }

  private createJsonResponse(res: ServerResponse, data: any, statusCode: number = 200): void {
    res.writeHead(statusCode, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data, null, 2));
  }

  private createErrorResponse(res: ServerResponse, message: string, statusCode: number = 500): void {
    this.createJsonResponse(res, { error: message, timestamp: new Date().toISOString() }, statusCode);
  }

  private async handleHealthRequest(req: IncomingMessage, res: ServerResponse, component?: string): Promise<void> {
    try {
      const startTime = Date.now();
      
      if (req.method !== 'GET') {
        this.createErrorResponse(res, 'Method not allowed', 405);
        return;
      }

      const healthData = component ? 
        await healthService.getHealthCheck(component) : 
        await getHealth();

      const responseTime = Date.now() - startTime;
      
      // Log the request
      if (this.config.logRequests) {
        logger.info('HealthServer', `Health request ${component ? `for ${component}` : 'overall'}`, {
          method: req.method,
          url: req.url,
          statusCode: 200,
          responseTime,
          userAgent: req.headers['user-agent'],
        });
      }

      this.createJsonResponse(res, {
        ...healthData,
        metadata: {
          responseTime,
          timestamp: new Date().toISOString(),
          version: process.env.npm_package_version || '1.0.0',
        },
      });

    } catch (error) {
      logger.error('HealthServer', 'Health request failed', { 
        error: error instanceof Error ? error.message : String(error),
        url: req.url,
        method: req.method,
      });
      
      this.createErrorResponse(res, 'Internal server error', 500);
    }
  }

  private async handleLivenessRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      if (req.method !== 'GET') {
        this.createErrorResponse(res, 'Method not allowed', 405);
        return;
      }

      const livenessData = getLiveness();
      
      if (this.config.logRequests) {
        logger.info('HealthServer', 'Liveness request', {
          method: req.method,
          url: req.url,
          statusCode: 200,
        });
      }

      this.createJsonResponse(res, {
        ...livenessData,
        metadata: {
          timestamp: new Date().toISOString(),
          version: process.env.npm_package_version || '1.0.0',
        },
      });

    } catch (error) {
      logger.error('HealthServer', 'Liveness request failed', { 
        error: error instanceof Error ? error.message : String(error),
        url: req.url,
        method: req.method,
      });
      
      this.createErrorResponse(res, 'Internal server error', 500);
    }
  }

  private async handleReadinessRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      if (req.method !== 'GET') {
        this.createErrorResponse(res, 'Method not allowed', 405);
        return;
      }

      const readinessData = await getReadiness();
      
      if (this.config.logRequests) {
        logger.info('HealthServer', 'Readiness request', {
          method: req.method,
          url: req.url,
          statusCode: readinessData.status === 'ready' ? 200 : 503,
          isReady: readinessData.status,
        });
      }

      const statusCode = readinessData.status === 'ready' ? 200 : 503;
      this.createJsonResponse(res, {
        ...readinessData,
        metadata: {
          timestamp: new Date().toISOString(),
          version: process.env.npm_package_version || '1.0.0',
        },
      }, statusCode);

    } catch (error) {
      logger.error('HealthServer', 'Readiness request failed', { 
        error: error instanceof Error ? error.message : String(error),
        url: req.url,
        method: req.method,
      });
      
      this.createErrorResponse(res, 'Internal server error', 500);
    }
  }

  private async handleMetricsRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      if (req.method !== 'GET') {
        this.createErrorResponse(res, 'Method not allowed', 405);
        return;
      }

      const metricsData = getHealthMetrics();
      
      if (this.config.logRequests) {
        logger.info('HealthServer', 'Metrics request', {
          method: req.method,
          url: req.url,
          statusCode: 200,
        });
      }

      this.createJsonResponse(res, {
        ...metricsData,
        metadata: {
          timestamp: new Date().toISOString(),
          version: process.env.npm_package_version || '1.0.0',
        },
      });

    } catch (error) {
      logger.error('HealthServer', 'Metrics request failed', { 
        error: error instanceof Error ? error.message : String(error),
        url: req.url,
        method: req.method,
      });
      
      this.createErrorResponse(res, 'Internal server error', 500);
    }
  }

  private async handleRootRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    try {
      if (req.method !== 'GET') {
        this.createErrorResponse(res, 'Method not allowed', 405);
        return;
      }

      // Get overall health for root endpoint
      const healthData = await getHealth();
      
      if (this.config.logRequests) {
        logger.info('HealthServer', 'Root health request', {
          method: req.method,
          url: req.url,
          statusCode: 200,
        });
      }

      this.createJsonResponse(res, {
        status: 'ok',
        service: 'wa-transfer',
        version: process.env.npm_package_version || '1.0.0',
        timestamp: new Date().toISOString(),
        endpoints: {
          health: '/health',
          healthComponent: '/health/:component',
          liveness: '/liveness',
          readiness: '/readiness',
          metrics: '/metrics',
        },
        ...(typeof healthData === 'object' && 'overall' in healthData ? {
          overall: healthData.overall,
          components: Object.keys(healthData.components).length,
          uptime: healthData.summary.uptime,
        } : {}),
      });

    } catch (error) {
      logger.error('HealthServer', 'Root request failed', { 
        error: error instanceof Error ? error.message : String(error),
        url: req.url,
        method: req.method,
      });
      
      this.createErrorResponse(res, 'Internal server error', 500);
    }
  }

  private setupRoutes(): void {
    this.server.on('request', (req: IncomingMessage, res: ServerResponse): void => {
      // Handle CORS
      if (this.config.enableCors) {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        
        if (req.method === 'OPTIONS') {
          res.writeHead(200);
          res.end();
          return;
        }
      }

      // Route handling
      const url = req.url || '';
      
      if (url === '/health') {
        this.handleHealthRequest(req, res);
      } else if (url.startsWith('/health/')) {
        const component = url.replace('/health/', '');
        this.handleHealthRequest(req, res, component);
      } else if (url === '/liveness') {
        this.handleLivenessRequest(req, res);
      } else if (url === '/readiness') {
        this.handleReadinessRequest(req, res);
      } else if (url === '/metrics') {
        this.handleMetricsRequest(req, res);
      } else if (url === '/' || url === '/health') {
        this.handleRootRequest(req, res);
      } else {
        this.createErrorResponse(res, 'Not found', 404);
      }
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = createServer();
        this.setupRoutes();

        this.server.listen(this.config.port, this.config.host, () => {
          logger.info('HealthServer', `Health server started on ${this.config.host}:${this.config.port}`, {
            port: this.config.port,
            host: this.config.host,
            enableCors: this.config.enableCors,
          });
          
          // Start health checks
          healthService.startHealthChecks();
          
          resolve();
        });

        this.server.on('error', (error: Error) => {
          logger.error('HealthServer', 'Health server error', { error: error.message });
          reject(error);
        });

      } catch (error) {
        logger.error('HealthServer', 'Failed to start health server', { 
          error: error instanceof Error ? error.message : String(error) 
        });
        reject(error);
      }
    });
  }

  async stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          logger.info('HealthServer', 'Health server stopped');
          
          // Stop health checks
          healthService.stopHealthChecks();
          
          this.server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  updateConfig(newConfig: Partial<HealthServerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    logger.info('HealthServer', 'Configuration updated', { newConfig });
  }

  getConfig(): HealthServerConfig {
    return { ...this.config };
  }

  isRunning(): boolean {
    return this.server !== null;
  }
}

// Global health server instance
export const healthServer = new HealthServer();

// Convenience functions for starting/stopping
export const startHealthServer = async (config?: Partial<HealthServerConfig>) => {
  if (config) {
    healthServer.updateConfig(config);
  }
  return await healthServer.start();
};

export const stopHealthServer = async () => {
  return await healthServer.stop();
};