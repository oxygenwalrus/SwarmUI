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
│ Model selector                  │  badge if non-video model loaded
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
│  Frames  ────────────────[  ]   │
│  FPS     ────────────────[  ]   │
│  Steps   ────────────────[  ]   │
│  CFG     ────────────────[  ]   │  I2V only
│  Format  [H.264 MP4      ▼]     │
│  Boomerang  ○                   │
├─────────────────────────────────┤
│ RESOLUTION                      │
│  [16:9][9:16][4:3][1:1][Custom] │  video-aware presets
│  Width [   ] × Height [   ]     │
├─────────────────────────────────┤
│ SAMPLER                         │
│  Sampler  [Euler    ▼]          │
│  Schedule [Simple  ▼]           │
├─────────────────────────────────┤
│ LoRAs                           │
│  [Browse LoRAs]  [active cards] │
├─────────────────────────────────┤
│ [████ Generate ████]            │
└─────────────────────────────────┘
```

---

## Architecture

### Approach

Option A: new dedicated `VideoSidebar` component. `WorkspaceSidebar` is not modified. Shared atomic sub-components are imported directly.

### Type changes (existing files)

**`src/routing/appRoute.ts`**
- Add `'video'` to `GenerateWorkspaceMode` union: `'quick' | 'guided' | 'advanced' | 'video'`

**`src/pages/GeneratePage/components/WorkspaceExperiencePanel.tsx`**
- Add `{ value: 'video', label: 'Video' }` to the mode `SegmentedControl`

**`src/pages/GeneratePage/index.tsx`**
- Extend `usesAdvancedRail` to include `'video'`: `currentMode === 'advanced' || currentMode === 'video'`
- Add `VideoSidebar` branch in the sidebar conditional:
  ```typescript
  currentMode === 'video'
    ? <VideoSidebar ... />
    : <WorkspaceSidebar ... />
  ```

### New files

```
swarmui-react/src/pages/GeneratePage/components/VideoSidebar/
  index.tsx               — root component, scrollable column, sticky header + generate button
  VideoWorkflowToggle.tsx — T2V / I2V SegmentedControl; local state, defaults to T2V,
                            auto-flips to I2V if an init image is already loaded on mount
  VideoParameters.tsx     — frames, fps, steps, cfg (I2V only), format, boomerang sliders/inputs
  VideoResolution.tsx     — aspect ratio preset buttons (16:9, 9:16, 4:3, 1:1, Custom)
                            plus width/height number inputs; presets write both fields
  VideoModelWarning.tsx   — Alert shown when selected model has supportsVideo=false
```

### Shared components imported (no duplication)

| Component | Source |
|---|---|
| `SectionHero` | existing |
| `GenerateButton` | `ParameterPanel/GenerateButton` |
| `SliderWithInput` | existing |
| `SeedInput` | existing |
| `SwarmBadge`, `ElevatedCard` | existing UI primitives |
| `getModelMediaCapabilities` | `utils/modelCapabilities` |
| Init image upload logic | `paramForm.handleInitImageUpload` passed as prop |

### State

No new stores. All video parameters already exist in `GenerateParams`:
- `videoframes`, `videofps`, `videosteps`, `videocfg`, `videoformat`, `videoboomerang`
- `text2videoframes`, `text2videofps`, `text2videoformat`
- `initimage`

T2V/I2V toggle is local `useState` inside `VideoSidebar`. It is not persisted — defaults to T2V on mount, auto-switches to I2V if `form.values.initimage` is already set.

When the user switches from I2V to T2V, `initimage` is cleared from the form.

### Resolution presets

| Label | Width | Height | Notes |
|---|---|---|---|
| 16:9 | 1280 | 720 | Default for LTX-Video |
| 16:9 sm | 768 | 512 | Lighter, faster |
| 9:16 | 720 | 1280 | Vertical/portrait |
| 4:3 | 960 | 720 | |
| 1:1 | 512 | 512 | |
| Custom | — | — | Manual width/height inputs |

### Video parameter defaults by workflow

| Parameter | T2V default | I2V default |
|---|---|---|
| Frames | 97 (LTXV) | 25 |
| FPS | 24 | 24 |
| Steps | 20 | 20 |
| CFG | — (hidden) | 3.5 |
| Format | h264-mp4 | h264-mp4 |
| Boomerang | off | off |

---

## What is excluded

The following sections from Advanced mode are intentionally absent in Video mode:

- Hi-Res Refiner / Upscale
- ControlNet
- Variation seed
- CLIP Skip
- Embeddings
- VAE override
- FreeU

---

## Files changed summary

| File | Change |
|---|---|
| `src/routing/appRoute.ts` | Add `'video'` to mode union |
| `src/pages/GeneratePage/components/WorkspaceExperiencePanel.tsx` | Add Video tab to SegmentedControl |
| `src/pages/GeneratePage/index.tsx` | Extend `usesAdvancedRail`, add `VideoSidebar` branch |
| `src/pages/GeneratePage/components/VideoSidebar/index.tsx` | New |
| `src/pages/GeneratePage/components/VideoSidebar/VideoWorkflowToggle.tsx` | New |
| `src/pages/GeneratePage/components/VideoSidebar/VideoParameters.tsx` | New |
| `src/pages/GeneratePage/components/VideoSidebar/VideoResolution.tsx` | New |
| `src/pages/GeneratePage/components/VideoSidebar/VideoModelWarning.tsx` | New |
