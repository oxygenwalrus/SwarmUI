import type { Model } from '../api/types';

export interface ModelMediaCapabilities {
    supportsVideo: boolean;
    supportsTextToVideo: boolean;
    supportsImageToVideo: boolean;
    source: 'explicit' | 'architecture' | 'none';
    matchedArchitecture: string | null;
}

const TEXT_TO_VIDEO_PATTERNS = [
    /mochi/i,
    /hunyuan/i,
    /\bltxv\b/i,
    /ltx[\s-]?video/i,
    /wan/i, // Wan 2.1 & 2.2
];

const IMAGE_TO_VIDEO_PATTERNS = [
    /\bsvd\b/i,
    /stable[\s-]?video[\s-]?diffusion/i,
    /cosmos/i,
    /\bltxv\b/i,
    /ltx[\s-]?video/i,
    /wan/i, // Wan 2.1 & 2.2
];

function readBoolean(value: unknown): boolean | undefined {
    if (typeof value === 'boolean') {
        return value;
    }
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (['true', '1', 'yes', 'on'].includes(normalized)) {
            return true;
        }
        if (['false', '0', 'no', 'off'].includes(normalized)) {
            return false;
        }
    }
    return undefined;
}

function readStringArray(value: unknown): string[] {
    if (Array.isArray(value)) {
        return value
            .filter((entry): entry is string => typeof entry === 'string')
            .map((entry) => entry.trim())
            .filter(Boolean);
    }

    if (typeof value === 'string') {
        return value
            .split(/[|,]/)
            .map((entry) => entry.trim())
            .filter(Boolean);
    }

    return [];
}

function modeListSupports(modes: string[], pattern: RegExp): boolean | undefined {
    if (modes.length === 0) {
        return undefined;
    }

    return modes.some((mode) => pattern.test(mode));
}

function getExplicitCapabilities(model: Model): {
    supportsVideo?: boolean;
    supportsTextToVideo?: boolean;
    supportsImageToVideo?: boolean;
    found: boolean;
} {
    const record = model as Record<string, unknown>;
    const nestedCapabilityRecord =
        (record.mediaCapabilities && typeof record.mediaCapabilities === 'object' ? record.mediaCapabilities : null)
        || (record.media_capabilities && typeof record.media_capabilities === 'object' ? record.media_capabilities : null)
        || (record.videoCapabilities && typeof record.videoCapabilities === 'object' ? record.videoCapabilities : null)
        || (record.video_capabilities && typeof record.video_capabilities === 'object' ? record.video_capabilities : null)
        || (record.capabilities && typeof record.capabilities === 'object' ? record.capabilities : null);
    const nested = (nestedCapabilityRecord ?? {}) as Record<string, unknown>;

    const supportsVideo = readBoolean(record.supportsVideo)
        ?? readBoolean(record.supports_video)
        ?? readBoolean(nested.supportsVideo)
        ?? readBoolean(nested.supports_video)
        ?? readBoolean(nested.video);

    const supportsTextToVideo = readBoolean(record.supportsTextToVideo)
        ?? readBoolean(record.supports_text_to_video)
        ?? readBoolean(record.textToVideo)
        ?? readBoolean(record.text_to_video)
        ?? readBoolean(nested.supportsTextToVideo)
        ?? readBoolean(nested.supports_text_to_video)
        ?? readBoolean(nested.textToVideo)
        ?? readBoolean(nested.text_to_video);

    const supportsImageToVideo = readBoolean(record.supportsImageToVideo)
        ?? readBoolean(record.supports_image_to_video)
        ?? readBoolean(record.imageToVideo)
        ?? readBoolean(record.image_to_video)
        ?? readBoolean(nested.supportsImageToVideo)
        ?? readBoolean(nested.supports_image_to_video)
        ?? readBoolean(nested.imageToVideo)
        ?? readBoolean(nested.image_to_video);

    const supportedModes = [
        ...readStringArray(record.supportedModes),
        ...readStringArray(record.supported_modes),
        ...readStringArray(record.videoModes),
        ...readStringArray(record.video_modes),
        ...readStringArray(nested.supportedModes),
        ...readStringArray(nested.supported_modes),
        ...readStringArray(nested.videoModes),
        ...readStringArray(nested.video_modes),
        ...readStringArray(nested.modes),
    ];

    const inferredTextToVideo = modeListSupports(supportedModes, /(text[\s-]?to[\s-]?video|t2v)/i);
    const inferredImageToVideo = modeListSupports(supportedModes, /(image[\s-]?to[\s-]?video|img2video|i2v)/i);

    const explicitTextToVideo = supportsTextToVideo ?? inferredTextToVideo;
    const explicitImageToVideo = supportsImageToVideo ?? inferredImageToVideo;
    const found = [
        supportsVideo,
        explicitTextToVideo,
        explicitImageToVideo,
    ].some((value) => value !== undefined);

    return {
        supportsVideo,
        supportsTextToVideo: explicitTextToVideo,
        supportsImageToVideo: explicitImageToVideo,
        found,
    };
}

function getArchitectureFallback(model: Model): Pick<ModelMediaCapabilities, 'supportsTextToVideo' | 'supportsImageToVideo' | 'matchedArchitecture'> {
    const architecture = typeof model.architecture === 'string' ? model.architecture : '';
    const haystack = architecture || (typeof model.class === 'string' ? model.class : '') || model.name;

    return {
        supportsTextToVideo: TEXT_TO_VIDEO_PATTERNS.some((pattern) => pattern.test(haystack)),
        supportsImageToVideo: IMAGE_TO_VIDEO_PATTERNS.some((pattern) => pattern.test(haystack)),
        matchedArchitecture: architecture || haystack || null,
    };
}

export function getModelMediaCapabilities(model: Model | null | undefined): ModelMediaCapabilities {
    if (!model) {
        return {
            supportsVideo: false,
            supportsTextToVideo: false,
            supportsImageToVideo: false,
            source: 'none',
            matchedArchitecture: null,
        };
    }

    const explicit = getExplicitCapabilities(model);
    const fallback = getArchitectureFallback(model);

    const supportsTextToVideo = explicit.supportsTextToVideo ?? fallback.supportsTextToVideo;
    const supportsImageToVideo = explicit.supportsImageToVideo ?? fallback.supportsImageToVideo;
    const supportsVideo = explicit.supportsVideo ?? (supportsTextToVideo || supportsImageToVideo);

    return {
        supportsVideo,
        supportsTextToVideo,
        supportsImageToVideo,
        source: explicit.found ? 'explicit' : supportsVideo ? 'architecture' : 'none',
        matchedArchitecture: supportsVideo ? fallback.matchedArchitecture : null,
    };
}
