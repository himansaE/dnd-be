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
  const requestId = `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const startTs = Date.now();
  let firstChunkLogged = false;
  let ttftMs: number | null = null;

  console.log("[chat] start", { requestId, sessionId });

  c.header("Content-Type", "text/event-stream");
  c.header("Cache-Control", "no-cache");
  c.header("Connection", "keep-alive");

  const stream = chatService.streamChat(sessionId, message);

  return new Response(
    new ReadableStream({
      async start(controller) {
        for await (const chunk of stream) {
          if (!firstChunkLogged) {
            firstChunkLogged = true;
            ttftMs = Date.now() - startTs;
            console.log("[chat] ttft", { requestId, sessionId, ttftMs });
          }
          controller.enqueue(`data: ${JSON.stringify(chunk)}\n\n`);
          if (chunk.isComplete) {
            const totalMs = Date.now() - startTs;
            console.log("[chat] complete", {
              requestId,
              sessionId,
              totalMs,
              ttftMs,
            });
            controller.close();
          }
        }
      },
    })
  );
});

export { chat };
