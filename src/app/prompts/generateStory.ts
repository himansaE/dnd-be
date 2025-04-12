import type { ChatCompletionMessageParam } from "../utils/openai.js";

const generateStoryUserPrompt = `
Please generate three unique Dungeon & Dragons-inspired stories. Each story should include:
- "title": An evocative title that captures the essence or mystery of the story.
- "description": A brief overview of the story's setting, conflict, or magical element.
- "starterPlot": An engaging opening scenario or hook that introduces a challenge or mystery.
- "imagePrompt": A short, detailed visual description suitable for image generation (for example, "A misty forest under a full moon with ancient glowing runes on stone walls").

Output your response in the exact JSON format shown below:

{
  "stories": [
    {
      "title": "<Title for story 1>",
      "description": "<Description for story 1>",
      "starterPlot": "<Starter plot for story 1>",
      "imagePrompt": "<Image prompt for story 1>"
    },
    {
      "title": "<Title for story 2>",
      "description": "<Description for story 2>",
      "starterPlot": "<Starter plot for story 2>",
      "imagePrompt": "<Image prompt for story 2>"
    },
    {
      "title": "<Title for story 3>",
      "description": "<Description for story 3>",
      "starterPlot": "<Starter plot for story 3>",
      "imagePrompt": "<Image prompt for story 3>"
    }
  ]
}

Replace all placeholder text with creative content. Do not include any additional text or formatting outside of this JSON structure.
`;

const generateStorySystemPrompt = `
You are a creative storyteller specializing in fantasy narratives, particularly within the Dungeon & Dragons universe. Your task is to craft imaginative, atmospheric stories that immerse players in magical adventures. Every generated story must include:
- A unique title that captures the essence or mystery of the tale.
- A brief description summarizing the setting, conflict, or magical element.
- An engaging starter plot that hooks the player into the adventure.
- A vivid image prompt detailing a key visual scene suitable for image generation.

You must strictly follow the provided JSON structure for output and not include any commentary, headings, or extra text outside the JSON structure.
`;

const generateStoryDevPrompt = `
As part of the application development, ensure that your output is fully compliant with the following conditions:
- Output exactly three stories.
- Each story is an object containing the keys "title", "description", "starterPlot", and "imagePrompt".
- Do not introduce any markdown formatting, explanations, or additional text outside of the JSON structure.
- Validate that the JSON structure is correctly formatted with proper quotes and keys.
`;

export const generateStoryMessage = [
  {
    role: "system",
    content: generateStorySystemPrompt,
  },
  {
    role: "user",
    content: generateStoryUserPrompt,
  },
  {
    role: "developer",
    content: generateStoryDevPrompt,
  },
] satisfies ChatCompletionMessageParam[];
