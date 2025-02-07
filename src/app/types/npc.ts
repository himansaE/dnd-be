import type {
  NPC,
  NPCMemory as PrismaNPCMemory,
  Quest,
  QuestRequirement,
  Reputation,
  RequiredItem,
} from "@prisma/client";

export interface NPCRole extends NPC {
  quests: (Quest & {
    requirements:
      | (QuestRequirement & {
          reputation: Reputation[];
          items: RequiredItem[];
        })
      | null;
  })[];
  memories: PrismaNPCMemory[];
}

export interface NPCMemory extends PrismaNPCMemory {
  quest?: Quest | null;
  npc: NPC;
}

export interface PromptContext {
  role: NPCRole;
  memories: NPCMemory[];
  availableQuests?: Quest[];
  currentContext: string;
}
