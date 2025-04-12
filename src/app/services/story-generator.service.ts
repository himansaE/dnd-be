import { generateStoryMessage } from "../prompts/generateStory.js";
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

export class StoryGeneratorService {
  async generateStoryOptions(): Promise<StoryOptions> {
    const response = await createChat(generateStoryMessage, {
      response_format: {
        type: "json_object",
      },
    });

    const content = JSON.parse(response) as StoryOptions;
    return content;
  }
}
