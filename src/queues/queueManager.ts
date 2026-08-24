/**
 * Queue Manager using BullMQ
 * Provides persistent, restart-safe job queues with Redis backend
 */

import { Queue, Worker, Job, JobsOptions } from 'bullmq';
import Redis from 'ioredis';
import { logger } from '../utils/logger';

export interface QueueJob {
  id: string;
  type: 'schedule_post' | 'publish_post' | 'generate_carousel' | 'send_notification' | 'process_messages';
  payload: any;
  priority: 'high' | 'medium' | 'low';
  attempts: number;
  maxAttempts: number;
  scheduledAt?: Date;
}

export class QueueManager {
  private redis: Redis;
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();

  constructor() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 500, 3000);
        return delay;
      },
    });

    this.redis.on('connect', () => {
      logger.info('Redis connected', { redisUrl });
    });

    this.redis.on('error', (err) => {
      logger.error('Redis connection error', err);
    });
  }

  createQueue(name: string): Queue {
    if (!this.queues.has(name)) {
      const queue = new Queue(name, {
        connection: this.redis,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: {
            count: 1000,
            age: 24 * 3600,
          },
          removeOnFail: {
            count: 5000,
            age: 7 * 24 * 3600,
          },
        },
      });

      this.queues.set(name, queue);
      logger.info('Queue created', { queueName: name });
    }

    return this.queues.get(name)!;
  }

  async addJob(queueName: string, jobData: QueueJob): Promise<Job> {
    const queue = this.createQueue(queueName);

    const jobOptions: JobsOptions = {
      priority: jobData.priority === 'high' ? 1 : jobData.priority === 'medium' ? 5 : 10,
      attempts: jobData.maxAttempts,
      backoff: {
        type: 'exponential',
        delay: 2000,
      },
    };

    if (jobData.scheduledAt && jobData.scheduledAt > new Date()) {
      jobOptions.delay = jobData.scheduledAt.getTime() - Date.now();
    }

    const job = await queue.add(jobData.type, jobData.payload, jobOptions);
    logger.info('Job added to queue', {
      queueName,
      jobId: job.id,
      type: jobData.type,
      priority: jobData.priority,
    });

    return job;
  }

  createWorker(queueName: string, processor: (job: Job) => Promise<any>): Worker {
    if (!this.workers.has(queueName)) {
      const queue = this.createQueue(queueName);
      const worker = new Worker(queueName, processor, { connection: this.redis });

      worker.on('completed', (job) => {
        logger.info('Job completed', { queueName, jobId: job.id });
      });

      worker.on('failed', (job, err) => {
        logger.error('Job failed', err, { queueName, jobId: job?.id });
      });

      worker.on('error', (err) => {
        logger.error('Worker error', err, { queueName });
      });

      this.workers.set(queueName, worker);
      logger.info('Worker created', { queueName });
    }

    return this.workers.get(queueName)!;
  }

  async getQueueStats(queueName: string): Promise<any> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      return null;
    }

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      queueName,
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + delayed,
    };
  }

  async close(): Promise<void> {
    logger.info('Closing queue manager');
    
    const closePromises = [];
    for (const [name, queue] of this.queues) {
      closePromises.push(queue.close());
    }
    for (const [name, worker] of this.workers) {
      closePromises.push(worker.close());
    }
    for (const [name, redis] of this.queues) {
      // Redis connection is shared, close once
      break;
    }

    await Promise.all(closePromises);
    await this.redis.quit();
    logger.info('Queue manager closed');
  }
}

export const queueManager = new QueueManager();