import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { CharacterService } from "@services/character.service.js";
import {
  characterCreateSchema,
  characterUpdateSchema,
  characterIdsQuerySchema,
  characterSearchQuerySchema,
} from "@/app/validators/character.validator.js";

const characterRoute = new Hono();
const service = new CharacterService();

// List with pagination
characterRoute.get("/", async (c) => {
  const page = Number.parseInt(c.req.query("page") ?? "1");
  const pageSize = Number.parseInt(c.req.query("pageSize") ?? "20");
  const data = await service.list(
    isNaN(page) ? 1 : page,
    isNaN(pageSize) ? 20 : pageSize
  );
  return c.json(data, 200);
});

// Get by id
characterRoute.get("/:id", async (c) => {
  const id = c.req.param("id");
  const item = await service.get(id);
  if (!item) return c.json({ message: "Not found" }, 404);
  return c.json(item, 200);
});

// Get many by ids: /api/characters/by-ids?ids=a,b,c&userId=
characterRoute.get(
  "/by-ids",
  zValidator("query", characterIdsQuerySchema),
  async (c) => {
    const { ids } = c.req.valid("query");
    const items = await service.getMany(ids);
    return c.json(items, 200);
  }
);

// Text search by name: /api/characters/search?q=...&userId=&page=&pageSize=
characterRoute.get(
  "/search",
  zValidator("query", characterSearchQuerySchema),
  async (c) => {
    const { q, page = 1, pageSize = 20 } = c.req.valid("query");
    const data = await service.searchByName(q, page, pageSize);
    return c.json(data, 200);
  }
);

// Create (supports JSON or multipart/form-data with image)
characterRoute.post("/", async (c) => {
  const contentType = c.req.header("content-type") ?? "";
  let data: any = {};
  let file: File | null = null;

  if (contentType.includes("multipart/form-data")) {
    const form = await c.req.formData();
    data = {
      name: String(form.get("name") ?? ""),
      type: String(form.get("type") ?? ""),
      ability: form.get("ability") ? String(form.get("ability")) : undefined,
      description: form.get("description")
        ? String(form.get("description"))
        : undefined,
    };
    const img = form.get("image");
    if (img && typeof img !== "string") file = img as File;
  } else {
    try {
      data = await c.req.json();
    } catch (e) {
      data = {};
    }
  }

  const parsed = characterCreateSchema.safeParse(data);
  if (!parsed.success) {
    return c.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      400
    );
  }

  const item = await service.create(parsed.data, file ? { file } : undefined);
  return c.json(item, 201);
});

// Update (supports JSON or multipart/form-data with image)
characterRoute.put("/:id", async (c) => {
  const id = c.req.param("id");
  const contentType = c.req.header("content-type") ?? "";
  let data: any = {};
  let file: File | null = null;

  if (contentType.includes("multipart/form-data")) {
    const form = await c.req.formData();
    data = {
      name: form.get("name") ? String(form.get("name")) : undefined,
      type: form.get("type") ? String(form.get("type")) : undefined,
      ability: form.get("ability") ? String(form.get("ability")) : undefined,
      description: form.get("description")
        ? String(form.get("description"))
        : undefined,
    };
    const img = form.get("image");
    if (img && typeof img !== "string") file = img as File;
  } else {
    try {
      data = await c.req.json();
    } catch (e) {
      data = {};
    }
  }

  const parsed = characterUpdateSchema.safeParse(data);
  if (!parsed.success) {
    return c.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      400
    );
  }

  const item = await service.update(
    id,
    parsed.data,
    file ? { file } : undefined
  );
  return c.json(item, 200);
});

// Delete
characterRoute.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const item = await service.remove(id);
  return c.json(item, 200);
});

export { characterRoute };
