/**
 * Roleplay interaction style definitions and utilities.
 */
import type { RoleplayInteractionStyle } from '../types/roleplay';

export interface RoleplayInteractionStyleConfig {
    id: RoleplayInteractionStyle;
    label: string;
    description: string;
    systemPromptHint: string;
}

export const ROLEPLAY_INTERACTION_STYLES: RoleplayInteractionStyleConfig[] = [
    {
        id: 'storyteller',
        label: 'Storyteller',
        description: 'Narrative roleplay with scene descriptions, actions, and dialogue.',
        systemPromptHint: 'Write in a narrative style with scene descriptions and character actions.',
    },
    {
        id: 'personal-chat',
        label: 'Personal Chat',
        description: 'Casual conversational style, like texting a friend.',
        systemPromptHint: 'Respond in a casual, conversational tone as if chatting directly.',
    },
];

export const DEFAULT_ROLEPLAY_INTERACTION_STYLE: RoleplayInteractionStyle = 'storyteller';
export const LEGACY_ROLEPLAY_INTERACTION_STYLE: RoleplayInteractionStyle = 'storyteller';

/**
 * Get the config for a given interaction style, falling back to the default.
 */
export function getRoleplayInteractionStyleConfig(
    style: RoleplayInteractionStyle,
): RoleplayInteractionStyleConfig {
    return (
        ROLEPLAY_INTERACTION_STYLES.find((s) => s.id === style) ??
        ROLEPLAY_INTERACTION_STYLES[0]
    );
}
