/**
 * Import/export roleplay character data bundles (JSON-based).
 * Supports sharing characters, sessions, and lorebooks as portable files.
 */
import type {
    RoleplayCharacter,
    RoleplayChatSession,
    RoleplayLorebook,
} from '../../types/roleplay';

export interface RoleplayBundleData {
    version: number;
    exportedAt: number;
    character: RoleplayCharacter;
    sessions?: RoleplayChatSession[];
    lorebooks?: RoleplayLorebook[];
}

/**
 * Create a bundle object from a character and optional related data.
 */
export function createRoleplayBundle(
    character: RoleplayCharacter,
    sessions?: RoleplayChatSession[],
    lorebooks?: RoleplayLorebook[],
): RoleplayBundleData {
    return {
        version: 1,
        exportedAt: Date.now(),
        character,
        sessions: sessions?.length ? sessions : undefined,
        lorebooks: lorebooks?.length ? lorebooks : undefined,
    };
}

/**
 * Trigger a browser download of a roleplay bundle as a JSON file.
 */
export function downloadRoleplayBundle(bundle: RoleplayBundleData): void {
    const json = JSON.stringify(bundle, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${bundle.character.name.replace(/\s+/g, '_').toLowerCase()}_roleplay.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Parse a roleplay bundle from a JSON string or File.
 */
export async function parseRoleplayBundle(
    input: string | File,
): Promise<RoleplayBundleData> {
    let raw: string;
    if (typeof input === 'string') {
        raw = input;
    } else {
        raw = await input.text();
    }

    const data = JSON.parse(raw) as RoleplayBundleData;

    if (!data.version || !data.character?.id || !data.character?.name) {
        throw new Error('Invalid roleplay bundle: missing required fields');
    }

    return data;
}
