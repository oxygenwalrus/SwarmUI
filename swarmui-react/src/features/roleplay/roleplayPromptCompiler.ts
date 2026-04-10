/**
 * Compiles the final roleplay prompt from character data, session state, and user input.
 */
import type {
    RoleplayCharacter,
    RoleplayChatSession,
    ChatMessage,
    RoleplayPersona,
    ActivatedRoleplayLoreEntry,
} from '../../types/roleplay';
import { getEffectiveSystemPrompt } from './roleplayCharacterPrompting';

export interface CompiledRoleplayPrompt {
    systemPrompt: string;
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
}

/**
 * Compile the full prompt payload for an LLM roleplay request.
 * Assembles the system prompt, conversation history, persona info, and lore entries.
 */
export function compileRoleplayPrompt(options: {
    character: RoleplayCharacter;
    session: RoleplayChatSession;
    persona?: RoleplayPersona | null;
    activeLore?: ActivatedRoleplayLoreEntry[];
    maxHistoryMessages?: number;
}): CompiledRoleplayPrompt {
    const {
        character,
        session,
        persona,
        activeLore = [],
        maxHistoryMessages = 40,
    } = options;

    const systemPrompt = getEffectiveSystemPrompt(character, session);

    const systemParts: string[] = [systemPrompt];

    if (persona && session.promptStack.includePersona) {
        systemParts.push(`User persona: ${persona.name} — ${persona.description}`);
    }

    if (activeLore.length > 0 && session.promptStack.includeLore) {
        const loreBlock = activeLore
            .map((entry) => `[Lore: ${entry.title}] ${entry.content}`)
            .join('\n');
        systemParts.push(loreBlock);
    }

    if (session.promptStack.postHistoryNote) {
        systemParts.push(`[Note: ${session.promptStack.postHistoryNote}]`);
    }

    const history = session.messages.slice(-maxHistoryMessages);
    const messages = history
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    return {
        systemPrompt: systemParts.join('\n\n'),
        messages,
    };
}
