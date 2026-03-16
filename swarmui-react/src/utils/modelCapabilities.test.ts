import { describe, expect, it } from 'vitest';
import { getModelMediaCapabilities } from './modelCapabilities';

describe('getModelMediaCapabilities', () => {
    it('classifies known text-to-video architectures', () => {
        const capabilities = getModelMediaCapabilities({
            name: 'mochi-preview',
            architecture: 'Mochi',
        });

        expect(capabilities.supportsVideo).toBe(true);
        expect(capabilities.supportsTextToVideo).toBe(true);
        expect(capabilities.supportsImageToVideo).toBe(false);
        expect(capabilities.source).toBe('architecture');
    });

    it('classifies known image-to-video architectures', () => {
        const capabilities = getModelMediaCapabilities({
            name: 'svd-xt',
            architecture: 'SVD',
        });

        expect(capabilities.supportsVideo).toBe(true);
        expect(capabilities.supportsTextToVideo).toBe(false);
        expect(capabilities.supportsImageToVideo).toBe(true);
    });

    it('classifies dual-mode ltxv architectures', () => {
        const capabilities = getModelMediaCapabilities({
            name: 'ltxv-13b',
            architecture: 'LTX-Video',
        });

        expect(capabilities.supportsVideo).toBe(true);
        expect(capabilities.supportsTextToVideo).toBe(true);
        expect(capabilities.supportsImageToVideo).toBe(true);
    });

    it('prefers explicit backend capability fields over heuristics', () => {
        const capabilities = getModelMediaCapabilities({
            name: 'custom-model',
            architecture: 'SVD',
            supportsVideo: true,
            supportsTextToVideo: true,
            supportsImageToVideo: false,
        });

        expect(capabilities.supportsVideo).toBe(true);
        expect(capabilities.supportsTextToVideo).toBe(true);
        expect(capabilities.supportsImageToVideo).toBe(false);
        expect(capabilities.source).toBe('explicit');
    });

    it('returns no video capability for non-video models', () => {
        const capabilities = getModelMediaCapabilities({
            name: 'sdxl-base',
            architecture: 'SDXL',
        });

        expect(capabilities.supportsVideo).toBe(false);
        expect(capabilities.supportsTextToVideo).toBe(false);
        expect(capabilities.supportsImageToVideo).toBe(false);
        expect(capabilities.source).toBe('none');
    });
});
