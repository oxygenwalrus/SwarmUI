import { describe, expect, it } from 'vitest';
import { validateGeneration } from './productTypes';

describe('validateGeneration', () => {
    it('returns a blocking issue when model is missing', () => {
        const issues = validateGeneration(
            {
                prompt: 'portrait lighting test',
            },
            {
                selectedBackend: 'Local',
                enableControlNet: false,
                enableVideo: false,
                enableInitImage: false,
            }
        );

        expect(issues.some((issue) => issue.id === 'missing-model' && issue.severity === 'blocking')).toBe(true);
    });

    it('warns when controlnet and init image modes are incomplete', () => {
        const issues = validateGeneration(
            {
                prompt: 'robot portrait',
                model: 'sdxl-base.safetensors',
            },
            {
                selectedBackend: 'Comfy',
                enableControlNet: true,
                enableVideo: false,
                enableInitImage: true,
            }
        );

        expect(issues.map((issue) => issue.id)).toContain('missing-controlnet-input');
        expect(issues.map((issue) => issue.id)).toContain('missing-init-image');
    });
});
