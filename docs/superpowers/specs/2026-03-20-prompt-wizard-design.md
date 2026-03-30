# Prompt Wizard — Design Spec

**Date:** 2026-03-20
**Status:** Approved
**Approach:** Guided Wizard (Approach A)

## Problem

The current prompt builder has too many bundled options that are not clearly organised. Presets dump multi-token blocks rather than offering individual tag control. 16 flat categories mix different concerns at the same level. The system doesn't respect model-specific prompt ordering conventions (e.g. Illustrious/danbooru tag order).

## Goals

1. Replace the preset-block model with **individual tags as the primary unit**
2. Organise tags into a **guided wizard** that follows the natural prompt construction workflow
3. Support **prompt profiles** that control tag ordering per model (Illustrious first)
4. Preserve all existing presets as quick-fill shortcuts
5. Unify image generation and roleplay preset storage where it makes sense
6. Start with a curated tag library, with ability to import/extend from external sources later

## Non-Goals

- Changing the regional/segment canvas builder
- Changing PromptInput autocomplete, enhancement, or grammar checking
- Changing the prompt syntax insertion menu
- Changing the prompt cache system
- Automatic model detection (manual profile switching only)

---

## Data Model

### Tag

```typescript
interface PromptTag {
  id: string;                    // e.g. "tag-anime-style"
  text: string;                  // the actual prompt token: "anime style"
  step: BuilderStep;             // which wizard step it belongs to
  subcategory?: string;          // optional grouping within a step, e.g. "Hair" within Appearance
  profiles: string[];             // profile IDs this tag is relevant to, e.g. ["illustrious"]
  aliases?: string[];            // for search/autocomplete: ["anime", "japanese animation"]
  negativeText?: string;         // auto-added negative when this tag is selected
  isCustom?: boolean;            // true for user-created tags (persisted in localStorage)
}
```

### Builder Step

```typescript
type BuilderStep =
  | 'subject'      // What am I generating?
  | 'appearance'   // How does it look?
  | 'action'       // What is it doing?
  | 'setting'      // Where?
  | 'style'        // Artistic style
  | 'atmosphere'   // Mood, lighting, color
  | 'quality';     // Technical quality, negatives
```

### Step Metadata

Defines display names and ordered subcategories per step. Subcategories control the tab order within each step's content area.

```typescript
interface StepMeta {
  step: BuilderStep;
  label: string;                 // Display name, e.g. "Appearance"
  description: string;           // Helper text, e.g. "How does the subject look?"
  subcategories: string[];       // Ordered subcategory names, e.g. ["Hair", "Eyes", "Body", "Clothing"]
}
```

Tags with no `subcategory` (or `subcategory: undefined`) are placed in an implicit "General" group that appears before named subcategories, ordered by selection order.

### Prompt Profile

```typescript
interface PromptProfile {
  id: string;                    // e.g. "illustrious"
  name: string;                  // "Illustrious / Danbooru"
  stepOrder: BuilderStep[];      // tag ordering per model convention
  tagSeparator: string;          // ", " for danbooru-style, ". " for natural language
  description?: string;
}
```

Default (Illustrious) profile:
```
stepOrder: ['quality', 'subject', 'appearance', 'action', 'setting', 'style', 'atmosphere']
tagSeparator: ", "
```

### Preset (quick-fill shortcut)

```typescript
interface PromptPreset {
  id: string;
  name: string;
  step: BuilderStep;             // which step it appears in
  tagIds: string[];              // references to tags it pre-selects
  description?: string;
  isDefault: boolean;
}
```

### Roleplay Presets

Roleplay presets remain structurally unchanged — they are full system prompt blocks, not tag collections. They move into the unified store but are only surfaced in roleplay context (chat page), not the image generation wizard.

---

## Wizard UI Architecture

### Layout (top to bottom)

1. **Header bar** — Profile selector dropdown + global search box + close button
2. **Step navigation** — Horizontal step indicators (Subject -> Appearance -> Action -> Setting -> Style -> Atmosphere -> Quality). Clickable to jump. Shows selected tag count per step.
3. **Step content area** — Active step's content:
   - Subcategory tabs (e.g. within Appearance: Hair, Eyes, Body, Clothing, Accessories)
   - Tag grid — individual tags as toggleable chips
   - Quick-fill presets — collapsible row at top of each step
4. **Live prompt preview** — Sticky bottom bar showing assembled prompt in profile-correct order. Editable. Shows negative prompt.
5. **Action bar** — "Apply to Prompt" / "Apply to Negative" / "Clear All"

### Navigation

- Next/Previous buttons advance through steps
- Step indicators are clickable for direct jump
- Steps with selected tags show count badges
- Empty steps are skippable

### Search

Global search in header filters tags across all steps, results grouped by step. Separate from the existing PromptInput autocomplete.

### Tag Interaction

- Single click toggles tag on/off
- Selected = filled/accent chip, available = outline chip
- Selected tags pinned to top of their subcategory
- Each chip shows its prompt text directly

---

## Prompt Assembly

### Assembly Flow

1. Collect all selected tags across all steps
2. Group by step
3. Order step groups according to active profile's `stepOrder`
4. Within each step, order by subcategory (following `StepMeta.subcategories` order, with uncategorised tags in an implicit "General" group first), then by selection order within each subcategory
5. Join with profile's `tagSeparator`
6. Negative tags collected and joined separately

### Example (Illustrious profile)

Selected: `masterpiece` (quality) + `1girl` (subject) + `long hair, blue eyes` (appearance) + `standing` (action) + `classroom` (setting) + `anime style` (style) + `dramatic lighting` (atmosphere)

Output: `masterpiece, 1girl, long hair, blue eyes, standing, classroom, anime style, dramatic lighting`

### Integration

- "Apply to Prompt" appends to existing PromptInput text (same as current)
- Existing PromptInput autocomplete continues to work alongside wizard
- Regional/segment canvas builder untouched — manages its own syntax blocks
- Prompt cache store works against final prompt text regardless of assembly method

---

## Migration

### Preset -> Tag Migration

All ~100+ existing presets from `promptPresets.json` are converted to:

1. **Individual tags** — preset `promptText` split on commas, each token becomes a tag. Step and subcategory assignments are manually curated during migration and stored in `promptTags.json`. The migration does not auto-classify tags.
2. **Quick-fill preset** — a preset record referencing those tag IDs, preserving the one-click shortcut

Negative prompt text split the same way into negative tags.

### Custom User Presets

Custom presets in localStorage migrated on first load: split into tags (marked `isCustom: true`) + preset reference. Custom tags are persisted in localStorage alongside other custom state. Migration version flag prevents re-running.

### Roleplay Presets

Data preserved unchanged. `roleplayPromptPresets.ts` remains the source of truth for roleplay preset data. The unified store imports from it and exposes roleplay presets only in roleplay context. The file itself is not modified or removed.

---

## File Structure

### New Files

```
src/features/promptWizard/
  types.ts                    — Tag, BuilderStep, StepMeta, PromptProfile, Preset types
  profiles.ts                 — Prompt profile definitions (Illustrious first)
  steps.ts                    — Step metadata definitions (labels, descriptions, subcategories per step)
  assemble.ts                 — Prompt assembly logic
  migrate.ts                  — Migration from old preset format
  index.ts                    — Public exports

src/data/
  promptTags.json             — Tag library (migrated from promptPresets.json)
  promptQuickPresets.json     — Quick-fill preset definitions

src/stores/
  promptWizardStore.ts        — Unified store: selected tags, active profile, active step, custom tags/presets

src/components/
  PromptWizard.tsx            — Root modal component
  PromptWizardHeader.tsx      — Profile selector, search, close
  PromptWizardSteps.tsx       — Step navigation bar
  PromptWizardStepContent.tsx — Tag grid + subcategories + quick-fill
  PromptWizardTagChip.tsx     — Individual toggleable tag chip
  PromptWizardPreview.tsx     — Live prompt preview + actions
```

### Modified Files

- `PromptInput.tsx` — swap PromptPresetSelector for PromptWizard
- Any parent rendering PromptPresetSelector — update import

### Removed (after migration confirmed)

- `PromptPresetSelector.tsx`
- `stores/promptPresets.ts`
- `data/promptPresets.json` (replaced by promptTags.json + promptQuickPresets.json)

### Untouched

- `PromptSyntaxButton.tsx`
- `promptBuilderStore.ts` (canvas/regional)
- `promptEnhanceStore.ts`
- `promptCacheStore.ts`
- `compile.ts` / `types.ts` (regional prompt compilation)
- `roleplayPromptPresets.ts` (data preserved)

---

## Key Constraints

- **All existing presets must be preserved** — no deletions, migrated into new structure
- **Illustrious/danbooru tag conventions first** — other profiles added later
- **Curated tag library to start** — external import capability designed in but not built initially
- **Manual prompt profile switching** — no automatic model detection
- **Individual tags are the primary unit** — presets are convenience shortcuts on top
