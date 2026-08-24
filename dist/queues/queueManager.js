"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueManager = exports.QueueManager = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("../utils/logger");
class QueueManager {
    redis;
    queues = new Map();
    workers = new Map();
    constructor() {
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        this.redis = new ioredis_1.default(redisUrl, {
            maxRetriesPerRequest: 3,
            retryStrategy: (times) => {
                const delay = Math.min(times * 500, 3000);
                return delay;
            },
        });
        this.redis.on('connect', () => {
            logger_1.logger.info('Redis connected', { redisUrl });
        });
        this.redis.on('error', (err) => {
            logger_1.logger.error('Redis connection error', err);
        });
    }
    createQueue(name) {
        if (!this.queues.has(name)) {
            const queue = new bullmq_1.Queue(name, {
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
            logger_1.logger.info('Queue created', { queueName: name });
        }
        return this.queues.get(name);
    }
    async addJob(queueName, jobData) {
        const queue = this.createQueue(queueName);
        const jobOptions = {
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
        logger_1.logger.info('Job added to queue', {
            queueName,
            jobId: job.id,
            type: jobData.type,
            priority: jobData.priority,
        });
        return job;
    }
    createWorker(queueName, processor) {
        if (!this.workers.has(queueName)) {
            const queue = this.createQueue(queueName);
            const worker = new bullmq_1.Worker(queueName, processor, { connection: this.redis });
            worker.on('completed', (job) => {
                logger_1.logger.info('Job completed', { queueName, jobId: job.id });
            });
            worker.on('failed', (job, err) => {
                logger_1.logger.error('Job failed', err, { queueName, jobId: job?.id });
            });
            worker.on('error', (err) => {
                logger_1.logger.error('Worker error', err, { queueName });
            });
            this.workers.set(queueName, worker);
            logger_1.logger.info('Worker created', { queueName });
        }
        return this.workers.get(queueName);
    }
    async getQueueStats(queueName) {
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
    async close() {
        logger_1.logger.info('Closing queue manager');
        const closePromises = [];
        for (const [name, queue] of this.queues) {
            closePromises.push(queue.close());
        }
        for (const [name, worker] of this.workers) {
            closePromises.push(worker.close());
        }
        for (const [name, redis] of this.queues) {
            break;
        }
        await Promise.all(closePromises);
        await this.redis.quit();
        logger_1.logger.info('Queue manager closed');
    }
}
exports.QueueManager = QueueManager;
exports.queueManager = new QueueManager();
//# sourceMappingURL=queueManager.js.map