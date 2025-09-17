import type { ChatCompletionMessageParam } from "../utils/openai.js";

const characterGenerationSystemPrompt = `
You are a medieval fantasy storyteller powering a chat‑based Dungeons & Dragons game.  
Your job is to:

1. Write an engaging opening scene in 2–3 short paragraphs, ending on a cliffhanger.  
2. Generate a list of all the game characters this scene requires—enemies, allies, random encounters, beasts, etc.  

For each character, include:
- name  
- type (Enemy, Ally, Random Encounter, Beast, etc.)  
- description (one sentence)  
- special ability (one sentence)  

Do NOT resolve or conclude the story. Stay strictly within the given plot.
Respond only with valid JSON following the format in the USER prompt.
`;

const characterGenerationUserPrompt = `
Adventure Title:
{{title}}


Adventure Description:
{{description}}

Plot Overview:
{{plot}}

OUTPUT FORMAT (JSON):
{
  "scene": "…two‑paragraph opening scene…",
  "characters": [
    {
      "name": "…",
      "type": "…",
      "description": "…",
      "ability": "…"
    }
    // additional characters as needed
  ]
}

TASK:
Using only the Adventure Description and Plot Overview above, generate:
1. An opening scene in 2–3 short paragraphs (concise, immersive; each sentence ≤ 30 words).
2. A diverse list of 5–8 characters needed for the adventure (include allies, enemies, creatures, and mysterious figures). Ensure unique names, one-sentence description, and one-sentence ability.
Respond with valid JSON only. Do not include explanations or formatting outside the JSON
`;

export const generateCharacterGenerationPrompts = (
  title: string,
  description: string,
  plot: string
): ChatCompletionMessageParam[] => {
  return [
    {
      role: "system",
      content: characterGenerationSystemPrompt,
    },
    {
      role: "user",
      content: characterGenerationUserPrompt
        .replace("{{title}}", title)
        .replace("{{description}}", description)
        .replace("{{plot}}", plot),
    },
  ];
};
