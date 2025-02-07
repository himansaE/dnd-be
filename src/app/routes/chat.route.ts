import { Hono } from "hono";
import { authRequired } from "@middlewares/auth.middleware.js";
import { ChatService } from "@/app/services/chat.service.js";

const chat = new Hono();
const chatService = new ChatService();

chat.use("*", authRequired);

chat.post("/sessions", async (c) => {
  const { userId, title } = await c.req.json();
  const session = await chatService.createSession(userId, title);
  return c.json(session);
});

chat.post("/sessions/:id/messages", async (c) => {
  const sessionId = c.req.param("id");
  const { message } = await c.req.json();

  c.header("Content-Type", "text/event-stream");
  c.header("Cache-Control", "no-cache");
  c.header("Connection", "keep-alive");

  const stream = chatService.streamChat(sessionId, message);

  return new Response(
    new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          controller.enqueue(`data: ${JSON.stringify(chunk)}\n\n`);
          if (chunk.isComplete) {
            controller.close();
          }
        }
      },
    })
  );
});

export { chat };
