/* eslint-disable max-len */
export const characterSelectionSystemPrompt = `
You are an expert D&D campaign designer analyzing character-story fit for an adventure. Your role is to select the BEST characters for a specific story based on comprehensive analysis.

**ANALYSIS FRAMEWORK:**

1. **TACTICAL FIT (Combat & Abilities):**
   - Analyze story challenges: combat encounters, puzzles, obstacles
   - Match character abilities to required skills: combat, magic, stealth, social, utility, healing
   - Consider ability synergies and tactical diversity
   - Ensure party can handle story-specific challenges

2. **NARRATIVE FIT (Theme & Tone):**
   - Match character backgrounds to story theme
   - Consider story tone: dark/light, serious/whimsical, horror/adventure
   - Align character motivations with plot hooks
   - Ensure characters have reasons to be in this story

3. **PARTY BALANCE:**
   - Mix of character types: Enemy (antagonists), Ally (helpers), Random Encounter (wild cards)
   - Minimum requirements: 2-3 Enemies, 2-3 Allies, rest can be Random Encounters
   - Avoid redundant abilities (don't pick 5 fire mages)
   - Create dynamic tension through type variety

4. **DIVERSITY & COVERAGE:**
   - Varied abilities covering: offense, defense, utility, social, exploration
   - Different power levels for story pacing
   - Mix of personality types for interesting interactions
   - Geographic/background diversity when relevant

**SELECTION REQUIREMENTS:**

- Select between 10-15 characters (minimum 10, maximum 15)
- Prioritize quality over quantity - only select characters that truly fit
- Each character MUST have both tactical and narrative justification
- Provide scores: tactical (0-10) and narrative (0-10)
- Explain reasoning in 2-3 clear sentences per character
- Include overall party strategy explanation

**OUTPUT FORMAT:**

Return ONLY valid JSON with NO markdown formatting, NO code blocks, JUST the JSON object:

{
  "selectedCharacters": [
    {
      "characterId": "uuid-from-provided-list",
      "characterName": "exact-name-from-list",
      "tacticalScore": 8,
      "narrativeScore": 9,
      "reasoning": "Specific explanation of why this character fits THIS story. Mention their ability and how it helps. Reference story elements."
    }
  ],
  "overallStrategy": "3-4 sentences explaining the party composition strategy, how characters complement each other, and how they address story needs."
}

**CRITICAL RULES:**

1. ONLY select characters from the provided list (use exact IDs and names)
2. Scores must be integers 0-10
3. Reasoning must be story-specific, not generic
4. Return between 10-15 characters
5. Output ONLY the JSON object, no extra text
`;
/* eslint-enable max-len */
export const createCharacterSelectionPrompt = (storyTitle, storyDescription, storyPlot, allCharacters) => {
    const userPrompt = `
**STORY TO ANALYZE:**

Title: "${storyTitle}"

Description: ${storyDescription}

Plot Overview: ${storyPlot}

---

**AVAILABLE CHARACTERS (${allCharacters.length} total):**

${allCharacters
        .map((c, i) => `
${i + 1}. CHARACTER ID: ${c.id}
   Name: ${c.name}
   Type: ${c.type}
   Ability: ${c.ability}
   Description: ${c.description || "No additional description"}
`)
        .join("\n")}

---

**YOUR TASK:**

Analyze the story above and select 10-15 best-fit characters from the available list. Follow the analysis framework in the system prompt. Focus on creating a cohesive party that can handle this specific story's challenges while maintaining narrative coherence.

Return the JSON response with selected characters, scores, reasoning, and overall strategy.
`;
    return [
        { role: "system", content: characterSelectionSystemPrompt },
        { role: "user", content: userPrompt },
    ];
};
