# Video Workspace Mode — Design Spec

**Date:** 2026-03-24
**Status:** Approved

---

## Overview

Add a permanent fourth workspace mode — **Video** — to the SwarmUI React frontend. It sits alongside Quick, Guided, and Advanced in the mode switcher and provides a focused, top-to-bottom video generation experience. Controls irrelevant to video (Hi-Res Refiner, ControlNet, Variation, CLIP Skip) are excluded entirely. Both text-to-video (T2V) and image-to-video (I2V) workflows are equally prominent.

---

## Goals

- Single scrollable sidebar ordered by importance, highest priority at top
- T2V and I2V equally accessible via a top-level toggle
- No image-generation-specific controls
- LoRA support included
- Reuses existing components and form state — no new stores

---

## Layout (top to bottom)

```
┌─────────────────────────────────┐
│ Video Workspace  [Ready] [Queue]│  sticky header
│ [History]                       │
├─────────────────────────────────┤
│ Model selector                  │  VideoModelWarning shown below if mismatch
│ (+ LoRA browser button)         │
├─────────────────────────────────┤
│ Prompt                          │
│ Negative prompt                 │
├─────────────────────────────────┤
│ [Text-to-Video] [Image-to-Video]│  SegmentedControl toggle
│ ┌ I2V only ─────────────────┐   │
│ │ Init image dropzone        │   │  shown only in I2V mode
│ └───────────────────────────┘   │
├─────────────────────────────────┤
│ VIDEO PARAMETERS                │
│  Frames  ────────────────[  ]   │  T2V: text2videoframes / I2V: videoframes
│  FPS     ────────────────[  ]   │  T2V: text2videofps   / I2V: videofps
│  CFG     ────────────────[  ]   │  I2V only: videocfg (no T2V CFG field)
│  Format  [H.264 MP4      ▼]     │  T2V: text2videoformat / I2V: videoformat
│  Boomerang  ○                   │  I2V only: videoboomerang
├─────────────────────────────────┤
│ RESOLUTION                      │
│  [16:9][9:16][4:3][1:1][Custom] │  5 preset buttons
│  Width [   ] × Height [   ]     │
├─────────────────────────────────┤
│ SAMPLER                         │
│  Sampler  [Euler    ▼]          │
│  Schedule [Simple  ▼]           │
│  Steps    ────────────[  ]      │  global steps field — applies to both T2V and I2V
│  Seed     [        ] [🎲]       │
├─────────────────────────────────┤
│ LoRAs                           │
│  [Browse LoRAs]  [active cards] │
├─────────────────────────────────┤
│ [████ Generate ████]            │
└─────────────────────────────────┘
```

**Steps:** Video mode uses the global `steps` field for both T2V and I2V. The backend (`WorkflowGeneratorSteps.cs`) resolves step count by checking global `Steps` first, then falling back to `VideoSteps` — so sending `steps` is correct and `videosteps` does not need to be synced or exposed.

**`videomodel` field:** This is a secondary I2V conversion model param (distinct from the primary `model`). The primary model selector in VideoSidebar writes to `model` only, consistent with all other modes. `videomodel` is not exposed in Video mode (left at default empty string).

---

## Architecture

### Approach

Option A: new dedicated `VideoSidebar` component. `WorkspaceSidebar` is not modified. Shared atomic sub-components are imported directly.

### Type changes (existing files)

**`src/routing/appRoute.ts`**
- Add `'video'` to `GenerateWorkspaceMode` union: `'quick' | 'guided' | 'advanced' | 'video'`
- `GenerateWorkspaceMode` is re-exported via `navigationStore.ts` — no second edit needed there.
- `DEFAULT_ROUTE` remains `'guided'` — Video mode is not the default.
- URL round-tripping works without changes: `parseHashRoute` type-casts the mode string (no runtime allowlist), so `?mode=video` deep-links correctly once the union includes `'video'`. `serializeRoute` only omits mode when it equals `'guided'`, so `'video'` is always written. Do **not** add allowlist validation to `normalizeRoute` — it would break deep-linking.
- **Important:** The union edit must happen before any other code changes. Until `'video'` is in the union, TypeScript will flag calls to `setCurrentMode('video')` as type errors.

**`src/pages/GeneratePage/components/WorkspaceExperiencePanel.tsx`**
- Add `{ value: 'video', label: 'Video' }` to the mode `SegmentedControl`

**`src/pages/GeneratePage/index.tsx`**

1. Extend `usesAdvancedRail`:
   ```typescript
   const usesAdvancedRail = currentMode === 'advanced' || currentMode === 'video';
   ```
   Video mode inherits the Advanced shell: resizable sidebar, pinned gallery rail, no `--supporting` CSS class. `showGalleryRail` will be true for Video mode when gallery is pinned — desirable for reviewing clips. The `setGalleryPinned(false)` cleanup only fires when `!usesAdvancedRail`, so a pinned gallery persists across Advanced ↔ Video switches. **Sidebar width:** Video mode uses `workspaceLayout.sidebarWidth` (the shared user-resizable value, default 380px) — not a fixed width. On first use, the sidebar will open at whatever width the user last set in Advanced mode.

2. Add `VideoSidebar` branch in the sidebar conditional:
   ```typescript
   currentMode === 'video'
     ? <VideoSidebar ... />
     : <WorkspaceSidebar ... />
   ```

3. Update `modeStageCopy` — full replacement:
   ```typescript
   const modeStageCopy = currentMode === 'quick'
       ? 'A minimal run path with the canvas front and center.'
       : currentMode === 'guided'
           ? 'Curated controls on the left, with the stage ready for review and iteration.'
           : currentMode === 'video'
               ? 'Focused video generation with text-to-video and image-to-video controls.'
               : 'Full studio workspace with the canvas leading and support tools around it.';
   ```

4. Update the stage header mode badge (falls through to `'Advanced'` without this):
   ```typescript
   {currentMode === 'quick' ? 'Quick'
     : currentMode === 'guided' ? 'Guided'
     : currentMode === 'video' ? 'Video'
     : 'Advanced'}
   ```

5. `handlePromoteToWorkflow`: `templateId` for video falls through to `null` — intentional. However, `imageSrc` in that function reads `enableInitImage ? String(form.values.initimage || '') || null : null`. In Video mode `enableInitImage` is not threaded in, so it will be `false` from the generation store and the init image will not be included in workflow handoffs from I2V mode. This is a **known limitation of the initial implementation** — workflow promotion from Video/I2V mode will not carry the init image. Acceptable for v1; can be addressed in a follow-up by deriving `imageSrc` from `form.values.initimage` directly when `currentMode === 'video'`.

6. **Cross-mode init image state:** when the user switches away from Video/I2V to any other mode, `initimage` is not cleared. This is consistent with existing behaviour across all modes. In Advanced mode the image remains available in the Image Setup inspector.

**`src/pages/GeneratePage/hooks/useParameterForm.ts`**
- Update `text2videoframes` default: `25` → `97`
- Update `videocfg` default: `7` → `3.5`

These affect all modes (including Advanced video controls) — correct behaviour.

### New files

```
swarmui-react/src/pages/GeneratePage/components/VideoSidebar/
  index.tsx               — root component, scrollable column, sticky header + generate button
  VideoWorkflowToggle.tsx — T2V / I2V SegmentedControl
  VideoParameters.tsx     — video-specific parameter sliders
  VideoResolution.tsx     — 5 aspect ratio preset buttons + width/height inputs
  VideoModelWarning.tsx   — capability mismatch alert
```

### VideoSidebar prop interface

```typescript
interface VideoSidebarProps {
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
  // Pass as: `paramForm.form.values.initimage || paramForm.initImagePreview || null`
  initImagePreview: string | null;
  onInitImageUpload: (file: File) => void;
  onClearInitImage: () => void;

  // LoRAs
  activeLoras: LoRASelection[];
  onLoraChange: (loras: LoRASelection[]) => void;
  onOpenLoraBrowser: () => void;
}
```

**Note:** Video mode does not use `enableInitImage` / `setEnableInitImage`. The `VideoWorkflowToggle` state (`'t2v'` | `'i2v'`) serves this role. Do not thread `enableInitImage` into `VideoSidebar`.

### Shared components imported (no duplication)

| Component | Source |
|---|---|
| `SectionHero` | existing |
| `GenerateButton` | `ParameterPanel/GenerateButton` |
| `SliderWithInput` | existing |
| `SeedInput` | existing |
| `SwarmBadge`, `ElevatedCard` | existing UI primitives |
| `getModelMediaCapabilities` | `utils/modelCapabilities` |

### VideoWorkflowToggle behaviour

- Local `useState<'t2v' | 'i2v'>`, not persisted
- **On mount / re-mount:** default is `'t2v'`. Switch to `'i2v'` if `initImagePreview` is a non-empty truthy string (i.e. `!!(initImagePreview)`). This covers both `form.values.initimage` and `paramForm.initImagePreview` since the prop is already the merged value.
- **Switching I2V → T2V:** calls `onClearInitImage()`. Do not call the upload handler.
- **Constraint:** T2V mode always has no init image loaded. This is intentional — T2V does not use init images.

### VideoParameters bindings

`VideoParameters` receives `workflow: 't2v' | 'i2v'`:

| Control | T2V field | I2V field |
|---|---|---|
| Frames | `text2videoframes` | `videoframes` |
| FPS | `text2videofps` | `videofps` |
| CFG | — (hidden) | `videocfg` |
| Format | `text2videoformat` | `videoformat` |
| Boomerang | — (hidden) | `videoboomerang` |

**No `text2videocfg` field exists in `GenerateParams` or the backend — do not add one.**

Steps is not in `VideoParameters` — it is the global `steps` field in the Sampler section.

### VideoModelWarning logic

Receives `capabilities: ModelMediaCapabilities` and `workflow: 't2v' | 'i2v'`:

| Condition | Message |
|---|---|
| `!capabilities.supportsVideo` | "This model does not support video generation. Select a video-capable model." |
| `workflow === 't2v' && !capabilities.supportsTextToVideo` | "This model supports image-to-video only. Switch to Image-to-Video or load a T2V-capable model." |
| `workflow === 'i2v' && !capabilities.supportsImageToVideo` | "This model supports text-to-video only. Switch to Text-to-Video or load an I2V-capable model." |

No warning shown when capabilities match the active workflow.

### VideoResolution presets

Five preset buttons. Clicking a preset writes both `width` and `height` to the form. The active preset is determined on each render by comparing current `form.values.width` × `form.values.height` against the preset table — if no pair matches, Custom is shown as active. This covers the on-mount case where dimensions were set in another mode.

| Label | Width | Height | Notes |
|---|---|---|---|
| 16:9 | 1280 | 720 | Default — recommended for LTX-Video |
| 9:16 | 720 | 1280 | Vertical/portrait |
| 4:3 | 960 | 720 | |
| 1:1 | 512 | 512 | |
| Custom | — | — | Width/height inputs only, no preset written |

---

## What is excluded

Intentionally absent in Video mode:

- Hi-Res Refiner / Upscale
- ControlNet
- Variation seed
- CLIP Skip
- Embeddings
- VAE override
- FreeU
- Backend selector (global concern, lives in the top header)
- `videosteps` (global `steps` used instead — backend falls through to it correctly)
- `videomodel` secondary param (not exposed in v1)

---

## Known limitations (v1)

- **Workflow promotion from I2V:** "Send to Workflow" from Video/I2V mode will not carry the init image (because `enableInitImage` is not threaded into VideoSidebar). The generated prompt and params will transfer correctly.

---

## Files changed summary

| File | Change |
|---|---|
| `src/routing/appRoute.ts` | Add `'video'` to mode union — **do this first** |
| `src/pages/GeneratePage/components/WorkspaceExperiencePanel.tsx` | Add Video tab to SegmentedControl |
| `src/pages/GeneratePage/index.tsx` | Extend `usesAdvancedRail`; add `VideoSidebar` branch; update `modeStageCopy`; update stage header badge |
| `src/pages/GeneratePage/hooks/useParameterForm.ts` | Update `text2videoframes` default to 97, `videocfg` default to 3.5 |
| `src/pages/GeneratePage/components/VideoSidebar/index.tsx` | New |
| `src/pages/GeneratePage/components/VideoSidebar/VideoWorkflowToggle.tsx` | New |
| `src/pages/GeneratePage/components/VideoSidebar/VideoParameters.tsx` | New |
| `src/pages/GeneratePage/components/VideoSidebar/VideoResolution.tsx` | New |
| `src/pages/GeneratePage/components/VideoSidebar/VideoModelWarning.tsx` | New |
