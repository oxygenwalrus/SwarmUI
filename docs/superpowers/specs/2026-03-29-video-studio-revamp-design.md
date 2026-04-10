# Video Studio Revamp — Design Spec

## Summary

Redesign the VideoSidebar in the SwarmUI React frontend to provide a simplified, model-driven video generation experience optimized for Wan 2.1, Wan 2.2, and LTXV models. The UI auto-configures all technical parameters based on model selection, supports both Text-to-Video and Image-to-Video workflows, includes pre-flight component checking with one-click downloads, and transparently selects the correct ComfyUI workflow behind the scenes.

## Goals

- Zero-knowledge friendly: a user who has never done video generation can use the page immediately
- Model-first flow: selecting a model drives all defaults and available options
- Smart defaults with optional manual override via an Advanced accordion
- Automatic ComfyUI workflow selection with an "Open in ComfyUI" escape hatch
- Pre-flight checks for required components (text encoders, VAEs) with one-click download
- Visual consistency with existing SwarmUI pages

## Non-Goals

- Supporting non-ComfyUI backends for video generation
- Full model downloads (only auxiliary components like text encoders and VAEs)
- Workflow editing within the video sidebar itself

---

## UI Layout

The VideoSidebar replaces the WorkspaceSidebar when `currentMode === 'video'` (existing behavior). The internal layout is redesigned into two zones:

### Primary Controls (always visible, scrollable)

1. **Header** — "Video Studio" title with history action icon
2. **Model selector** — Searchable Select dropdown. Triggers the full cascade: resolution presets, quality defaults, workflow auto-selection, pre-flight component check
3. **Pre-flight alerts** — Alert components below model selector when required components are missing. Each shows component name and a one-click "[Download]" button with inline progress. Generate button disabled until resolved (see "GenerateButton disabled state" below)
4. **Workflow toggle** — SegmentedControl: "Text-to-Video" / "Image-to-Video"
5. **Init image upload** — Only visible in I2V mode. FileButton with image preview and clear button (existing pattern)
6. **Prompt** — Single Textarea for the video description
7. **Quality preset** — SegmentedControl: Draft / Standard / High. Controls steps and CFG behind the scenes
8. **Resolution presets** — Model-aware button group showing labeled presets (e.g., "Landscape 832x480"). Active preset highlighted. Presets change when model changes
9. **Generate button** — Existing GenerateButton component (see disabled state handling below)

### Advanced Section (collapsed Accordion)

- Negative prompt textarea
- Frames slider (with model-appropriate range/marks)
- FPS slider
- Steps slider (shows auto-configured value, editable)
- CFG Scale slider (shows auto-configured value, editable)
- Seed input
- Sampler select
- Scheduler select
- Video format select: `'h264-mp4'` | `'h265-mp4'` | `'webm'` | `'webp'` | `'gif'` (these string values match existing `videoformat` field values in the backend)
- Boomerang toggle (I2V only)
- Width/Height number inputs (for custom resolutions)
- LoRA browser button + active LoRAs list (moved from primary controls to reduce clutter for beginners; power users know to look in Advanced)
- "Open in ComfyUI" button

### GenerateButton disabled state

The existing `GenerateButton` component does not currently support a `disabled` prop with tooltip. The implementation must add a `disabled?: boolean` prop and `disabledReason?: string` prop to `GenerateButton`, rendering a Mantine Tooltip around the button when disabled.

---

## State Management

Video studio state is managed as **local component state** within the `useVideoProfile` hook and the VideoSidebar component itself. This avoids adding a new Zustand store for state that is purely UI-local and already derives from form values + model selection.

Specifically:
- **Quality preset selection** — local `useState` in VideoSidebar, derived from/synced with form values (steps, CFG)
- **Active profile** — computed by `useVideoProfile` hook from the selected model name
- **Pre-flight status** — local state in `PreflightCheck` component (checking/ready/missing/downloading/error)
- **Workflow mode** — existing local `useState` (already in current implementation)

The form values themselves (steps, CFG, frames, etc.) continue to live in the Mantine `useForm` instance, which syncs with the Zustand `generationStore` as it does today.

Session persistence: quality preset and workflow mode do not persist across page refreshes. On reload, they reset to "Standard" and "t2v" respectively, with values re-derived from the selected model. This matches the current behavior for video-specific state.

---

## Model Profile Registry

A data module (`videoModelProfiles.ts`) mapping recognized model families to their optimal defaults. Model matching uses regex patterns (extending the existing `modelCapabilities.ts` approach).

### Profile Schema

```typescript
interface VideoModelProfile {
    id: string;
    label: string;
    pattern: RegExp;
    priority: number; // Higher = matched first. Prevents ambiguous multi-match.
    supportsT2V: boolean;
    supportsI2V: boolean;
    draft: { steps: number; cfg: number; frames: number };
    standard: { steps: number; cfg: number; frames: number };
    high: { steps: number; cfg: number; frames: number };
    defaultFps: number;
    defaultSampler: string;
    defaultScheduler: { t2v: string; i2v: string };
    resolutionPresets: Array<{ label: string; width: number; height: number }>;
    requiredComponents: Array<{
        type: 'text_encoder' | 'vae' | 'clip';
        name: string;
        filename: string;
        downloadUrl: string;
        modelType: string; // Maps to swarmClient.downloadModel type param: 'VAE', 'Clip', etc.
    }>;
    workflowId: { t2v: string; i2v: string };
}
```

### Profile matching priority

Profiles are tested in descending `priority` order. First match wins. This prevents ambiguity when a model name matches multiple patterns (e.g., a hypothetical "wan22-ltxv-hybrid" would match the highest-priority profile).

Priority order: Wan 2.2 (priority 30) > Wan 2.1 (priority 20) > LTXV (priority 10). Wan 2.2 is higher than 2.1 because "wan2.2" also contains patterns that could match "wan2".

### Profiles

| Field | Wan 2.1 | Wan 2.2 | LTXV |
|-------|---------|---------|------|
| Pattern | `/wan.*2\.?1/i` | `/wan.*2\.?2/i` | `/\bltxv\b\|ltx[\s-]?video/i` |
| Priority | 20 | 30 | 10 |
| T2V / I2V | Both | Both | Both |
| Draft steps / CFG / frames | 10 / 3.0 / 33 | 10 / 3.0 / 33 | 8 / 3.0 / 41 |
| Standard steps / CFG / frames | 20 / 5.0 / 81 | 20 / 5.0 / 81 | 20 / 3.5 / 97 |
| High steps / CFG / frames | 35 / 5.0 / 81 | 35 / 5.0 / 81 | 40 / 3.5 / 97 |
| Default FPS | 16 | 16 | 24 |
| Sampler | euler | euler | euler |
| Scheduler (T2V / I2V) | normal / normal | normal / normal | ltxv / ltxv-image |
| Resolution presets | 832x480, 480x832, 512x512 | 1280x720, 720x1280, 960x960 | 768x512, 512x768, 512x512 |
| Required components | T5-XXL text encoder | T5-XXL text encoder | T5-XXL text encoder, LTXV VAE |
| Workflow IDs | wan21_t2v / wan21_i2v | wan22_t2v / wan22_i2v | ltxv_t2v / ltxv_i2v |

### Frame field mapping

Profile `frames` values map to the existing `GenerateParams` fields as follows:
- **T2V mode:** `text2videoframes` field
- **I2V mode:** `videoframes` field

This preserves backward compatibility with the existing parameter system where T2V and I2V use separate field names.

### Generic Fallback

Unrecognized models get: euler sampler, normal scheduler, 20 steps, 7.0 CFG, 25 frames, 24 FPS, generic resolution presets (1280x720, 720x1280, 512x512), no pre-flight checks, standard backend generation path (no auto-workflow). An info badge displays: "Unknown model family — using default settings. Advanced controls recommended."

---

## Pre-flight Component Checker

### API Integration

The pre-flight checker uses the existing `swarmClient` API:
- **Checking existence:** Call `swarmClient.listModels(type)` where `type` is the component's `modelType` (e.g., `'VAE'`, `'Clip'`). Search the returned model list for the expected `filename`. This uses the same endpoint the model browser already calls.
- **Downloading:** Call `swarmClient.downloadModel({ url, type, name })` which opens a WebSocket (`DoModelDownloadWS`) with real-time progress callbacks (`onProgress`, `onSuccess`, `onError`). This is the same mechanism used by the existing `ModelDownloader` component.

### Flow

1. Model selected -> profile matched -> `requiredComponents` list obtained
2. For each required component, call `swarmClient.listModels(component.modelType)` and check if `component.filename` exists in the results
3. **All present:** Green checkmark badge on model selector, Generate enabled
4. **Missing:** Alert below model selector listing missing components with "[Download]" buttons, Generate disabled with tooltip "Missing required components"
5. Download button -> `swarmClient.downloadModel()` WebSocket -> inline Progress bar updated via `onProgress` callback -> `onSuccess` triggers re-check
6. **Download failure:** `onError` callback -> Progress bar turns red, error message, retry button, Generate stays disabled

### Concurrent downloads

Multiple missing components can be downloaded simultaneously. Each component gets its own progress bar and WebSocket connection. Generate enables only when all required components are present.

### Components Per Model

- Wan 2.1 / 2.2: T5-XXL text encoder (VAE typically bundled with model checkpoint)
- LTXV: T5-XXL text encoder, LTXV VAE

Unrecognized models skip pre-flight entirely.

---

## ComfyUI Workflow Integration

### Auto-workflow (invisible)

On Generate, the system resolves a workflow ID from `profile.workflowId[workflow]` and loads the corresponding workflow JSON. Workflow files are stored at `src/BuiltinExtensions/ComfyUIBackend/ExampleWorkflows/VideoWorkflows/` in the backend project directory.

**Important:** These workflow files are a backend-side dependency. They are served by the SwarmUI C# backend (which already discovers and serves workflow files from the `CustomWorkflows/` directory). The React frontend loads them via the existing workflow API — not bundled into the JS build.

Six workflow files:
- `wan21_t2v.json`, `wan21_i2v.json`
- `wan22_t2v.json`, `wan22_i2v.json`
- `ltxv_t2v.json`, `ltxv_i2v.json`

Workflow JSONs contain placeholder node values that are patched at generation time with actual form values (prompt, model path, resolution, steps, CFG, etc.). The patching approach follows the same pattern used in `features/canvasWorkflow/compat.ts` (`buildCanvasApplyPatch` function at line 33), which takes a payload and produces a patch object that maps node IDs to parameter overrides.

### "Open in ComfyUI" handoff (explicit)

Button in Advanced accordion:
1. Captures current form state
2. Creates a `WorkflowHandoff` object (interface defined in `stores/workflowWorkspaceStore.ts`)
3. Sets `templateId` to the resolved workflow ID
4. Calls `setWorkflowHandoff()` then `navigateToWorkflows({ mode: 'comfy' })` (the `navigateToWorkflows` function is defined in `stores/navigationStore.ts` line 153, accepting a `WorkflowRouteState` partial)
5. Workflow page opens with the workflow pre-loaded and all parameter nodes populated

---

## Quality Presets

Three-tier SegmentedControl:

- **Draft:** Lower frames (~40% of standard), lower steps, lower CFG. For quick previews.
- **Standard:** Full recommended frames, recommended steps and CFG. Good for most use.
- **High:** Same frames and FPS as Standard, higher steps. Best quality, slower.

### Interaction with Advanced controls

- Quality preset active -> Advanced shows auto-configured values, still editable
- User manually changes steps or CFG in Advanced -> quality preset deselects (no active selection = "Custom")
- Selecting a quality preset again overwrites manual steps/CFG changes
- Frames slider always editable independently (quality preset only sets initial value on model change)

---

## Edge Cases

### Model not recognized
- Generic fallback defaults applied
- Generic resolution presets shown
- No pre-flight checks
- No auto-workflow (standard backend generation path)
- Info badge: "Unknown model family — using default settings. Advanced controls recommended."

### Switching models mid-session
- All auto-configured values update to new profile
- Quality preset label stays the same, underlying values change to new profile
- Resolution resets to new model's default landscape preset
- Manual Advanced overrides cleared, quality preset re-engages
- Init image preserved

### Switching workflow (T2V <-> I2V)
- T2V clears init image (existing behavior)
- Scheduler updates if profile specifies different per-workflow schedulers
- Frame count, steps, CFG stay as-is (driven by quality preset)

### Download failure
- Progress bar turns red, error message inline
- Retry button replaces download button
- Generate remains disabled

### Model list filtering
The model selector shows all models (not filtered to video-only). This matches the current behavior. An unrecognized model gets generic fallback defaults rather than being hidden, since the backend may support video models the frontend doesn't yet have profiles for.

---

## VideoSidebarProps Changes

The `VideoSidebarProps` interface changes as follows:

**Removed props** (handled internally by `useVideoProfile` hook):
- None removed, but several become unused as the profile system auto-configures values

**Added props:**
- `preflightDisabled: boolean` — Whether pre-flight has unresolved missing components (used to disable Generate)

The bulk of the existing props remain unchanged since the sidebar still needs model data, form access, generation control, etc.

---

## Files to Create / Modify

### New files
- `swarmui-react/src/pages/GeneratePage/components/VideoSidebar/videoModelProfiles.ts` — Model profile registry with Wan 2.1, Wan 2.2, LTXV profiles and generic fallback
- `swarmui-react/src/pages/GeneratePage/components/VideoSidebar/PreflightCheck.tsx` — Component checker UI with download progress
- `swarmui-react/src/pages/GeneratePage/components/VideoSidebar/QualityPreset.tsx` — Quality preset SegmentedControl
- `swarmui-react/src/pages/GeneratePage/components/VideoSidebar/useVideoProfile.ts` — Hook that resolves profile from model name and cascades defaults to form
- `src/BuiltinExtensions/ComfyUIBackend/ExampleWorkflows/VideoWorkflows/` — 6 workflow JSON files (backend-side, not part of React build)

### Modified files
- `swarmui-react/src/pages/GeneratePage/components/VideoSidebar/index.tsx` — Complete rewrite of layout to new two-zone design
- `swarmui-react/src/pages/GeneratePage/components/VideoSidebar/VideoResolution.tsx` — Accept resolution presets from profile instead of hardcoded `VIDEO_PRESETS`
- `swarmui-react/src/pages/GeneratePage/components/VideoSidebar/VideoParameters.tsx` — Restructured for Advanced accordion placement
- `swarmui-react/src/pages/GeneratePage/components/VideoSidebar/VideoWorkflowToggle.tsx` — Minor: add workflow-triggered scheduler updates
- `swarmui-react/src/utils/modelCapabilities.ts` — Add Wan 2.1 and Wan 2.2 patterns to both `TEXT_TO_VIDEO_PATTERNS` and `IMAGE_TO_VIDEO_PATTERNS` (currently missing entirely)
- `swarmui-react/src/pages/GeneratePage/hooks/useParameterForm.ts` — No new form fields needed; quality preset is local UI state, not a generation param
- `swarmui-react/src/hooks/useGenerationHandlers.ts` — Inject workflow resolution before generation call (resolve workflow ID from profile, load workflow JSON, apply parameter patches)
- `swarmui-react/src/pages/GeneratePage/components/ParameterPanel/GenerateButton.tsx` — Add `disabled` and `disabledReason` props with Tooltip

### Files to delete
- `swarmui-react/src/pages/GeneratePage/components/VideoSidebar/VideoModelWarning.tsx` — Replaced by `PreflightCheck.tsx`

Note: `videoGuidance.ts` and `videoModelRecommendations.ts` do not exist in the VideoSidebar directory (confirmed via filesystem listing). No deletion needed for those files.
