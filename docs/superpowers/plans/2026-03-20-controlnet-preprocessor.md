# ControlNet Preprocessor Dropdown Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a preprocessor `Select` dropdown to each of the three ControlNet slots so users can choose how their input image is processed before being used as guidance.

**Architecture:** Three targeted changes — extend the `GenerateParams` type with preprocessor fields, add those fields to the generate pipeline's `includeParam` allowlist so they reach the backend, and add a `Select` dropdown to `ControlNetAccordion` using a static `PREPROCESSOR_OPTIONS` list. The "Auto" option is represented by `''` in the Mantine Select but stored as `undefined` in the form so the field is omitted from the request.

**Tech Stack:** TypeScript, React, Mantine UI v7, Mantine Form, Vitest

**Spec:** `docs/superpowers/specs/2026-03-20-controlnet-preprocessor-design.md`

---

## Chunk 1: Types + Allowlist

### Task 1: Add preprocessor fields to GenerateParams

**Files:**
- Modify: `swarmui-react/src/api/types.ts` (ControlNet block, lines ~98–113)

The `GenerateParams` interface needs three optional string fields for the preprocessor param that SwarmUI accepts.

- [ ] **Open `swarmui-react/src/api/types.ts` and find the ControlNet block** (around line 98). It currently ends with `controlnetthreeend?: number;`.

- [ ] **Add the three preprocessor fields immediately after `controlnetthreeend`:**

```ts
  // ControlNet
  controlnetimageinput?: string;
  controlnetmodel?: string;
  controlnetstrength?: number;
  controlnetstart?: number;
  controlnetend?: number;
  controlnettwoimageinput?: string;
  controlnettwomodel?: string;
  controlnettwostrength?: number;
  controlnettwostart?: number;
  controlnettwoend?: number;
  controlnetthreeimageinput?: string;
  controlnetthreemodel?: string;
  controlnetthreestrength?: number;
  controlnetthreestart?: number;
  controlnetthreeend?: number;
  controlnetpreprocessor?: string;       // ← add
  controlnettwopreprocessor?: string;    // ← add
  controlnetthreepreprocessor?: string;  // ← add
```

- [ ] **Verify TypeScript compiles cleanly:**

```bash
cd swarmui-react && npx tsc --noEmit
```

Expected: no errors related to the new fields.

- [ ] **Commit:**

```bash
git add swarmui-react/src/api/types.ts
git commit -m "feat: add controlnetpreprocessor fields to GenerateParams"
```

---

### Task 2: Add preprocessor keys to the generate pipeline allowlist

**Files:**
- Modify: `swarmui-react/src/hooks/useGenerationHandlers.ts` (ControlNet block, lines ~515–533)

The `includeParam` function inside `useGenerationHandlers` has an explicit allowlist of keys that are permitted in the generate payload. Keys not in this list are silently dropped with reason `feature_filtered`. The three new preprocessor keys must be added to the same ControlNet block.

- [ ] **Open `swarmui-react/src/hooks/useGenerationHandlers.ts` and find the ControlNet block** (around line 515). It looks like:

```ts
if (
    [
        'controlnetmodel',
        'controlnetimageinput',
        'controlnetstrength',
        'controlnetstart',
        'controlnetend',
        'controlnettwomodel',
        'controlnettwoimageinput',
        'controlnettwostrength',
        'controlnettwostart',
        'controlnettwoend',
        'controlnetthreemodel',
        'controlnetthreeimageinput',
        'controlnetthreestrength',
        'controlnetthreestart',
        'controlnetthreeend',
    ].includes(key)
) return enableControlNet;
```

- [ ] **Add the three preprocessor keys to the end of this array:**

```ts
if (
    [
        'controlnetmodel',
        'controlnetimageinput',
        'controlnetstrength',
        'controlnetstart',
        'controlnetend',
        'controlnettwomodel',
        'controlnettwoimageinput',
        'controlnettwostrength',
        'controlnettwostart',
        'controlnettwoend',
        'controlnetthreemodel',
        'controlnetthreeimageinput',
        'controlnetthreestrength',
        'controlnetthreestart',
        'controlnetthreeend',
        'controlnetpreprocessor',       // ← add
        'controlnettwopreprocessor',    // ← add
        'controlnetthreepreprocessor',  // ← add
    ].includes(key)
) return enableControlNet;
```

- [ ] **Verify TypeScript compiles cleanly:**

```bash
cd swarmui-react && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Commit:**

```bash
git add swarmui-react/src/hooks/useGenerationHandlers.ts
git commit -m "feat: add controlnetpreprocessor keys to generate pipeline allowlist"
```

---

## Chunk 2: ControlNet Accordion Component

> **Prerequisite:** Chunk 1 must be complete. `GenerateParams` in `types.ts` must already have the three preprocessor fields, otherwise `form.setFieldValue(slot.preprocessorKey, ...)` will fail TypeScript compilation in Step 5.

### Task 3: Add preprocessor dropdown to ControlNetAccordion

**Files:**
- Modify: `swarmui-react/src/pages/GeneratePage/components/accordions/ControlNetAccordion.tsx`
- Create: `swarmui-react/src/pages/GeneratePage/components/accordions/ControlNetAccordion.test.ts`

> **Note on render testing:** `@testing-library/react` is not installed in this project. The test covers the `PREPROCESSOR_OPTIONS` data constant (pure logic). The bidirectional Mantine binding is verified manually in Step 5.

> **Mantine v8 note:** `Select`'s `onChange` signature is `(value: string | null) => void`. The Auto sentinel guard must handle both `null` and `''`.

This task adds the `PREPROCESSOR_OPTIONS` constant, extends the slot config type and data, and renders a `Select` dropdown in each slot.

#### Step 1: Write the failing test first

- [ ] **Create `swarmui-react/src/pages/GeneratePage/components/accordions/ControlNetAccordion.test.ts`:**

```ts
import { describe, expect, it } from 'vitest';

// We test the PREPROCESSOR_OPTIONS constant directly by importing it.
// This validates the sentinel value (''), the backend strings, and labels
// before touching the component rendering.
import { PREPROCESSOR_OPTIONS } from './ControlNetAccordion';

describe('PREPROCESSOR_OPTIONS', () => {
    it('has Auto as the first option with empty string sentinel', () => {
        expect(PREPROCESSOR_OPTIONS[0].value).toBe('');
        expect(PREPROCESSOR_OPTIONS[0].label).toMatch(/auto/i);
    });

    it('includes None as an explicit option', () => {
        const none = PREPROCESSOR_OPTIONS.find((o) => o.value === 'None');
        expect(none).toBeDefined();
    });

    it('includes all expected backend preprocessor values', () => {
        const values = PREPROCESSOR_OPTIONS.map((o) => o.value);
        expect(values).toContain('Canny');
        expect(values).toContain('SDPoseDrawKeypoints');
        expect(values).toContain('SDPoseFaceBBoxes');
        expect(values).toContain('SDPoseKeypointExtractor');
        expect(values).toContain('CropByBBoxes');
    });

    it('has no duplicate values', () => {
        const values = PREPROCESSOR_OPTIONS.map((o) => o.value);
        expect(new Set(values).size).toBe(values.length);
    });
});
```

- [ ] **Run the test — expect it to FAIL** (export doesn't exist yet):

```bash
cd swarmui-react && npx vitest run src/pages/GeneratePage/components/accordions/ControlNetAccordion.test.ts
```

Expected output: `FAIL` — `PREPROCESSOR_OPTIONS` is not exported.

#### Step 2: Extend the type union and slot config

- [ ] **Open `ControlNetAccordion.tsx`. Find the `ControlNetFieldKey` union (line ~19) and add the three preprocessor keys:**

```ts
type ControlNetFieldKey =
    | 'controlnetimageinput'
    | 'controlnetmodel'
    | 'controlnetstrength'
    | 'controlnetstart'
    | 'controlnetend'
    | 'controlnettwoimageinput'
    | 'controlnettwomodel'
    | 'controlnettwostrength'
    | 'controlnettwostart'
    | 'controlnettwoend'
    | 'controlnetthreeimageinput'
    | 'controlnetthreemodel'
    | 'controlnetthreestrength'
    | 'controlnetthreestart'
    | 'controlnetthreeend'
    | 'controlnetpreprocessor'       // ← add
    | 'controlnettwopreprocessor'    // ← add
    | 'controlnetthreepreprocessor'; // ← add
```

- [ ] **Add `preprocessorKey` to `ControlNetSlotConfig` (line ~36):**

```ts
interface ControlNetSlotConfig {
    value: string;
    title: string;
    imageKey: ControlNetFieldKey;
    modelKey: ControlNetFieldKey;
    strengthKey: ControlNetFieldKey;
    startKey: ControlNetFieldKey;
    endKey: ControlNetFieldKey;
    preprocessorKey: ControlNetFieldKey; // ← add
}
```

- [ ] **Add `preprocessorKey` to each slot in `CONTROL_NET_SLOTS` (line ~46):**

```ts
const CONTROL_NET_SLOTS: ControlNetSlotConfig[] = [
    {
        value: 'controlnet-primary',
        title: 'ControlNet',
        imageKey: 'controlnetimageinput',
        modelKey: 'controlnetmodel',
        strengthKey: 'controlnetstrength',
        startKey: 'controlnetstart',
        endKey: 'controlnetend',
        preprocessorKey: 'controlnetpreprocessor',      // ← add
    },
    {
        value: 'controlnet-secondary',
        title: 'ControlNet Two',
        imageKey: 'controlnettwoimageinput',
        modelKey: 'controlnettwomodel',
        strengthKey: 'controlnettwostrength',
        startKey: 'controlnettwostart',
        endKey: 'controlnettwoend',
        preprocessorKey: 'controlnettwopreprocessor',   // ← add
    },
    {
        value: 'controlnet-tertiary',
        title: 'ControlNet Three',
        imageKey: 'controlnetthreeimageinput',
        modelKey: 'controlnetthreemodel',
        strengthKey: 'controlnetthreestrength',
        startKey: 'controlnetthreestart',
        endKey: 'controlnetthreeend',
        preprocessorKey: 'controlnetthreepreprocessor', // ← add
    },
];
```

#### Step 3: Add PREPROCESSOR_OPTIONS constant (exported for testability)

- [ ] **Add the constant directly after the `CONTROL_NET_SLOTS` array (before the `ControlNetAccordionProps` interface):**

```ts
export const PREPROCESSOR_OPTIONS = [
    { value: '',                        label: 'Auto (recommended)' },
    { value: 'None',                    label: 'None (raw image)' },
    { value: 'Canny',                   label: 'Canny' },
    { value: 'SDPoseDrawKeypoints',     label: 'OpenPose - Draw Keypoints' },
    { value: 'SDPoseFaceBBoxes',        label: 'OpenPose - Face Boxes' },
    { value: 'SDPoseKeypointExtractor', label: 'OpenPose - Extract Keypoints' },
    { value: 'CropByBBoxes',            label: 'Crop by Bounding Boxes' },
];
```

- [ ] **Run the test — expect it to PASS now:**

```bash
cd swarmui-react && npx vitest run src/pages/GeneratePage/components/accordions/ControlNetAccordion.test.ts
```

Expected: all 4 tests pass. Do not proceed to Step 4 until this is green.

- [ ] **Run TypeScript check to confirm types + slot config are sound before writing render code:**

```bash
cd swarmui-react && npx tsc --noEmit
```

Expected: no errors. This confirms `preprocessorKey` is on `ControlNetSlotConfig`, the three keys are in `ControlNetFieldKey`, and `GenerateParams` (from Chunk 1) has the preprocessor fields — all required for the render JSX in Step 4 to compile cleanly.

#### Step 4: Render the preprocessor Select in the component

- [ ] **Inside the `ControlNetAccordion` component, find the `Select` for the model (around line 188) and add the preprocessor dropdown immediately after it:**

```tsx
<Select
    label={`${slot.title} Model`}
    placeholder={
        loadingControlNets
            ? 'Loading ControlNets...'
            : 'Select ControlNet model'
    }
    data={controlNetOptions}
    {...form.getInputProps(slot.modelKey)}
    searchable
    clearable
    description={`Model for ${slot.title.toLowerCase()} guidance`}
/>

{/* ← Add this block */}
<Select
    label="Preprocessor"
    description="Auto selects based on model. Use None if your image is already preprocessed."
    data={PREPROCESSOR_OPTIONS}
    value={(form.values[slot.preprocessorKey] as string | undefined) ?? ''}
    onChange={(value) =>
        form.setFieldValue(
            slot.preprocessorKey,
            // Mantine v8 onChange passes string | null; treat both null and ''
            // as "Auto" so the field is omitted from the generate request
            value == null || value === '' ? undefined : value
        )
    }
/>
```

Note the bidirectional binding:
- **render:** `value ?? ''` maps `undefined` → `''` so Mantine shows "Auto (recommended)" as selected rather than blank
- **onChange:** `value == null || value === ''` maps both `null` (Mantine clear) and `''` (Auto option) → `undefined` so the field is omitted from the generate request

#### Step 5: Commit type + config changes first

- [ ] **Run TypeScript check before committing:**

```bash
cd swarmui-react && npx tsc --noEmit
```

Expected: no errors (the render is not yet in place, but types and slot config compile cleanly).

- [ ] **Run tests:**

```bash
cd swarmui-react && npx vitest run src/pages/GeneratePage/components/accordions/ControlNetAccordion.test.ts
```

Expected: 4 tests pass (`PREPROCESSOR_OPTIONS` constant tests).

- [ ] **Commit type + config changes:**

```bash
git add swarmui-react/src/pages/GeneratePage/components/accordions/ControlNetAccordion.tsx \
        swarmui-react/src/pages/GeneratePage/components/accordions/ControlNetAccordion.test.ts
git commit -m "feat: extend ControlNet slot config with preprocessorKey and add PREPROCESSOR_OPTIONS"
```

#### Step 6: Commit the render (Select dropdown)

- [ ] **Run the full test suite:**

```bash
cd swarmui-react && npx vitest run
```

Expected: all existing tests pass, plus the 4 new `PREPROCESSOR_OPTIONS` tests.

- [ ] **Run TypeScript check:**

```bash
cd swarmui-react && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Start the dev server and manually verify:**

```bash
cd swarmui-react && npm run dev
```

Open the Generate page → expand ControlNet → open any slot → confirm:
- A "Preprocessor" dropdown appears between the model selector and the strength slider
- It shows "Auto (recommended)" as the selected option by default (not blank)
- All 7 options appear in the dropdown
- Selecting a preprocessor then switching back to "Auto" shows "Auto (recommended)" again (not blank)
- Selecting "None" sends `"None"` to the backend (can verify via browser network tab on generate)

- [ ] **Commit render:**

```bash
git add swarmui-react/src/pages/GeneratePage/components/accordions/ControlNetAccordion.tsx
git commit -m "feat: render preprocessor Select dropdown in each ControlNet slot"
```
