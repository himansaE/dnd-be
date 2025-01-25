import type { Context, Next } from "hono";
import { createMiddleware } from "hono/factory";
import { HTTPException } from "hono/http-exception";

// This middleware checks if the user is authenticated
const authRequired = createMiddleware((c: Context, next: Next) => {
  if (c.var.clerkAuth?.userId) return next();

  throw new HTTPException(401, {
    cause: "Unauthorized",
    message: "You need to be authenticated to access this resource",
  });
});

export { authRequired };
