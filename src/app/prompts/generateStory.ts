import type { ChatCompletionMessageParam } from "../utils/openai.js";

const generateStoryUserPrompt = `
Generate three distinct Dungeons & Dragons story options suitable as adventure starting points. For each option, provide the following specific pieces of information:
1.  **'title'**: A short, evocative, and dramatic name for the story option. This title is the *only* piece of information players might see initially to choose an adventure. (e.g., "Echoes of the Shattered Star", "The Crimson Tide Covenant")
2.  **'card_background'**: One vivid sentence (12–20 words) describing a visual scene for image generation. Use concrete nouns, colors, composition, atmosphere, weather, key objects or creatures. Avoid pronouns, abstract concepts, and meta-verbs like "depict"; avoid named IPs unless necessary. (e.g., "A lone watchtower under a blood-red moon; spectral wolves silhouetted on crumbling stone.", "Golden light through stained glass onto a moss-covered stone throne in a ruined hall.")
3.  **'hidden_description'**: A concise (3-4 sentences) summary of the core situation, intended *only for the Dungeon Master*. This description **must** clearly outline:
    * The **central conflict** or pressing danger the players will likely face.
    * **Two distinct opposing groups or factions** involved in the conflict (describe their nature or goals generally, not specific named NPCs).
    * A **secret element, twist, or hidden motivation** driving the conflict that isn't immediately obvious.
    * A **time-sensitive element or impending event** that creates urgency (e.g., "The ritual concludes in 3 days," "The artifact loses power by sunrise," "The invasion fleet arrives with the tide").
4.  **'plot'**: A brief (2-3 sentences) outline describing how the story should continue after the initial setup. This should describe the future progression, potential story arcs, and lingering mysteries that will guide the players’ journey.

**Required JSON Structure**:

{
  "option_1": { "title": "", "card_background": "", "hidden_description": "", "plot": "" },
  "option_2": { "title": "", "card_background": "", "hidden_description": "", "plot": "" },
  "option_3": { "title": "", "card_background": "", "hidden_description": "", "plot": "" }
}
`;

const generateStorySystemPrompt = `
You are a creative AI specializing in generating concise and evocative Dungeons & Dragons adventure seeds. Your goal is to produce three distinct story *options* based precisely on the user's request. For each option, you must create a 'title', a visual 'card_background' sentence (for image generation), a 'hidden_description' (detailing the conflict, factions, secret twist, and urgency for the DM), and a 'plot' (describing how the story should continue). Adhere strictly to the simple language requirement, ensure thematic uniqueness across the three options, and follow the exact JSON output format specified by the user. Produce *only* the JSON data structure as the final response, without any additional commentary or formatting.
`;

export {
  generateStoryUserPrompt,
  generateStorySystemPrompt,
  // generateStoryDevPrompt,
};

export const generateStoryMessage = [
  {
    role: "system",
    content: generateStorySystemPrompt,
  },
  {
    role: "user",
    content: generateStoryUserPrompt,
  },
  // {
  //   role: "developer",
  //   content: generateStoryDevPrompt,
  // },
] satisfies ChatCompletionMessageParam[];
