// useVideoProfile.ts
import { useMemo } from 'react';
import {
    matchVideoProfile,
    GENERIC_FALLBACK_PROFILE,
    type VideoModelProfile,
    type QualityTier,
    type VideoWorkflow,
} from './videoModelProfiles';

export interface ResolvedProfileDefaults {
    profile: VideoModelProfile;
    isGenericFallback: boolean;
    steps: number;
    cfg: number;
    frames: number;
    fps: number;
    sampler: string;
    scheduler: string;
    width: number;
    height: number;
    resolutionPresets: VideoModelProfile['resolutionPresets'];
    requiredComponents: VideoModelProfile['requiredComponents'];
    workflowId: string;
}

/**
 * Pure function: resolve all generation defaults from a model name, quality tier, and workflow.
 * Exported for unit testing.
 */
export function resolveProfileDefaults(
    modelName: string,
    quality: QualityTier,
    workflow: VideoWorkflow,
): ResolvedProfileDefaults {
    const profile = matchVideoProfile(modelName) ?? GENERIC_FALLBACK_PROFILE;
    const isGenericFallback = profile.id === 'generic';
    const qualitySettings = profile[quality];
    const defaultResolution = profile.resolutionPresets[0] ?? { width: 512, height: 512 };

    return {
        profile,
        isGenericFallback,
        steps: qualitySettings.steps,
        cfg: qualitySettings.cfg,
        frames: qualitySettings.frames,
        fps: profile.defaultFps,
        sampler: profile.defaultSampler,
        scheduler: profile.defaultScheduler[workflow],
        width: defaultResolution.width,
        height: defaultResolution.height,
        resolutionPresets: profile.resolutionPresets,
        requiredComponents: profile.requiredComponents,
        workflowId: profile.workflowId[workflow],
    };
}

/**
 * React hook that resolves the active video model profile.
 */
export function useVideoProfile(
    modelName: string,
    quality: QualityTier,
    workflow: VideoWorkflow,
): ResolvedProfileDefaults {
    return useMemo(
        () => resolveProfileDefaults(modelName, quality, workflow),
        [modelName, quality, workflow],
    );
}
