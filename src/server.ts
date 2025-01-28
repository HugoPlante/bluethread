import { Elysia } from 'elysia';
import { BskyAgent, RichText } from '@atproto/api'; // Use the Bluesky Agent for direct authentication
import { createThread, getThreadById } from './storage';
import { BlueskyFirehose } from './bluesky';

const BLUESKY_USERNAME = process.env.BLUESKY_USERNAME || "";
const BLUESKY_PASSWORD = process.env.BLUESKY_PASSWORD || "";

if (BLUESKY_USERNAME.length == 0 || BLUESKY_PASSWORD.length == 0) {
    throw new Error('Bluesky credentials are missing in the .env file');
}
const agent = new BskyAgent({ service: 'https://bsky.social' });

async function authenticate() {
    try {
        await agent.login({
            identifier: process.env.BLUESKY_USERNAME!,
            password: process.env.BLUESKY_PASSWORD!
        });
        console.log('🤖 Bot authenticated');
        new BlueskyFirehose(agent).start();
        console.log(`${agent.session?.did} unroll`)
    } catch (error) {
        console.error('Authentication failed:', error);
        process.exit(1);
    }
}

const app = new Elysia()
    .get('/', () => 'Hello Bun!')
    .get('/thread/:id', async ({ params: { id }, set }) => {
        try {
            const thread = await getThreadById(id);
            if (!thread) {
                set.status = 404;
                return 'Thread not found';
            }

            // Return HTML with formatted content
            return new Response(
                `<html>
        <head><title>Thread Archive</title></head>
        <body>
          <h1>Thread Archive</h1>
          <pre>${thread.mergedContent}</pre>
        </body>
      </html>`,
                { headers: { 'Content-Type': 'text/html' } }
            );
        } catch (error) {
            set.status = 500;
            return 'Error retrieving thread';
        }
    })
    .listen(3000);

console.log(`🦊 Server running at ${app.server?.hostname}:${app.server?.port}`);

await authenticate().catch(console.error);