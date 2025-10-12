import { CharacterRepository } from "@repositories/character.repository.js";
import { createChat } from "../utils/openai.js";
import { createCharacterSelectionPrompt } from "../prompts/characterSelection.js";
export class CharacterSelectionService {
    characterRepo = new CharacterRepository();
    async selectCharactersForStory(storyTitle, storyDescription, storyPlot) {
        const requestId = `char-select-${Date.now().toString(36)}`;
        console.log(`[${requestId}][CharacterSelectionService] Starting AI character selection...`);
        // Fetch all available characters
        const allCharacters = await this.characterRepo.list(0, 1000);
        console.log(`[${requestId}] Found ${allCharacters.length} total characters in database`);
        if (allCharacters.length < 10) {
            throw new Error(`Not enough characters available. Found ${allCharacters.length}, need at least 10.`);
        }
        // Create AI prompt with story and character data
        const prompt = createCharacterSelectionPrompt(storyTitle, storyDescription, storyPlot, allCharacters.map((c) => ({
            id: c.id,
            name: c.name,
            type: c.type,
            ability: c.ability || "None",
            description: c.description || "",
        })));
        console.log(`[${requestId}] Calling AI to analyze ${allCharacters.length} characters for story fit...`);
        // Call AI with JSON mode
        const response = await createChat(prompt, {
            response_format: { type: "json_object" },
            meta: {
                aiOperationId: "character.selection",
                label: "AI Character Selection",
            },
        });
        console.log(`[${requestId}] AI response received, parsing...`);
        // Parse and validate AI response
        let result;
        try {
            result = JSON.parse(response);
        }
        catch (error) {
            console.error(`[${requestId}] Failed to parse AI response:`, error);
            throw new Error("Invalid AI response format");
        }
        // Validate response structure
        if (!result.selectedCharacters ||
            !Array.isArray(result.selectedCharacters)) {
            console.error(`[${requestId}] Missing selectedCharacters array`);
            throw new Error("AI response missing selectedCharacters array");
        }
        if (result.selectedCharacters.length < 10) {
            console.error(`[${requestId}] AI selected only ${result.selectedCharacters.length} characters, need at least 10`);
            throw new Error(`AI selected insufficient characters (${result.selectedCharacters.length}/10 minimum)`);
        }
        if (result.selectedCharacters.length > 15) {
            console.warn(`[${requestId}] AI selected ${result.selectedCharacters.length} characters, trimming to 15`);
            result.selectedCharacters = result.selectedCharacters.slice(0, 15);
        }
        console.log(`[${requestId}] AI selected ${result.selectedCharacters.length} characters`);
        // Extract character IDs and validate they exist
        const selectedIds = result.selectedCharacters.map((c) => c.characterId);
        const validCharacterIds = new Set(allCharacters.map((c) => c.id));
        const invalidIds = selectedIds.filter((id) => !validCharacterIds.has(id));
        if (invalidIds.length > 0) {
            console.error(`[${requestId}] AI selected invalid character IDs:`, invalidIds);
            throw new Error(`AI selected ${invalidIds.length} invalid character ID(s)`);
        }
        // Fetch full character data for selected IDs
        const selectedCharacterData = await this.characterRepo.findManyByIds(selectedIds);
        if (selectedCharacterData.length !== selectedIds.length) {
            console.warn(`[${requestId}] Some characters not found: requested ${selectedIds.length}, found ${selectedCharacterData.length}`);
        }
        console.log(`[${requestId}] Character selection successful: ${selectedCharacterData.length} characters retrieved`);
        return {
            characters: selectedCharacterData,
            analysis: result.selectedCharacters,
            strategy: result.overallStrategy || "No strategy provided",
        };
    }
}
