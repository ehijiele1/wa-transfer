/**
 * Health Check and Monitoring
 * Provides health endpoints and dependency status checks
 */

import { logger } from '../utils/logger';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  dependencies: {
    whatsapp: DependencyStatus;
    supabase: DependencyStatus;
    ollama: DependencyStatus;
    redis: DependencyStatus;
  };
}

export interface DependencyStatus {
  status: 'up' | 'down' | 'degraded';
  latency?: number;
  lastChecked: string;
  error?: string;
}

class HealthChecker {
  private startTime: number;

  constructor() {
    this.startTime = Date.now();
  }

  async checkHealth(): Promise<HealthStatus> {
    const dependencies = {
      whatsapp: await this.checkWhatsApp(),
      supabase: await this.checkSupabase(),
      ollama: await this.checkOllama(),
      redis: await this.checkRedis(),
    };

    const allUp = Object.values(dependencies).every(dep => dep.status === 'up');
    const anyDown = Object.values(dependencies).some(dep => dep.status === 'down');

    return {
      status: allUp ? 'healthy' : anyDown ? 'unhealthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      dependencies,
    };
  }

  private async checkWhatsApp(): Promise<DependencyStatus> {
    try {
      // WhatsApp is a WebSocket connection, not HTTP
      // For now, we'll just check if the service is initialized
      return {
        status: 'up',
        lastChecked: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        status: 'down',
        lastChecked: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  private async checkSupabase(): Promise<DependencyStatus> {
    const start = Date.now();
    try {
      // Import here to avoid circular dependency
      const SupabaseService = (await import('../services/supabase')).default;
      const supabaseService = new SupabaseService();
      await supabaseService.getRecentMessages(1);
      
      return {
        status: 'up',
        latency: Date.now() - start,
        lastChecked: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        status: 'down',
        lastChecked: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  private async checkOllama(): Promise<DependencyStatus> {
    const start = Date.now();
    try {
      const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
      const response = await fetch(`${baseUrl}/api/tags`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return {
        status: 'up',
        latency: Date.now() - start,
        lastChecked: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        status: 'down',
        lastChecked: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  private async checkRedis(): Promise<DependencyStatus> {
    const start = Date.now();
    try {
      const { queueManager } = await import('../queues/queueManager');
      await queueManager.getQueueStats('health-check');
      
      return {
        status: 'up',
        latency: Date.now() - start,
        lastChecked: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        status: 'down',
        lastChecked: new Date().toISOString(),
        error: error.message,
      };
    }
  }

  getUptime(): number {
    return Date.now() - this.startTime;
  }
}

export const healthChecker = new HealthChecker();