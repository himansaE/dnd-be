import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { StoryService } from "../services/story.service.js";
import {
  storyStartSchema,
  storyContinueSchema,
} from "../validators/story.validator.js";

const storyRoute = new Hono();
const storyService = new StoryService();

storyRoute.get(
  "/start-scene",
  zValidator("query", storyStartSchema),
  async (c) => {
    const data = c.req.valid("query");
    return await storyService
      .startStory(data.title, data.description, data.plot)
      .then((response) => {
        return c.json(response, 200);
      });
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
