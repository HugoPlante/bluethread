import { Elysia } from 'elysia';
import { BskyAgent, RichText } from '@atproto/api'; // Use the Bluesky Agent for direct authentication
import { createThread, getThreadById } from './storage';

const BLUESKY_USERNAME = process.env.BLUESKY_USERNAME || "";
const BLUESKY_PASSWORD = process.env.BLUESKY_PASSWORD || "";

if (BLUESKY_USERNAME.length == 0 || BLUESKY_PASSWORD.length == 0) {
    throw new Error('Bluesky credentials are missing in the .env file');
}

// Initialize the Bluesky Agent
const agent = new BskyAgent({ service: 'https://bsky.social' });

// Authenticate the bot using credentials from .env
async function authenticateBot() {
    try {
        await agent.login({
            identifier: BLUESKY_USERNAME,
            password: BLUESKY_PASSWORD
        })
        console.log('Bot authenticated successfully!');
    } catch (error) {
        console.error('Failed to authenticate bot:', error);
        throw error;
    }
}

await authenticateBot();

async function post(text: string) {
    const richText = new RichText({ text });
    await richText.detectFacets(agent);

    await agent.post({
        text: richText.text,
        facets: richText.facets,
    });
}

async function fetchPost(postId: string) {
    const threadView = await agent.getPostThread({ uri: postId });
    return threadView;
}

console.log(await fetchPost("https://bsky.app/profile/bluethreadapp.bsky.social/post/3lgjfbswuvf2x"))

const app = new Elysia()
    .get('/', () => 'Hello Bun!')
    .get('/thread/:id', async ({ params: { id }, set }) => {
        try {
            // Fetch the post using the authenticated agent
            const post = await agent.getPost({ uri: id });
            return post.data;
        } catch (error) {
            set.status = 404;
            return 'Post not found';
        }
    })
    .post('/thread', async ({ body }) => {
        const { content } = body as { content: string };
        const thread = await createThread(content);
        return { id: thread.id };
    })
    .listen(3000);

console.log(
    `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);