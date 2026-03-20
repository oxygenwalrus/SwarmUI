# ControlNet Preprocessor Dropdown — Design Spec

**Date:** 2026-03-20
**Status:** Approved

## Problem

The ControlNet accordion exposes model selection, strength, and start/end steps but has no preprocessor control. The SwarmUI backend supports a `controlnetpreprocessor` param (and two/three variants) that converts a regular photo into the control signal the chosen model expects. Without this, users uploading a regular photo to Depth or Soft Edge get no preprocessing and generation is incorrect. Canny and OpenPose happen to auto-process because SwarmUI's "toggleable" behaviour kicks in when the param is omitted — but users have no way to override or understand what is happening.

## Goal

Add a preprocessor `Select` dropdown to each of the three ControlNet slots so users can:
- Leave it on **Auto** (default) and let SwarmUI pick the right preprocessor for the model
- Explicitly select a preprocessor (e.g. force Canny on a slot using a Depth model)
- Select **None** when they are providing a pre-processed image themselves

## Approach

**Option A — Preprocessor dropdown with "Auto" default** (selected).

Omitting the preprocessor field from the generate request triggers SwarmUI's auto-selection. The dropdown defaults to "Auto" by leaving the form field `undefined`, which means the field is never sent.

## Data Layer

### `src/api/types.ts`
Add three optional fields to `GenerateParams`:
```ts
controlnetpreprocessor?: string;
controlnettwopreprocessor?: string;
controlnetthreepreprocessor?: string;
```

### `src/pages/GeneratePage/hooks/useParameterForm.ts`
No default values added for preprocessor fields. Omitting them from `DEFAULT_FORM_VALUES` is intentional — undefined fields are not sent in the generate request, which produces the desired Auto behaviour.

## Component Layer

### `src/pages/GeneratePage/components/accordions/ControlNetAccordion.tsx`

**1. `ControlNetFieldKey` union — extend with:**
```ts
| 'controlnetpreprocessor'
| 'controlnettwopreprocessor'
| 'controlnetthreepreprocessor'
```

**2. `ControlNetSlotConfig` — add field:**
```ts
preprocessorKey: ControlNetFieldKey;
```

Populate in `CONTROL_NET_SLOTS`:
- Slot 1: `preprocessorKey: 'controlnetpreprocessor'`
- Slot 2: `preprocessorKey: 'controlnettwopreprocessor'`
- Slot 3: `preprocessorKey: 'controlnetthreepreprocessor'`

**3. `PREPROCESSOR_OPTIONS` constant** at top of file:
```ts
const PREPROCESSOR_OPTIONS = [
  { value: '',                    label: 'Auto (recommended)' },
  { value: 'None',                label: 'None (raw image)' },
  { value: 'Canny',               label: 'Canny' },
  { value: 'SDPoseDrawKeypoints', label: 'OpenPose - Draw Keypoints' },
  { value: 'SDPoseFaceBBoxes',    label: 'OpenPose - Face Boxes' },
  { value: 'SDPoseKeypointExtractor', label: 'OpenPose - Extract Keypoints' },
  { value: 'CropByBBoxes',        label: 'Crop by Bounding Boxes' },
];
```

The empty string `''` acts as the sentinel for "Auto". On change, if the value is `''` the form field is set to `undefined` (omitted from request); otherwise the string is written directly.

**4. Dropdown placement:** Between the model `Select` and the strength `SliderWithInput` in each slot's stack.

**5. Props:** No new props on `ControlNetAccordion` — preprocessor options are static and hardcoded, so no data needs to flow from parent components.

## UX Details

- **Label:** `"Preprocessor"`
- **Description:** `"Auto selects based on model. Use None if your image is already preprocessed."`
- **Placeholder:** `"Auto (recommended)"` when nothing selected
- No changes required to `WorkspaceSidebar`, `GeneratePage/index.tsx`, or any store

## Files Changed

| File | Change |
|------|--------|
| `src/api/types.ts` | Add 3 preprocessor fields to `GenerateParams` |
| `src/pages/GeneratePage/components/accordions/ControlNetAccordion.tsx` | Add `PREPROCESSOR_OPTIONS`, extend `ControlNetFieldKey`, extend `ControlNetSlotConfig`, add `preprocessorKey` to slots, render dropdown in each slot |
| `src/pages/GeneratePage/hooks/useParameterForm.ts` | No change (omission = Auto by design) |

## Out of Scope

- Installing additional preprocessor nodes (e.g. DepthAnything) — separate task
- Exposing the `controlnetuniontype` param — separate task
- Any changes to the generate request pipeline
