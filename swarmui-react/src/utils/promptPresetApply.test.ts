import { describe, expect, it } from 'vitest';
import { prependPromptText } from './promptPresetApply';

describe('prependPromptText', () => {
    it('prepends preset text to an existing prompt', () => {
        expect(prependPromptText('portrait, cinematic lighting', 'cyberpunk, neon')).toBe(
            'cyberpunk, neon, portrait, cinematic lighting'
        );
    });

    it('uses preset text directly when the prompt is empty', () => {
        expect(prependPromptText('', 'boudoir, soft light')).toBe('boudoir, soft light');
    });

    it('ignores empty preset text', () => {
        expect(prependPromptText('existing prompt', '   ')).toBe('existing prompt');
    });
});
