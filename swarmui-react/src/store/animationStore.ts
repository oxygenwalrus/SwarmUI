// Animation Store - Controls animation behavior preferences
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';

export type AnimationSpeed = 'slow' | 'normal' | 'fast';
export type HoverIntensity = 'subtle' | 'normal' | 'pronounced';
export type MotionPreset = 'minimal' | 'calm' | 'studio' | 'expressive';
export type EffectsIntensity = 'off' | 'soft' | 'full';

interface AnimationStore {
    reducedMotion: boolean;
    speed: AnimationSpeed;
    hoverIntensity: HoverIntensity;
    effectsEnabled: boolean;
    motionPreset: MotionPreset;
    ambientMotion: boolean;
    pageTransitions: boolean;
    hoverLiftEnabled: boolean;
    loadingAnimations: boolean;
    effectsIntensity: EffectsIntensity;

    setReducedMotion: (enabled: boolean) => void;
    setSpeed: (speed: AnimationSpeed) => void;
    setHoverIntensity: (intensity: HoverIntensity) => void;
    setEffectsEnabled: (enabled: boolean) => void;
    setMotionPreset: (preset: MotionPreset) => void;
    setAmbientMotion: (enabled: boolean) => void;
    setPageTransitions: (enabled: boolean) => void;
    setHoverLiftEnabled: (enabled: boolean) => void;
    setLoadingAnimations: (enabled: boolean) => void;
    setEffectsIntensity: (intensity: EffectsIntensity) => void;
}

interface AnimationSettingsSnapshot {
    reducedMotion: boolean;
    speed: AnimationSpeed;
    hoverIntensity: HoverIntensity;
    effectsEnabled: boolean;
    motionPreset: MotionPreset;
    ambientMotion: boolean;
    pageTransitions: boolean;
    hoverLiftEnabled: boolean;
    loadingAnimations: boolean;
    effectsIntensity: EffectsIntensity;
}

interface MotionPresetConfig {
    ambientScale: number;
    pageScale: number;
    hoverScale: number;
    loadingScale: number;
    effectsScale: number;
}

const DEFAULT_ANIMATION_SETTINGS: AnimationSettingsSnapshot = {
    reducedMotion: false,
    speed: 'normal',
    hoverIntensity: 'normal',
    effectsEnabled: true,
    motionPreset: 'studio',
    ambientMotion: true,
    pageTransitions: true,
    hoverLiftEnabled: true,
    loadingAnimations: true,
    effectsIntensity: 'full',
};

// Speed multipliers for duration scaling.
const SPEED_MULTIPLIERS: Record<AnimationSpeed, number> = {
    slow: 2,
    normal: 1,
    fast: 0.5,
};

// Hover scale values before preset scaling.
const HOVER_SCALES: Record<HoverIntensity, number> = {
    subtle: 1.02,
    normal: 1.05,
    pronounced: 1.1,
};

const EFFECTS_INTENSITY_MAP: Record<EffectsIntensity, number> = {
    off: 0,
    soft: 0.55,
    full: 1,
};

const MOTION_PRESETS: Record<MotionPreset, MotionPresetConfig> = {
    minimal: {
        ambientScale: 0.35,
        pageScale: 0.72,
        hoverScale: 0.82,
        loadingScale: 0.6,
        effectsScale: 0.4,
    },
    calm: {
        ambientScale: 0.72,
        pageScale: 0.92,
        hoverScale: 0.94,
        loadingScale: 0.86,
        effectsScale: 0.75,
    },
    studio: {
        ambientScale: 1,
        pageScale: 1,
        hoverScale: 1,
        loadingScale: 1,
        effectsScale: 1,
    },
    expressive: {
        ambientScale: 1.28,
        pageScale: 1.12,
        hoverScale: 1.1,
        loadingScale: 1.18,
        effectsScale: 1.22,
    },
};

function getSettingsSnapshot(state: Partial<AnimationSettingsSnapshot>): AnimationSettingsSnapshot {
    return {
        reducedMotion: state.reducedMotion ?? DEFAULT_ANIMATION_SETTINGS.reducedMotion,
        speed: state.speed ?? DEFAULT_ANIMATION_SETTINGS.speed,
        hoverIntensity: state.hoverIntensity ?? DEFAULT_ANIMATION_SETTINGS.hoverIntensity,
        effectsEnabled: state.effectsEnabled ?? DEFAULT_ANIMATION_SETTINGS.effectsEnabled,
        motionPreset: state.motionPreset ?? DEFAULT_ANIMATION_SETTINGS.motionPreset,
        ambientMotion: state.ambientMotion ?? DEFAULT_ANIMATION_SETTINGS.ambientMotion,
        pageTransitions: state.pageTransitions ?? DEFAULT_ANIMATION_SETTINGS.pageTransitions,
        hoverLiftEnabled: state.hoverLiftEnabled ?? DEFAULT_ANIMATION_SETTINGS.hoverLiftEnabled,
        loadingAnimations: state.loadingAnimations ?? DEFAULT_ANIMATION_SETTINGS.loadingAnimations,
        effectsIntensity: state.effectsIntensity ?? DEFAULT_ANIMATION_SETTINGS.effectsIntensity,
    };
}

function syncAnimationSettingsToDOM(snapshot: AnimationSettingsSnapshot) {
    const root = document.documentElement;

    if (snapshot.reducedMotion) {
        root.style.setProperty('--animation-duration', '0ms');
        root.style.setProperty('--transition-duration', '0ms');
        root.style.setProperty('--hover-scale-base', '1');
        root.style.setProperty('--hover-scale', '1');
        root.style.setProperty('--hover-scale-effective', '1');
        root.style.setProperty('--effects-intensity', '0');
        root.style.setProperty('--effects-enabled', '0');
        root.style.setProperty('--motion-speed-multiplier', '0');
        root.style.setProperty('--motion-ambient-scale', '0');
        root.style.setProperty('--motion-page-scale', '0');
        root.style.setProperty('--motion-hover-lift-scale', '0');
        root.style.setProperty('--motion-loading-scale', '0');
        root.style.setProperty('--motion-effects-intensity', '0');
        root.setAttribute('data-reduced-motion', 'true');
        root.setAttribute('data-effects', 'off');
        root.setAttribute('data-ambient-motion', 'off');
        root.setAttribute('data-page-transitions', 'off');
        root.setAttribute('data-hover-lift', 'off');
        root.setAttribute('data-loading-animations', 'off');
        return;
    }

    const preset = MOTION_PRESETS[snapshot.motionPreset];
    const speedMultiplier = SPEED_MULTIPLIERS[snapshot.speed];
    const hoverScaleBase = HOVER_SCALES[snapshot.hoverIntensity];
    const effectsIntensityLevel = snapshot.effectsEnabled
        ? EFFECTS_INTENSITY_MAP[snapshot.effectsIntensity] * preset.effectsScale
        : 0;
    const hoverScaleEffective = snapshot.hoverLiftEnabled
        ? 1 + ((hoverScaleBase - 1) * preset.hoverScale)
        : 1;

    root.style.setProperty('--animation-duration', `${200 * speedMultiplier}ms`);
    root.style.setProperty('--transition-duration', `${100 * speedMultiplier}ms`);
    root.style.setProperty('--hover-scale-base', String(hoverScaleBase));
    root.style.setProperty('--hover-scale', String(hoverScaleEffective));
    root.style.setProperty('--hover-scale-effective', String(hoverScaleEffective));
    root.style.setProperty('--effects-intensity', String(effectsIntensityLevel));
    root.style.setProperty('--effects-enabled', snapshot.effectsEnabled ? '1' : '0');
    root.style.setProperty('--motion-speed-multiplier', String(speedMultiplier));
    root.style.setProperty('--motion-ambient-scale', String(snapshot.ambientMotion ? preset.ambientScale : 0));
    root.style.setProperty('--motion-page-scale', String(snapshot.pageTransitions ? preset.pageScale : 0));
    root.style.setProperty('--motion-hover-lift-scale', String(snapshot.hoverLiftEnabled ? preset.hoverScale : 0));
    root.style.setProperty('--motion-loading-scale', String(snapshot.loadingAnimations ? preset.loadingScale : 0));
    root.style.setProperty('--motion-effects-intensity', String(effectsIntensityLevel));
    root.removeAttribute('data-reduced-motion');

    root.setAttribute('data-motion-preset', snapshot.motionPreset);
    root.setAttribute('data-effects', snapshot.effectsEnabled && effectsIntensityLevel > 0 ? 'on' : 'off');
    root.setAttribute('data-ambient-motion', snapshot.ambientMotion ? 'on' : 'off');
    root.setAttribute('data-page-transitions', snapshot.pageTransitions ? 'on' : 'off');
    root.setAttribute('data-hover-lift', snapshot.hoverLiftEnabled ? 'on' : 'off');
    root.setAttribute('data-loading-animations', snapshot.loadingAnimations ? 'on' : 'off');
}

function applyCurrentSettings(state: Partial<AnimationSettingsSnapshot>) {
    syncAnimationSettingsToDOM(getSettingsSnapshot(state));
}

export function shouldReduceMotionForApp(): boolean {
    const state = useAnimationStore.getState();
    if (state?.reducedMotion) {
        return true;
    }

    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
        return false;
    }

    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function shouldUsePageTransitions(): boolean {
    const state = useAnimationStore.getState();
    if (!state) {
        return !shouldReduceMotionForApp();
    }

    return !state.reducedMotion && state.pageTransitions;
}

export const useAnimationStore = create<AnimationStore>()(
    devtools(
        persist(
            (set, get) => ({
                ...DEFAULT_ANIMATION_SETTINGS,

                setReducedMotion: (enabled: boolean) => {
                    set({ reducedMotion: enabled });
                    applyCurrentSettings(get());
                },

                setSpeed: (speed: AnimationSpeed) => {
                    set({ speed });
                    applyCurrentSettings(get());
                },

                setHoverIntensity: (intensity: HoverIntensity) => {
                    set({ hoverIntensity: intensity });
                    applyCurrentSettings(get());
                },

                setEffectsEnabled: (enabled: boolean) => {
                    set({
                        effectsEnabled: enabled,
                        effectsIntensity: enabled
                            ? (get().effectsIntensity === 'off' ? 'soft' : get().effectsIntensity)
                            : 'off',
                    });
                    applyCurrentSettings(get());
                },

                setMotionPreset: (preset: MotionPreset) => {
                    set({ motionPreset: preset });
                    applyCurrentSettings(get());
                },

                setAmbientMotion: (enabled: boolean) => {
                    set({ ambientMotion: enabled });
                    applyCurrentSettings(get());
                },

                setPageTransitions: (enabled: boolean) => {
                    set({ pageTransitions: enabled });
                    applyCurrentSettings(get());
                },

                setHoverLiftEnabled: (enabled: boolean) => {
                    set({ hoverLiftEnabled: enabled });
                    applyCurrentSettings(get());
                },

                setLoadingAnimations: (enabled: boolean) => {
                    set({ loadingAnimations: enabled });
                    applyCurrentSettings(get());
                },

                setEffectsIntensity: (intensity: EffectsIntensity) => {
                    set({
                        effectsIntensity: intensity,
                        effectsEnabled: intensity !== 'off',
                    });
                    applyCurrentSettings(get());
                },
            }),
            {
                name: 'swarmui-animation',
            }
        ),
        { name: 'AnimationStore' }
    )
);

// Backwards-compatible exported helper.
export function applyAnimationSettings(
    reducedMotion: boolean,
    speed: AnimationSpeed,
    hoverIntensity: HoverIntensity,
    effectsEnabled: boolean = true
) {
    applyCurrentSettings({
        ...useAnimationStore.getState(),
        reducedMotion,
        speed,
        hoverIntensity,
        effectsEnabled,
        effectsIntensity: effectsEnabled
            ? (useAnimationStore.getState().effectsIntensity === 'off' ? 'full' : useAnimationStore.getState().effectsIntensity)
            : 'off',
    });
}

// Initialize animation settings on app load
export function initializeAnimationSettings() {
    const stored = localStorage.getItem('swarmui-animation');
    if (stored) {
        try {
            const { state } = JSON.parse(stored);
            applyCurrentSettings(state ?? DEFAULT_ANIMATION_SETTINGS);
        } catch {
            applyCurrentSettings(DEFAULT_ANIMATION_SETTINGS);
        }
    } else {
        applyCurrentSettings(DEFAULT_ANIMATION_SETTINGS);
    }
}
