import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { getEnvVariable, validateEnvs } from "./app/utils/env.js";

const app = new Hono();

// validate the environment variables
if (!validateEnvs()) process.exit(1);

app.get("/", (c) => {
  return c.text("Hello Hono!");
});

const port = Number(getEnvVariable("PORT", "3000"));
console.log(`Server is running on http://localhost:${port}`);

serve({
  fetch: app.fetch,
  port,
});
