import { z } from "zod";
export const storyStartSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required"),
  plot: z.string().min(1, "Plot is required"),
});
