import Bull from 'bull';
import { BlueskyService } from './bluesky';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const bluesky = new BlueskyService();

// Create the queue
export const threadQueue = new Bull('thread-processing', {
    redis: {
        host: process.env.REDIS_HOST,
        port: Number(process.env.REDIS_PORT),
    },
    defaultJobOptions: {
        attempts: 3,  // Retry failed jobs 3 times
        backoff: {
            type: 'exponential',
            delay: 1000  // Start with 1s delay, then 2s, then 4s
        }
    }
});

// Process jobs from the queue
threadQueue.process(async (job) => {
    const { postId } = job.data;

    try {
        const thread = await bluesky.fetchThread(postId);
        await prisma.thread.create({
            data: thread
        });

        return { threadId: thread.id };
    } catch (error) {
        console.error(`Failed to process thread ${postId}:`, error);
        throw error; // This will trigger a retry if attempts remain
    }
});

// Monitor queue errors
threadQueue.on('failed', (job, err) => {
    console.error(`Job ${job.id} failed with error:`, err);
});