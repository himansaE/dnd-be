import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { chat } from "./app/routes/chat.route.js";
import { getEnvVariable } from "./app/utils/env.js";

const app = new Hono();

app.use("*", logger());
app.route("/api/chat", chat);

const PORT = Number.parseInt(getEnvVariable("PORT", "3000"));
serve({
  fetch: app.fetch,
  port: PORT,
});

console.log(`Server running at http://localhost:${PORT}`);
