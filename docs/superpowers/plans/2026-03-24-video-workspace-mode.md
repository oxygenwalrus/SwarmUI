# Video Workspace Mode Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a permanent "Video" fourth mode to the SwarmUI React frontend with a focused, scrollable sidebar for T2V and I2V generation.

**Architecture:** New `VideoSidebar` component tree lives at `components/VideoSidebar/`. Logic is extracted into pure functions co-located with each component for testability. `WorkspaceSidebar` is not modified. `GeneratePage/index.tsx` routes to `VideoSidebar` when `currentMode === 'video'`.

**Tech Stack:** TypeScript, React, Mantine UI (Accordion, SegmentedControl, Stack, Select, Switch, Text, Alert), Zustand (existing stores — no new stores), Vitest for tests.

---

## Chunk 1: Foundation — type union, mode switcher, form defaults

### Task 1: Widen `GenerateWorkspaceMode` to include `'video'`

**Files:**
- Modify: `swarmui-react/src/routing/appRoute.ts:3`
- Test: `swarmui-react/src/routing/appRoute.test.ts`

- [ ] **Step 1: Write the failing test**

Add to `swarmui-react/src/routing/appRoute.test.ts` inside the existing `describe('appRoute', ...)` block:

```typescript
it('round-trips video mode through serialise → parse', () => {
    const serialized = serializeRoute({
        page: 'generate',
        generate: { mode: 'video' as GenerateWorkspaceMode },
    });

    expect(serialized).toContain('mode=video');

    const parsed = parseHashRoute(serialized);
    expect(parsed.generate?.mode).toBe('video');
});

it('normalizes video mode without altering it', () => {
    const route = normalizeRoute({
        page: 'generate',
        generate: { mode: 'video' as GenerateWorkspaceMode },
    });

    expect(route.generate?.mode).toBe('video');
});
```

Add `GenerateWorkspaceMode` to the import at the top of the test file:
```typescript
import { normalizeRoute, parseHashRoute, serializeRoute } from './appRoute';
import type { GenerateWorkspaceMode } from './appRoute';
```

- [ ] **Step 2: Run test to verify it fails (TypeScript error)**

```bash
cd swarmui-react && npm run test -- src/routing/appRoute.test.ts
```

Expected: TypeScript error — `'video'` is not assignable to `GenerateWorkspaceMode`.

- [ ] **Step 3: Add `'video'` to the union**

In `swarmui-react/src/routing/appRoute.ts`, line 3:

```typescript
export type GenerateWorkspaceMode = 'quick' | 'guided' | 'advanced' | 'video';
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd swarmui-react && npm run test -- src/routing/appRoute.test.ts
```

Expected: All tests pass including the two new ones.

- [ ] **Step 5: Commit**

```bash
git add swarmui-react/src/routing/appRoute.ts swarmui-react/src/routing/appRoute.test.ts
git commit -m "feat(video-mode): add 'video' to GenerateWorkspaceMode union"
```

---

### Task 2: Add Video tab to the mode switcher

**Files:**
- Modify: `swarmui-react/src/pages/GeneratePage/components/WorkspaceExperiencePanel.tsx`

There is no extractable logic to unit test here — it's a render change. The verification step is a build check.

- [ ] **Step 1: Locate the SegmentedControl in `WorkspaceExperiencePanel.tsx`**

Find the `data` array for the mode `SegmentedControl`. It currently reads:
```typescript
data={[
    { value: 'quick', label: 'Quick' },
    { value: 'guided', label: 'Guided' },
    { value: 'advanced', label: 'Advanced' },
]}
```

- [ ] **Step 2: Add the Video entry**

```typescript
data={[
    { value: 'quick', label: 'Quick' },
    { value: 'guided', label: 'Guided' },
    { value: 'advanced', label: 'Advanced' },
    { value: 'video', label: 'Video' },
]}
```

- [ ] **Step 3: Verify TypeScript compiles cleanly**

```bash
cd swarmui-react && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add swarmui-react/src/pages/GeneratePage/components/WorkspaceExperiencePanel.tsx
git commit -m "feat(video-mode): add Video tab to mode switcher"
```

---

### Task 3: Update video default form values

**Files:**
- Modify: `swarmui-react/src/pages/GeneratePage/hooks/useParameterForm.ts`

- [ ] **Step 1: Locate `DEFAULT_FORM_VALUES`**

Open `swarmui-react/src/pages/GeneratePage/hooks/useParameterForm.ts` and find `DEFAULT_FORM_VALUES`. Locate these two fields:
- `text2videoframes` (currently `25`)
- `videocfg` (currently `7`)

- [ ] **Step 2: Update the defaults**

```typescript
text2videoframes: 97,   // was 25 — aligns with LTX-Video T2V recommended frame count
videocfg: 3.5,          // was 7 — aligns with video model CFG expectations
```

- [ ] **Step 3: Verify TypeScript compiles cleanly**

```bash
cd swarmui-react && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Run full test suite to confirm no regressions**

```bash
cd swarmui-react && npm run test
```

Expected: All tests pass.

- [ ] **Step 5: Commit**

```bash
git add swarmui-react/src/pages/GeneratePage/hooks/useParameterForm.ts
git commit -m "feat(video-mode): update text2videoframes default to 97, videocfg to 3.5"
```

---

## Chunk 2: Logic components — VideoModelWarning and VideoResolution

### Task 4: Create `VideoModelWarning` with extracted logic

**Files:**
- Create: `swarmui-react/src/pages/GeneratePage/components/VideoSidebar/VideoModelWarning.tsx`
- Create: `swarmui-react/src/pages/GeneratePage/components/VideoSidebar/VideoModelWarning.test.ts`

The warning logic is extracted as a pure function `getVideoCapabilityWarning` so it can be unit tested independently of React.

- [ ] **Step 1: Create the test file**

Create `swarmui-react/src/pages/GeneratePage/components/VideoSidebar/VideoModelWarning.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd swarmui-react && npm run test -- src/pages/GeneratePage/components/VideoSidebar/VideoModelWarning.test.ts
```

Expected: FAIL — `getVideoCapabilityWarning` not found.

- [ ] **Step 3: Create `VideoModelWarning.tsx`**

Create `swarmui-react/src/pages/GeneratePage/components/VideoSidebar/VideoModelWarning.tsx`:

```tsx
import { Alert, Text } from '@mantine/core';
import type { ModelMediaCapabilities } from '../../../../utils/modelCapabilities';

export type VideoWorkflow = 't2v' | 'i2v';

/**
 * Pure function — exported for testing.
 * Returns a warning message string or null if capabilities match the workflow.
 */
export function getVideoCapabilityWarning(
    capabilities: ModelMediaCapabilities,
    workflow: VideoWorkflow,
): string | null {
    if (!capabilities.supportsVideo) {
        return 'This model does not support video generation. Select a video-capable model.';
    }
    if (workflow === 't2v' && !capabilities.supportsTextToVideo) {
        return 'This model supports image-to-video only. Switch to Image-to-Video or load a T2V-capable model.';
    }
    if (workflow === 'i2v' && !capabilities.supportsImageToVideo) {
        return 'This model supports text-to-video only. Switch to Text-to-Video or load an I2V-capable model.';
    }
    return null;
}

interface VideoModelWarningProps {
    capabilities: ModelMediaCapabilities;
    workflow: VideoWorkflow;
}

export function VideoModelWarning({ capabilities, workflow }: VideoModelWarningProps) {
    const message = getVideoCapabilityWarning(capabilities, workflow);
    if (!message) return null;

    return (
        <Alert color="yellow" variant="light">
            <Text size="sm">{message}</Text>
        </Alert>
    );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd swarmui-react && npm run test -- src/pages/GeneratePage/components/VideoSidebar/VideoModelWarning.test.ts
```

Expected: All 7 tests pass.

- [ ] **Step 5: Commit**

```bash
git add swarmui-react/src/pages/GeneratePage/components/VideoSidebar/VideoModelWarning.tsx \
        swarmui-react/src/pages/GeneratePage/components/VideoSidebar/VideoModelWarning.test.ts
git commit -m "feat(video-mode): add VideoModelWarning component with capability logic"
```

---

### Task 5: Create `VideoResolution` with preset detection logic

**Files:**
- Create: `swarmui-react/src/pages/GeneratePage/components/VideoSidebar/VideoResolution.tsx`
- Create: `swarmui-react/src/pages/GeneratePage/components/VideoSidebar/VideoResolution.test.ts`

- [ ] **Step 1: Create the test file**

Create `swarmui-react/src/pages/GeneratePage/components/VideoSidebar/VideoResolution.test.ts`:

```typescript
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
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd swarmui-react && npm run test -- src/pages/GeneratePage/components/VideoSidebar/VideoResolution.test.ts
```

Expected: FAIL — `getActivePreset` and `VIDEO_PRESETS` not found.

- [ ] **Step 3: Create `VideoResolution.tsx`**

Create `swarmui-react/src/pages/GeneratePage/components/VideoSidebar/VideoResolution.tsx`:

```tsx
import { Group, NumberInput, Stack, Text } from '@mantine/core';
import { SwarmButton } from '../../../../components/ui';
import type { UseFormReturnType } from '@mantine/form';
import type { GenerateParams } from '../../../../api/types';

export interface VideoPreset {
    label: string;
    width: number;
    height: number;
}

/**
 * Exported for testing.
 */
export const VIDEO_PRESETS: VideoPreset[] = [
    { label: '16:9', width: 1280, height: 720 },
    { label: '9:16', width: 720, height: 1280 },
    { label: '4:3',  width: 960,  height: 720  },
    { label: '1:1',  width: 512,  height: 512  },
];

/**
 * Returns the preset label matching the given dimensions, or 'Custom' if none match.
 * Exported for testing.
 */
export function getActivePreset(
    width: number,
    height: number,
    presets: VideoPreset[],
): string {
    const match = presets.find(p => p.width === width && p.height === height);
    return match ? match.label : 'Custom';
}

interface VideoResolutionProps {
    form: UseFormReturnType<GenerateParams>;
}

export function VideoResolution({ form }: VideoResolutionProps) {
    const activePreset = getActivePreset(
        form.values.width ?? 0,
        form.values.height ?? 0,
        VIDEO_PRESETS,
    );

    function applyPreset(preset: VideoPreset) {
        form.setFieldValue('width', preset.width);
        form.setFieldValue('height', preset.height);
    }

    return (
        <Stack gap="xs">
            <Text size="xs" fw={600} c="invokeGray.2" tt="uppercase">Resolution</Text>
            <Group gap="xs" wrap="wrap">
                {VIDEO_PRESETS.map((preset) => (
                    <SwarmButton
                        key={preset.label}
                        size="xs"
                        tone={activePreset === preset.label ? 'primary' : 'secondary'}
                        emphasis={activePreset === preset.label ? 'filled' : 'soft'}
                        onClick={() => applyPreset(preset)}
                    >
                        {preset.label}
                    </SwarmButton>
                ))}
                <SwarmButton
                    size="xs"
                    tone={activePreset === 'Custom' ? 'primary' : 'secondary'}
                    emphasis={activePreset === 'Custom' ? 'filled' : 'soft'}
                    onClick={() => {/* manual edit activates Custom automatically */}}
                >
                    Custom
                </SwarmButton>
            </Group>
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
                <Text size="sm" c="dimmed" mt={20}>×</Text>
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
        </Stack>
    );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd swarmui-react && npm run test -- src/pages/GeneratePage/components/VideoSidebar/VideoResolution.test.ts
```

Expected: All 8 tests pass.

- [ ] **Step 5: Commit**

```bash
git add swarmui-react/src/pages/GeneratePage/components/VideoSidebar/VideoResolution.tsx \
        swarmui-react/src/pages/GeneratePage/components/VideoSidebar/VideoResolution.test.ts
git commit -m "feat(video-mode): add VideoResolution component with preset detection"
```

---

## Chunk 3: State components — VideoWorkflowToggle and VideoParameters

### Task 6: Create `VideoWorkflowToggle`

**Files:**
- Create: `swarmui-react/src/pages/GeneratePage/components/VideoSidebar/VideoWorkflowToggle.tsx`
- Create: `swarmui-react/src/pages/GeneratePage/components/VideoSidebar/VideoWorkflowToggle.test.ts`

- [ ] **Step 1: Create the test file**

Create `swarmui-react/src/pages/GeneratePage/components/VideoSidebar/VideoWorkflowToggle.test.ts`:

```typescript
import { describe, expect, it } from 'vitest';
import { resolveInitialWorkflow } from './VideoWorkflowToggle';

describe('resolveInitialWorkflow', () => {
    it('defaults to t2v when no init image is present', () => {
        expect(resolveInitialWorkflow(null)).toBe('t2v');
    });

    it('defaults to t2v for empty string', () => {
        expect(resolveInitialWorkflow('')).toBe('t2v');
    });

    it('returns i2v when an init image preview string is present', () => {
        expect(resolveInitialWorkflow('data:image/png;base64,abc')).toBe('i2v');
    });

    it('returns i2v for any non-empty string', () => {
        expect(resolveInitialWorkflow('/path/to/image.png')).toBe('i2v');
    });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd swarmui-react && npm run test -- src/pages/GeneratePage/components/VideoSidebar/VideoWorkflowToggle.test.ts
```

Expected: FAIL — `resolveInitialWorkflow` not found.

- [ ] **Step 3: Create `VideoWorkflowToggle.tsx`**

Create `swarmui-react/src/pages/GeneratePage/components/VideoSidebar/VideoWorkflowToggle.tsx`:

```tsx
import { SegmentedControl, Stack, Text } from '@mantine/core';
import type { VideoWorkflow } from './VideoModelWarning';

/**
 * Determines initial workflow state from the current init image preview.
 * Exported for testing.
 */
export function resolveInitialWorkflow(initImagePreview: string | null): VideoWorkflow {
    return initImagePreview ? 'i2v' : 't2v';
}

interface VideoWorkflowToggleProps {
    workflow: VideoWorkflow;
    onChange: (workflow: VideoWorkflow) => void;
}

export function VideoWorkflowToggle({ workflow, onChange }: VideoWorkflowToggleProps) {
    return (
        <Stack gap="xs">
            <SegmentedControl
                value={workflow}
                onChange={(value) => onChange(value as VideoWorkflow)}
                data={[
                    { value: 't2v', label: 'Text-to-Video' },
                    { value: 'i2v', label: 'Image-to-Video' },
                ]}
                fullWidth
                size="sm"
            />
            {workflow === 'i2v' && (
                <Text size="xs" c="invokeGray.3">
                    Upload an init image below to animate it.
                </Text>
            )}
            {workflow === 't2v' && (
                <Text size="xs" c="invokeGray.3">
                    Describe the video content in your prompt.
                </Text>
            )}
        </Stack>
    );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd swarmui-react && npm run test -- src/pages/GeneratePage/components/VideoSidebar/VideoWorkflowToggle.test.ts
```

Expected: All 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add swarmui-react/src/pages/GeneratePage/components/VideoSidebar/VideoWorkflowToggle.tsx \
        swarmui-react/src/pages/GeneratePage/components/VideoSidebar/VideoWorkflowToggle.test.ts
git commit -m "feat(video-mode): add VideoWorkflowToggle component"
```

---

### Task 7: Create `VideoParameters`

**Files:**
- Create: `swarmui-react/src/pages/GeneratePage/components/VideoSidebar/VideoParameters.tsx`

No extractable logic — this component is purely a set of form bindings selected by `workflow`. Verification is TypeScript compilation.

- [ ] **Step 1: Create `VideoParameters.tsx`**

Create `swarmui-react/src/pages/GeneratePage/components/VideoSidebar/VideoParameters.tsx`:

```tsx
import { Select, Stack, Switch, Text } from '@mantine/core';
import type { UseFormReturnType } from '@mantine/form';
import type { GenerateParams } from '../../../../api/types';
import { SliderWithInput } from '../../../../components/SliderWithInput';
import type { VideoWorkflow } from './VideoModelWarning';

const FORMAT_OPTIONS = [
    { value: 'h264-mp4', label: 'H.264 MP4' },
    { value: 'h265-mp4', label: 'H.265 MP4' },
    { value: 'webm',     label: 'WebM'      },
    { value: 'webp',     label: 'WebP'      },
    { value: 'gif',      label: 'GIF'       },
];

interface VideoParametersProps {
    form: UseFormReturnType<GenerateParams>;
    workflow: VideoWorkflow;
}

export function VideoParameters({ form, workflow }: VideoParametersProps) {
    const isI2V = workflow === 'i2v';

    return (
        <Stack gap="sm">
            <Text size="xs" fw={600} c="invokeGray.2" tt="uppercase">Video Parameters</Text>

            {/* Frames — T2V and I2V use separate form fields */}
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
                marks={
                    isI2V
                        ? [{ value: 25, label: '25' }, { value: 121, label: '121' }]
                        : [{ value: 97, label: '97 (LTXV)' }, { value: 73, label: '73 (Hunyuan)' }]
                }
            />

            {/* FPS — T2V and I2V use separate form fields */}
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
                marks={[{ value: 24, label: '24' }]}
            />

            {/* CFG — I2V only (no text2videocfg field exists) */}
            {isI2V && (
                <SliderWithInput
                    label="CFG Scale"
                    value={form.values.videocfg ?? 3.5}
                    onChange={(value) => form.setFieldValue('videocfg', value)}
                    min={1}
                    max={20}
                    step={0.5}
                    decimalScale={1}
                    marks={[{ value: 3.5, label: '3.5' }, { value: 7, label: '7' }]}
                />
            )}

            {/* Format — T2V and I2V use separate form fields */}
            <Select
                label="Format"
                size="sm"
                data={FORMAT_OPTIONS}
                {...(isI2V
                    ? form.getInputProps('videoformat')
                    : form.getInputProps('text2videoformat')
                )}
            />

            {/* Boomerang — I2V only */}
            {isI2V && (
                <Switch
                    label="Boomerang (loop back and forth)"
                    size="xs"
                    {...form.getInputProps('videoboomerang', { type: 'checkbox' })}
                />
            )}
        </Stack>
    );
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
cd swarmui-react && npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add swarmui-react/src/pages/GeneratePage/components/VideoSidebar/VideoParameters.tsx
git commit -m "feat(video-mode): add VideoParameters component"
```

---

## Chunk 4: VideoSidebar root and GeneratePage wiring

### Task 8: Create `VideoSidebar/index.tsx`

**Files:**
- Create: `swarmui-react/src/pages/GeneratePage/components/VideoSidebar/index.tsx`

This assembles all sub-components into the full scrollable sidebar layout.

- [ ] **Step 1: Create `VideoSidebar/index.tsx`**

Create `swarmui-react/src/pages/GeneratePage/components/VideoSidebar/index.tsx`:

```tsx
import { memo, useEffect, useState } from 'react';
import {
    Box,
    Divider,
    FileButton,
    Group,
    Image,
    ScrollArea,
    Select,
    Stack,
    Text,
    Textarea,
} from '@mantine/core';
import { IconHistory, IconUpload, IconX } from '@tabler/icons-react';
import type { UseFormReturnType } from '@mantine/form';
import type { GenerateParams, LoRASelection, Model } from '../../../../api/types';
import type { ModelMediaCapabilities } from '../../../../utils/modelCapabilities';
import { SectionHero } from '../../../../components/ui';
import { SwarmActionIcon, SwarmButton } from '../../../../components/ui';
import { GenerateButton } from '../ParameterPanel/GenerateButton';
import { SliderWithInput } from '../../../../components/SliderWithInput';
import { SeedInput } from '../../../../components/SeedInput';
import { SamplingSelect } from '../../../../components/ui';
import { ActiveLoRAs } from '../ParameterPanel/ActiveLoRAs';
import { VideoModelWarning } from './VideoModelWarning';
import { VideoWorkflowToggle, resolveInitialWorkflow } from './VideoWorkflowToggle';
import { VideoParameters } from './VideoParameters';
import { VideoResolution } from './VideoResolution';
import type { VideoWorkflow } from './VideoModelWarning';
import { useT2IParams } from '../../../../hooks/useT2IParams';

export interface VideoSidebarProps {
    // Form
    form: UseFormReturnType<GenerateParams>;
    onGenerate: (values: GenerateParams) => void;

    // Models
    models: Model[];
    loadingModels: boolean;
    loadingModel: boolean;
    onModelSelect: (modelName: string | null) => void;
    modelMediaCapabilities: ModelMediaCapabilities;

    // Generation control
    generating: boolean;
    onStop: () => void;
    onOpenSchedule: () => void;

    // History
    onOpenHistory: () => void;

    // Init image (I2V)
    initImagePreview: string | null;
    onInitImageUpload: (file: File | null) => void;
    onClearInitImage: () => void;

    // LoRAs
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
    const { samplers, schedulers } = useT2IParams();
    const [workflow, setWorkflow] = useState<VideoWorkflow>(
        () => resolveInitialWorkflow(initImagePreview),
    );

    // Re-sync toggle if init image changes externally (e.g. restored session)
    useEffect(() => {
        setWorkflow(resolveInitialWorkflow(initImagePreview));
    }, [initImagePreview]);

    function handleWorkflowChange(next: VideoWorkflow) {
        if (next === 't2v') {
            onClearInitImage();
        }
        setWorkflow(next);
    }

    const modelOptions = models.map((m) => ({
        value: m.name,
        label: m.title || m.name,
    }));

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
            {/* Sticky header */}
            <Box p="sm" style={{ borderBottom: 'var(--elevation-border)', flexShrink: 0 }}>
                <SectionHero
                    title="Video Workspace"
                    generating={generating}
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
                            placeholder={loadingModels ? 'Loading...' : 'Select a model'}
                            data={modelOptions}
                            searchable
                            size="sm"
                            disabled={loadingModel}
                            value={form.values.model ?? null}
                            onChange={onModelSelect}
                        />

                        {/* Capability warning */}
                        <VideoModelWarning
                            capabilities={modelMediaCapabilities}
                            workflow={workflow}
                        />

                        {/* LoRA browser */}
                        <SwarmButton
                            size="xs"
                            tone="secondary"
                            emphasis="soft"
                            onClick={onOpenLoraBrowser}
                        >
                            Browse LoRAs
                        </SwarmButton>

                        <Divider />

                        {/* Prompt */}
                        <Textarea
                            label="Prompt"
                            placeholder="Describe the video..."
                            minRows={3}
                            autosize
                            size="sm"
                            {...form.getInputProps('prompt')}
                        />
                        <Textarea
                            label="Negative Prompt"
                            placeholder="What to avoid..."
                            minRows={2}
                            autosize
                            size="sm"
                            {...form.getInputProps('negativeprompt')}
                        />

                        <Divider />

                        {/* Workflow toggle */}
                        <VideoWorkflowToggle
                            workflow={workflow}
                            onChange={handleWorkflowChange}
                        />

                        {/* Init image (I2V only) */}
                        {workflow === 'i2v' && (
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

                        {/* Video parameters */}
                        <VideoParameters form={form} workflow={workflow} />

                        <Divider />

                        {/* Resolution */}
                        <VideoResolution form={form} />

                        <Divider />

                        {/* Sampler */}
                        <Stack gap="sm">
                            <Text size="xs" fw={600} c="invokeGray.2" tt="uppercase">Sampler</Text>
                            <SamplingSelect
                                label="Sampler"
                                data={samplers}
                                size="sm"
                                {...form.getInputProps('sampler')}
                            />
                            <SamplingSelect
                                label="Schedule"
                                data={schedulers}
                                size="sm"
                                {...form.getInputProps('scheduler')}
                            />
                            <SliderWithInput
                                label="Steps"
                                value={form.values.steps ?? 20}
                                onChange={(value) => form.setFieldValue('steps', value)}
                                min={1}
                                max={150}
                                marks={[{ value: 20, label: '20' }, { value: 50, label: '50' }]}
                            />
                            <SeedInput
                                value={form.values.seed ?? -1}
                                onChange={(value) => form.setFieldValue('seed', value)}
                            />
                        </Stack>

                        <Divider />

                        {/* LoRAs */}
                        <ActiveLoRAs
                            form={form}
                            activeLoras={activeLoras}
                            onLoraChange={onLoraChange}
                            onOpenLoraBrowser={onOpenLoraBrowser}
                        />

                        <Divider />

                        {/* Generate button */}
                        <GenerateButton
                            generating={generating}
                            onStop={onStop}
                            onOpenSchedule={onOpenSchedule}
                            currentValues={form.values}
                        />
                    </Stack>
                </form>
            </ScrollArea>
        </Box>
    );
});
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
cd swarmui-react && npx tsc --noEmit
```

Expected: No errors. If `SamplingSelect` or `SectionHero` import paths differ, check `src/components/ui/index.ts` for exact exports and adjust accordingly.

- [ ] **Step 3: Commit**

```bash
git add swarmui-react/src/pages/GeneratePage/components/VideoSidebar/index.tsx
git commit -m "feat(video-mode): add VideoSidebar root component"
```

---

### Task 9: Wire `VideoSidebar` into `GeneratePage/index.tsx`

**Files:**
- Modify: `swarmui-react/src/pages/GeneratePage/index.tsx`

This task makes four targeted edits. Make them one at a time.

- [ ] **Step 1: Add the import**

At the top of `index.tsx`, alongside other component imports, add:

```typescript
import { VideoSidebar } from './components/VideoSidebar';
```

- [ ] **Step 2: Extend `usesAdvancedRail`**

Find the line (currently ~645):
```typescript
const usesAdvancedRail = currentMode === 'advanced';
```

Replace with:
```typescript
const usesAdvancedRail = currentMode === 'advanced' || currentMode === 'video';
```

- [ ] **Step 3: Update `modeStageCopy`**

Find the existing three-level ternary (~line 685). Replace the entire expression:
```typescript
const modeStageCopy = currentMode === 'quick'
    ? 'A minimal run path with the canvas front and center.'
    : currentMode === 'guided'
        ? 'Curated controls on the left, with the stage ready for review and iteration.'
        : currentMode === 'video'
            ? 'Focused video generation with text-to-video and image-to-video controls.'
            : 'Full studio workspace with the canvas leading and support tools around it.';
```

- [ ] **Step 4: Update the stage header mode badge**

Find the ternary that renders `'Quick'`, `'Guided'`, or `'Advanced'` (~line 1024). Replace:
```typescript
{currentMode === 'quick' ? 'Quick'
  : currentMode === 'guided' ? 'Guided'
  : currentMode === 'video' ? 'Video'
  : 'Advanced'}
```

- [ ] **Step 5: Replace the sidebar conditional with a three-way branch**

Find the entire block starting at `{usesAdvancedRail ? (` (~line 906) through the closing `)}` after `</WorkspaceModeDeck>` (~line 1002). Replace the whole thing:

```typescript
{currentMode === 'video' ? (
    <VideoSidebar
        form={paramForm.form}
        onGenerate={handleGenerateWithBuilder}
        models={dataLoaders.models}
        loadingModels={dataLoaders.loadingModels}
        loadingModel={paramForm.loadingModel}
        onModelSelect={paramForm.handleModelSelect}
        modelMediaCapabilities={modelMediaCapabilities}
        generating={generating}
        onStop={handleInterrupt}
        onOpenSchedule={modals.openScheduleModal}
        onOpenHistory={modals.openHistoryDrawer}
        initImagePreview={
            paramForm.form.values.initimage || paramForm.initImagePreview || null
        }
        onInitImageUpload={paramForm.handleInitImageUpload}
        onClearInitImage={paramForm.clearInitImage}
        activeLoras={activeLoras}
        onLoraChange={paramForm.handleLoraChange}
        onOpenLoraBrowser={modals.openLoraModal}
    />
) : usesAdvancedRail ? (
    <WorkspaceSidebar
        form={paramForm.form}
        onGenerate={handleGenerateWithBuilder}
        onResetWorkspace={handleResetWorkspace}
        presets={paramForm.presets || []}
        onLoadPreset={paramForm.handleLoadPreset}
        onOpenSaveModal={modals.openSavePresetModal}
        onDeletePreset={paramForm.handleDeletePreset}
        onDuplicatePreset={paramForm.handleDuplicatePreset}
        onOpenHistory={modals.openHistoryDrawer}
        backends={dataLoaders.backends}
        backendOptions={dataLoaders.backendOptions}
        selectedBackend={selectedBackend}
        onBackendChange={setSelectedBackend}
        loadingBackends={dataLoaders.loadingBackends}
        activeLoras={activeLoras}
        onLoraChange={paramForm.handleLoraChange}
        onOpenLoraBrowser={modals.openLoraModal}
        onOpenEmbeddingBrowser={modals.openEmbeddingModal}
        onOpenModelBrowser={modals.openModelBrowser}
        generating={generating}
        onStop={handleInterrupt}
        onOpenSchedule={modals.openScheduleModal}
        onGenerateAndUpscale={handleGenerateAndUpscale}
        enableRefiner={enableRefiner}
        setEnableRefiner={setEnableRefiner}
        enableInitImage={enableInitImage}
        setEnableInitImage={setEnableInitImage}
        initImagePreview={paramForm.form.values.initimage || paramForm.initImagePreview}
        onInitImageUpload={paramForm.handleInitImageUpload}
        onClearInitImage={paramForm.clearInitImage}
        enableVariation={enableVariation}
        setEnableVariation={setEnableVariation}
        enableControlNet={enableControlNet}
        setEnableControlNet={setEnableControlNet}
        enableVideo={enableVideo}
        setEnableVideo={setEnableVideo}
        modelMediaCapabilities={modelMediaCapabilities}
        models={dataLoaders.models}
        loadingModels={dataLoaders.loadingModels}
        loadingModel={paramForm.loadingModel}
        onModelSelect={paramForm.handleModelSelect}
        vaeOptions={dataLoaders.vaeOptions}
        loadingVAEs={dataLoaders.loadingVAEs}
        controlNetOptions={dataLoaders.controlNetOptions}
        loadingControlNets={dataLoaders.loadingControlNets}
        upscaleModels={dataLoaders.upscaleModels}
        embeddingOptions={dataLoaders.embeddingOptions}
        wildcardOptions={dataLoaders.wildcardOptions}
        wildcardText={wildcardText}
        onWildcardTextChange={setWildcardText}
        quickModules={workspaceLayout.openQuickModules}
        onQuickModulesChange={workspaceActions.setOpenQuickModules}
        inspectorSections={workspaceLayout.openInspectorSections}
        onInspectorSectionsChange={workspaceActions.setOpenInspectorSections}
        lastInspectorJumpTarget={workspaceLayout.lastInspectorJumpTarget}
        onLastInspectorJumpTargetChange={workspaceActions.setLastInspectorJumpTarget}
    />
) : (
    <WorkspaceModeDeck
        mode={currentMode}
        form={paramForm.form}
        onGenerate={handleGenerateWithBuilder}
        backends={dataLoaders.backends}
        backendOptions={dataLoaders.backendOptions}
        selectedBackend={selectedBackend}
        onBackendChange={setSelectedBackend}
        loadingBackends={dataLoaders.loadingBackends}
        models={dataLoaders.models}
        loadingModels={dataLoaders.loadingModels}
        loadingModel={paramForm.loadingModel}
        onModelSelect={paramForm.handleModelSelect}
        generating={generating}
        onStop={handleInterrupt}
        onOpenSchedule={modals.openScheduleModal}
        onGenerateAndUpscale={handleGenerateAndUpscale}
        onOpenHistory={modals.openHistoryDrawer}
        onOpenModelBrowser={modals.openModelBrowser}
        onOpenLoraBrowser={modals.openLoraModal}
        onOpenEmbeddingBrowser={modals.openEmbeddingModal}
        onPromoteWorkflow={handlePromoteToWorkflow}
        enableRefiner={enableRefiner}
        setEnableRefiner={setEnableRefiner}
        enableInitImage={enableInitImage}
        setEnableInitImage={setEnableInitImage}
        enableVariation={enableVariation}
        setEnableVariation={setEnableVariation}
        enableControlNet={enableControlNet}
        setEnableControlNet={setEnableControlNet}
        enableVideo={enableVideo}
        setEnableVideo={setEnableVideo}
        modelMediaCapabilities={modelMediaCapabilities}
        activeRecipe={activeRecipe}
        issues={issues}
    />
)}
```

- [ ] **Step 6: Verify TypeScript compiles cleanly**

```bash
cd swarmui-react && npx tsc --noEmit
```

Expected: No errors. Fix any prop type mismatches reported.

- [ ] **Step 7: Run the full test suite**

```bash
cd swarmui-react && npm run test
```

Expected: All tests pass.

- [ ] **Step 8: Build the project**

```bash
cd swarmui-react && npm run build:integrated
```

Expected: Build succeeds with no errors. If running locally without the .NET backend, run `npm run build` instead and verify `dist/` is produced.

- [ ] **Step 9: Commit**

```bash
git add swarmui-react/src/pages/GeneratePage/index.tsx
git commit -m "feat(video-mode): wire VideoSidebar into GeneratePage"
```

---

## Verification checklist

After all tasks complete, manually verify in the browser:

- [ ] Mode switcher shows four tabs: Quick, Guided, Advanced, Video
- [ ] Selecting Video mode shows the VideoSidebar (not WorkspaceSidebar)
- [ ] Selecting a non-video model (e.g. SDXL) shows the yellow capability warning
- [ ] Selecting a video model (e.g. LTX-Video) clears the warning
- [ ] T2V toggle: no init image section visible, Frames/FPS/Format shown, no CFG/Boomerang
- [ ] I2V toggle: init image upload button appears, CFG and Boomerang become visible
- [ ] Uploading an init image shows the thumbnail with clear button
- [ ] Clearing init image via button hides the thumbnail
- [ ] Resolution presets write correct width/height to the form
- [ ] Custom preset activates when width/height are edited manually
- [ ] Generate button triggers generation with video parameters
- [ ] Switching to Advanced mode after Video retains sidebar width and gallery pin state
