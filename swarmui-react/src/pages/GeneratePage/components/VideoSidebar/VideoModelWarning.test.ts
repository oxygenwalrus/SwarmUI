import { describe, expect, it } from 'vitest';
import { getVideoCapabilityWarning } from './VideoModelWarning';
import type { ModelMediaCapabilities } from '../../../../utils/modelCapabilities';

const fullVideoCapabilities: ModelMediaCapabilities = {
    supportsVideo: true,
    supportsTextToVideo: true,
    supportsImageToVideo: true,
    source: 'architecture',
    matchedArchitecture: 'lightricks-ltx-video',
};

const t2vOnlyCapabilities: ModelMediaCapabilities = {
    supportsVideo: true,
    supportsTextToVideo: true,
    supportsImageToVideo: false,
    source: 'architecture',
    matchedArchitecture: 'mochi',
};

const i2vOnlyCapabilities: ModelMediaCapabilities = {
    supportsVideo: true,
    supportsTextToVideo: false,
    supportsImageToVideo: true,
    source: 'architecture',
    matchedArchitecture: 'stable-video-diffusion-img2vid-v1',
};

const noVideoCapabilities: ModelMediaCapabilities = {
    supportsVideo: false,
    supportsTextToVideo: false,
    supportsImageToVideo: false,
    source: 'none',
    matchedArchitecture: null,
};

describe('getVideoCapabilityWarning', () => {
    it('returns null when model fully supports the active workflow (T2V)', () => {
        expect(getVideoCapabilityWarning(fullVideoCapabilities, 't2v')).toBeNull();
    });

    it('returns null when model fully supports the active workflow (I2V)', () => {
        expect(getVideoCapabilityWarning(fullVideoCapabilities, 'i2v')).toBeNull();
    });

    it('returns no-video warning when model has no video support', () => {
        const warning = getVideoCapabilityWarning(noVideoCapabilities, 't2v');
        expect(warning).not.toBeNull();
        expect(warning).toContain('does not support video');
    });

    it('warns when T2V selected but model is I2V-only', () => {
        const warning = getVideoCapabilityWarning(i2vOnlyCapabilities, 't2v');
        expect(warning).not.toBeNull();
        expect(warning).toContain('image-to-video only');
    });

    it('warns when I2V selected but model is T2V-only', () => {
        const warning = getVideoCapabilityWarning(t2vOnlyCapabilities, 'i2v');
        expect(warning).not.toBeNull();
        expect(warning).toContain('text-to-video only');
    });

    it('returns null for T2V-only model in T2V mode', () => {
        expect(getVideoCapabilityWarning(t2vOnlyCapabilities, 't2v')).toBeNull();
    });

    it('returns null for I2V-only model in I2V mode', () => {
        expect(getVideoCapabilityWarning(i2vOnlyCapabilities, 'i2v')).toBeNull();
    });
});
