/**
 * Character prompting utilities for the roleplay system.
 * Builds system prompts and personality blocks from character data.
 */
import type {
    RoleplayCharacter,
    RoleplayPersonalityProfile,
    RoleplayPromptStack,
    RoleplayChatSession,
} from '../../types/roleplay';

/** Create a default prompt stack for new sessions. */
export function createDefaultPromptSet(): RoleplayPromptStack {
    return {
        mainPromptOverride: '',
        authorNote: '',
        postHistoryNote: '',
        includePersona: true,
        includeCharacterDefinition: true,
        includeScenario: true,
        includeExampleMessages: true,
        includeMemory: true,
        includeLore: true,
    };
}

/** Create a blank personality profile for a new character. */
export function createEmptyRoleplayPersonalityProfile(): RoleplayPersonalityProfile {
    return {
        coreTraits: '',
        speakingStyle: '',
        emotionalTone: '',
        boundaries: '',
        motivations: '',
        relationshipToUser: '',
        quirks: '',
    };
}

/**
 * Build a structured personality block from a character's personality profile.
 * Used in the CharacterEditor to preview what the AI sees.
 */
export function buildStructuredPersonalityBlock(
    profile: RoleplayPersonalityProfile,
): string {
    const sections: string[] = [];
    if (profile.coreTraits) sections.push(`Core traits: ${profile.coreTraits}`);
    if (profile.speakingStyle) sections.push(`Speaking style: ${profile.speakingStyle}`);
    if (profile.emotionalTone) sections.push(`Emotional tone: ${profile.emotionalTone}`);
    if (profile.boundaries) sections.push(`Boundaries: ${profile.boundaries}`);
    if (profile.motivations) sections.push(`Motivations: ${profile.motivations}`);
    if (profile.relationshipToUser) sections.push(`Relationship to user: ${profile.relationshipToUser}`);
    if (profile.quirks) sections.push(`Quirks: ${profile.quirks}`);
    return sections.join('\n');
}

/**
 * Build a personality block from a character for injection into system prompts.
 */
export function buildCharacterPersonalityBlock(
    character: RoleplayCharacter,
): string {
    if (character.personality) {
        return character.personality;
    }
    return buildStructuredPersonalityBlock(character.personalityProfile);
}

/**
 * Resolve the effective system prompt for a character + session combination.
 * Applies the prompt stack overrides and includes character definition, scenario, etc.
 */
export function getEffectiveSystemPrompt(
    character: RoleplayCharacter,
    session?: RoleplayChatSession | null,
): string {
    const promptStack = session?.promptStack ?? createDefaultPromptSet();

    if (promptStack.mainPromptOverride) {
        return promptStack.mainPromptOverride;
    }

    const isChat = character.interactionStyle === 'personal-chat';
    const basePrompt = isChat
        ? character.chatSystemPrompt || character.systemPrompt
        : character.roleplaySystemPrompt || character.systemPrompt;

    const sections: string[] = [];

    if (basePrompt) {
        sections.push(basePrompt);
    }

    if (promptStack.includeCharacterDefinition && character.description) {
        sections.push(`Character: ${character.description}`);
    }

    const personalityBlock = buildCharacterPersonalityBlock(character);
    if (promptStack.includeCharacterDefinition && personalityBlock) {
        sections.push(`Personality: ${personalityBlock}`);
    }

    if (promptStack.includeScenario && character.scenario) {
        sections.push(`Scenario: ${character.scenario}`);
    }

    if (promptStack.includeMemory && session?.conversationSummary) {
        sections.push(`Previous conversation summary: ${session.conversationSummary}`);
    }

    if (promptStack.authorNote) {
        sections.push(`[Author note: ${promptStack.authorNote}]`);
    }

    return sections.join('\n\n');
}
