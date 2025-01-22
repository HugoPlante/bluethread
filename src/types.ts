interface Thread {
    id: string;
    posts: ThreadPost[];
    createdAt: Date;
}

interface ThreadPost {
    text: string;
    author: string;
    createdAt: Date;
}