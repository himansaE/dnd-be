import { prisma } from "@repositories/database.js";
export class ChatRepository {
    async createSession(userId, title) {
        const initialMessage = {
            role: "system",
            content: "Initial session started.",
            chatHistory: {
                create: {
                    userId,
                    title,
                },
            },
        };
        const chatHistory = await prisma.message.create({
            data: initialMessage,
            select: {
                chatHistory: {
                    include: {
                        messages: true,
                    },
                },
            },
        });
        return chatHistory.chatHistory;
    }
    async updateSession(id, messages) {
        // First delete existing messages to maintain conversation order
        await prisma.message.deleteMany({
            where: { chatHistoryId: id },
        });
        // Then create new messages
        const messageData = messages.map((msg) => ({
            chatHistoryId: id,
            role: msg.role,
            content: typeof msg.content === "string"
                ? msg.content
                : JSON.stringify(msg.content),
        }));
        await prisma.message.createMany({
            data: messageData,
        });
        return (await prisma.chatHistory.findUnique({
            where: { id },
            include: { messages: true },
        }));
    }
    async getSession(id) {
        const session = await prisma.chatHistory.findUnique({
            where: { id },
            include: {
                messages: {
                    orderBy: { createdAt: "asc" },
                },
            },
        });
        return session;
    }
    async getUserSessions(userId) {
        return await prisma.chatHistory.findMany({
            where: { userId },
            orderBy: { updatedAt: "desc" },
        });
    }
    convertToMessageCreate(msg) {
        return {
            role: msg.role,
            content: typeof msg.content === "string"
                ? msg.content
                : JSON.stringify(msg.content),
        };
    }
}
