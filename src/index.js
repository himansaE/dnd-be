import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { logger } from "hono/logger";
import { getEnvVariable } from "./app/utils/env.js";
import { cors } from "hono/cors";
import router from "./app/routes/index.route.js";
const app = new Hono();
app.use("*", logger());
app.use("*", cors());
app.route("/api", router);
const PORT = Number.parseInt(getEnvVariable("PORT", "3000"));
serve({
    fetch: app.fetch,
    port: PORT,
});
console.log(`Server running at http://localhost:${PORT}`);
