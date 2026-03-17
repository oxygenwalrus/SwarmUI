import { describe, expect, it } from 'vitest';
import { applyAssistantPatchToParams } from './assistantApply';

describe('applyAssistantPatchToParams', () => {
    it('replaces and appends prompt text explicitly', () => {
        const result = applyAssistantPatchToParams(
            { prompt: 'base prompt', negativeprompt: 'old negative' },
            {
                prompt: 'new prompt',
                promptAppend: 'extra lighting',
            }
        );

        expect(result.prompt).toBe('new prompt\nextra lighting');
    });

    it('applies only the allowlisted parameter suggestions', () => {
        const result = applyAssistantPatchToParams(
            {
                prompt: 'portrait',
                negativeprompt: 'blurry',
                model: 'base-model',
                width: 512,
                height: 512,
            },
            {
                parameters: {
                    width: 768,
                    height: 1024,
                    steps: 32,
                    sampler: 'euler',
                    model: 'should-not-change',
                } as never,
            }
        );

        expect(result.width).toBe(768);
        expect(result.height).toBe(1024);
        expect(result.steps).toBe(32);
        expect(result.sampler).toBe('euler');
        expect(result.model).toBe('base-model');
    });

    it('replaces the negative prompt without disturbing unrelated values', () => {
        const result = applyAssistantPatchToParams(
            {
                prompt: 'portrait',
                negativeprompt: 'old negative',
                cfgscale: 7,
            },
            {
                negativeprompt: 'deformed hands, blurry',
            }
        );

        expect(result.negativeprompt).toBe('deformed hands, blurry');
        expect(result.cfgscale).toBe(7);
    });
});
