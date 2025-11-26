import { z } from "zod";

export const storyStartSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  plot: z.string().min(1, "Plot is required"),
  characterIds: z
    .array(z.string().uuid())
    .min(10, "Minimum 10 characters required")
    .max(30, "Maximum 30 characters allowed"),
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

// Output Schema (AI Response)
export const soundtrackSchema = z.object({
  track_id: z.string(),
  prompt: z.string().optional(),
  reason: z.string().optional(),
});

export const musicTrackSchema = z.object({
  id: z.string(),
  prompt: z.string(),
  mood: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const storyResponseSchema = z.object({
  music_tracks: z.record(z.string(), musicTrackSchema).optional(),
  segments: z.record(
    z.string(), // segmentId
    z.object({
      narrative_content: z.array(
        z.union([
          z.object({ type: z.literal("narrator"), text: z.string() }),
          z.object({
            type: z.literal("character"),
            name: z.string(),
            dialogue: z.string(),
            characterId: z.string().optional(),
          }),
        ])
      ),
      choices: z.array(
        z.object({
          text: z.string(),
          next_segment_id: z.string(),
        })
      ),
      soundtrack: soundtrackSchema,
    })
  ),
});
