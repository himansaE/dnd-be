import { ItemType, type PlayerProgress, type Quest } from "@prisma/client";
import type { StoryBaseOptions, StoryProgress } from "../types/story.js";

import { prisma } from "@repositories/database.js";
import type { GameAction } from "../types/actions.js";
import {
  createChat,
  type ChatCompletionMessageParam,
} from "../utils/openai.js";
import { generateCharacterGenerationPrompts } from "../prompts/characterGeneration.js";
import {
  generateStoryPrompts,
  createContinuationUserMessage,
} from "../prompts/playStory.js";
import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import { promisify } from "util";
import { exec } from "child_process";
import { CharacterRepository } from "@repositories/character.repository.js";

const run = promisify(exec);

export class StoryService {
  private characterRepo = new CharacterRepository();

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

  // v 0.0.1 functionality

  private async generateStoryBase(
    title: string,
    description: string,
    plot: string
  ): Promise<StoryBaseOptions> {
    const response = await createChat(
      generateCharacterGenerationPrompts(title, description, plot),
      {
        response_format: {
          type: "json_object",
        },
        meta: {
          aiOperationId: "story.base",
          label: "Generate story base",
        },
      }
    );

    const content = JSON.parse(response) as StoryBaseOptions;
    return content;
  }

  private async generateStoryStartScene(
    title: string,
    description: string,
    plot: string,
    base: StoryBaseOptions,
    selectedCharacters: any[]
  ): Promise<string> {
    let content: any;
    let response: string = "";

    // Format characters with full details for AI
    const charactersForAI = selectedCharacters.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type,
      ability: c.ability || "None",
      description: c.description || "",
    }));

    console.log(
      `[StoryService.generateStoryStartScene] Passing ${charactersForAI.length} characters to AI`
    );

    const originalPrompts: ChatCompletionMessageParam[] = generateStoryPrompts(
      title,
      description,
      plot,
      base.scene,
      JSON.stringify(charactersForAI)
    );

    let retryCount = 0;
    const maxRetries = 5;

    while (retryCount < maxRetries) {
      try {
        if (retryCount === 0) {
          console.log("Attempting initial story scene generation...");
          response = await createChat(originalPrompts, {
            response_format: {
              type: "json_object",
            },
            meta: {
              aiOperationId: "story.start",
              label: "Generate start scene",
            },
          });
        } else {
          console.warn(
            `Retry attempt ${
              retryCount + 1
            }/${maxRetries} to regenerate JSON...`
          );

          await new Promise((resolve) =>
            setTimeout(resolve, 1500 * retryCount)
          );

          const regenerationPrompts: ChatCompletionMessageParam[] = [
            ...originalPrompts,
            {
              role: "user",
              content:
                "The previous response was incomplete or malformed JSON. Please provide the **complete and valid JSON object** containing the Ink code again.",
            },
          ];

          response = await createChat(regenerationPrompts, {
            response_format: {
              type: "json_object",
            },
            meta: {
              aiOperationId: "story.start.retry",
              label: "Retry start scene",
            },
          });
        }

        content = JSON.parse(response);

        console.log(
          `Successfully parsed JSON after ${retryCount + 1} attempts.`
        );
        break;
      } catch (error: any) {
        console.error(
          `JSON parsing or API call failed on attempt ${retryCount + 1}:`,
          error.message
        );
        console.log("Problematic response content:", response);

        retryCount++;
        if (retryCount >= maxRetries) {
          console.error(
            `Max retries (${maxRetries}) reached. Failed to get valid JSON.`
          );
          // If we ran out of retries, throw an error to indicate failure
          throw new Error(
            "Failed to generate story scene due to persistent JSON errors after retries."
          );
        }
      }
    }
    if (!content || typeof content !== "object" || content === null) {
      console.error(
        "Final result does not contain the expected valid JSON structure with an 'ink' string property.",
        content
      );
      throw new Error(
        "Generated content is missing the expected JSON structure or 'ink' property."
      );
    }

    return content;
  }
  public async startStory(
    title: string,
    description: string,
    plot: string,
    characterIds: string[]
  ) {
    console.log(
      `[StoryService.startStory] START - Fetching ${characterIds.length} characters`
    );

    // Fetch selected characters from database
    const characters = await this.characterRepo.findManyByIds(characterIds);
    console.log(
      `[StoryService.startStory] Fetched ${characters.length} characters:`,
      characters.map((c) => ({ id: c.id, name: c.name }))
    );

    if (characters.length < 10 || characters.length > 30) {
      throw new Error(
        `Expected 10-30 characters, got ${characters.length}. Some character IDs may be invalid.`
      );
    }

    // Generate opening scene (no longer generates characters)
    const storyBase = await this.generateStoryBase(title, description, plot);

    // Generate story start scene with user-selected characters
    const startScene = await this.generateStoryStartScene(
      title,
      description,
      plot,
      storyBase,
      characters
    );
    console.log("Start scene generated successfully:", startScene);
    return {
      storyBase,
      startScene,
    };
  }

  public async continueStory(
    conversationHistory: ChatCompletionMessageParam[],
    currentSegmentId: string,
    choiceId: string,
    nextSegmentId: string,
    flowHistory: string[]
  ) {
    try {
      const continuationSegments = await this.generateStoryContinuation(
        conversationHistory,
        currentSegmentId,
        choiceId,
        nextSegmentId,
        flowHistory
      );

      console.log(
        "Story continuation generated successfully:",
        continuationSegments
      );

      // continuationSegments already has { segments: {...} } structure
      // Don't wrap it again!
      return {
        ...continuationSegments,
        success: true,
      };
    } catch (error) {
      console.error("Error generating story continuation:", error);
      throw new Error("Failed to generate story continuation");
    }
  }

  private async generateStoryContinuation(
    conversationHistory: ChatCompletionMessageParam[],
    currentSegmentId: string,
    choiceId: string,
    nextSegmentId: string,
    flowHistory: string[]
  ): Promise<any> {
    // Add the continuation user message to the conversation history
    const continuationMessage = createContinuationUserMessage({
      currentSegmentId,
      choiceId,
      nextSegmentId,
      flowHistory,
    });

    // Build the full conversation for the API call
    const fullConversation: ChatCompletionMessageParam[] = [
      ...conversationHistory,
      continuationMessage,
    ];

    let retryCount = 0;
    const maxRetries = 5;
    let content: any;
    let response: string = "";

    while (retryCount < maxRetries) {
      try {
        if (retryCount === 0) {
          console.log(
            `Attempting story continuation from segment ${currentSegmentId} to ${nextSegmentId}...`
          );
          response = await createChat(fullConversation, {
            response_format: {
              type: "json_object",
            },
            meta: {
              aiOperationId: "story.continue",
              label: `Continue from ${currentSegmentId} -> ${nextSegmentId}`,
            },
          });
        } else {
          console.warn(
            `Retry attempt ${
              retryCount + 1
            }/${maxRetries} to regenerate continuation JSON...`
          );

          await new Promise((resolve) =>
            setTimeout(resolve, 1500 * retryCount)
          );

          const regenerationPrompts: ChatCompletionMessageParam[] = [
            ...fullConversation,
            {
              role: "user",
              content:
                "The previous response was incomplete or malformed JSON. Please provide the **complete and valid JSON object** containing the continuation segments again.",
            },
          ];

          response = await createChat(regenerationPrompts, {
            response_format: {
              type: "json_object",
            },
            meta: {
              aiOperationId: "story.continue.retry",
              label: `Retry continue ${currentSegmentId} -> ${nextSegmentId}`,
            },
          });
        }

        content = JSON.parse(response);

        console.log(`[generateStoryContinuation] Raw AI response structure:`, {
          hasSegments: !!content?.segments,
          hasNestedSegments: !!content?.segments?.segments,
          topLevelKeys: Object.keys(content ?? {}),
          segmentKeys: Object.keys(content?.segments ?? {}),
        });

        // Sanitize provider output: flatten nested segments, fix character keys, filter prior IDs
        const sanitized = this.sanitizeContinuationContent(
          content,
          flowHistory ?? [],
          nextSegmentId
        );

        console.log(`[generateStoryContinuation] Sanitization result:`, {
          inputHadNested: !!content?.segments?.segments,
          outputHasSegments: !!sanitized?.segments,
          outputHasNested: !!sanitized?.segments?.segments,
          outputSegmentKeys: Object.keys(sanitized?.segments ?? {}),
        });

        content = sanitized;

        console.log(
          `[generateStoryContinuation] After assignment to content:`,
          {
            hasSegments: !!content?.segments,
            hasNestedSegments: !!content?.segments?.segments,
            segmentKeys: Object.keys(content?.segments ?? {}).slice(0, 5),
          }
        );

        // CRITICAL: Validate that the requested segment ID is present
        if (!content?.segments || !content.segments[nextSegmentId]) {
          console.error(
            `VALIDATION FAILED: AI did not generate the requested segment "${nextSegmentId}"`
          );
          console.error(
            `Available segment IDs:`,
            Object.keys(content?.segments ?? {})
          );

          // If this is not the last retry, try again
          if (retryCount < maxRetries - 1) {
            console.warn(
              `Will retry (attempt ${retryCount + 2}/${maxRetries})...`
            );
            retryCount++;
            continue;
          } else {
            throw new Error(
              `AI failed to generate the requested segment "${nextSegmentId}" after ${maxRetries} attempts. Available segments: ${Object.keys(
                content?.segments ?? {}
              ).join(", ")}`
            );
          }
        }

        console.log(
          `Story continuation parsed successfully after ${
            retryCount + 1
          } attempts. Requested segment "${nextSegmentId}" is present.`
        );
        break;
      } catch (error: any) {
        console.error(
          `JSON parsing or API call failed on attempt ${retryCount + 1}:`,
          error.message
        );
        console.log("Problematic response content:", response);

        retryCount++;
        if (retryCount >= maxRetries) {
          console.error(
            `Max retries (${maxRetries}) reached. Failed to get valid continuation JSON.`
          );
          throw new Error(
            "Failed to generate story continuation due to persistent JSON errors after retries."
          );
        }
      }
    }

    if (!content || typeof content !== "object" || content === null) {
      console.error(
        "Final result does not contain the expected valid JSON structure with segments.",
        content
      );
      throw new Error(
        "Generated content is missing the expected JSON structure or segments."
      );
    }

    console.log(`[generateStoryContinuation] Final return structure:`, {
      hasSegments: !!content?.segments,
      hasNestedSegments: !!content?.segments?.segments,
      topLevelKeys: Object.keys(content ?? {}),
      segmentKeysCount: Object.keys(content?.segments ?? {}).length,
      firstFewSegmentKeys: Object.keys(content?.segments ?? {}).slice(0, 3),
    });

    return content;
  }

  private sanitizeContinuationContent(
    raw: any,
    previousIds: string[],
    requiredId: string
  ) {
    // Handle nested segments structure (AI sometimes returns segments.segments)
    let segmentsObj: Record<string, any> = {};

    if (raw?.segments?.segments && typeof raw.segments.segments === "object") {
      // Case: { segments: { segments: { ... } } }
      console.log(
        "[sanitizeContinuationContent] Detected nested segments.segments structure, flattening..."
      );
      segmentsObj = raw.segments.segments;
    } else if (raw?.segments && typeof raw.segments === "object") {
      // Case: { segments: { ... } }
      segmentsObj = raw.segments;
    } else {
      // Fallback
      segmentsObj = raw ?? {};
    }

    const previous = new Set((previousIds || []).map((s) => String(s)));
    const result: Record<string, any> = {};

    // Extract music_tracks if present
    const music_tracks = raw?.music_tracks || {};

    const normalizeNarrativeItem = (item: any) => {
      if (!item || typeof item !== "object")
        return { type: "narrator", text: "" };
      if (item.type === "character") {
        const name = item.name ?? item.speaker ?? "";
        const dialogue = item.dialogue ?? item.text ?? "";
        return { type: "character", name, dialogue };
      }
      const text = item.text ?? item.dialogue ?? "";
      return { type: "narrator", text };
    };

    const normalizeSegment = (seg: any) => {
      const narrative = Array.isArray(seg?.narrative_content)
        ? seg.narrative_content.map(normalizeNarrativeItem)
        : [];
      const choices = Array.isArray(seg?.choices)
        ? seg.choices.map((c: any) => ({
            text: String(c?.text ?? ""),
            next_segment_id: String(c?.next_segment_id ?? ""),
          }))
        : [];
      const soundtrack =
        seg?.soundtrack && typeof seg.soundtrack === "object"
          ? {
              action: seg.soundtrack.action === "CHANGE" ? "CHANGE" : "KEEP",
              // Keep both track_id and prompt if the model supplies them.
              track_id:
                typeof seg.soundtrack.track_id === "string"
                  ? seg.soundtrack.track_id
                  : undefined,
              prompt:
                typeof seg.soundtrack.prompt === "string"
                  ? seg.soundtrack.prompt
                  : undefined,
              reason:
                typeof seg.soundtrack.reason === "string"
                  ? seg.soundtrack.reason
                  : undefined,
            }
          : undefined;
      return { narrative_content: narrative, choices, soundtrack };
    };

    for (const key of Object.keys(segmentsObj)) {
      // keep requiredId even if it appeared in history; otherwise skip duplicates
      if (previous.has(key) && key !== requiredId) continue;
      result[key] = normalizeSegment(segmentsObj[key]);
    }

    return { segments: result, music_tracks };
  }
}
