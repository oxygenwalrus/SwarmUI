// useVideoProfile.test.ts
import { describe, expect, it } from 'vitest';
import { resolveProfileDefaults } from './useVideoProfile';

describe('resolveProfileDefaults', () => {
    it('returns correct defaults for Wan 2.1 in standard quality T2V', () => {
        const result = resolveProfileDefaults('wan2.1_t2v_model', 'standard', 't2v');
        expect(result.profile.id).toBe('wan21');
        expect(result.steps).toBe(20);
        expect(result.cfg).toBe(5.0);
        expect(result.frames).toBe(81);
        expect(result.fps).toBe(16);
        expect(result.sampler).toBe('euler');
        expect(result.scheduler).toBe('normal');
        expect(result.width).toBe(832);
        expect(result.height).toBe(480);
    });

    it('returns draft settings with fewer frames', () => {
        const result = resolveProfileDefaults('wan2.1_t2v_model', 'draft', 't2v');
        expect(result.steps).toBe(10);
        expect(result.frames).toBe(33);
    });

    it('uses i2v scheduler for LTXV in I2V mode', () => {
        const result = resolveProfileDefaults('ltxv_model', 'standard', 'i2v');
        expect(result.scheduler).toBe('ltxv-image');
    });

    it('uses t2v scheduler for LTXV in T2V mode', () => {
        const result = resolveProfileDefaults('ltxv_model', 'standard', 't2v');
        expect(result.scheduler).toBe('ltxv');
    });

    it('returns generic fallback for unrecognized models', () => {
        const result = resolveProfileDefaults('sdxl_base', 'standard', 't2v');
        expect(result.profile.id).toBe('generic');
        expect(result.isGenericFallback).toBe(true);
    });

    it('returns Wan 2.2 resolution presets', () => {
        const result = resolveProfileDefaults('wan2.2_720p_model', 'standard', 't2v');
        expect(result.resolutionPresets[0].width).toBe(1280);
        expect(result.resolutionPresets[0].height).toBe(720);
    });
});
