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

// Create
characterRoute.post(
  "/",
  zValidator("json", characterCreateSchema),
  async (c) => {
    const body = c.req.valid("json");
    const item = await service.create(body);
    return c.json(item, 201);
  }
);

// Update
characterRoute.put(
  "/:id",
  zValidator("json", characterUpdateSchema),
  async (c) => {
    const id = c.req.param("id");
    const body = c.req.valid("json");
    const item = await service.update(id, body);
    return c.json(item, 200);
  }
);

// Delete
characterRoute.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const item = await service.remove(id);
  return c.json(item, 200);
});

export { characterRoute };
