import { StoryService } from "./story.service.js";
import { MemoryService } from "./memory.service.js";
import { prisma } from "@repositories/database.js";
export class NPCService {
    storyService;
    memoryService;
    constructor() {
        this.storyService = new StoryService();
        this.memoryService = new MemoryService();
    }
    async getNPC(npcId) {
        return await prisma.nPC.findUnique({
            where: { id: npcId },
            include: {
                quests: {
                    include: {
                        requirements: {
                            include: {
                                reputation: true,
                                items: true,
                            },
                        },
                    },
                },
                memories: {
                    orderBy: { lastInteraction: "desc" },
                    take: 5,
                    include: {
                        quest: true,
                        npc: true,
                    },
                },
            },
        });
    }
    async getAvailableQuests(npcId, playerId) {
        const progress = await this.storyService.getPlayerProgress(playerId);
        const npc = await this.getNPC(npcId);
        if (!npc)
            throw new Error("NPC not found");
        return npc.quests.filter((quest) => {
            if (!quest.requirements)
                return true;
            return this.checkQuestRequirements(quest.requirements, progress);
        });
    }
    checkQuestRequirements(requirements, progress) {
        if (!requirements)
            return true;
        const { reputation, items, quests } = requirements;
        // Check reputation requirements
        if (reputation?.length) {
            for (const req of reputation) {
                const playerRep = progress.reputation.find((r) => r.faction === req.faction);
                if (!playerRep || playerRep.amount < req.amount) {
                    return false;
                }
            }
        }
        // Check item requirements
        if (items?.length) {
            for (const item of items) {
                const playerItem = progress.inventory.find((i) => i.itemId === item.itemId);
                if (!playerItem || playerItem.quantity < item.quantity) {
                    return false;
                }
            }
        }
        // Check quest requirements
        if (quests?.length) {
            return quests.every((questId) => progress.completedQuests.includes(questId));
        }
        return true;
    }
    async updateNPCMemory(npcId, playerId, interaction) {
        const sentiment = await this.analyzeSentiment(interaction.message);
        const keyFacts = await this.extractKeyFacts(interaction);
        const memory = await this.memoryService.updateMemory(npcId, playerId, [{ role: "assistant", content: interaction.message }], sentiment, keyFacts);
        return memory;
    }
    async analyzeSentiment(message) {
        // TODO: Implement proper sentiment analysis
        // For now, basic positive/negative word checking
        const positiveWords = ["happy", "glad", "good", "great", "excellent"];
        const negativeWords = ["bad", "sad", "angry", "awful", "terrible"];
        const words = message.toLowerCase().split(" ");
        const positive = words.filter((w) => positiveWords.includes(w)).length;
        const negative = words.filter((w) => negativeWords.includes(w)).length;
        return (positive - negative) / words.length || 0;
    }
    async extractKeyFacts(interaction) {
        const facts = [];
        const quest = await prisma.quest.findFirst({
            where: {
                id: interaction.actions.find((a) => a.type === "START_QUEST")?.data
                    .questId,
            },
        });
        if (quest) {
            facts.push(`Started quest: ${quest.title}`);
        }
        // Add other fact extractions based on actions
        for (const action of interaction.actions) {
            switch (action.type) {
                case "GIVE_ITEM":
                    {
                        const item = await prisma.inventoryItem.findFirst({
                            where: { itemId: action.data.itemId },
                        });
                        if (item) {
                            facts.push(`Received item: ${item.name}`);
                        }
                    }
                    break;
                case "UPDATE_REPUTATION":
                    facts.push(`Reputation changed with ${action.data.targetId}`);
                    break;
            }
        }
        return facts;
    }
}
