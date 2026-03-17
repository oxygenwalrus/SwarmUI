import type { GenerateParams } from '../api/types';
import type { AssistantApplyPatch } from '../types/assistant';

const ALLOWED_PARAMETER_KEYS = ['negativeprompt', 'steps', 'cfgscale', 'sampler', 'scheduler', 'width', 'height'] as const;

export function applyAssistantPatchToParams(
    params: GenerateParams,
    patch: AssistantApplyPatch
): GenerateParams {
    const nextParams: GenerateParams = { ...params };

    if (patch.prompt !== undefined) {
        nextParams.prompt = patch.prompt;
    }

    if (patch.promptAppend) {
        const currentPrompt = nextParams.prompt || '';
        nextParams.prompt = `${currentPrompt}${currentPrompt.trim().length > 0 ? '\n' : ''}${patch.promptAppend}`.trim();
    }

    if (patch.negativeprompt !== undefined) {
        nextParams.negativeprompt = patch.negativeprompt;
    }

    if (patch.parameters) {
        for (const key of ALLOWED_PARAMETER_KEYS) {
            const value = patch.parameters[key];
            if (value !== undefined) {
                (nextParams as Record<string, string | number | undefined>)[key] = value;
            }
        }
    }

    return nextParams;
}

export { ALLOWED_PARAMETER_KEYS };
