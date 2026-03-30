// VideoResolution.test.ts
import { describe, expect, it } from 'vitest';
import { getActivePreset, type ResolutionPreset } from './VideoResolution';

const TEST_PRESETS: ResolutionPreset[] = [
    { label: 'Landscape 1280x720', width: 1280, height: 720 },
    { label: 'Portrait 720x1280', width: 720, height: 1280 },
    { label: 'Square 512x512', width: 512, height: 512 },
];

describe('getActivePreset', () => {
    it('returns matching preset label', () => {
        expect(getActivePreset(1280, 720, TEST_PRESETS)).toBe('Landscape 1280x720');
    });

    it('returns Custom for unmatched dimensions', () => {
        expect(getActivePreset(999, 999, TEST_PRESETS)).toBe('Custom');
    });
});
