import { ItemType, type PlayerProgress, type Quest } from "@prisma/client";
import type { StoryProgress } from "../types/story.js";

import { prisma } from "@repositories/database.js";
import type { GameAction } from "../types/actions.js";
export class StoryService {
  async getPlayerProgress(playerId: string): Promise<StoryProgress> {
    const progress = await prisma.playerProgress.findUnique({
      where: { userId: playerId },
      include: {
        activeQuests: {
          include: {
            quest: {
              include: {
                steps: true,
              },
            },
          },
        },
        inventory: true,
        reputation: true,
        storyState: true,
      },
    });

    if (!progress) {
      return this.initializePlayerProgress(playerId);
    }

    return progress as StoryProgress;
  }

  private async initializePlayerProgress(
    playerId: string
  ): Promise<StoryProgress> {
    return await prisma.playerProgress.create({
      data: {
        userId: playerId,
        completedQuests: [],
        knownLocations: [],
      },
      include: {
        activeQuests: {
          include: {
            quest: {
              include: {
                steps: true,
              },
            },
          },
        },
        inventory: true,
        reputation: true,
        storyState: true,
      },
    });
  }

  async executeActions(playerId: string, actions: GameAction[]): Promise<void> {
    const progress = await this.getPlayerProgress(playerId);

    for (const action of actions) {
      switch (action.type) {
        case "GIVE_ITEM":
          await this.addItemToInventory(
            progress.id,
            action.data.itemId!,
            action.data.amount || 1
          );
          break;
        case "START_QUEST":
          await this.startQuest(progress.id, action.data.questId!);
          break;
        case "PROGRESS_QUEST":
          await this.updateQuestProgress(
            progress.id,
            action.data.questId!,
            action.data.amount || 1
          );
          break;
        case "UPDATE_REPUTATION":
          await this.updateReputation(
            progress.id,
            action.data.targetId!,
            action.data.amount || 0
          );
          break;
      }
    }
  }

  private async addItemToInventory(
    progressId: string,
    itemId: string,
    amount: number
  ) {
    const existingItem = await prisma.inventoryItem.findFirst({
      where: {
        progressId,
        itemId,
      },
    });

    if (existingItem) {
      await prisma.inventoryItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + amount },
      });
    } else {
      await prisma.inventoryItem.create({
        data: {
          progressId,
          itemId,
          name: "Unknown Item", // You might want to fetch this from an item database
          quantity: amount,
          type: ItemType.MISC,
        },
      });
    }
  }

  private async startQuest(progressId: string, questId: string) {
    const existingQuest = await prisma.playerQuest.findFirst({
      where: {
        progressId,
        questId,
      },
    });

    if (!existingQuest) {
      await prisma.playerQuest.create({
        data: {
          questId,
          progressId,
          status: "ACTIVE",
          currentStep: 0,
        },
      });
    }
  }

  private async updateQuestProgress(
    progressId: string,
    questId: string,
    stepProgress: number
  ) {
    const playerQuest = await prisma.playerQuest.findFirst({
      where: {
        progressId,
        questId,
      },
      include: {
        quest: {
          include: {
            steps: true,
            rewards: {
              include: {
                reputation: true,
                items: true,
              },
            },
          },
        },
      },
    });

    if (!playerQuest) return;

    const newStep = playerQuest.currentStep + stepProgress;
    const isCompleted = newStep >= playerQuest.quest.steps.length;

    if (isCompleted) {
      await this.completeQuest(progressId, playerQuest);
    } else {
      await prisma.playerQuest.update({
        where: { id: playerQuest.id },
        data: { currentStep: newStep },
      });
    }
  }

  private async completeQuest(progressId: string, playerQuest: any) {
    // Update quest status
    await prisma.playerQuest.update({
      where: { id: playerQuest.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
      },
    });

    // Add to completed quests
    await prisma.playerProgress.update({
      where: { id: progressId },
      data: {
        completedQuests: {
          push: playerQuest.questId,
        },
      },
    });

    // Apply rewards if any
    if (playerQuest.quest.rewards) {
      const { reputation, items, locations } = playerQuest.quest.rewards;

      // Apply reputation rewards
      for (const rep of reputation || []) {
        await this.updateReputation(progressId, rep.faction, rep.amount);
      }

      // Apply item rewards
      for (const item of items || []) {
        await this.addItemToInventory(progressId, item.itemId, item.quantity);
      }

      // Add new locations
      if (locations?.length) {
        await prisma.playerProgress.update({
          where: { id: progressId },
          data: {
            knownLocations: {
              push: locations,
            },
          },
        });
      }
    }
  }

  private async updateReputation(
    progressId: string,
    faction: string,
    amount: number
  ) {
    const existingRep = await prisma.reputation.findFirst({
      where: {
        progressId,
        faction,
      },
    });

    if (existingRep) {
      await prisma.reputation.update({
        where: { id: existingRep.id },
        data: { amount: existingRep.amount + amount },
      });
    } else {
      await prisma.reputation.create({
        data: {
          faction,
          amount,
          progressId,
        },
      });
    }
  }
}
