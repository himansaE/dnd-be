import { ChatRepository } from "@/app/repositories/chat.repository.js";
import { createChatStream, } from "@utils/openai.js";
import { MemoryService } from "./memory.service.js";
import { NPCService } from "./npc.service.js";
import { PromptOptimizer } from "./promptOptimizer.service.js";
import { StoryService } from "./story.service.js";
export class ChatService {
    repository;
    promptOptimizer;
    memoryService;
    storyService;
    npcService;
    constructor() {
        this.repository = new ChatRepository();
        this.promptOptimizer = new PromptOptimizer();
        this.memoryService = new MemoryService();
        this.storyService = new StoryService();
        this.npcService = new NPCService();
    }
    async createSession(userId, title) {
        return await this.repository.createSession(userId, title);
    }
    async *streamChat(sessionId, userMessage) {
        const session = await this.repository.getSession(sessionId);
        if (!session)
            throw new Error("Session not found");
        const messages = session.messages.map((msg) => ({
            role: this.convertRole(msg.role),
            content: msg.content || "", // Ensure content is never undefined
        }));
        const userMsg = {
            role: "user",
            content: userMessage,
        };
        const updatedMessages = [...messages, userMsg];
        let assistantMessage = "";
        const stream = await createChatStream(updatedMessages, {
            meta: {
                aiOperationId: "chat.session.stream",
                label: `Chat session ${sessionId}`,
            },
        });
        for await (const chunk of stream) {
            assistantMessage += chunk;
            yield { content: chunk, isComplete: false };
        }
        const finalMessage = {
            role: "user",
            content: assistantMessage || "", // Ensure content is never undefined
        };
        await this.repository.updateSession(sessionId, [...messages, finalMessage]);
        yield { content: "", isComplete: true };
    }
    convertRole(role) {
        return "user";
    }
    async *streamNPCChat(npcId, playerId, message, context) {
        const npc = await this.npcService.getNPC(npcId);
        if (!npc)
            throw new Error("NPC not found");
        const memories = await this.memoryService.getMemories(npcId, playerId);
        const progress = await this.storyService.getPlayerProgress(playerId);
        const enrichedContext = {
            ...context,
            availableQuests: undefined,
            memories: memories.map((memory) => {
                return {
                    ...memory,
                    npc: npc,
                };
            }),
        };
        const promptMessages = this.promptOptimizer.createPrompt(enrichedContext, message, progress);
        const validatedMessages = promptMessages.map((msg) => ({
            role: msg.role,
            content: msg.content,
        }));
        let responseText = "";
        const stream = await createChatStream(validatedMessages, {
            meta: {
                aiOperationId: "chat.npc.stream",
                label: `NPC ${npcId} -> Player ${playerId}`,
            },
        });
        for await (const chunk of stream) {
            responseText += chunk;
            yield { content: chunk, isComplete: false };
        }
        try {
            const parsed = JSON.parse(responseText);
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
            };
        }
        catch (error) {
            console.error("Failed to process NPC response:", error);
            yield {
                content: "I apologize, but I'm having trouble understanding what happened. Could you please repeat that?",
                isComplete: true,
            };
        }
    }
}
