import type {
  NPC,
  Quest,
  NPCMemory as PrismaNPCMemory,
  NPCMemory,
  Reputation,
  RequiredItem,
} from "@prisma/client";
import { StoryService } from "./story.service.js";
import { MemoryService } from "./memory.service.js";
import type { NPCRole } from "../types/npc.js";
import { prisma } from "@repositories/database.js";
import type {
  QuestRequirements as PrismaQuestRequirement,
  StoryProgress,
} from "../types/story.js";
import type { GameAction } from "../types/actions.js";

export class NPCService {
  private storyService: StoryService;
  private memoryService: MemoryService;

  constructor() {
    this.storyService = new StoryService();
    this.memoryService = new MemoryService();
  }

  async getNPC(npcId: string): Promise<NPCRole | null> {
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

  async getAvailableQuests(npcId: string, playerId: string): Promise<Quest[]> {
    const progress = await this.storyService.getPlayerProgress(playerId);
    const npc = await this.getNPC(npcId);

    if (!npc) throw new Error("NPC not found");

    return npc.quests.filter((quest) => {
      if (!quest.requirements) return true;
      return this.checkQuestRequirements(quest.requirements, progress);
    });
  }

  private checkQuestRequirements(
    requirements:
      | (PrismaQuestRequirement & {
          reputation: Reputation[];
          items: RequiredItem[];
        })
      | null,
    progress: StoryProgress
  ): boolean {
    if (!requirements) return true;

    const { reputation, items, quests } = requirements;

    // Check reputation requirements
    if (reputation?.length) {
      for (const req of reputation) {
        const playerRep = progress.reputation.find(
          (r) => r.faction === req.faction
        );
        if (!playerRep || playerRep.amount < req.amount) {
          return false;
        }
      }
    }

    // Check item requirements
    if (items?.length) {
      for (const item of items) {
        const playerItem = progress.inventory.find(
          (i) => i.itemId === item.itemId
        );
        if (!playerItem || playerItem.quantity < item.quantity) {
          return false;
        }
      }
    }

    // Check quest requirements
    if (quests?.length) {
      return quests.every((questId) =>
        progress.completedQuests.includes(questId)
      );
    }

    return true;
  }

  async updateNPCMemory(
    npcId: string,
    playerId: string,
    interaction: { message: string; actions: GameAction[] }
  ): Promise<NPCMemory> {
    const sentiment = await this.analyzeSentiment(interaction.message);
    const keyFacts = await this.extractKeyFacts(interaction);

    const memory = await this.memoryService.updateMemory(
      npcId,
      playerId,
      [{ role: "assistant", content: interaction.message }],
      sentiment,
      keyFacts
    );

    return memory;
  }

  private async analyzeSentiment(message: string): Promise<number> {
    // TODO: Implement proper sentiment analysis
    // For now, basic positive/negative word checking
    const positiveWords = ["happy", "glad", "good", "great", "excellent"];
    const negativeWords = ["bad", "sad", "angry", "awful", "terrible"];

    const words = message.toLowerCase().split(" ");
    const positive = words.filter((w) => positiveWords.includes(w)).length;
    const negative = words.filter((w) => negativeWords.includes(w)).length;

    return (positive - negative) / words.length || 0;
  }

  private async extractKeyFacts(interaction: {
    message: string;
    actions: GameAction[];
  }): Promise<string[]> {
    const facts: string[] = [];
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
          const item = await prisma.inventoryItem.findFirst({
            where: { itemId: action.data.itemId },
          });
          if (item) {
            facts.push(`Received item: ${item.name}`);
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
