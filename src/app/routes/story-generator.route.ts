import { Hono } from "hono";
import { StoryGeneratorService } from "../services/story-generator.service.js";

const storyGenerator = new Hono();
const generatorService = new StoryGeneratorService();

storyGenerator.get("/generate", async (c) => {
  try {
    const options = await generatorService.generateStoryOptions();
    return c.json(options);
  } catch (error) {
    console.error("Story generation error:", error);
    return c.json({ error: "Failed to generate story options" }, 500);
  }
});

export { storyGenerator };
