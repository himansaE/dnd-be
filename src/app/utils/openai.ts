import OpenAI from "openai";
import { getEnvVariable } from "./env.js";
import type {
  ChatCompletionAssistantMessageParam,
  ChatCompletionSystemMessageParam,
  ChatCompletionUserMessageParam,
} from "openai/src/resources/index.js";
import type {
  ChatCompletionDeveloperMessageParam,
  ChatCompletionFunctionMessageParam,
  ChatCompletionToolMessageParam,
} from "openai/resources/index.mjs";

const openai = new OpenAI({
  apiKey: getEnvVariable("OPENAI_APIKEY", ""),
  baseURL: getEnvVariable("OPENAI_BASEURL", ""),
});
interface ChatCompletionStreamOptions {
  stream?: true;
  temperature?: number;
  max_tokens?: number;
  response_format?: {
    type: "text" | "json_object";
  };
}

export async function* createChatStream(
  messages: ChatCompletionMessageParam[],
  options?: ChatCompletionStreamOptions
) {
  const stream = await openai.chat.completions.create({
    model: getEnvVariable("OPENAI_MODEL_NAME", "gemini-2.5-pro-preview-03-25"),
    messages,
    stream: true,
    ...options,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || "";
    if (content) yield content;
  }
}

export type {
  ChatCompletionUserMessageParam,
  ChatCompletionAssistantMessageParam,
  ChatCompletionSystemMessageParam,
};

export type ChatCompletionMessageParam =
  | ChatCompletionDeveloperMessageParam
  | ChatCompletionSystemMessageParam
  | ChatCompletionUserMessageParam
  | ChatCompletionAssistantMessageParam
  | ChatCompletionToolMessageParam
  | ChatCompletionFunctionMessageParam;

export async function createChat(
  messages: ChatCompletionMessageParam[],
  options?: Omit<ChatCompletionStreamOptions, "stream">
) {
  try {
    const response = await openai.chat.completions.create({
      model: getEnvVariable(
        "OPENAI_MODEL_NAME",
        "gemini-2.5-pro-preview-03-25"
      ),
      messages,
      stream: false,

      ...options,
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      console.error("OpenAI response missing content:", response);
      throw new Error("Received empty response from AI.");
    }

    return content;
  } catch (error) {
    console.error("Error calling OpenAI createChat:", error);
    throw error;
  }
}

export { openai };
