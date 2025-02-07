import OpenAI from "openai";
import { getEnvVariable } from "./env.js";
import type {
  ChatCompletionAssistantMessageParam,
  ChatCompletionSystemMessageParam,
  ChatCompletionUserMessageParam,
} from "openai/src/resources/index.js";

const openai = new OpenAI({
  apiKey: getEnvVariable("OPENAI_APIKEY", ""),
  baseURL: getEnvVariable("OPENAI_BASEURL", ""),
});

export async function* createChatStream(
  messages: (
    | ChatCompletionUserMessageParam
    | ChatCompletionAssistantMessageParam
    | ChatCompletionSystemMessageParam
  )[]
) {
  const stream = await openai.chat.completions.create({
    model: "gpt-3.5-turbo",
    messages,
    stream: true,
    temperature: 0.7,
    max_tokens: 1000,
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content || "";
    if (content) yield content;
  }
}

export { openai };
export type {
  ChatCompletionUserMessageParam,
  ChatCompletionAssistantMessageParam,
  ChatCompletionSystemMessageParam,
};
