import express from 'express';
import { PrismaClient } from '@prisma/client';
import { BlueskyService } from './bluesky';

const app = express();
const prisma = new PrismaClient();
const bluesky = new BlueskyService();

app.get('/thread/:id', async (req, res) => {
    const thread = await prisma.thread.findUnique({
        where: { id: req.params.id }
    });

    if (!thread) {
        return res.status(404).json({ error: 'Thread not found' });
    }

    res.render('thread', { thread });
});

// Webhook endpoint for bot mentions
app.post('/webhook', async (req, res) => {
    const { postId } = req.body;

    try {
        const thread = await bluesky.fetchThread(postId);
        await prisma.thread.create({
            data: thread
        });

        res.json({ success: true, threadId: thread.id });
    } catch (error) {
        res.status(500).json({ error: 'Failed to process thread' });
    }
});

app.listen(3000);