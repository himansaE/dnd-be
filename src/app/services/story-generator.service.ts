import { generateStoryMessage } from "../prompts/generateStory.js";
import { getEnvVariable } from "../utils/env.js";
import { createChat } from "../utils/openai.js";
import { joinUrl } from "../utils/utils.js";

interface StoryOption {
  title: string;
  card_background: string;
  hidden_description: string;
}
interface StoryOptions {
  option_1: StoryOption;
  option_2: StoryOption;
  option_3: StoryOption;
}

type GeneratePreviewImageResponse =
  | {
      success: true;
      url: string;
    }
  | {
      success: false;
      error: string;
    };
export class StoryGeneratorService {
  async generateStoryOptions(): Promise<
    [StoryOption, StoryOption, StoryOption]
  > {
    const response = await createChat(generateStoryMessage, {
      response_format: {
        type: "json_object",
      },
    });

    const content = JSON.parse(response) as StoryOptions;
    const optionsWithImages = Object.entries(content).map(
      async ([key, option]) => {
        const imgRes = await this.generatePreviewImage(option.card_background);
        if (!imgRes.success) {
          console.error(
            `Failed to generate image for prompt "${option.card_background}": ${imgRes.error}`
          );
          content[key as keyof StoryOptions].card_background = "";
        } else {
          content[key as keyof StoryOptions].card_background = imgRes.url;
        }

        return option;
      }
    );

    await Promise.all(optionsWithImages);

    return [content.option_1, content.option_2, content.option_3];
  }

  async generatePreviewImage(
    prompt: string
  ): Promise<GeneratePreviewImageResponse> {
    const url = new URL(getEnvVariable("WORKER_URL", ""));
    url.searchParams.append("prompt", prompt);

    try {
      const req = await fetch(url, {
        headers: {
          "x-token": getEnvVariable("WORKER_TOKEN", ""),
        },
      });

      // Check if the request was successful before trying to read the body
      if (!req.ok) {
        throw new Error(
          `Image generation worker request failed with status ${
            req.status
          }: ${await req.text()}`
        );
      }

      return {
        success: true,
        url: await req.text(), // Assume worker returns URL as plain text
      };
    } catch (e) {
      console.error("generatePreviewImage Error:", e);
      return {
        success: false,
        error:
          e instanceof Error
            ? e.message
            : "Unknown error occurred during image generation request",
      };
    }
  }
}
