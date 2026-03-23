import { describe, expect, it } from 'vitest';
import { getActivePreset, VIDEO_PRESETS } from './VideoResolution';

describe('getActivePreset', () => {
    it('identifies 16:9 preset', () => {
        expect(getActivePreset(1280, 720, VIDEO_PRESETS)).toBe('16:9');
    });

    it('identifies 9:16 preset', () => {
        expect(getActivePreset(720, 1280, VIDEO_PRESETS)).toBe('9:16');
    });

    it('identifies 4:3 preset', () => {
        expect(getActivePreset(960, 720, VIDEO_PRESETS)).toBe('4:3');
    });

    it('identifies 1:1 preset', () => {
        expect(getActivePreset(512, 512, VIDEO_PRESETS)).toBe('1:1');
    });

    it('returns Custom when dimensions match no preset', () => {
        expect(getActivePreset(768, 512, VIDEO_PRESETS)).toBe('Custom');
    });

    it('returns Custom for zero dimensions', () => {
        expect(getActivePreset(0, 0, VIDEO_PRESETS)).toBe('Custom');
    });

    it('returns Custom when only width matches', () => {
        expect(getActivePreset(1280, 500, VIDEO_PRESETS)).toBe('Custom');
    });
});

describe('VIDEO_PRESETS', () => {
    it('has exactly 4 non-custom presets', () => {
        expect(VIDEO_PRESETS).toHaveLength(4);
    });

    it('defaults 16:9 preset to 1280x720', () => {
        const preset = VIDEO_PRESETS.find(p => p.label === '16:9');
        expect(preset?.width).toBe(1280);
        expect(preset?.height).toBe(720);
    });
});
