import { env } from "hono/adapter";
import type { Context } from "hono";
import { z, type ZodIssue } from "zod";
import { config } from "dotenv";

// Initialize dotenv
config();

const envSchema = z.object({
  PORT: z.string(),
  DATABASE_URL: z.string(),
  OPENAI_APIKEY: z.string(),
  OPENAI_BASEURL: z.string(),
  OPENAI_MODEL_NAME: z.string(),
  WORKER_URL: z.string(),
  WORKER_TOKEN: z.string(),
  BUCKET_URL: z.string(),
});

type Env = z.infer<typeof envSchema>;

function formatZodError(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join(".");
      return `❌ ${path}: ${issue.message}
Required environment variable ${path} is ${
        process.env[path] === undefined ? "missing" : "invalid"
      }
Expected type: ${"expected" in issue ? issue.expected : "unknown"}
Received: ${
        process.env[path] === undefined ? "undefined" : typeof process.env[path]
      }`;
    })
    .join("\n\n");
}

export function validateEnvs() {
  try {
    const parsedEnvs = envSchema.safeParse(process.env);

    if (!parsedEnvs.success) {
      const formattedError = formatZodError(parsedEnvs.error);
      console.error("\n🚨 Environment Variables Validation Error:\n");
      console.error(formattedError);
      console.error(
        "\nPlease check your .env file and provide all required variables.\n"
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error(
      "\n🚨 Unexpected error while validating environment variables"
    );
    return false;
  }
}

// this is a helper function to get the environment variable
export function getEnvVariable<K extends keyof Env>(
  key: K,
  defaultValue: Env[K]
): Env[K] {
  return process.env[key] ?? defaultValue;
}
