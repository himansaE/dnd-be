import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { StoryService } from "../services/story.service.js";
import {
  storyStartSchema,
  storyContinueSchema,
} from "../validators/story.validator.js";

const storyRoute = new Hono();
const storyService = new StoryService();

storyRoute.post(
  "/start-scene",
  zValidator("json", storyStartSchema),
  async (c) => {
    const requestId = `start-${Date.now().toString(36)}`;
    console.log(
      `[${requestId}] Story start request with ${
        c.req.valid("json").characterIds.length
      } characters`
    );

    try {
      const data = c.req.valid("json");
      const response = await storyService.startStory(
        data.title,
        data.description,
        data.plot,
        data.characterIds
      );
      console.log(`[${requestId}] Story start SUCCESS`);
      return c.json(response, 200);
    } catch (error: any) {
      console.error(`[${requestId}] Story start ERROR:`, error);
      return c.json(
        {
          error: "Failed to start story",
          message: error.message ?? "Unknown error",
        },
        500
      );
    }
  }
);

storyRoute.post(
  "/continue-scene",
  zValidator("json", storyContinueSchema),
  async (c) => {
    const data = c.req.valid("json");
    return await storyService
      .continueStory(
        data.conversationHistory,
        data.currentSegmentId,
        data.choiceId,
        data.nextSegmentId,
        data.flowHistory ?? []
      )
      .then((response) => {
        return c.json(response, 200);
      });
  }
);

export { storyRoute };
