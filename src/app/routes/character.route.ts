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
  const requestId = `create-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  console.log(`[${requestId}] ===== START CREATE CHARACTER =====`);
  console.log(`[${requestId}] Method: ${c.req.method}, Path: ${c.req.path}`);

  try {
    const contentType = c.req.header("content-type") ?? "";
    console.log(`[${requestId}] Content-Type: ${contentType}`);

    let data: any = {};
    let file: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      console.log(`[${requestId}] Processing multipart/form-data`);
      const form = await c.req.formData();
      console.log(`[${requestId}] FormData keys:`, Array.from(form.keys()));

      data = {
        name: String(form.get("name") ?? ""),
        type: String(form.get("type") ?? ""),
        ability: form.get("ability") ? String(form.get("ability")) : undefined,
        description: form.get("description")
          ? String(form.get("description"))
          : undefined,
      };
      console.log(`[${requestId}] Parsed data:`, {
        name: data.name,
        type: data.type,
        hasAbility: !!data.ability,
        hasDescription: !!data.description,
      });

      const img = form.get("image");
      if (img && typeof img !== "string") {
        file = img as File;
        console.log(`[${requestId}] Image file found:`, {
          name: file.name,
          type: file.type,
          size: file.size,
        });
      } else {
        console.log(`[${requestId}] No image file in form`);
      }
    } else {
      console.log(`[${requestId}] Processing JSON body`);
      try {
        data = await c.req.json();
        console.log(`[${requestId}] Parsed JSON:`, {
          name: data?.name,
          type: data?.type,
        });
      } catch (e) {
        console.error(`[${requestId}] Failed to parse JSON:`, e);
        data = {};
      }
    }

    console.log(`[${requestId}] Validating with Zod schema...`);
    const parsed = characterCreateSchema.safeParse(data);
    if (!parsed.success) {
      console.error(
        `[${requestId}] Validation FAILED:`,
        parsed.error.flatten()
      );
      return c.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        400
      );
    }
    console.log(`[${requestId}] Validation PASSED`);

    console.log(`[${requestId}] Calling service.create with file: ${!!file}`);
    const item = await service.create(parsed.data, file ? { file } : undefined);
    console.log(`[${requestId}] Character created successfully:`, {
      id: item.id,
      name: item.name,
      imageKey: (item as any).imageKey,
      imageUrl: (item as any).imageUrl,
    });

    console.log(`[${requestId}] ===== END CREATE CHARACTER (SUCCESS) =====`);
    return c.json(item, 201);
  } catch (err: any) {
    console.error(`[${requestId}] ===== ERROR IN CREATE CHARACTER =====`);
    console.error(`[${requestId}]`, err);
    console.error(`[${requestId}] Stack:`, err.stack);
    return c.json(
      { error: "Internal Server Error", message: err.message },
      500
    );
  }
});

// Update (supports JSON or multipart/form-data with image)
characterRoute.put("/:id", async (c) => {
  const id = c.req.param("id");
  const requestId = `update-${id}-${Date.now().toString(36)}`;
  console.log(`[${requestId}] ===== START UPDATE CHARACTER =====`);
  console.log(`[${requestId}] ID: ${id}`);

  try {
    const contentType = c.req.header("content-type") ?? "";
    console.log(`[${requestId}] Content-Type: ${contentType}`);

    let data: any = {};
    let file: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      console.log(`[${requestId}] Processing multipart/form-data`);
      const form = await c.req.formData();
      console.log(`[${requestId}] FormData keys:`, Array.from(form.keys()));

      data = {
        name: form.get("name") ? String(form.get("name")) : undefined,
        type: form.get("type") ? String(form.get("type")) : undefined,
        ability: form.get("ability") ? String(form.get("ability")) : undefined,
        description: form.get("description")
          ? String(form.get("description"))
          : undefined,
      };
      console.log(`[${requestId}] Parsed data:`, data);

      const img = form.get("image");
      if (img && typeof img !== "string") {
        file = img as File;
        console.log(`[${requestId}] Image file found:`, {
          name: file.name,
          type: file.type,
          size: file.size,
        });
      } else {
        console.log(`[${requestId}] No image file in form`);
      }
    } else {
      console.log(`[${requestId}] Processing JSON body`);
      try {
        data = await c.req.json();
        console.log(`[${requestId}] Parsed JSON:`, data);
      } catch (e) {
        console.error(`[${requestId}] Failed to parse JSON:`, e);
        data = {};
      }
    }

    console.log(`[${requestId}] Validating with Zod schema...`);
    const parsed = characterUpdateSchema.safeParse(data);
    if (!parsed.success) {
      console.error(
        `[${requestId}] Validation FAILED:`,
        parsed.error.flatten()
      );
      return c.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        400
      );
    }
    console.log(`[${requestId}] Validation PASSED`);

    console.log(`[${requestId}] Calling service.update with file: ${!!file}`);
    const item = await service.update(
      id,
      parsed.data,
      file ? { file } : undefined
    );
    console.log(`[${requestId}] Character updated successfully:`, {
      id: item.id,
      name: item.name,
      imageKey: (item as any).imageKey,
      imageUrl: (item as any).imageUrl,
    });

    console.log(`[${requestId}] ===== END UPDATE CHARACTER (SUCCESS) =====`);
    return c.json(item, 200);
  } catch (err: any) {
    console.error(`[${requestId}] ===== ERROR IN UPDATE CHARACTER =====`);
    console.error(`[${requestId}]`, err);
    console.error(`[${requestId}] Stack:`, err.stack);
    return c.json(
      { error: "Internal Server Error", message: err.message },
      500
    );
  }
});

// Delete
characterRoute.delete("/:id", async (c) => {
  const id = c.req.param("id");
  const item = await service.remove(id);
  return c.json(item, 200);
});

export { characterRoute };
