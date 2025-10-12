import { prisma } from "@repositories/database.js";
export class MemoryService {
    async getMemories(npcId, playerId) {
        return await prisma.nPCMemory.findMany({
            where: { npcId, playerId },
            orderBy: { lastInteraction: "desc" },
            take: 5,
            include: {
                quest: true,
                npc: true,
                interaction: true,
            },
        });
    }
    async updateMemory(npcId, playerId, messages, sentiment, key_facts) {
        // First create chat history and messages
        const chatHistoryData = {
            user: { connect: { id: playerId } },
            title: `Interaction with NPC ${npcId}`,
            messages: {
                create: messages.map((msg) => ({
                    role: msg.role,
                    content: typeof msg.content === "string"
                        ? msg.content
                        : JSON.stringify(msg.content),
                })),
            },
        };
        const chatHistory = await prisma.chatHistory.create({
            data: chatHistoryData,
            include: {
                messages: true,
            },
        });
        const recentMemory = await prisma.nPCMemory.findFirst({
            where: {
                npcId,
                playerId,
                lastInteraction: {
                    gte: new Date(Date.now() - 1000 * 60 * 30),
                },
            },
        });
        if (recentMemory) {
            // Update existing memory
            const memoryData = {
                interaction: {
                    connect: chatHistory.messages.map((msg) => ({ id: msg.id })),
                },
                sentiment: (recentMemory.sentiment + sentiment) / 2,
                key_facts: [...new Set([...recentMemory.key_facts, ...key_facts])],
                lastInteraction: new Date(),
            };
            return await prisma.nPCMemory.update({
                where: { id: recentMemory.id },
                data: memoryData,
                include: {
                    npc: true,
                    quest: true,
                    interaction: true,
                },
            });
        }
        // Create new memory
        const memoryData = {
            npc: { connect: { id: npcId } },
            player: { connect: { id: playerId } },
            interaction: {
                connect: chatHistory.messages.map((msg) => ({ id: msg.id })),
            },
            sentiment,
            key_facts,
            lastInteraction: new Date(),
        };
        return await prisma.nPCMemory.create({
            data: memoryData,
            include: {
                npc: true,
                quest: true,
                interaction: true,
            },
        });
    }
}
