import type {
  PlayerProgress,
  PlayerQuest,
  Quest as PrismaQuest,
  QuestRequirement as PrismaQuestRequirement,
  Reputation,
  InventoryItem as PrismaInventoryItem,
  StateItem,
  QuestStep as PrismaQuestStep,
  RequiredItem,
} from "@prisma/client";

export interface StoryProgress
  extends Omit<
    PlayerProgress,
    "activeQuests" | "inventory" | "reputation" | "storyState"
  > {
  activeQuests: (PlayerQuest & {
    quest: PrismaQuest & {
      steps: PrismaQuestStep[];
    };
  })[];
  inventory: PrismaInventoryItem[];
  reputation: Reputation[];
  storyState: StateItem[];
}

export type { PrismaQuest as Quest };
export type { PrismaQuestStep as QuestStep };

export interface InventoryItem {
  id: string;
  name: string;
  quantity: number;
  metadata?: Record<string, any>;
}

export interface QuestRequirements
  extends Omit<PrismaQuestRequirement, "id" | "questId"> {
  reputation: Array<{ faction: string; amount: number }>;
  items: RequiredItem[];
  quests: string[];
}

export type StoryBaseOptions = {
  scene: string;
  characters: Character[];
};

export type Character = {
  name: string;
  type: string;
  description: string;
  ability: string;
};
