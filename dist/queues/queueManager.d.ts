import { Queue, Worker, Job } from 'bullmq';
export interface QueueJob {
    id: string;
    type: 'schedule_post' | 'publish_post' | 'generate_carousel' | 'send_notification' | 'process_messages';
    payload: any;
    priority: 'high' | 'medium' | 'low';
    attempts: number;
    maxAttempts: number;
    scheduledAt?: Date;
}
export declare class QueueManager {
    private redis;
    private queues;
    private workers;
    constructor();
    createQueue(name: string): Queue;
    addJob(queueName: string, jobData: QueueJob): Promise<Job>;
    createWorker(queueName: string, processor: (job: Job) => Promise<any>): Worker;
    getQueueStats(queueName: string): Promise<any>;
    close(): Promise<void>;
}
export declare const queueManager: QueueManager;
//# sourceMappingURL=queueManager.d.ts.map