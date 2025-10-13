/**
 * Creates a middleware function that validates request body against a Zod schema
 * @template T - Type extending ZodSchema
 * @param {T} schema - The Zod schema to validate against
 * @returns {(c: ValidatedContext<z.infer<T>>, next: () => Promise<void>) => Promise<void>}
 * Middleware function that:
 * - Parses request body
 * - Validates it against provided schema
 * - Attaches validated data to context if successful
 * - Get validated data using `getValidatedData` helper
 * - Returns 400 with error details if validation fails
 * @throws {Response} Returns 400 status code if validation fails
 */
export const zodValidator = (schema) => {
    return async (c, next) => {
        try {
            const parsedData = schema.parse(await c.req.json());
            c["validatedData"] = parsedData;
            await next();
        }
        catch (err) {
            return c.json({ error: "Validation failed", details: err.errors }, 400);
        }
    };
};
