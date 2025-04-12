import { generateStoryMessage } from "../prompts/generateStory.js";
import { getEnvVariable } from "../utils/env.js";
import { createChat } from "../utils/openai.js";

interface StoryOption {
  title: string;
  description: string;
  imagePrompt: string;
  starterPlot: string;
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
  async generateStoryOptions(): Promise<StoryOptions> {
    const response = await createChat(generateStoryMessage, {
      response_format: {
        type: "json_object",
      },
    });

    const content = JSON.parse(response) as StoryOptions;

    const imageGenerationPromises = Object.values(content).map(
      async (option) => {
        const imageResult = await this.generatePreviewImage(option.imagePrompt);
        if (imageResult.success) {
          option.imagePrompt = imageResult.url;
        } else {
          console.error(
            `Failed to generate image for prompt "${option.imagePrompt}": ${imageResult.error}`
          );
          option.imagePrompt = "GENERATION_FAILED";
        }
      }
    );

    await Promise.all(imageGenerationPromises);

    return content;
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

      return {
        success: true,
        url: await req.text(),
      };
    } catch (e) {
      return {
        success: false,
        error: e instanceof Error ? e.message : "Unknown error occurred",
      };
    }
  }
}
