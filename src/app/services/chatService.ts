import { ChatRepository } from "@repositories/chatRepository.js";
import type { StreamResponse } from "../types/chat.js";
import type { PromptContext } from "../types/npc.js";
import type { NPCResponse } from "../types/actions.js";
import {
  createChatStream,
  type ChatCompletionUserMessageParam as ChatCompletionMessageParam,
} from "@utils/openai.js";
import { MemoryService } from "./memoryService.js";
import { NPCService } from "./npcService.js";
import { PromptOptimizer } from "./promptOptimizer.js";
import { StoryService } from "./storyService.js";
import type { Quest } from "../types/story.js";
import type { Message } from "@prisma/client";

export class ChatService {
  private repository: ChatRepository;
  private promptOptimizer: PromptOptimizer;
  private memoryService: MemoryService;
  private storyService: StoryService;
  private npcService: NPCService;

  constructor() {
    this.repository = new ChatRepository();
    this.promptOptimizer = new PromptOptimizer();
    this.memoryService = new MemoryService();
    this.storyService = new StoryService();
    this.npcService = new NPCService();
  }

  async createSession(userId: string, title: string) {
    return await this.repository.createSession(userId, title);
  }

  async *streamChat(sessionId: string, userMessage: string) {
    const session = await this.repository.getSession(sessionId);
    if (!session) throw new Error("Session not found");

    const messages: ChatCompletionMessageParam[] = session.messages.map(
      (msg) => ({
        role: this.convertRole(msg.role),
        content: msg.content || "", // Ensure content is never undefined
      })
    );

    const userMsg: ChatCompletionMessageParam = {
      role: "user",
      content: userMessage,
    };

    const updatedMessages = [...messages, userMsg];
    let assistantMessage = "";

    const stream = await createChatStream(updatedMessages);
    for await (const chunk of stream) {
      assistantMessage += chunk;
      yield { content: chunk, isComplete: false } as StreamResponse;
    }

    const finalMessage: ChatCompletionMessageParam = {
      role: "user",
      content: assistantMessage || "", // Ensure content is never undefined
    };

    await this.repository.updateSession(sessionId, [...messages, finalMessage]);
    yield { content: "", isComplete: true } as StreamResponse;
  }

  private convertRole(role: string): ChatCompletionMessageParam["role"] {
    return "user";
  }

  async *streamNPCChat(
    npcId: string,
    playerId: string,
    message: string,
    context: PromptContext
  ) {
    const npc = await this.npcService.getNPC(npcId);
    if (!npc) throw new Error("NPC not found");

    const memories = await this.memoryService.getMemories(npcId, playerId);
    const progress = await this.storyService.getPlayerProgress(playerId);

    const enrichedContext: PromptContext & { availableQuests?: Quest[] } = {
      ...context,
      availableQuests: undefined,
      memories: memories.map((memory) => {
        return {
          ...memory,
          npc: npc,
        };
      }),
    };

    const promptMessages = this.promptOptimizer.createPrompt(
      enrichedContext,
      message,
      progress
    );

    const validatedMessages: ChatCompletionMessageParam[] = promptMessages.map(
      (msg) => ({
        role: msg.role,
        content: msg.content,
      })
    );

    let responseText = "";
    const stream = await createChatStream(validatedMessages);

    for await (const chunk of stream) {
      responseText += chunk;
      yield { content: chunk, isComplete: false } as StreamResponse;
    }

    try {
      const parsed = JSON.parse(responseText) as NPCResponse;
      await this.storyService.executeActions(playerId, parsed.actions);
      await this.npcService.updateNPCMemory(npcId, playerId, {
        message: parsed.message,
        actions: parsed.actions,
      });

      // Yield the final formatted message
      yield {
        content: parsed.message,
        actions: parsed.actions,
        isComplete: true,
      } as StreamResponse & Partial<NPCResponse>;
    } catch (error) {
      console.error("Failed to process NPC response:", error);
      yield {
        content:
          "I apologize, but I'm having trouble understanding what happened. Could you please repeat that?",
        isComplete: true,
      } as StreamResponse;
    }
  }
}
