// blueskyFirehose.ts
import { BskyAgent, AppBskyFeedPost } from '@atproto/api';
import { isPostProcessed, markPostProcessed } from './storage';

const JETSTREAMS = [
    'wss://jetstream1.us-east.bsky.network',
    'wss://jetstream2.us-east.bsky.network',
    'wss://jetstream1.us-west.bsky.network',
    'wss://jetstream2.us-west.bsky.network'
];

export class BlueskyFirehose {
    private agent: BskyAgent;

    constructor(agent: BskyAgent) {
        this.agent = agent;
    }

    public start() {
        this.connectToFirehose();
    }

    private connectToFirehose() {
        const wsUrl = JETSTREAMS[Math.floor(Math.random() * JETSTREAMS.length)] +
            '/subscribe?wantedCollections=app.bsky.feed.post';
        const ws = new WebSocket(wsUrl);

        ws.onmessage = async (event) => this.handleMessage(event);
        ws.onclose = () => this.handleClose();
        ws.onerror = (err) => this.handleError(err, ws);
    }

    private async handleMessage(event: MessageEvent) {
        const data = JSON.parse(event.data);
        if (AppBskyFeedPost.isRecord(data?.commit?.record)) {
            try {
                await this.handlePost({
                    uri: data.uri,
                    cid: data.cid,
                    record: data.commit.record
                });
            } catch (err) {
                console.error('Error processing post:', err);
            }
        }
    }

    

    private async handlePost(post: any) {
        const postUri = post.uri;
        const text = post.record.text;
        const authorDid = post.record.did;

        if (await isPostProcessed(postUri)) return;

        // Find the root of the thread
        const rootPost = await this.findRootPost(postUri);

        // Check if we already processed this thread
        let thread = await getThreadByRootUri(rootPost.uri);

        if (!thread) {
            // Create initial thread record
            thread = await createThread(
                text,
                rootPost.uri,
                authorDid,
                rootPost.uri === postUri ? undefined : rootPost.uri
            );
        }

        // Fetch and merge all posts in the thread
        const mergedContent = await this.mergeThreadPosts(rootPost.uri, authorDid);

        // Update the thread with merged content
        await updateMergedContent(thread.id, mergedContent);

        // Send reply with link
        await this.sendThreadLink(post, thread.id);

        // Mark as processed
        await markPostProcessed(postUri);
    }

    private async detectMentions(text: string): Promise<string[]> {
        const { RichText } = await import('@atproto/api');
        const rt = new RichText({ text });
        await rt.detectFacets(this.agent);

        return rt.facets?.flatMap(facet =>
            facet.features
                .filter(f => f.$type === 'app.bsky.richtext.facet#mention')
                .map(f => f.did)
        ) || [];
    }

    private async sendReply(post: any) {
        const { RichText } = await import('@atproto/api');
        const parentPost = await this.agent.getPost({ uri: post.uri });
        const authorHandle = parentPost.data.author.handle;

        const responseText = `@${authorHandle} Thanks for mentioning me! Here's a random number: ${Math.floor(Math.random() * 100)}`;
        const responseRt = new RichText({ text: responseText });
        await responseRt.detectFacets(this.agent);

        await this.agent.post({
            text: responseRt.text,
            facets: responseRt.facets,
            reply: {
                parent: parentPost.data,
                root: parentPost.data
            }
        });
    }

    private handleClose() {
        console.log('Connection closed, reconnecting...');
        setTimeout(() => this.connectToFirehose(), 5000);
    }

    private handleError(err: Event, ws: WebSocket) {
        console.error('WebSocket error:', err);
        ws.close();
    }
}