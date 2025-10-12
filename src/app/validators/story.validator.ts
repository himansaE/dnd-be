import { z } from "zod";

export const storyStartSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  plot: z.string().min(1, "Plot is required"),
  characterIds: z
    .array(z.string().uuid())
    .length(10, "Exactly 10 characters required"),
});

export const storyContinueSchema = z.object({
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(["system", "user", "assistant"]),
        content: z.string(),
      })
    )
    .min(1, "Conversation history is required"),
  currentSegmentId: z.string().min(1, "Current segment ID is required"),
  choiceId: z.string().min(1, "Choice ID is required"),
  nextSegmentId: z.string().min(1, "Next segment ID is required"),
  flowHistory: z.array(z.string()).optional(),
});
