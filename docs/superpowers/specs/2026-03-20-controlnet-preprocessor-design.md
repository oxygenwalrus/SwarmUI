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
No default values added for preprocessor fields. This is intentional and consistent with `controlnetmodel`, which is also absent from `DEFAULT_FORM_VALUES`. Undefined fields are not sent in the generate request, producing the desired Auto behaviour.

### `src/hooks/useGenerationHandlers.ts`
The generate pipeline uses an explicit `includeParam` allowlist. The three new preprocessor keys must be added to the ControlNet block of that allowlist, otherwise they will be silently filtered from the payload and never reach the backend.

## Component Layer

### `src/pages/GeneratePage/components/accordions/ControlNetAccordion.tsx`

**1. `ControlNetFieldKey` union — extend with:**
```ts
| 'controlnetpreprocessor'
| 'controlnettwopreprocessor'
| 'controlnetthreepreprocessor'
```
Note: `handleImageUpload` and `handleClearImage` accept `ControlNetFieldKey` but are only called for image fields — the preprocessor keys are never passed to them. The union extension is required so `form.setFieldValue(slot.preprocessorKey, ...)` compiles without a type error.

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
  { value: '',                        label: 'Auto (recommended)' },
  { value: 'None',                    label: 'None (raw image)' },
  { value: 'Canny',                   label: 'Canny' },
  { value: 'SDPoseDrawKeypoints',     label: 'OpenPose - Draw Keypoints' },
  { value: 'SDPoseFaceBBoxes',        label: 'OpenPose - Face Boxes' },
  { value: 'SDPoseKeypointExtractor', label: 'OpenPose - Extract Keypoints' },
  { value: 'CropByBBoxes',            label: 'Crop by Bounding Boxes' },
];
```

This list is **static and intentionally hardcoded** for this phase. The values were confirmed against a live SwarmUI 0.9.8.0 backend's `TriggerRefresh` response (`controlnetpreprocessor.values`). Dynamic enumeration (e.g. picking up DepthAnything if installed) is out of scope — tracked separately.

**4. `onChange` handler — "Auto" sentinel behaviour (bidirectional):**

The empty string `''` is the Mantine `Select` sentinel for the "Auto" option.

**On change (user picks "Auto"):** convert `''` to `undefined`:
```ts
onChange={(value) =>
  form.setFieldValue(slot.preprocessorKey, value === '' ? undefined : value)
}
```
Setting `undefined` keeps the field absent from the form values object (omitted from the generate request).

**On render (displaying current value):** convert `undefined` back to `''` so Mantine selects the "Auto" row rather than rendering blank:
```ts
value={form.values[slot.preprocessorKey] as string ?? ''}
```
Without this, Mantine `Select` receives `undefined` and treats the component as uncontrolled, causing the dropdown to appear empty on initial load and after any reset rather than showing "Auto (recommended)".

**5. Dropdown placement:** Between the model `Select` and the strength `SliderWithInput` in each slot's stack.

**6. Props:** No new props on `ControlNetAccordion` — preprocessor options are static.

## UX Details

- **Label:** `"Preprocessor"`
- **Description:** `"Auto selects based on model. Use None if your image is already preprocessed."`
- **Placeholder:** `"Auto (recommended)"` when field is `undefined`
- No changes required to `WorkspaceSidebar` or `GeneratePage/index.tsx`

## Edge Cases

- **Preprocessor selected, no image uploaded:** No UI validation is added. The backend handles this gracefully (falls back to init image or errors). This is consistent with existing behaviour for the model dropdown. Out of scope for this change.
- **Preprocessor selected, ControlNet disabled:** The preprocessor field is sent regardless of the enabled toggle. The backend ignores ControlNet params when ControlNet is not enabled. No special handling needed.

## Files Changed

| File | Change |
|------|--------|
| `src/api/types.ts` | Add 3 preprocessor fields to `GenerateParams` |
| `src/hooks/useGenerationHandlers.ts` | Add 3 preprocessor keys to the ControlNet block of the `includeParam` allowlist |
| `src/pages/GeneratePage/components/accordions/ControlNetAccordion.tsx` | Add `PREPROCESSOR_OPTIONS`, extend `ControlNetFieldKey`, extend `ControlNetSlotConfig`, add `preprocessorKey` to slots, render dropdown in each slot with correct `onChange` |
| `src/pages/GeneratePage/hooks/useParameterForm.ts` | No change (omission = Auto by design, consistent with `controlnetmodel`) |

## Out of Scope

- Installing additional preprocessor nodes (e.g. DepthAnything) — separate task
- Dynamic preprocessor list enumeration from backend — separate task
- Exposing the `controlnetuniontype` param — separate task
- UI validation for missing image when preprocessor is selected — separate task
