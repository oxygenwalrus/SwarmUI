# Video Studio Revamp Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the VideoSidebar into a model-driven "Video Studio" with auto-configured parameters, pre-flight component checking, and transparent ComfyUI workflow selection.

**Architecture:** Model-first flow where selecting a video model cascades all defaults (steps, CFG, frames, resolution, sampler, scheduler, workflow). Primary controls surface is minimal; technical controls live in an Advanced accordion. Pre-flight checker validates required components (text encoders, VAEs) with one-click download via existing WebSocket API.

**Tech Stack:** React 18, TypeScript, Mantine UI, Zustand, Vitest, existing SwarmUI API client

**Spec:** `docs/superpowers/specs/2026-03-29-video-studio-revamp-design.md`

---

## Chunk 1: Data Layer — Model Profiles & Capabilities

### Task 1: Create videoModelProfiles.ts — Profile Registry

**Files:**
- Create: `swarmui-react/src/pages/GeneratePage/components/VideoSidebar/videoModelProfiles.ts`
- Test: `swarmui-react/src/pages/GeneratePage/components/VideoSidebar/videoModelProfiles.test.ts`

- [ ] **Step 1: Write the test file**

```typescript
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
        // "wan2.2" should not accidentally match wan2.1 pattern
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd swarmui-react && npx vitest run src/pages/GeneratePage/components/VideoSidebar/videoModelProfiles.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```typescript
// videoModelProfiles.ts

export type QualityTier = 'draft' | 'standard' | 'high';

export interface QualitySettings {
    steps: number;
    cfg: number;
    frames: number;
}

export interface RequiredComponent {
    type: 'text_encoder' | 'vae' | 'clip';
    name: string;
    filename: string;
    downloadUrl: string;
    modelType: string; // swarmClient.downloadModel type: 'VAE', 'Clip', etc.
}

export interface VideoModelProfile {
    id: string;
    label: string;
    pattern: RegExp;
    priority: number;
    supportsT2V: boolean;
    supportsI2V: boolean;
    draft: QualitySettings;
    standard: QualitySettings;
    high: QualitySettings;
    defaultFps: number;
    defaultSampler: string;
    defaultScheduler: { t2v: string; i2v: string };
    resolutionPresets: Array<{ label: string; width: number; height: number }>;
    requiredComponents: RequiredComponent[];
    workflowId: { t2v: string; i2v: string };
}

export const VIDEO_MODEL_PROFILES: VideoModelProfile[] = [
    {
        id: 'wan22',
        label: 'Wan 2.2',
        pattern: /wan.*2\.?2/i,
        priority: 30,
        supportsT2V: true,
        supportsI2V: true,
        draft: { steps: 10, cfg: 3.0, frames: 33 },
        standard: { steps: 20, cfg: 5.0, frames: 81 },
        high: { steps: 35, cfg: 5.0, frames: 81 },
        defaultFps: 16,
        defaultSampler: 'euler',
        defaultScheduler: { t2v: 'normal', i2v: 'normal' },
        resolutionPresets: [
            { label: 'Landscape 1280x720', width: 1280, height: 720 },
            { label: 'Portrait 720x1280', width: 720, height: 1280 },
            { label: 'Square 960x960', width: 960, height: 960 },
        ],
        requiredComponents: [
            {
                type: 'text_encoder',
                name: 'T5-XXL Text Encoder',
                filename: 'google_t5-v1_1-xxl_encoderonly',
                downloadUrl: 'https://huggingface.co/mcmonkey/google_t5-v1_1-xxl_encoderonly/resolve/main/model.safetensors',
                modelType: 'Clip',
            },
        ],
        workflowId: { t2v: 'wan22_t2v', i2v: 'wan22_i2v' },
    },
    {
        id: 'wan21',
        label: 'Wan 2.1',
        pattern: /wan.*2\.?1/i,
        priority: 20,
        supportsT2V: true,
        supportsI2V: true,
        draft: { steps: 10, cfg: 3.0, frames: 33 },
        standard: { steps: 20, cfg: 5.0, frames: 81 },
        high: { steps: 35, cfg: 5.0, frames: 81 },
        defaultFps: 16,
        defaultSampler: 'euler',
        defaultScheduler: { t2v: 'normal', i2v: 'normal' },
        resolutionPresets: [
            { label: 'Landscape 832x480', width: 832, height: 480 },
            { label: 'Portrait 480x832', width: 480, height: 832 },
            { label: 'Square 512x512', width: 512, height: 512 },
        ],
        requiredComponents: [
            {
                type: 'text_encoder',
                name: 'T5-XXL Text Encoder',
                filename: 'google_t5-v1_1-xxl_encoderonly',
                downloadUrl: 'https://huggingface.co/mcmonkey/google_t5-v1_1-xxl_encoderonly/resolve/main/model.safetensors',
                modelType: 'Clip',
            },
        ],
        workflowId: { t2v: 'wan21_t2v', i2v: 'wan21_i2v' },
    },
    {
        id: 'ltxv',
        label: 'LTX Video',
        pattern: /\bltxv\b|ltx[\s-]?video/i,
        priority: 10,
        supportsT2V: true,
        supportsI2V: true,
        draft: { steps: 8, cfg: 3.0, frames: 41 },
        standard: { steps: 20, cfg: 3.5, frames: 97 },
        high: { steps: 40, cfg: 3.5, frames: 97 },
        defaultFps: 24,
        defaultSampler: 'euler',
        defaultScheduler: { t2v: 'ltxv', i2v: 'ltxv-image' },
        resolutionPresets: [
            { label: 'Landscape 768x512', width: 768, height: 512 },
            { label: 'Portrait 512x768', width: 512, height: 768 },
            { label: 'Square 512x512', width: 512, height: 512 },
        ],
        requiredComponents: [
            {
                type: 'text_encoder',
                name: 'T5-XXL Text Encoder',
                filename: 'google_t5-v1_1-xxl_encoderonly',
                downloadUrl: 'https://huggingface.co/mcmonkey/google_t5-v1_1-xxl_encoderonly/resolve/main/model.safetensors',
                modelType: 'Clip',
            },
            {
                type: 'vae',
                name: 'LTXV VAE',
                filename: 'ltxv_vae',
                downloadUrl: 'https://huggingface.co/Lightricks/LTX-Video/resolve/main/vae/diffusion_pytorch_model.safetensors',
                modelType: 'VAE',
            },
        ],
        workflowId: { t2v: 'ltxv_t2v', i2v: 'ltxv_i2v' },
    },
];

export type VideoWorkflow = 't2v' | 'i2v';

export const GENERIC_FALLBACK_PROFILE: VideoModelProfile = {
    id: 'generic',
    label: 'Unknown Model',
    pattern: /$^/, // never matches
    priority: 0,
    supportsT2V: true,
    supportsI2V: true,
    draft: { steps: 10, cfg: 7.0, frames: 25 },
    standard: { steps: 20, cfg: 7.0, frames: 25 },
    high: { steps: 35, cfg: 7.0, frames: 25 },
    defaultFps: 24,
    defaultSampler: 'euler',
    defaultScheduler: { t2v: 'normal', i2v: 'normal' },
    resolutionPresets: [
        { label: 'Landscape 1280x720', width: 1280, height: 720 },
        { label: 'Portrait 720x1280', width: 720, height: 1280 },
        { label: 'Square 512x512', width: 512, height: 512 },
    ],
    requiredComponents: [],
    workflowId: { t2v: '', i2v: '' },
};

/**
 * Match a model name against known video model profiles.
 * Returns the highest-priority matching profile, or null if none match.
 */
export function matchVideoProfile(modelName: string): VideoModelProfile | null {
    if (!modelName) return null;
    const sorted = [...VIDEO_MODEL_PROFILES].sort((a, b) => b.priority - a.priority);
    return sorted.find((profile) => profile.pattern.test(modelName)) ?? null;
}

/**
 * Get the quality settings for a given tier from a profile.
 */
export function getQualitySettings(profile: VideoModelProfile, tier: QualityTier): QualitySettings {
    return profile[tier];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd swarmui-react && npx vitest run src/pages/GeneratePage/components/VideoSidebar/videoModelProfiles.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add swarmui-react/src/pages/GeneratePage/components/VideoSidebar/videoModelProfiles.ts swarmui-react/src/pages/GeneratePage/components/VideoSidebar/videoModelProfiles.test.ts
git commit -m "feat(video): add video model profile registry with Wan 2.1, Wan 2.2, LTXV profiles"
```

---

### Task 2: Add Wan patterns to modelCapabilities.ts

**Files:**
- Modify: `swarmui-react/src/utils/modelCapabilities.ts:11-24`

- [ ] **Step 1: Add Wan patterns to both arrays**

In `modelCapabilities.ts`, add Wan patterns to `TEXT_TO_VIDEO_PATTERNS` and `IMAGE_TO_VIDEO_PATTERNS`:

```typescript
const TEXT_TO_VIDEO_PATTERNS = [
    /mochi/i,
    /hunyuan/i,
    /\bltxv\b/i,
    /ltx[\s-]?video/i,
    /wan/i,          // Wan 2.1 & 2.2
];

const IMAGE_TO_VIDEO_PATTERNS = [
    /\bsvd\b/i,
    /stable[\s-]?video[\s-]?diffusion/i,
    /cosmos/i,
    /\bltxv\b/i,
    /ltx[\s-]?video/i,
    /wan/i,          // Wan 2.1 & 2.2
];
```

- [ ] **Step 2: Run existing tests**

Run: `cd swarmui-react && npx vitest run src/utils/modelCapabilities`
Expected: PASS (existing tests should still pass; new patterns don't break anything)

- [ ] **Step 3: Commit**

```bash
git add swarmui-react/src/utils/modelCapabilities.ts
git commit -m "feat(video): add Wan model patterns to video capability detection"
```

---

### Task 3: Create useVideoProfile hook

**Files:**
- Create: `swarmui-react/src/pages/GeneratePage/components/VideoSidebar/useVideoProfile.ts`
- Test: `swarmui-react/src/pages/GeneratePage/components/VideoSidebar/useVideoProfile.test.ts`

- [ ] **Step 1: Write the test file**

```typescript
// useVideoProfile.test.ts
import { describe, expect, it } from 'vitest';
import { resolveProfileDefaults } from './useVideoProfile';
import type { VideoWorkflow } from './videoModelProfiles';

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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd swarmui-react && npx vitest run src/pages/GeneratePage/components/VideoSidebar/useVideoProfile.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Write the implementation**

```typescript
// useVideoProfile.ts
import { useMemo } from 'react';
import type { UseFormReturnType } from '@mantine/form';
import type { GenerateParams } from '../../../../api/types';
import type { VideoWorkflow } from './videoModelProfiles';
import {
    matchVideoProfile,
    GENERIC_FALLBACK_PROFILE,
    type VideoModelProfile,
    type QualityTier,
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
 * React hook that resolves the active video model profile and applies
 * defaults to the form when the model or quality tier changes.
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd swarmui-react && npx vitest run src/pages/GeneratePage/components/VideoSidebar/useVideoProfile.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add swarmui-react/src/pages/GeneratePage/components/VideoSidebar/useVideoProfile.ts swarmui-react/src/pages/GeneratePage/components/VideoSidebar/useVideoProfile.test.ts
git commit -m "feat(video): add useVideoProfile hook for model-driven default resolution"
```

---

## Chunk 2: UI Components — Quality Preset, Pre-flight Check, GenerateButton

### Task 4: Create QualityPreset.tsx

**Files:**
- Create: `swarmui-react/src/pages/GeneratePage/components/VideoSidebar/QualityPreset.tsx`

- [ ] **Step 1: Write the component**

```typescript
// QualityPreset.tsx
import { SegmentedControl, Stack, Text } from '@mantine/core';
import type { QualityTier } from './videoModelProfiles';

interface QualityPresetProps {
    value: QualityTier | null; // null = custom (user overrode values)
    onChange: (tier: QualityTier) => void;
}

const QUALITY_DATA = [
    { value: 'draft', label: 'Draft' },
    { value: 'standard', label: 'Standard' },
    { value: 'high', label: 'High' },
] as const;

export function QualityPreset({ value, onChange }: QualityPresetProps) {
    return (
        <Stack gap="xs">
            <Text size="xs" fw={600} c="invokeGray.2" tt="uppercase">Quality</Text>
            <SegmentedControl
                value={value ?? ''}
                onChange={(val) => {
                    if (val === 'draft' || val === 'standard' || val === 'high') {
                        onChange(val);
                    }
                }}
                data={[...QUALITY_DATA]}
                fullWidth
                size="sm"
            />
            {value === 'draft' && (
                <Text size="xs" c="dimmed">
                    Faster preview with fewer frames and steps.
                </Text>
            )}
            {value === null && (
                <Text size="xs" c="dimmed">
                    Custom — manual settings in Advanced override the preset.
                </Text>
            )}
        </Stack>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add swarmui-react/src/pages/GeneratePage/components/VideoSidebar/QualityPreset.tsx
git commit -m "feat(video): add QualityPreset segmented control component"
```

---

### Task 5: Create PreflightCheck.tsx

**Files:**
- Create: `swarmui-react/src/pages/GeneratePage/components/VideoSidebar/PreflightCheck.tsx`

- [ ] **Step 1: Write the component**

```typescript
// PreflightCheck.tsx
import { useCallback, useEffect, useState } from 'react';
import { Alert, Badge, Group, Progress, Stack, Text } from '@mantine/core';
import { IconAlertTriangle, IconCheck, IconDownload, IconRefresh } from '@tabler/icons-react';
import { swarmClient } from '../../../../api/client';
import { SwarmButton } from '../../../../components/ui';
import type { RequiredComponent } from './videoModelProfiles';

type ComponentStatus = 'checking' | 'present' | 'missing' | 'downloading' | 'error';

interface ComponentState {
    component: RequiredComponent;
    status: ComponentStatus;
    progress: number;
    error: string | null;
}

interface PreflightCheckProps {
    requiredComponents: RequiredComponent[];
    onStatusChange: (allPresent: boolean) => void;
}

export function PreflightCheck({ requiredComponents, onStatusChange }: PreflightCheckProps) {
    const [states, setStates] = useState<ComponentState[]>([]);

    const checkComponents = useCallback(async () => {
        if (requiredComponents.length === 0) {
            onStatusChange(true);
            setStates([]);
            return;
        }

        const initialStates: ComponentState[] = requiredComponents.map((c) => ({
            component: c,
            status: 'checking',
            progress: 0,
            error: null,
        }));
        setStates(initialStates);

        const updatedStates = [...initialStates];
        for (let i = 0; i < requiredComponents.length; i++) {
            const comp = requiredComponents[i];
            try {
                const models = await swarmClient.listModels('', comp.modelType);
                const found = models.some(
                    (m) => m.name.toLowerCase().includes(comp.filename.toLowerCase()),
                );
                updatedStates[i] = {
                    ...updatedStates[i],
                    status: found ? 'present' : 'missing',
                };
            } catch {
                updatedStates[i] = {
                    ...updatedStates[i],
                    status: 'missing',
                };
            }
        }

        setStates([...updatedStates]);
        onStatusChange(updatedStates.every((s) => s.status === 'present'));
    }, [requiredComponents, onStatusChange]);

    useEffect(() => {
        checkComponents();
    }, [checkComponents]);

    const handleDownload = (index: number) => {
        const comp = states[index].component;
        setStates((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], status: 'downloading', progress: 0, error: null };
            return next;
        });

        swarmClient.downloadModel(
            {
                url: comp.downloadUrl,
                type: comp.modelType,
                name: comp.filename,
            },
            {
                onProgress: (data) => {
                    setStates((prev) => {
                        const next = [...prev];
                        next[index] = { ...next[index], progress: data.overall_percent };
                        return next;
                    });
                },
                onSuccess: () => {
                    setStates((prev) => {
                        const next = [...prev];
                        next[index] = { ...next[index], status: 'present', progress: 100 };
                        return next;
                    });
                    // Re-check all to update overall status
                    setTimeout(() => checkComponents(), 500);
                },
                onError: (error) => {
                    setStates((prev) => {
                        const next = [...prev];
                        next[index] = { ...next[index], status: 'error', error };
                        return next;
                    });
                },
            },
        );
    };

    const missingOrError = states.filter(
        (s) => s.status === 'missing' || s.status === 'downloading' || s.status === 'error',
    );

    if (missingOrError.length === 0 && states.length > 0 && states.every((s) => s.status === 'present')) {
        return (
            <Badge color="green" variant="light" leftSection={<IconCheck size={12} />}>
                All components ready
            </Badge>
        );
    }

    if (states.some((s) => s.status === 'checking')) {
        return (
            <Badge color="gray" variant="light">
                Checking components...
            </Badge>
        );
    }

    if (missingOrError.length === 0) return null;

    return (
        <Alert color="yellow" variant="light" icon={<IconAlertTriangle size={16} />} title="Missing Components">
            <Stack gap="xs">
                {missingOrError.map((state, i) => {
                    const globalIndex = states.indexOf(state);
                    return (
                        <Stack key={state.component.filename} gap={4}>
                            <Group justify="space-between" wrap="nowrap">
                                <Text size="sm">{state.component.name}</Text>
                                {state.status === 'missing' && (
                                    <SwarmButton
                                        size="xs"
                                        tone="primary"
                                        emphasis="soft"
                                        leftSection={<IconDownload size={12} />}
                                        onClick={() => handleDownload(globalIndex)}
                                    >
                                        Download
                                    </SwarmButton>
                                )}
                                {state.status === 'error' && (
                                    <SwarmButton
                                        size="xs"
                                        tone="danger"
                                        emphasis="soft"
                                        leftSection={<IconRefresh size={12} />}
                                        onClick={() => handleDownload(globalIndex)}
                                    >
                                        Retry
                                    </SwarmButton>
                                )}
                            </Group>
                            {state.status === 'downloading' && (
                                <Progress value={state.progress} size="sm" animated />
                            )}
                            {state.status === 'error' && state.error && (
                                <Text size="xs" c="red">{state.error}</Text>
                            )}
                        </Stack>
                    );
                })}
            </Stack>
        </Alert>
    );
}
```

- [ ] **Step 2: Commit**

```bash
git add swarmui-react/src/pages/GeneratePage/components/VideoSidebar/PreflightCheck.tsx
git commit -m "feat(video): add PreflightCheck component with one-click download"
```

---

### Task 6: Add disabled state to GenerateButton

**Files:**
- Modify: `swarmui-react/src/pages/GeneratePage/components/ParameterPanel/GenerateButton.tsx:11-21,165-177`

- [ ] **Step 1: Add disabled props to the interface**

In `GenerateButton.tsx`, add to `GenerateButtonProps`:

```typescript
export interface GenerateButtonProps {
    generating: boolean;
    onStop: () => void;
    onOpenSchedule: () => void;
    onGenerateVariations?: (count: number) => void;
    onGenerateAndUpscale?: () => void;
    qualityCoach?: QualityCoachAnalysis;
    onApplyQualityCoachFixes?: (overrides: Partial<GenerateParams>) => void;
    currentValues?: Partial<GenerateParams>;
    selectedModel?: Model | null;
    disabled?: boolean;
    disabledReason?: string;
}
```

- [ ] **Step 2: Destructure new props and wrap Generate button with Tooltip**

In the `GenerateButton` component function, destructure `disabled` and `disabledReason`. Then wrap the existing generate `SwarmButton` (the one with `type="submit"`) with a conditional Tooltip:

Find the `<SwarmButton type="submit"` block (around line 165-177) and change it to:

```typescript
<Tooltip
    label={disabledReason ?? 'Cannot generate'}
    disabled={!disabled}
    withArrow
>
    <SwarmButton
        type="submit"
        size="lg"
        fullWidth
        tone="primary"
        emphasis="solid"
        className="gradient-button with-glow"
        leftSection={<IconPlayerPlay size={18} />}
        onContextMenu={disabled ? undefined : contextMenu.open}
        style={{ flex: '1 1 auto', opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? 'none' : undefined }}
        disabled={disabled}
    >
        Generate
    </SwarmButton>
</Tooltip>
```

Note: Mantine's Tooltip works with disabled elements by wrapping in a span. The `SwarmButton` extends Mantine `Button` which handles the disabled prop natively.

- [ ] **Step 3: Run the build to verify no type errors**

Run: `cd swarmui-react && npx tsc --noEmit`
Expected: No new errors (existing errors may be present)

- [ ] **Step 4: Commit**

```bash
git add swarmui-react/src/pages/GeneratePage/components/ParameterPanel/GenerateButton.tsx
git commit -m "feat(video): add disabled state with tooltip to GenerateButton"
```

---

## Chunk 3: VideoSidebar Rewrite

### Task 7: Rewrite VideoSidebar index.tsx

**Files:**
- Modify: `swarmui-react/src/pages/GeneratePage/components/VideoSidebar/index.tsx` (complete rewrite)

- [ ] **Step 1: Rewrite the component**

Replace the entire contents of `index.tsx` with:

```typescript
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import {
    Accordion,
    Alert,
    Box,
    Divider,
    FileButton,
    Image,
    ScrollArea,
    Select,
    Stack,
    Switch,
    Text,
    Textarea,
} from '@mantine/core';
import { IconHistory, IconInfoCircle, IconRoute2, IconUpload, IconX } from '@tabler/icons-react';
import type { UseFormReturnType } from '@mantine/form';
import type { GenerateParams, LoRASelection, Model } from '../../../../api/types';
import type { ModelMediaCapabilities } from '../../../../utils/modelCapabilities';
import { SectionHero } from '../../../../components/ui';
import { SwarmActionIcon, SwarmButton } from '../../../../components/ui';
import { SamplingSelect } from '../../../../components/ui';
import { GenerateButton } from '../ParameterPanel/GenerateButton';
import { SliderWithInput } from '../../../../components/SliderWithInput';
import { SeedInput } from '../../../../components/SeedInput';
import { ActiveLoRAs } from '../ParameterPanel/ActiveLoRAs';
import { VideoWorkflowToggle, resolveInitialWorkflow } from './VideoWorkflowToggle';
import { VideoResolution } from './VideoResolution';
import { QualityPreset } from './QualityPreset';
import { PreflightCheck } from './PreflightCheck';
import { useVideoProfile, resolveProfileDefaults } from './useVideoProfile';
import { useT2IParams } from '../../../../hooks/useT2IParams';
import { useWorkflowWorkspaceStore } from '../../../../stores/workflowWorkspaceStore';
import { useNavigationStore } from '../../../../stores/navigationStore';
import type { VideoWorkflow } from './videoModelProfiles';
import type { QualityTier } from './videoModelProfiles';

const FORMAT_OPTIONS = [
    { value: 'h264-mp4', label: 'H.264 MP4' },
    { value: 'h265-mp4', label: 'H.265 MP4' },
    { value: 'webm', label: 'WebM' },
    { value: 'webp', label: 'WebP' },
    { value: 'gif', label: 'GIF' },
];

export interface VideoSidebarProps {
    form: UseFormReturnType<GenerateParams>;
    onGenerate: (values: GenerateParams) => void;
    models: Model[];
    loadingModels: boolean;
    loadingModel: boolean;
    onModelSelect: (modelName: string | null) => void;
    modelMediaCapabilities: ModelMediaCapabilities;
    generating: boolean;
    onStop: () => void;
    onOpenSchedule: () => void;
    onOpenHistory: () => void;
    initImagePreview: string | null;
    onInitImageUpload: (file: File | null) => void;
    onClearInitImage: () => void;
    activeLoras: LoRASelection[];
    onLoraChange: (loras: LoRASelection[]) => void;
    onOpenLoraBrowser: () => void;
}

export const VideoSidebar = memo(function VideoSidebar({
    form,
    onGenerate,
    models,
    loadingModels,
    loadingModel,
    onModelSelect,
    modelMediaCapabilities,
    generating,
    onStop,
    onOpenSchedule,
    onOpenHistory,
    initImagePreview,
    onInitImageUpload,
    onClearInitImage,
    activeLoras,
    onLoraChange,
    onOpenLoraBrowser,
}: VideoSidebarProps) {
    const { samplerOptions, schedulerOptions } = useT2IParams();
    const setWorkflowHandoff = useWorkflowWorkspaceStore((s) => s.setHandoff);
    const navigateToWorkflows = useNavigationStore((s) => s.navigateToWorkflows);

    const [workflow, setWorkflow] = useState<VideoWorkflow>(
        () => resolveInitialWorkflow(initImagePreview),
    );
    const [qualityTier, setQualityTier] = useState<QualityTier | null>('standard');
    const [preflightReady, setPreflightReady] = useState(true);

    const modelName = form.values.model ?? '';
    const resolved = useVideoProfile(modelName, qualityTier ?? 'standard', workflow);

    // Re-sync workflow toggle if init image changes externally
    useEffect(() => {
        setWorkflow(resolveInitialWorkflow(initImagePreview));
    }, [initImagePreview]);

    // Apply profile defaults when model or quality tier changes
    // (but NOT on workflow toggle — per spec, only scheduler changes on workflow switch)
    const prevModelRef = useRef(modelName);
    const prevQualityRef = useRef(qualityTier);
    useEffect(() => {
        if (!modelName) return;
        const defaults = resolveProfileDefaults(modelName, qualityTier ?? 'standard', workflow);
        const modelChanged = prevModelRef.current !== modelName;
        const qualityChanged = prevQualityRef.current !== qualityTier;
        prevModelRef.current = modelName;
        prevQualityRef.current = qualityTier;

        // Always update scheduler (it can differ per workflow)
        form.setFieldValue('scheduler', defaults.scheduler);

        // Only reset all params on model or quality change, not workflow toggle
        if (modelChanged || qualityChanged) {
            const isI2V = workflow === 'i2v';
            form.setFieldValue('steps', defaults.steps);
            form.setFieldValue('cfgscale', defaults.cfg);
            form.setFieldValue('sampler', defaults.sampler);
            form.setFieldValue('width', defaults.width);
            form.setFieldValue('height', defaults.height);

            if (isI2V) {
                form.setFieldValue('videoframes', defaults.frames);
                form.setFieldValue('videofps', defaults.fps);
                form.setFieldValue('videocfg', defaults.cfg);
            } else {
                form.setFieldValue('text2videoframes', defaults.frames);
                form.setFieldValue('text2videofps', defaults.fps);
            }
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [modelName, qualityTier, workflow]);

    // Detect manual step/CFG overrides -> deselect quality preset
    // Use a ref to avoid race conditions with the cascading effect above
    const cascadingRef = useRef(false);
    useEffect(() => {
        // Skip detection during the cascade effect's updates
        if (cascadingRef.current) return;
        if (qualityTier === null) return;
        const expected = resolveProfileDefaults(modelName, qualityTier, workflow);
        if (
            form.values.steps !== expected.steps ||
            form.values.cfgscale !== expected.cfg
        ) {
            setQualityTier(null);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [form.values.steps, form.values.cfgscale]);

    function handleWorkflowChange(next: VideoWorkflow) {
        if (next === 't2v') {
            onClearInitImage();
        }
        setWorkflow(next);
    }

    function handleQualityChange(tier: QualityTier) {
        setQualityTier(tier);
    }

    const handleOpenInComfyUI = useCallback(() => {
        setWorkflowHandoff({
            source: 'generate',
            templateId: resolved.workflowId || null,
            params: { ...form.values },
        });
        navigateToWorkflows({ mode: 'comfy' });
    }, [form.values, navigateToWorkflows, resolved.workflowId, setWorkflowHandoff]);

    const modelOptions = models.map((m) => ({
        value: m.name,
        label: m.title || m.name,
    }));

    const isI2V = workflow === 'i2v';
    const preflightDisabled = !preflightReady && resolved.requiredComponents.length > 0;

    return (
        <Box
            className="surface-table panel-gradient-subtle"
            style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
            }}
        >
            {/* Header */}
            <Box p="sm" style={{ borderBottom: 'var(--elevation-border)', flexShrink: 0 }}>
                <SectionHero
                    title="Video Studio"
                    rightSection={
                        <SwarmActionIcon
                            tone="secondary"
                            emphasis="ghost"
                            size="sm"
                            title="History"
                            onClick={onOpenHistory}
                        >
                            <IconHistory size={14} />
                        </SwarmActionIcon>
                    }
                />
            </Box>

            {/* Scrollable body */}
            <ScrollArea style={{ flex: 1 }} p="sm">
                <form onSubmit={form.onSubmit(onGenerate)}>
                    <Stack gap="md">
                        {/* Model selector */}
                        <Select
                            label="Model"
                            placeholder={loadingModels ? 'Loading...' : 'Select a video model'}
                            data={modelOptions}
                            searchable
                            size="sm"
                            disabled={loadingModel}
                            value={form.values.model ?? null}
                            onChange={onModelSelect}
                        />

                        {/* Pre-flight component check */}
                        <PreflightCheck
                            requiredComponents={resolved.requiredComponents}
                            onStatusChange={setPreflightReady}
                        />

                        {/* Unknown model info */}
                        {resolved.isGenericFallback && modelName && (
                            <Alert color="blue" variant="light" icon={<IconInfoCircle size={16} />}>
                                <Text size="sm">
                                    Unknown model family — using default settings. Open Advanced for full control.
                                </Text>
                            </Alert>
                        )}

                        <Divider />

                        {/* Workflow toggle */}
                        <VideoWorkflowToggle
                            workflow={workflow}
                            onChange={handleWorkflowChange}
                        />

                        {/* Init image (I2V only) */}
                        {isI2V && (
                            <Stack gap="xs">
                                {initImagePreview ? (
                                    <Box style={{ position: 'relative', display: 'inline-block' }}>
                                        <Image
                                            src={initImagePreview}
                                            mah={180}
                                            fit="contain"
                                            radius="sm"
                                        />
                                        <SwarmActionIcon
                                            tone="danger"
                                            emphasis="soft"
                                            size="xs"
                                            title="Clear init image"
                                            style={{ position: 'absolute', top: 4, right: 4 }}
                                            onClick={onClearInitImage}
                                        >
                                            <IconX size={10} />
                                        </SwarmActionIcon>
                                    </Box>
                                ) : (
                                    <FileButton
                                        onChange={(file) => file && onInitImageUpload(file)}
                                        accept="image/*"
                                    >
                                        {(props) => (
                                            <SwarmButton
                                                {...props}
                                                tone="secondary"
                                                emphasis="soft"
                                                leftSection={<IconUpload size={14} />}
                                            >
                                                Upload Init Image
                                            </SwarmButton>
                                        )}
                                    </FileButton>
                                )}
                            </Stack>
                        )}

                        <Divider />

                        {/* Prompt */}
                        <Textarea
                            label="Prompt"
                            placeholder="Describe the video you want to create..."
                            minRows={3}
                            autosize
                            size="sm"
                            {...form.getInputProps('prompt')}
                        />

                        <Divider />

                        {/* Quality preset */}
                        <QualityPreset
                            value={qualityTier}
                            onChange={handleQualityChange}
                        />

                        {/* Resolution presets */}
                        <VideoResolution
                            form={form}
                            presets={resolved.resolutionPresets}
                        />

                        <Divider />

                        {/* Generate button */}
                        <GenerateButton
                            generating={generating}
                            onStop={onStop}
                            onOpenSchedule={onOpenSchedule}
                            currentValues={form.values}
                            disabled={preflightDisabled}
                            disabledReason="Missing required components — download them above"
                        />

                        {/* Advanced section */}
                        <Accordion variant="separated">
                            <Accordion.Item value="advanced">
                                <Accordion.Control>
                                    <Text size="sm" fw={600}>Advanced Settings</Text>
                                </Accordion.Control>
                                <Accordion.Panel>
                                    <Stack gap="sm">
                                        {/* Negative prompt */}
                                        <Textarea
                                            label="Negative Prompt"
                                            placeholder="What to avoid..."
                                            minRows={2}
                                            autosize
                                            size="sm"
                                            {...form.getInputProps('negativeprompt')}
                                        />

                                        <Divider />

                                        {/* Frames */}
                                        <SliderWithInput
                                            label="Frames"
                                            value={isI2V ? (form.values.videoframes ?? 25) : (form.values.text2videoframes ?? 97)}
                                            onChange={(value) =>
                                                isI2V
                                                    ? form.setFieldValue('videoframes', value)
                                                    : form.setFieldValue('text2videoframes', value)
                                            }
                                            min={1}
                                            max={257}
                                        />

                                        {/* FPS */}
                                        <SliderWithInput
                                            label="FPS"
                                            value={isI2V ? (form.values.videofps ?? 24) : (form.values.text2videofps ?? 24)}
                                            onChange={(value) =>
                                                isI2V
                                                    ? form.setFieldValue('videofps', value)
                                                    : form.setFieldValue('text2videofps', value)
                                            }
                                            min={1}
                                            max={60}
                                        />

                                        {/* Steps */}
                                        <SliderWithInput
                                            label="Steps"
                                            value={form.values.steps ?? 20}
                                            onChange={(value) => form.setFieldValue('steps', value)}
                                            min={1}
                                            max={150}
                                        />

                                        {/* CFG Scale */}
                                        <SliderWithInput
                                            label="CFG Scale"
                                            value={isI2V ? (form.values.videocfg ?? 3.5) : (form.values.cfgscale ?? 7)}
                                            onChange={(value) =>
                                                isI2V
                                                    ? form.setFieldValue('videocfg', value)
                                                    : form.setFieldValue('cfgscale', value)
                                            }
                                            min={1}
                                            max={20}
                                            step={0.5}
                                            decimalScale={1}
                                        />

                                        {/* Seed */}
                                        <SeedInput
                                            value={form.values.seed ?? -1}
                                            onChange={(value) => form.setFieldValue('seed', value)}
                                        />

                                        <Divider />

                                        {/* Sampler */}
                                        <SamplingSelect
                                            kind="sampler"
                                            label="Sampler"
                                            data={samplerOptions}
                                            size="sm"
                                            {...form.getInputProps('sampler')}
                                        />
                                        <SamplingSelect
                                            kind="scheduler"
                                            label="Scheduler"
                                            data={schedulerOptions}
                                            size="sm"
                                            {...form.getInputProps('scheduler')}
                                        />

                                        {/* Format */}
                                        <Select
                                            label="Video Format"
                                            size="sm"
                                            data={FORMAT_OPTIONS}
                                            {...(isI2V
                                                ? form.getInputProps('videoformat')
                                                : form.getInputProps('text2videoformat')
                                            )}
                                        />

                                        {/* Boomerang (I2V only) */}
                                        {isI2V && (
                                            <Switch
                                                label="Boomerang (loop back and forth)"
                                                size="xs"
                                                {...form.getInputProps('videoboomerang', { type: 'checkbox' })}
                                            />
                                        )}

                                        {/* Custom resolution */}
                                        <VideoResolution form={form} presets={[]} customOnly />

                                        <Divider />

                                        {/* LoRAs */}
                                        <SwarmButton
                                            size="xs"
                                            tone="secondary"
                                            emphasis="soft"
                                            onClick={onOpenLoraBrowser}
                                        >
                                            Browse LoRAs
                                        </SwarmButton>
                                        <ActiveLoRAs
                                            form={form}
                                            activeLoras={activeLoras}
                                            onLoraChange={onLoraChange}
                                            onOpenLoraBrowser={onOpenLoraBrowser}
                                        />

                                        <Divider />

                                        {/* Open in ComfyUI */}
                                        {resolved.workflowId && (
                                            <SwarmButton
                                                size="xs"
                                                tone="secondary"
                                                emphasis="soft"
                                                leftSection={<IconRoute2 size={14} />}
                                                onClick={handleOpenInComfyUI}
                                            >
                                                Open in ComfyUI
                                            </SwarmButton>
                                        )}
                                    </Stack>
                                </Accordion.Panel>
                            </Accordion.Item>
                        </Accordion>
                    </Stack>
                </form>
            </ScrollArea>
        </Box>
    );
});
```

- [ ] **Step 2: Run the build to verify no type errors**

Run: `cd swarmui-react && npx tsc --noEmit`
Expected: No new type errors

- [ ] **Step 3: Commit**

```bash
git add swarmui-react/src/pages/GeneratePage/components/VideoSidebar/index.tsx
git commit -m "feat(video): rewrite VideoSidebar with model-driven layout, quality presets, and pre-flight checks"
```

---

### Task 8: Update VideoResolution.tsx for model-aware presets

**Files:**
- Modify: `swarmui-react/src/pages/GeneratePage/components/VideoSidebar/VideoResolution.tsx`

- [ ] **Step 1: Update to accept presets from props**

Replace the entire file:

```typescript
import { Group, NumberInput, Stack, Text } from '@mantine/core';
import { SwarmButton } from '../../../../components/ui';
import type { UseFormReturnType } from '@mantine/form';
import type { GenerateParams } from '../../../../api/types';

export interface ResolutionPreset {
    label: string;
    width: number;
    height: number;
}

/**
 * Returns the preset label matching the given dimensions, or 'Custom' if none match.
 */
export function getActivePreset(
    width: number,
    height: number,
    presets: ResolutionPreset[],
): string {
    const match = presets.find((p) => p.width === width && p.height === height);
    return match ? match.label : 'Custom';
}

interface VideoResolutionProps {
    form: UseFormReturnType<GenerateParams>;
    presets: ResolutionPreset[];
    customOnly?: boolean;
}

export function VideoResolution({ form, presets, customOnly }: VideoResolutionProps) {
    const activePreset = getActivePreset(
        form.values.width ?? 0,
        form.values.height ?? 0,
        presets,
    );

    function applyPreset(preset: ResolutionPreset) {
        form.setFieldValue('width', preset.width);
        form.setFieldValue('height', preset.height);
    }

    return (
        <Stack gap="xs">
            <Text size="xs" fw={600} c="invokeGray.2" tt="uppercase">Resolution</Text>
            {!customOnly && presets.length > 0 && (
                <Group gap="xs" wrap="wrap">
                    {presets.map((preset) => (
                        <SwarmButton
                            key={preset.label}
                            size="xs"
                            tone={activePreset === preset.label ? 'primary' : 'secondary'}
                            emphasis={activePreset === preset.label ? 'solid' : 'soft'}
                            onClick={() => applyPreset(preset)}
                        >
                            {preset.label}
                        </SwarmButton>
                    ))}
                    {activePreset === 'Custom' && (
                        <Text size="xs" c="dimmed">Custom</Text>
                    )}
                </Group>
            )}
            {(customOnly || activePreset === 'Custom' || presets.length === 0) && (
                <Group gap="xs" align="center">
                    <NumberInput
                        label="Width"
                        size="sm"
                        style={{ flex: 1 }}
                        min={64}
                        max={2048}
                        step={64}
                        {...form.getInputProps('width')}
                    />
                    <Text size="sm" c="dimmed" mt={20}>x</Text>
                    <NumberInput
                        label="Height"
                        size="sm"
                        style={{ flex: 1 }}
                        min={64}
                        max={2048}
                        step={64}
                        {...form.getInputProps('height')}
                    />
                </Group>
            )}
        </Stack>
    );
}
```

- [ ] **Step 2: Update the existing test**

The existing `VideoResolution.test.ts` imports `VIDEO_PRESETS` and `VideoPreset` which no longer exist (replaced by the `presets` prop). Update the test to import `getActivePreset` and `ResolutionPreset` instead, and pass presets directly:

```typescript
// VideoResolution.test.ts - updated
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
```

Run: `cd swarmui-react && npx vitest run src/pages/GeneratePage/components/VideoSidebar/VideoResolution.test.ts`
Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add swarmui-react/src/pages/GeneratePage/components/VideoSidebar/VideoResolution.tsx
git commit -m "feat(video): update VideoResolution to accept model-aware presets via props"
```

---

## Chunk 4: ComfyUI Workflow Files & Cleanup

### Task 9: Create ComfyUI video workflow JSON files

**Files:**
- Create: `src/BuiltinExtensions/ComfyUIBackend/ExampleWorkflows/VideoWorkflows/wan21_t2v.json`
- Create: `src/BuiltinExtensions/ComfyUIBackend/ExampleWorkflows/VideoWorkflows/wan21_i2v.json`
- Create: `src/BuiltinExtensions/ComfyUIBackend/ExampleWorkflows/VideoWorkflows/wan22_t2v.json`
- Create: `src/BuiltinExtensions/ComfyUIBackend/ExampleWorkflows/VideoWorkflows/wan22_i2v.json`
- Create: `src/BuiltinExtensions/ComfyUIBackend/ExampleWorkflows/VideoWorkflows/ltxv_t2v.json`
- Create: `src/BuiltinExtensions/ComfyUIBackend/ExampleWorkflows/VideoWorkflows/ltxv_i2v.json`

- [ ] **Step 1: Create the VideoWorkflows directory**

Run: `mkdir -p src/BuiltinExtensions/ComfyUIBackend/ExampleWorkflows/VideoWorkflows`

- [ ] **Step 2: Create Wan 2.1 T2V workflow**

Create `wan21_t2v.json` — a standard ComfyUI workflow JSON with nodes for:
- CLIPTextEncode (prompt placeholder)
- WanModelLoader (model path placeholder)
- KSampler (steps, cfg, sampler, scheduler placeholders)
- VAEDecode
- SaveAnimatedWEBP or video output node

The workflow should use ComfyUI's standard node format. Use placeholder values like `"__PROMPT__"`, `"__MODEL__"`, `"__STEPS__"`, `"__CFG__"`, `"__WIDTH__"`, `"__HEIGHT__"`, `"__FRAMES__"` that get patched at generation time.

Note: These workflows need to be valid ComfyUI API format. Study the existing `Basic SDXL.json` workflow in the repo for the correct format, then adapt for video nodes. If ComfyUI video nodes are not installed on the user's system, the backend will report the error — we don't need to validate node availability in the frontend.

- [ ] **Step 3: Create remaining 5 workflow files**

Follow the same pattern for:
- `wan21_i2v.json` — adds LoadImage node for init image
- `wan22_t2v.json` — same structure as wan21_t2v but default resolution differs
- `wan22_i2v.json` — same structure as wan21_i2v but default resolution differs
- `ltxv_t2v.json` — uses LTXV-specific nodes and ltxv scheduler
- `ltxv_i2v.json` — uses LTXV-specific nodes with ltxv-image scheduler and LoadImage

- [ ] **Step 4: Commit**

```bash
git add src/BuiltinExtensions/ComfyUIBackend/ExampleWorkflows/VideoWorkflows/
git commit -m "feat(video): add ComfyUI workflow JSON files for Wan 2.1, Wan 2.2, and LTXV"
```

---

### Task 10: Delete VideoModelWarning.tsx and clean up imports

**Note:** The `VideoWorkflow` type was already added to `videoModelProfiles.ts` in Task 1, and all new files (Task 3, Task 7) already import from `videoModelProfiles`. This task updates `VideoWorkflowToggle.tsx` and deletes old files.

**Files:**
- Delete: `swarmui-react/src/pages/GeneratePage/components/VideoSidebar/VideoModelWarning.tsx`
- Delete: `swarmui-react/src/pages/GeneratePage/components/VideoSidebar/VideoModelWarning.test.ts`
- Modify: `swarmui-react/src/pages/GeneratePage/components/VideoSidebar/VideoWorkflowToggle.tsx`

- [ ] **Step 1: Update VideoWorkflowToggle.tsx import**

Change line 2 from:
```typescript
import type { VideoWorkflow } from './VideoModelWarning';
```
To:
```typescript
import type { VideoWorkflow } from './videoModelProfiles';
```

- [ ] **Step 2: Delete the old files**

Run: `rm swarmui-react/src/pages/GeneratePage/components/VideoSidebar/VideoModelWarning.tsx swarmui-react/src/pages/GeneratePage/components/VideoSidebar/VideoModelWarning.test.ts`

- [ ] **Step 6: Remove old unused VideoParameters.tsx**

The VideoParameters component is no longer imported (its functionality is inline in the new VideoSidebar). Delete it:

Run: `rm swarmui-react/src/pages/GeneratePage/components/VideoSidebar/VideoParameters.tsx`

- [ ] **Step 7: Verify build**

Run: `cd swarmui-react && npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 8: Run all VideoSidebar tests**

Run: `cd swarmui-react && npx vitest run src/pages/GeneratePage/components/VideoSidebar/`
Expected: All remaining tests PASS

- [ ] **Step 9: Commit**

```bash
git add -A swarmui-react/src/pages/GeneratePage/components/VideoSidebar/
git commit -m "refactor(video): remove VideoModelWarning and VideoParameters, consolidate VideoWorkflow type"
```

---

## Chunk 5: Integration & Final Verification

### Task 11: Add workflow injection to useGenerationHandlers

**Files:**
- Modify: `swarmui-react/src/hooks/useGenerationHandlers.ts:535-540`

This is the key integration point where the auto-workflow feature actually takes effect. When video mode is enabled and a profile has a workflow ID, inject it into the generation parameters before sending to the backend.

- [ ] **Step 1: Import matchVideoProfile**

Add to imports in `useGenerationHandlers.ts`:

```typescript
import { matchVideoProfile } from '../pages/GeneratePage/components/VideoSidebar/videoModelProfiles';
```

- [ ] **Step 2: Add workflow injection before the backend param building**

In the `handleGenerate` callback, after the `normalizedValues` are created (around line 436) and before the `includeParam` function (around line 490), add workflow resolution:

```typescript
// --- Video workflow injection ---
// If video is enabled and the model matches a known profile, inject the workflow ID
if (enableVideo && normalizedModel) {
    const videoProfile = matchVideoProfile(normalizedModel);
    if (videoProfile) {
        // Determine workflow type from init image presence
        const videoWorkflow = normalizedValues.initimage ? 'i2v' : 't2v';
        const workflowId = videoProfile.workflowId[videoWorkflow];
        if (workflowId) {
            (normalizedValues as Record<string, unknown>)['comfyuiworkflow'] = workflowId;
        }
    }
}
```

- [ ] **Step 3: Add `comfyuiworkflow` to the includeParam function**

In the `includeParam` function, add a case for the workflow field:

```typescript
if (key === 'comfyuiworkflow') return enableVideo;
```

- [ ] **Step 4: Verify build**

Run: `cd swarmui-react && npx tsc --noEmit`
Expected: No new errors

- [ ] **Step 5: Commit**

```bash
git add swarmui-react/src/hooks/useGenerationHandlers.ts
git commit -m "feat(video): inject ComfyUI workflow ID in generation handler based on model profile"
```

---

### Task 12: Verify full build and test suite

**Files:** None (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `cd swarmui-react && npx vitest run`
Expected: All tests PASS

- [ ] **Step 2: Run the TypeScript compiler**

Run: `cd swarmui-react && npx tsc --noEmit`
Expected: No new errors introduced by video changes

- [ ] **Step 3: Run the dev build**

Run: `cd swarmui-react && npx vite build`
Expected: Build succeeds

- [ ] **Step 4: Commit any fix-ups needed**

If any issues were found in steps 1-3, fix them and commit:

```bash
git add -A
git commit -m "fix(video): address build/test issues from video studio revamp"
```
