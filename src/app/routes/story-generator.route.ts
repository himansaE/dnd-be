import { Hono } from "hono";
import { StoryGeneratorService } from "../services/story-generator.service.js";

const storyGenerator = new Hono();
const generatorService = new StoryGeneratorService();

storyGenerator.get("/generate", async (c) => {
  const requestId = `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const startTs = Date.now();
  console.log("[story-gen] start", { requestId });
  try {
    const options = await generatorService.generateStoryOptions();
    const totalMs = Date.now() - startTs;
    console.log("[story-gen] complete", { requestId, totalMs });
    return c.json(options);
  } catch (error) {
    console.error("Story generation error:", error);
    const totalMs = Date.now() - startTs;
    console.log("[story-gen] error", { requestId, totalMs });
    return c.json({ error: "Failed to generate story options" }, 500);
  }
});

export { storyGenerator };
