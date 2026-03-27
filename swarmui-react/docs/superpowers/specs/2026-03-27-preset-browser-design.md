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
  thumbnail?: string;        // optional emoji or icon name for the card
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

Triggered by "Create Preset" button at the bottom of the browser. Renders an inline form (not a new modal):

1. **Name** — text input (required)
2. **Description** — text input (optional)
3. **Category** — dropdown select (Characters, Scenes, Styles, Perspectives, Explicit)
4. **Tag selection** — temporarily switches to the step view for tag picking, or allows selecting from currently selected tags
5. **Save** — validates name is non-empty and at least 1 tag is selected, then saves to store

### Apply Behavior

**Purely additive.** Applying a preset merges its `tagIds` into `selectedTagIds` without removing any existing selections. Duplicate tag IDs are deduplicated. This allows stacking multiple presets (e.g., "Heroic Knight" + "Castle Setting" + "Golden Glow").

---

## Store & State Management

All new state lives in the existing `promptWizardStore` (not a separate store).

### New State Fields

```typescript
browserPresets: BrowserPreset[];        // user-created presets (defaults loaded from JSON)
activeView: 'steps' | 'presets';        // which view is showing
activePresetCategory: PresetCategory;   // which category tab is selected
presetSearchQuery: string;              // search within preset browser
```

### New Actions

```typescript
setActiveView: (view: 'steps' | 'presets') => void;
setActivePresetCategory: (category: PresetCategory) => void;
setPresetSearchQuery: (query: string) => void;
applyBrowserPreset: (presetId: string, allPresets: BrowserPreset[]) => void;
addBrowserPreset: (preset: Omit<BrowserPreset, 'id' | 'isDefault'>) => void;
updateBrowserPreset: (presetId: string, updates: Partial<BrowserPreset>) => void;
removeBrowserPreset: (presetId: string) => void;  // only allows removing user-created presets
```

### Data Loading

Default browser presets ship in `promptBrowserPresets.json`, lazy-loaded alongside `promptTags.json` and `promptQuickPresets.json` when the wizard modal opens.

### Persistence

- `browserPresets` (user-created only, where `isDefault === false`) persisted to localStorage via existing zustand persist middleware.
- `activePresetCategory` persisted (so user returns to their last-used category).
- `activeView` and `presetSearchQuery` are ephemeral (reset on modal close).
- Default presets are always loaded fresh from JSON — not persisted.

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

*Note: Exact tag IDs will be mapped to the existing `promptTags.json` library during implementation. Tags not yet in the library will be added.*

---

## File Structure

### New Files

| File | Purpose |
|------|---------|
| `src/features/promptWizard/browserPresetTypes.ts` | `PresetCategory` and `BrowserPreset` type definitions |
| `src/data/promptBrowserPresets.json` | ~65 curated default presets with tag ID mappings |
| `src/components/PromptWizardBrowser.tsx` | Main preset browser (category tabs + grid + search) |
| `src/components/PromptWizardPresetCard.tsx` | Individual preset card component |
| `src/components/PromptWizardPresetCreator.tsx` | Inline preset creation form |

### Modified Files

| File | Change |
|------|--------|
| `src/features/promptWizard/types.ts` | Re-export `PresetCategory`, `BrowserPreset` from browserPresetTypes |
| `src/stores/promptWizardStore.ts` | Add browser preset state fields and actions |
| `src/components/PromptWizard.tsx` | Add view toggle, conditionally render browser vs steps, load browser presets JSON |
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
