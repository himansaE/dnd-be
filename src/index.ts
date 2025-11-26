import { serve } from "@hono/node-server";
import { createNodeWebSocket } from "@hono/node-ws";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { chat } from "./app/routes/chat.route.js";
import { getEnvVariable } from "./app/utils/env.js";
import { storyGenerator } from "./app/routes/story-generator.route.js";
import { cors } from "hono/cors";
import router from "./app/routes/index.route.js";
import { MusicStreamService } from "./app/services/music.service.js";

const app = new Hono();

const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

app.use("*", logger());
app.use("*", cors());

app.route("/api", router);

app.get(
  "/ws/music",
  upgradeWebSocket((c) => {
    const musicService = new MusicStreamService();
    return {
      onOpen: async (_evt, ws) => {
        console.log("[WebSocket] Client connected to music stream");
        await musicService.connect(ws);
      },
      onMessage: async (evt, _ws) => {
        try {
          const data = evt.data as string | ArrayBufferLike;
          if (typeof data !== "string") return;
          const parsed = JSON.parse(data);
          if (parsed.type === "STEER" && typeof parsed.prompt === "string") {
            await musicService.steer(parsed.prompt);
          }
        } catch (err) {
          console.error("[WebSocket] Failed to process message:", err);
        }
      },
      onClose: () => {
        console.log("[WebSocket] Client disconnected");
        musicService.close();
      },
    };
  })
);

const PORT = Number.parseInt(getEnvVariable("PORT", "3000"));
const server = serve({
  fetch: app.fetch,
  port: PORT,
});
injectWebSocket(server);

console.log(`Server running at http://localhost:${PORT}`);
