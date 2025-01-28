import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Function to create a new thread
export async function createThread(content: string) {
    return await prisma.thread.create({
        data: {
            content,
        },
    });
}

// Function to retrieve a thread by ID
export async function getThreadById(id: string) {
    return await prisma.thread.findUnique({
        where: {
            id,
        },
    });
}

// Function to update a thread
export async function updateThread(id: string, content: string) {
    return await prisma.thread.update({
        where: {
            id,
        },
        data: {
            content,
        },
    });
}

// Function to delete a thread
export async function deleteThread(id: string) {
    return await prisma.thread.delete({
        where: {
            id,
        },
    });
}

// Ensure to disconnect Prisma Client when your application exits
process.on('beforeExit', () => {
    prisma.$disconnect();
});