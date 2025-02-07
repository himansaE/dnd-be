import type { ChatHistory, Message, Prisma } from "@prisma/client";
import { prisma } from "@repositories/database.js";
import type { ChatCompletionMessageParam } from "openai/src/resources/index.js";

export class ChatRepository {
  async createSession(
    userId: string,
    title: string
  ): Promise<ChatHistory & { messages: Message[] }> {
    const initialMessage: Prisma.MessageCreateInput = {
      role: "system",
      content: "Initial session started.",
      chatHistory: {
        create: {
          userId,
          title,
        },
      },
    };

    const chatHistory = await prisma.message.create({
      data: initialMessage,
      select: {
        chatHistory: {
          include: {
            messages: true,
          },
        },
      },
    });

    return chatHistory.chatHistory;
  }

  async updateSession(
    id: string,
    messages: ChatCompletionMessageParam[]
  ): Promise<ChatHistory & { messages: Message[] }> {
    // First delete existing messages to maintain conversation order
    await prisma.message.deleteMany({
      where: { chatHistoryId: id },
    });

    // Then create new messages
    const messageData: Prisma.MessageCreateManyInput[] = messages.map(
      (msg) => ({
        chatHistoryId: id,
        role: msg.role,
        content:
          typeof msg.content === "string"
            ? msg.content
            : JSON.stringify(msg.content),
      })
    );

    await prisma.message.createMany({
      data: messageData,
    });

    return (await prisma.chatHistory.findUnique({
      where: { id },
      include: { messages: true },
    })) as ChatHistory & { messages: Message[] };
  }

  async getSession(
    id: string
  ): Promise<(ChatHistory & { messages: Message[] }) | null> {
    const session = await prisma.chatHistory.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return session;
  }

  async getUserSessions(userId: string) {
    return await prisma.chatHistory.findMany({
      where: { userId },
      orderBy: { updatedAt: "desc" },
    });
  }

  convertToMessageCreate(
    msg: ChatCompletionMessageParam
  ): Prisma.MessageCreateWithoutChatHistoryInput {
    return {
      role: msg.role,
      content:
        typeof msg.content === "string"
          ? msg.content
          : JSON.stringify(msg.content),
    };
  }
}
