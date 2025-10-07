import { z } from "zod";

export const characterCreateSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  ability: z.string().optional(),
  description: z.string().optional(),
});

export const characterUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.string().min(1).optional(),
  ability: z.string().optional(),
  description: z.string().optional(),
});

export const characterIdsQuerySchema = z.object({
  ids: z.string().transform((s) =>
    s
      .split(",")
      .map((v) => v.trim())
      .filter(Boolean)
  ),
});

export const characterSearchQuerySchema = z.object({
  q: z.string().min(1),
  page: z.coerce.number().min(1).default(1).optional(),
  pageSize: z.coerce.number().min(1).max(100).default(20).optional(),
});
