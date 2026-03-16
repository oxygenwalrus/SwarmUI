# System Prompt Presets — Design Spec
**Date:** 2026-03-17
**Status:** Approved

---

## Overview

Expand the System Prompt field in the Character Editor modal with a grouped preset dropdown. Selecting a preset replaces the textarea content with a template prompt. The textarea remains fully editable after selection. Preset text is immutable — edits to one character's system prompt never affect another character or the original template.

---

## Goals

- Let users quickly bootstrap a character's system prompt from a curated set of templates
- Support adult/NSFW presets for mature roleplay scenarios
- Keep the UI minimal — one Select, no extra dialogs
- Make presets trivially extensible: all content lives in a data file, not the component

---

## Architecture

### New file: `src/data/roleplayPromptPresets.ts`

Exports two types and a single `ROLEPLAY_PROMPT_PRESETS` array:

```ts
export interface PromptPreset {
  value: string;   // unique key, e.g. "romance-explicit"
  label: string;   // shown in dropdown, e.g. "Explicit Erotic"
  prompt: string;  // full system prompt text (copied into textarea on select)
}

export interface PromptPresetGroup {
  group: string;        // Mantine Select group header label
  items: PromptPreset[];
}

export const ROLEPLAY_PROMPT_PRESETS: PromptPresetGroup[]
```

All presets include the `[SCENE: ...]` instruction so image generation works regardless of which preset is active.

The existing `DEFAULT_SYSTEM_PROMPT` constant moves here as the `"default-roleplay"` preset and is removed from `CharacterEditor.tsx`.

### Preset groups and items

| Group | Preset keys / labels |
|---|---|
| **General** | `default-roleplay` — Default Roleplay, `narrator` — Narrator / Storyteller |
| **Romance & Intimacy** | `romance-soft`, `romance-explicit`, `romance-tease` — Seductive Tease, `romance-passionate` — Passionate Lover, `romance-fwb` — Friends With Benefits, `romance-forbidden` — Forbidden Romance, `romance-harem` — Harem / Multiple Partners, `romance-possessive` — Possessive / Obsessive, `romance-dom` — Dominant Partner, `romance-sub` — Submissive Partner |
| **Dark & Mature** | `dark-fantasy`, `horror`, `morally-complex` |
| **Dominant / Submissive** | `ds-commanding-dom` — Commanding Dom, `ds-devoted-sub` — Devoted Sub, `ds-brat-tamer` — Brat Tamer |
| **Scenario-Specific** | `scenario-dm` — Dungeon Master, `scenario-slice-of-life`, `scenario-noir` — Thriller / Noir, `scenario-scifi` — Sci-Fi Crew |
| **Character Archetypes** | `archetype-villain`, `archetype-mentor`, `archetype-love-interest`, `archetype-rival` |

Total: ~22 presets across 6 groups.

---

## UI Changes — `CharacterEditor.tsx`

### System Prompt section (right column, currently lines 567–578)

Replace the plain `Textarea` label with a `Group justify="space-between"` header containing the label text and a `Select`:

```
┌─ Group justify="space-between" ──────────────────────────┐
│  Text "System Prompt"          Select "Load preset..."   │
└───────────────────────────────────────────────────────────┘
┌─ Textarea (monospace, 7–14 rows, autosize) ───────────────┐
│                                                           │
└───────────────────────────────────────────────────────────┘
  description: "Full instructions sent to the AI..."
```

**Select behaviour:**
- `data` prop receives `ROLEPLAY_PROMPT_PRESETS` mapped to Mantine's `{ group, items }` shape
- `value` is always controlled as `null` (resets after each selection)
- `onChange` calls `setSystemPrompt(preset.prompt)` then resets select to null
- `placeholder="Load preset..."`, `size="xs"`, `w={180}`, `clearable={false}`, `searchable`
- The Textarea `label` prop is removed (label rendered manually in the Group above)

**No other UI changes.** The description text, monospace styling, minRows/maxRows, and autosize all stay as-is.

---

## Data isolation guarantee

`systemPrompt` is local `useState` in `CharacterEditorForm`. The preset data file exports plain strings. There is no shared mutable state — selecting a preset copies the string value into that character's local state. Editing the textarea afterward only affects that character's in-progress form.

---

## Out of scope

- Saving custom presets (user-defined templates) — future work
- Per-preset scene suggestion prompts — future work
- Import/export of preset libraries — future work
