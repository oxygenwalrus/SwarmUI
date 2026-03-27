# Preset Browser — Design Spec

## Overview

Add a **Preset Browser** panel within the Prompt Wizard modal. Presets are granular building blocks (e.g., "Heroic Knight", "Lush Forest") that additively apply clusters of 3–6 tags to the current selection. Users switch between the existing step-by-step tag view and the preset browser via a toggle in the wizard header.

Five preset categories: **Characters, Scenes, Styles, Perspectives, Explicit**.

Users can also create, edit, and delete custom presets from within the browser UI.

---

## Data Model

### New Types

```typescript
export type PresetCategory = 'characters' | 'scenes' | 'styles' | 'perspectives' | 'explicit';

export interface BrowserPreset {
  id: string;
  name: string;
  category: PresetCategory;
  tagIds: string[];          // references into the tag library (can span any wizard step)
  description?: string;
  thumbnail?: string;        // optional single emoji character for the card (e.g., "🐺", "🏰")
  isDefault: boolean;        // true = shipped default, false = user-created
}
```

### Relationship to Existing Types

- **`BrowserPreset`** is distinct from the existing **`PromptPreset`** type. `PromptPreset` is scoped to a single `BuilderStep` and serves the sidebar quick-fill role. `BrowserPreset` spans any steps and is organized by `PresetCategory`.
- A `BrowserPreset.tagIds` array references tag IDs from `promptTags.json`. Tags can come from any wizard step — a character preset might include Subject + Appearance + Action tags.
- The existing `PromptPreset` type and `promptQuickPresets.json` are untouched.

---

## UI Architecture

### View Toggle

The wizard header gains a **Steps / Presets** segmented control (or toggle). This switches the main content area between:

- **Steps view** (default): Current step rail + tag palette. No changes to existing behavior.
- **Presets view**: Preset browser replaces the step rail and tag palette columns.

When in Presets view:
- The **Step Rail** is hidden.
- The **Tag Palette area** is replaced by the Preset Browser.
- The **Preview panel** stays visible — tags accumulate as presets are applied.
- The **Footer nav** (Previous/Next step buttons) is hidden.

### Preset Browser Layout

```
┌──────────────────────────────────────────────────────────┐
│ [Characters] [Scenes] [Styles] [Perspectives] [Explicit] │  ← category tabs
│ [🔍 Search presets...                                   ] │  ← search filter
├──────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│ │ Heroic  │ │ Dark    │ │ Cute    │ │ Slim    │        │
│ │ Knight  │ │Sorceress│ │ Catgirl │ │Elf Girl │        │
│ │ 5 tags  │ │ 4 tags  │ │ 4 tags  │ │ 5 tags  │        │  ← preset card grid
│ │ [Apply] │ │ [Apply] │ │ [Apply] │ │ [Apply] │        │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘        │
│ ...                                                      │
├──────────────────────────────────────────────────────────┤
│ [+ Create Preset]                                        │  ← opens inline creator
└──────────────────────────────────────────────────────────┘
```

### Preset Card

Each card displays:
- **Name** (bold)
- **Description** (1 line, dimmed, optional)
- **Tag count badge** (e.g., "5 tags")
- **Apply button** — additively merges tagIds into current selection
- For user-created presets: **Edit / Delete** actions (icon buttons or context menu)

### Preset Creation Flow (Inline)

Triggered by "Create Preset" button at the bottom of the browser. Renders an inline form that replaces the preset card grid (not a new modal):

1. **Name** — text input (required)
2. **Description** — text input (optional)
3. **Category** — dropdown select, defaults to the currently active category tab
4. **Tag selection** — the form displays the user's currently selected tags (from `selectedTagIds` in the store) as clickable chips. The user toggles which of their current tags to include in the preset. This means the typical workflow is: use the Steps view to pick tags first, switch to Presets view, then "Create Preset" to save that selection. If no tags are currently selected, the form shows an empty state prompting the user to switch to Steps view and select tags first.
5. **Save** — validates name is non-empty and at least 1 tag is toggled on, then calls `addBrowserPreset`. The form closes and the new preset appears in the grid.
6. **Cancel** — discards the form and returns to the card grid.

### Apply Behavior

**Purely additive.** Applying a preset merges its `tagIds` into `selectedTagIds` without removing any existing selections. Duplicate tag IDs are deduplicated. This allows stacking multiple presets (e.g., "Heroic Knight" + "Castle Setting" + "Golden Glow").

---

## Store & State Management

All new state lives in the existing `promptWizardStore` (not a separate store).

### New State Fields

```typescript
userBrowserPresets: BrowserPreset[];    // ONLY user-created presets (isDefault: false). Persisted.
activeView: 'steps' | 'presets';        // which view is showing (ephemeral, resets to 'steps')
activePresetCategory: PresetCategory;   // which category tab is selected (default: 'characters')
presetSearchQuery: string;              // search within preset browser (ephemeral)
```

### New Actions

```typescript
setActiveView: (view: 'steps' | 'presets') => void;
setActivePresetCategory: (category: PresetCategory) => void;
setPresetSearchQuery: (query: string) => void;
resetPresetBrowserEphemeral: () => void;                     // resets activeView → 'steps', presetSearchQuery → ''
applyBrowserPreset: (tagIds: string[]) => void;              // additive merge of tagIds into selectedTagIds
addBrowserPreset: (preset: Omit<BrowserPreset, 'id' | 'isDefault'>) => void;  // id auto-generated, isDefault always false
updateBrowserPreset: (presetId: string, updates: Partial<Pick<BrowserPreset, 'name' | 'description' | 'category' | 'tagIds' | 'thumbnail'>>) => void;  // only user-created presets; no-ops on defaults
removeBrowserPreset: (presetId: string) => void;             // only user-created presets; no-ops on defaults
```

### Merged Preset List

The store holds only `userBrowserPresets`. Default presets are loaded from JSON into component state (like the existing `defaultTags` / `defaultPresets` pattern in `PromptWizard.tsx`). The `PromptWizardBrowser` component receives both as props and merges them: `[...defaultBrowserPresets, ...userBrowserPresets]`. The `applyBrowserPreset` action takes `tagIds` directly (not a preset ID), so it does not need to look up presets — the component resolves the preset's tagIds before calling the action. This matches the existing `applyPreset(tagIds)` pattern in the store.

### Data Loading

Default browser presets ship in `promptBrowserPresets.json`, lazy-loaded alongside `promptTags.json` and `promptQuickPresets.json` when the wizard modal opens.

### Persistence

- `userBrowserPresets` is persisted to localStorage via the existing zustand `partialize` — the field contains only user-created presets, so no filtering needed.
- `activePresetCategory` is persisted (so user returns to their last-used category). Defaults to `'characters'`.
- `activeView` and `presetSearchQuery` are ephemeral — **not** added to `partialize`. Reset via `resetPresetBrowserEphemeral()` which is called from the `PromptWizard.tsx` `onClose` handler alongside the existing `close()`.
- Default presets are always loaded fresh from JSON — never persisted.

**`partialize` additions:** Add `userBrowserPresets` and `activePresetCategory` to the existing partialize allowlist. Do NOT add `activeView` or `presetSearchQuery`.

### Header Behavior in Presets View

When `activeView === 'presets'`, the existing tag search input in the header is hidden. The preset browser has its own search bar for filtering presets by name. The Steps/Presets segmented control is added to the header's left section, next to the profile selector.

### Footer & Stacked Preview in Presets View

When `activeView === 'presets'`:
- The Previous/Next step footer buttons are hidden.
- The stacked/bottom preview strip remains visible (it shows selected tags and assembled prompt, which is useful when applying presets).
- The footer area shows a simplified bar with just the preset count and a "Switch to Steps" shortcut.

---

## Default Preset Roster

~65 curated presets across 5 categories. Each maps to 3–6 tags from the existing tag library.

### Characters (~15)

| Preset | Example Tags |
|--------|-------------|
| Beautiful Asian Girl | 1girl, asian, beautiful, long hair, delicate features |
| Slim Elf Girl | 1girl, elf, slim, pointed ears, ethereal |
| Anthro Wolf Girl | 1girl, wolf ears, wolf tail, anthro, furry |
| Fierce Dragon | dragon, fierce, scales, wings, fire |
| Heroic Knight | knight, armor, sword, heroic, shield |
| Mysterious Mage | mage, robes, magic, mysterious, staff |
| Dark Sorceress | sorceress, dark magic, black robes, glowing eyes |
| Cute Catgirl | 1girl, cat ears, cat tail, cute, playful |
| Royal Princess | 1girl, princess, royal gown, tiara, elegant |
| Cyberpunk Hacker | hacker, cyberpunk, neon, goggles, tech |
| Samurai Warrior | samurai, katana, armor, japanese, warrior |
| Angel | angel, wings, halo, divine, white robes |
| Demon Girl | 1girl, demon, horns, dark wings, red eyes |
| School Girl | 1girl, school uniform, sailor uniform, young |
| Vampire | vampire, fangs, pale skin, red eyes, gothic |

### Scenes (~15)

| Preset | Example Tags |
|--------|-------------|
| Castle Setting | castle, medieval, stone walls, towers, banners |
| Night Club Scene | nightclub, neon lights, dance floor, dark, crowd |
| Rooftop Bar | rooftop, bar, city skyline, evening, cocktails |
| Beach Sunset | beach, sunset, ocean, sand, golden hour |
| Water Bungalow at Night | overwater bungalow, night, stars, tropical, ocean |
| Bedroom Scene | bedroom, bed, pillows, warm lighting, cozy |
| Apartment | apartment, modern interior, window, urban |
| Library Setting | library, bookshelves, reading, quiet, wood |
| Cherry Blossom Garden | cherry blossoms, garden, petals, spring, japanese |
| Dark Forest | dark forest, fog, twisted trees, eerie, moonlight |
| Space Station | space station, sci-fi, stars, control panel, zero gravity |
| Medieval Tavern | tavern, medieval, wood, candles, ale, fireplace |
| Hot Spring | hot spring, steam, rocks, outdoor, onsen |
| Underwater Temple | underwater, temple, ruins, ocean, bioluminescent |
| City Skyline at Night | city, skyline, night, lights, skyscrapers, urban |

### Styles (~12)

| Preset | Example Tags |
|--------|-------------|
| Anime | anime style, anime art |
| Realistic | realistic, photorealistic, hyperrealistic |
| Semi-Realistic | semi-realistic, detailed, blend of anime and realism |
| Low Light | low light, dim, shadows, moody, dark |
| Bright Light | bright, well-lit, vivid, clean lighting |
| Golden Glow | golden hour, warm glow, golden light, soft |
| Studio Ghibli | studio ghibli style, ghibli, miyazaki, hand-drawn, whimsical |
| Chainsaw Man | chainsaw man style, tatsuki fujimoto, gritty, horror manga |
| Dark Souls Aesthetic | dark souls, dark fantasy, grim, gothic, foreboding |
| Pastel Soft | pastel colors, soft, dreamy, gentle, light |
| High Contrast Noir | noir style, black and white, high contrast, shadows |
| Vibrant Pop Art | pop art, vibrant, bold colors, warhol, graphic |

### Perspectives (~10)

| Preset | Example Tags |
|--------|-------------|
| Close-Up Portrait | close-up, portrait, face focus, head shot |
| Full Body Shot | full body, standing, wide frame |
| Dutch Angle | dutch angle, tilted camera, dynamic |
| Bird's Eye View | bird's eye view, from above, overhead |
| Worm's Eye View | worm's eye view, from below, looking up |
| Over the Shoulder | over the shoulder, behind, depth |
| Wide Establishing Shot | wide shot, establishing shot, landscape, panoramic |
| Dynamic Action Angle | dynamic angle, action shot, motion blur |
| Side Profile | side view, profile, silhouette |
| Three-Quarter View | three-quarter view, angled, natural pose |

### Explicit (~12)

| Preset | Example Tags |
|--------|-------------|
| Lingerie | lingerie, lace, bra, panties, stockings |
| Nude Pose | nude, naked, bare skin, exposed |
| Suggestive Position | suggestive, seductive, alluring, teasing |
| Dominant Pose | dominant, commanding, assertive, power pose |
| Submissive Pose | submissive, kneeling, yielding, shy |
| Bondage | bondage, rope, tied, restrained, shibari |
| Riding | riding, cowgirl, straddling, on top |
| Missionary | missionary, lying down, intimate |
| Doggy Style | doggy style, from behind, bent over |
| Oral | oral, fellatio, licking, mouth |
| Provocative Outfit | provocative, revealing, tight, short skirt, cleavage |
| Stripping | stripping, undressing, removing clothes, tease |

*Note: Exact tag IDs will be mapped to the existing `promptTags.json` library during implementation. Tags not yet in the library will be added with appropriate `step`, `subcategory`, and `majorGroup` assignments.*

### Explicit Content Handling

Explicit category presets are always visible in the browser (no content gating toggle). The existing wizard already tracks `explicitCount` and shows an 18+ badge in the preview panel — this mechanism applies automatically when explicit preset tags are selected. No additional gating is needed for v1.

---

## File Structure

### New Files

| File | Purpose |
|------|---------|
| `src/data/promptBrowserPresets.json` | ~65 curated default presets with tag ID mappings |
| `src/components/PromptWizardBrowser.tsx` | Main preset browser (category tabs + grid + search) |
| `src/components/PromptWizardPresetCard.tsx` | Individual preset card component |
| `src/components/PromptWizardPresetCreator.tsx` | Inline preset creation form |

### Modified Files

| File | Change |
|------|--------|
| `src/features/promptWizard/types.ts` | Add `PresetCategory` and `BrowserPreset` types directly (same file as other wizard types) |
| `src/stores/promptWizardStore.ts` | Add browser preset state fields and actions |
| `src/components/PromptWizard.tsx` | Add view toggle, conditionally render browser vs steps, load browser presets JSON, call `resetPresetBrowserEphemeral()` on modal close |
| `src/components/PromptWizardHeader.tsx` | Add Steps/Presets segmented control |
| `src/data/promptTags.json` | Add any missing tags needed by browser presets |

### Untouched Files

| File | Reason |
|------|--------|
| `src/data/promptQuickPresets.json` | Existing step-level presets stay as-is |
| `src/components/PromptWizardStepContent.tsx` | No changes needed |
| `src/components/PromptWizardSteps.tsx` | No changes needed |
| `src/components/PromptWizardPreview.tsx` | No changes needed |
| `src/components/PromptWizardSidebar.tsx` | Sidebar library stays separate |
| `src/data/roleplayPromptPresets.ts` | Roleplay presets unrelated |
