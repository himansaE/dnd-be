import type { PromptContext, NPCRole } from "../types/npc.js";
import type { StoryProgress, Quest } from "../types/story.js";
import type { ChatCompletionUserMessageParam as ChatCompletionMessageParam } from "@utils/openai.js";

export class PromptOptimizer {
  private formatBackground(context: { role: NPCRole }): string {
    return `Background: ${context.role.background}
Personality: ${context.role.personality}
Known Facts: ${context.role.knowledge.join(". ")}`;
  }

  private createSystemPrompt(
    context: PromptContext & { availableQuests?: Quest[] },
    storyProgress: StoryProgress
  ): ChatCompletionMessageParam {
    return {
      role: "user",
      content: `You are ${context.role.name}, a ${
        context.role.role
      } in a fantasy RPG world.
${this.formatBackground(context)}
${this.formatMemories(context.memories)}
${this.formatPlayerContext(storyProgress)}
${this.formatAvailableQuests(context.availableQuests)}

Respond in character and include specific actions in the following JSON format:
{
  "message": "Your in-character response",
  "actions": [
    {
      "type": "ACTION_TYPE",
      "data": { ... action specific data ... }
    }
  ]
}

Available actions: GIVE_ITEM, TAKE_ITEM, START_QUEST, PROGRESS_QUEST, COMPLETE_QUEST, UPDATE_REPUTATION, ADD_KNOWLEDGE, UNLOCK_LOCATION, MODIFY_STATE`,
    };
  }

  private formatAvailableQuests(quests?: Quest[]): string {
    if (!quests?.length) return "No available quests.";
    return `Available Quests:\n${quests
      .map((q) => `- ${q.title}: ${q.description}`)
      .join("\n")}`;
  }

  private formatPlayerContext(progress: StoryProgress): string {
    return `Player Context:
- Active Quests: ${progress.activeQuests.map((q) => q.quest.title).join(", ")}
- Known Locations: ${progress.knownLocations.join(", ")}
- Reputation Levels: ${progress.reputation
      .map((r) => `${r.faction}: ${r.amount}`)
      .join(", ")}`;
  }

  private formatMemories(memories: PromptContext["memories"]): string {
    if (!memories.length) return "No previous interactions.";

    return memories
      .map(
        (memory) => `Previous interaction with player ${memory.playerId}:
        - Key facts: ${memory.key_facts.join(", ")}
        - Last sentiment: ${memory.sentiment}
        - Last interaction: ${memory.lastInteraction.toISOString()}`
      )
      .join("\n");
  }

  public createPrompt(
    context: PromptContext & { availableQuests?: Quest[] },
    userMessage: string,
    storyProgress: StoryProgress
  ): ChatCompletionMessageParam[] {
    return [
      this.createSystemPrompt(context, storyProgress),
      { role: "user", content: userMessage },
    ];
  }
}
