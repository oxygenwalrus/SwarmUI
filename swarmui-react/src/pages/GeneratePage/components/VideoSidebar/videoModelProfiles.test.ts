// videoModelProfiles.test.ts
import { describe, expect, it } from 'vitest';
import { matchVideoProfile, VIDEO_MODEL_PROFILES, GENERIC_FALLBACK_PROFILE } from './videoModelProfiles';

describe('matchVideoProfile', () => {
    it('matches Wan 2.1 model names', () => {
        expect(matchVideoProfile('wan2.1_t2v_fun')?.id).toBe('wan21');
        expect(matchVideoProfile('Wan-2.1-I2V')?.id).toBe('wan21');
        expect(matchVideoProfile('wan21_something')?.id).toBe('wan21');
    });

    it('matches Wan 2.2 model names', () => {
        expect(matchVideoProfile('wan2.2_t2v_720p')?.id).toBe('wan22');
        expect(matchVideoProfile('Wan-2.2-I2V')?.id).toBe('wan22');
    });

    it('matches LTXV model names', () => {
        expect(matchVideoProfile('ltxv_0.9.1')?.id).toBe('ltxv');
        expect(matchVideoProfile('LTX-Video-v1')?.id).toBe('ltxv');
        expect(matchVideoProfile('ltx video model')?.id).toBe('ltxv');
    });

    it('returns null for unrecognized models', () => {
        expect(matchVideoProfile('sd_xl_base_1.0')).toBeNull();
        expect(matchVideoProfile('')).toBeNull();
    });

    it('prioritizes Wan 2.2 over Wan 2.1 for ambiguous names', () => {
        expect(matchVideoProfile('wan2.2_model')?.id).toBe('wan22');
    });

    it('GENERIC_FALLBACK_PROFILE has expected defaults', () => {
        expect(GENERIC_FALLBACK_PROFILE.standard.steps).toBe(20);
        expect(GENERIC_FALLBACK_PROFILE.defaultSampler).toBe('euler');
        expect(GENERIC_FALLBACK_PROFILE.requiredComponents).toHaveLength(0);
    });

    it('each profile has valid resolution presets', () => {
        for (const profile of VIDEO_MODEL_PROFILES) {
            expect(profile.resolutionPresets.length).toBeGreaterThan(0);
            for (const preset of profile.resolutionPresets) {
                expect(preset.width).toBeGreaterThan(0);
                expect(preset.height).toBeGreaterThan(0);
                expect(preset.label).toBeTruthy();
            }
        }
    });
});
