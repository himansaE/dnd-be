import type { ValidatedContext } from "@/app/middlewares/zodValidator.middleware.js";

/**
 * Helper to safely extract validated data from context.
 */
export const getValidatedData = <T>(c: ValidatedContext<T>): T =>
  c["validatedData"];
