# Prompt Wizard Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the flat preset-block prompt library with a guided, tag-based wizard that assembles prompts in model-appropriate order.

**Architecture:** A step-by-step wizard modal where individual tags are the primary unit. Tags are grouped into 7 workflow steps (Subject, Appearance, Action, Setting, Style, Atmosphere, Quality). A prompt profile system controls tag ordering per model convention (Illustrious/danbooru first). Existing presets are preserved as quick-fill shortcuts that pre-select groups of tags.

**Tech Stack:** React 18, TypeScript, Mantine 8.3, Zustand, Vitest

**Spec:** `docs/superpowers/specs/2026-03-20-prompt-wizard-design.md`

---

## Chunk 1: Types, Profiles, Steps, and Assembly Logic

This chunk builds the core data layer with no UI — types, profile definitions, step metadata, and the prompt assembly function. Everything is test-driven.

### Task 1: Type Definitions

**Files:**
- Create: `swarmui-react/src/features/promptWizard/types.ts`

- [ ] **Step 1: Create type definitions file**

```typescript
// swarmui-react/src/features/promptWizard/types.ts

export type BuilderStep =
  | 'subject'
  | 'appearance'
  | 'action'
  | 'setting'
  | 'style'
  | 'atmosphere'
  | 'quality';

export interface StepMeta {
  step: BuilderStep;
  label: string;
  description: string;
  subcategories: string[];
}

export interface PromptProfile {
  id: string;
  name: string;
  stepOrder: BuilderStep[];
  tagSeparator: string;
  description?: string;
}

export interface PromptTag {
  id: string;
  text: string;
  step: BuilderStep;
  subcategory?: string;
  profiles: string[];
  aliases?: string[];
  negativeText?: string;
  isCustom?: boolean;
}

export interface PromptPreset {
  id: string;
  name: string;
  step: BuilderStep;
  tagIds: string[];
  description?: string;
  isDefault: boolean;
}
```

- [ ] **Step 2: Commit**

```bash
git add swarmui-react/src/features/promptWizard/types.ts
git commit -m "feat(promptWizard): add core type definitions"
```

---

### Task 2: Prompt Profiles

**Files:**
- Create: `swarmui-react/src/features/promptWizard/profiles.ts`
- Test: `swarmui-react/src/features/promptWizard/profiles.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// swarmui-react/src/features/promptWizard/profiles.test.ts
import { describe, expect, it } from 'vitest';
import { PROFILES, getProfile, DEFAULT_PROFILE_ID } from './profiles';
import type { BuilderStep } from './types';

const ALL_STEPS: BuilderStep[] = [
  'subject', 'appearance', 'action', 'setting', 'style', 'atmosphere', 'quality',
];

describe('profiles', () => {
  it('exports at least one profile', () => {
    expect(PROFILES.length).toBeGreaterThan(0);
  });

  it('default profile covers all 7 steps exactly once', () => {
    const profile = getProfile(DEFAULT_PROFILE_ID);
    expect(profile).toBeDefined();
    expect([...profile!.stepOrder].sort()).toEqual([...ALL_STEPS].sort());
    expect(new Set(profile!.stepOrder).size).toBe(ALL_STEPS.length);
  });

  it('illustrious profile puts quality first', () => {
    const profile = getProfile('illustrious');
    expect(profile).toBeDefined();
    expect(profile!.stepOrder[0]).toBe('quality');
  });

  it('getProfile returns undefined for unknown id', () => {
    expect(getProfile('nonexistent')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd swarmui-react && npx vitest run src/features/promptWizard/profiles.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement profiles**

```typescript
// swarmui-react/src/features/promptWizard/profiles.ts
import type { PromptProfile } from './types';

export const DEFAULT_PROFILE_ID = 'illustrious';

export const PROFILES: PromptProfile[] = [
  {
    id: 'illustrious',
    name: 'Illustrious / Danbooru',
    stepOrder: ['quality', 'subject', 'appearance', 'action', 'setting', 'style', 'atmosphere'],
    tagSeparator: ', ',
    description: 'Danbooru-style tag ordering. Quality tags first, then subject and details.',
  },
];

export function getProfile(id: string): PromptProfile | undefined {
  return PROFILES.find((p) => p.id === id);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd swarmui-react && npx vitest run src/features/promptWizard/profiles.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add swarmui-react/src/features/promptWizard/profiles.ts swarmui-react/src/features/promptWizard/profiles.test.ts
git commit -m "feat(promptWizard): add prompt profile definitions with Illustrious default"
```

---

### Task 3: Step Metadata

**Files:**
- Create: `swarmui-react/src/features/promptWizard/steps.ts`
- Test: `swarmui-react/src/features/promptWizard/steps.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// swarmui-react/src/features/promptWizard/steps.test.ts
import { describe, expect, it } from 'vitest';
import { STEP_META, getStepMeta } from './steps';
import type { BuilderStep } from './types';

const ALL_STEPS: BuilderStep[] = [
  'subject', 'appearance', 'action', 'setting', 'style', 'atmosphere', 'quality',
];

describe('steps', () => {
  it('defines metadata for every BuilderStep', () => {
    for (const step of ALL_STEPS) {
      const meta = getStepMeta(step);
      expect(meta, `missing StepMeta for "${step}"`).toBeDefined();
      expect(meta!.label.length).toBeGreaterThan(0);
      expect(meta!.description.length).toBeGreaterThan(0);
    }
  });

  it('appearance step has subcategories', () => {
    const meta = getStepMeta('appearance');
    expect(meta!.subcategories.length).toBeGreaterThan(0);
    expect(meta!.subcategories).toContain('Hair');
    expect(meta!.subcategories).toContain('Eyes');
  });

  it('STEP_META length matches number of BuilderSteps', () => {
    expect(STEP_META.length).toBe(ALL_STEPS.length);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd swarmui-react && npx vitest run src/features/promptWizard/steps.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement step metadata**

```typescript
// swarmui-react/src/features/promptWizard/steps.ts
import type { BuilderStep, StepMeta } from './types';

export const STEP_META: StepMeta[] = [
  {
    step: 'subject',
    label: 'Subject',
    description: 'What are you generating?',
    subcategories: ['Character', 'Creature', 'Object', 'Scene'],
  },
  {
    step: 'appearance',
    label: 'Appearance',
    description: 'How does the subject look?',
    subcategories: ['Hair', 'Eyes', 'Body', 'Clothing', 'Accessories'],
  },
  {
    step: 'action',
    label: 'Action & Pose',
    description: 'What is the subject doing?',
    subcategories: ['Pose', 'Expression', 'Gesture'],
  },
  {
    step: 'setting',
    label: 'Setting',
    description: 'Where is the scene?',
    subcategories: ['Indoor', 'Outdoor', 'Fantasy', 'Urban'],
  },
  {
    step: 'style',
    label: 'Style',
    description: 'What artistic style?',
    subcategories: ['Anime', 'Realistic', 'Painting', 'Digital'],
  },
  {
    step: 'atmosphere',
    label: 'Atmosphere',
    description: 'Mood, lighting, and color?',
    subcategories: ['Lighting', 'Mood', 'Color Palette'],
  },
  {
    step: 'quality',
    label: 'Quality',
    description: 'Technical quality and negative tags',
    subcategories: ['Positive Quality', 'Negative Quality'],
  },
];

export function getStepMeta(step: BuilderStep): StepMeta | undefined {
  return STEP_META.find((m) => m.step === step);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd swarmui-react && npx vitest run src/features/promptWizard/steps.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add swarmui-react/src/features/promptWizard/steps.ts swarmui-react/src/features/promptWizard/steps.test.ts
git commit -m "feat(promptWizard): add step metadata with subcategories"
```

---

### Task 4: Prompt Assembly Logic

**Files:**
- Create: `swarmui-react/src/features/promptWizard/assemble.ts`
- Test: `swarmui-react/src/features/promptWizard/assemble.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// swarmui-react/src/features/promptWizard/assemble.test.ts
import { describe, expect, it } from 'vitest';
import { assemblePrompt } from './assemble';
import type { PromptTag, PromptProfile } from './types';

const illustrious: PromptProfile = {
  id: 'illustrious',
  name: 'Illustrious',
  stepOrder: ['quality', 'subject', 'appearance', 'action', 'setting', 'style', 'atmosphere'],
  tagSeparator: ', ',
};

function makeTag(overrides: Partial<PromptTag> & Pick<PromptTag, 'id' | 'text' | 'step'>): PromptTag {
  return { profiles: ['illustrious'], ...overrides };
}

describe('assemblePrompt', () => {
  it('orders tags by profile stepOrder', () => {
    const tags: PromptTag[] = [
      makeTag({ id: 't1', text: 'anime style', step: 'style' }),
      makeTag({ id: 't2', text: 'masterpiece', step: 'quality' }),
      makeTag({ id: 't3', text: '1girl', step: 'subject' }),
    ];

    const result = assemblePrompt(tags, illustrious);
    expect(result.positive).toBe('masterpiece, 1girl, anime style');
  });

  it('orders within step by subcategory then selection order', () => {
    const tags: PromptTag[] = [
      makeTag({ id: 't1', text: 'blue eyes', step: 'appearance', subcategory: 'Eyes' }),
      makeTag({ id: 't2', text: 'long hair', step: 'appearance', subcategory: 'Hair' }),
      makeTag({ id: 't3', text: 'red dress', step: 'appearance', subcategory: 'Clothing' }),
    ];

    const result = assemblePrompt(tags, illustrious);
    // Hair comes before Eyes in STEP_META.appearance.subcategories
    expect(result.positive).toBe('long hair, blue eyes, red dress');
  });

  it('places uncategorised tags before subcategorised ones', () => {
    const tags: PromptTag[] = [
      makeTag({ id: 't1', text: 'blue eyes', step: 'appearance', subcategory: 'Eyes' }),
      makeTag({ id: 't2', text: 'beautiful', step: 'appearance' }),
    ];

    const result = assemblePrompt(tags, illustrious);
    expect(result.positive).toBe('beautiful, blue eyes');
  });

  it('collects negative text separately', () => {
    const tags: PromptTag[] = [
      makeTag({ id: 't1', text: 'masterpiece', step: 'quality', negativeText: 'worst quality' }),
      makeTag({ id: 't2', text: '1girl', step: 'subject' }),
    ];

    const result = assemblePrompt(tags, illustrious);
    expect(result.positive).toBe('masterpiece, 1girl');
    expect(result.negative).toBe('worst quality');
  });

  it('returns empty strings when no tags selected', () => {
    const result = assemblePrompt([], illustrious);
    expect(result.positive).toBe('');
    expect(result.negative).toBe('');
  });

  it('deduplicates negative text from multiple tags', () => {
    const tags: PromptTag[] = [
      makeTag({ id: 't1', text: 'anime style', step: 'style', negativeText: 'realistic' }),
      makeTag({ id: 't2', text: 'anime art', step: 'style', negativeText: 'realistic' }),
    ];

    const result = assemblePrompt(tags, illustrious);
    expect(result.negative).toBe('realistic');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd swarmui-react && npx vitest run src/features/promptWizard/assemble.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement assembly logic**

```typescript
// swarmui-react/src/features/promptWizard/assemble.ts
import type { PromptTag, PromptProfile } from './types';
import { getStepMeta } from './steps';

export interface AssembleResult {
  positive: string;
  negative: string;
}

export function assemblePrompt(
  selectedTags: PromptTag[],
  profile: PromptProfile,
): AssembleResult {
  if (selectedTags.length === 0) {
    return { positive: '', negative: '' };
  }

  const ordered: PromptTag[] = [];

  for (const step of profile.stepOrder) {
    const stepTags = selectedTags.filter((t) => t.step === step);
    const meta = getStepMeta(step);
    const subcatOrder = meta?.subcategories ?? [];

    // Uncategorised tags first (General group)
    const uncategorised = stepTags.filter((t) => !t.subcategory);
    ordered.push(...uncategorised);

    // Then by subcategory order
    for (const subcat of subcatOrder) {
      const subcatTags = stepTags.filter((t) => t.subcategory === subcat);
      ordered.push(...subcatTags);
    }

    // Any subcategory not in the meta list (shouldn't happen, but safe)
    const knownSubcats = new Set([undefined, ...subcatOrder]);
    const remaining = stepTags.filter((t) => t.subcategory && !knownSubcats.has(t.subcategory));
    ordered.push(...remaining);
  }

  const positive = ordered.map((t) => t.text).join(profile.tagSeparator);

  const negativeSet = new Set<string>();
  const negatives: string[] = [];
  for (const tag of ordered) {
    if (tag.negativeText) {
      const lower = tag.negativeText.toLowerCase();
      if (!negativeSet.has(lower)) {
        negativeSet.add(lower);
        negatives.push(tag.negativeText);
      }
    }
  }
  const negative = negatives.join(profile.tagSeparator);

  return { positive, negative };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd swarmui-react && npx vitest run src/features/promptWizard/assemble.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add swarmui-react/src/features/promptWizard/assemble.ts swarmui-react/src/features/promptWizard/assemble.test.ts
git commit -m "feat(promptWizard): add prompt assembly logic with profile-ordered tag joining"
```

---

### Task 5: Public Index

**Files:**
- Create: `swarmui-react/src/features/promptWizard/index.ts`

- [ ] **Step 1: Create barrel export**

```typescript
// swarmui-react/src/features/promptWizard/index.ts
export type {
  BuilderStep,
  StepMeta,
  PromptProfile,
  PromptTag,
  PromptPreset,
} from './types';
export { PROFILES, getProfile, DEFAULT_PROFILE_ID } from './profiles';
export { STEP_META, getStepMeta } from './steps';
export { assemblePrompt, type AssembleResult } from './assemble';
```

- [ ] **Step 2: Run all promptWizard tests**

Run: `cd swarmui-react && npx vitest run src/features/promptWizard/`
Expected: All tests PASS

- [ ] **Step 3: Commit**

```bash
git add swarmui-react/src/features/promptWizard/index.ts
git commit -m "feat(promptWizard): add barrel export index"
```

---

## Chunk 2: Tag Data Migration

This chunk converts the existing `promptPresets.json` into the new tag-based format (`promptTags.json` + `promptQuickPresets.json`) and adds the runtime migration logic for custom user presets in localStorage.

### Task 6: Curate Tag Data File

**Files:**
- Create: `swarmui-react/src/data/promptTags.json`
- Refer: `swarmui-react/src/data/promptPresets.json` (source data)

This is a manual curation task. Each token from every preset in `promptPresets.json` must be split out into an individual tag with the correct `step` and `subcategory` assignment.

- [ ] **Step 1: Create promptTags.json**

Read every entry in `swarmui-react/src/data/promptPresets.json`. For each preset, split `promptText` on commas. For each resulting token, create a `PromptTag` entry. Assign `step` and `subcategory` based on the original preset's `category` using this mapping:

| Old Category | New Step | Default Subcategory |
|---|---|---|
| `quality` | `quality` | `Positive Quality` |
| `style` | `style` | _(derive from tag, e.g. "Anime", "Realistic", "Painting", "Digital")_ |
| `character` | `subject` | `Character` |
| `demographics` | `appearance` | `Body` |
| `details` | `appearance` | _(assign to Hair/Eyes/Body/Clothing/Accessories as appropriate)_ |
| `object` | `subject` | `Object` |
| `pose` | `action` | `Pose` |
| `perspective` | `setting` | _(none — General group)_ |
| `location` | `setting` | _(assign to Indoor/Outdoor/Fantasy/Urban as appropriate)_ |
| `lighting` | `atmosphere` | `Lighting` |
| `mood` | `atmosphere` | `Mood` |
| `nsfw` | `subject` | _(none — General group)_ |
| `nsfw_anatomy` | `appearance` | `Body` |
| `nsfw_pose` | `action` | `Pose` |
| `nsfw_act` | `action` | `Gesture` |
| `nsfw_clothing` | `appearance` | `Clothing` |

For tags that had `negativePromptText` on the original preset, split those too and set `negativeText` on the corresponding positive tag(s). If a negative applies to the whole preset rather than a single tag, put it on the first tag from that preset.

Tag IDs: use format `tag-{step}-{slugified-text}`, e.g. `tag-style-anime-style`.

All tags get `profiles: ["illustrious"]` and `isCustom` is omitted (defaults to undefined/false).

Example entries in the output JSON:

```json
[
  {
    "id": "tag-style-anime-style",
    "text": "anime style",
    "step": "style",
    "subcategory": "Anime",
    "profiles": ["illustrious"],
    "aliases": ["anime"],
    "negativeText": "realistic, photo, 3d"
  },
  {
    "id": "tag-style-anime-art",
    "text": "anime art",
    "step": "style",
    "subcategory": "Anime",
    "profiles": ["illustrious"]
  },
  {
    "id": "tag-quality-masterpiece",
    "text": "masterpiece",
    "step": "quality",
    "subcategory": "Positive Quality",
    "profiles": ["illustrious"]
  }
]
```

**Important:** Every token from every preset in `promptPresets.json` must appear as a tag. Do not drop any. Deduplicate tokens that appear across multiple presets (keep one tag, reference it from both quick-fill presets).

- [ ] **Step 2: Verify no tokens were lost**

Write a quick check: load `promptPresets.json`, split all `promptText` values on commas, trim, lowercase, deduplicate. Do the same for `promptTags.json` `text` values. Confirm the sets are equal. Run this as a one-off vitest test.

- [ ] **Step 3: Commit**

```bash
git add swarmui-react/src/data/promptTags.json
git commit -m "feat(promptWizard): add curated tag library migrated from preset data"
```

---

### Task 7: Quick-Fill Presets Data File

**Files:**
- Create: `swarmui-react/src/data/promptQuickPresets.json`

- [ ] **Step 1: Create promptQuickPresets.json**

For each original preset in `promptPresets.json`, create a `PromptPreset` entry that references the tag IDs created in Task 6.

```json
[
  {
    "id": "preset-anime",
    "name": "Anime",
    "step": "style",
    "tagIds": ["tag-style-anime-style", "tag-style-anime-art"],
    "isDefault": true
  },
  {
    "id": "preset-realistic",
    "name": "Realistic",
    "step": "style",
    "tagIds": ["tag-style-realistic", "tag-style-photorealistic", "tag-style-hyperrealistic"],
    "isDefault": true
  }
]
```

Use the same category→step mapping from Task 6. Preset IDs: `preset-{slugified-original-name}`.

- [ ] **Step 2: Verify all original presets are represented**

Count entries in `promptQuickPresets.json` vs `promptPresets.json`. They should match. Verify all `tagIds` reference valid IDs in `promptTags.json`.

- [ ] **Step 3: Commit**

```bash
git add swarmui-react/src/data/promptQuickPresets.json
git commit -m "feat(promptWizard): add quick-fill preset definitions"
```

---

### Task 8: Runtime Migration for Custom User Presets

**Files:**
- Create: `swarmui-react/src/features/promptWizard/migrate.ts`
- Test: `swarmui-react/src/features/promptWizard/migrate.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// swarmui-react/src/features/promptWizard/migrate.test.ts
import { describe, expect, it } from 'vitest';
import { migrateCustomPreset } from './migrate';

describe('migrateCustomPreset', () => {
  it('splits a custom preset into individual tags and a preset reference', () => {
    const result = migrateCustomPreset({
      id: 'custom-123',
      name: 'Noir Portrait',
      category: 'style',
      promptText: 'noir portrait, dramatic contrast',
      negativePromptText: 'flat lighting',
      isDefault: false,
    });

    expect(result.tags).toHaveLength(2);
    expect(result.tags[0].text).toBe('noir portrait');
    expect(result.tags[0].step).toBe('style');
    expect(result.tags[0].isCustom).toBe(true);
    expect(result.tags[1].text).toBe('dramatic contrast');

    expect(result.preset.name).toBe('Noir Portrait');
    expect(result.preset.tagIds).toEqual(result.tags.map((t) => t.id));
    expect(result.preset.isDefault).toBe(false);
  });

  it('assigns negativeText to the first tag', () => {
    const result = migrateCustomPreset({
      id: 'custom-456',
      name: 'Test',
      category: 'lighting',
      promptText: 'warm light, golden hour',
      negativePromptText: 'cold, blue',
      isDefault: false,
    });

    expect(result.tags[0].negativeText).toBe('cold, blue');
    expect(result.tags[1].negativeText).toBeUndefined();
  });

  it('maps old categories to correct steps', () => {
    const result = migrateCustomPreset({
      id: 'custom-789',
      name: 'Test',
      category: 'pose',
      promptText: 'standing',
      isDefault: false,
    });

    expect(result.tags[0].step).toBe('action');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd swarmui-react && npx vitest run src/features/promptWizard/migrate.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement migration logic**

```typescript
// swarmui-react/src/features/promptWizard/migrate.ts
import type { BuilderStep, PromptTag, PromptPreset } from './types';

/** Shape of the old preset format from promptPresets store v2 */
export interface LegacyPreset {
  id: string;
  name: string;
  category: string;
  promptText: string;
  negativePromptText?: string;
  isDefault?: boolean;
}

const CATEGORY_TO_STEP: Record<string, BuilderStep> = {
  quality: 'quality',
  style: 'style',
  character: 'subject',
  demographics: 'appearance',
  details: 'appearance',
  object: 'subject',
  pose: 'action',
  perspective: 'setting',
  location: 'setting',
  lighting: 'atmosphere',
  mood: 'atmosphere',
  nsfw: 'subject',
  nsfw_anatomy: 'appearance',
  nsfw_pose: 'action',
  nsfw_act: 'action',
  nsfw_clothing: 'appearance',
};

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export function migrateCustomPreset(legacy: LegacyPreset): {
  tags: PromptTag[];
  preset: PromptPreset;
} {
  const step = CATEGORY_TO_STEP[legacy.category] ?? 'style';
  const tokens = legacy.promptText
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);

  const tags: PromptTag[] = tokens.map((text, index) => ({
    id: `custom-tag-${slugify(legacy.name)}-${slugify(text)}-${index}`,
    text,
    step,
    profiles: ['illustrious'],
    isCustom: true,
    negativeText: index === 0 ? legacy.negativePromptText : undefined,
  }));

  const preset: PromptPreset = {
    id: `custom-preset-${slugify(legacy.name)}`,
    name: legacy.name,
    step,
    tagIds: tags.map((t) => t.id),
    isDefault: false,
  };

  return { tags, preset };
}

export const MIGRATION_VERSION = 1;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd swarmui-react && npx vitest run src/features/promptWizard/migrate.test.ts`
Expected: PASS

- [ ] **Step 5: Update barrel export**

Add to `swarmui-react/src/features/promptWizard/index.ts`:

```typescript
export { migrateCustomPreset, MIGRATION_VERSION, type LegacyPreset } from './migrate';
```

- [ ] **Step 6: Commit**

```bash
git add swarmui-react/src/features/promptWizard/migrate.ts swarmui-react/src/features/promptWizard/migrate.test.ts swarmui-react/src/features/promptWizard/index.ts
git commit -m "feat(promptWizard): add runtime migration for custom user presets"
```

---

## Chunk 3: Zustand Store

### Task 9: Prompt Wizard Store

**Files:**
- Create: `swarmui-react/src/stores/promptWizardStore.ts`
- Test: `swarmui-react/src/stores/promptWizardStore.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
// swarmui-react/src/stores/promptWizardStore.test.ts
import { afterEach, describe, expect, it } from 'vitest';
import { usePromptWizardStore } from './promptWizardStore';

const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => { storage.set(key, value); },
    removeItem: (key: string) => { storage.delete(key); },
    clear: () => { storage.clear(); },
  },
  configurable: true,
});

const initialState = usePromptWizardStore.getState();

afterEach(() => {
  usePromptWizardStore.setState({ ...initialState, selectedTagIds: [], customTags: [], customPresets: [] });
  storage.clear();
});

describe('promptWizardStore', () => {
  it('starts with no selected tags', () => {
    expect(usePromptWizardStore.getState().selectedTagIds).toEqual([]);
  });

  it('toggles a tag on and off', () => {
    const store = usePromptWizardStore.getState();
    store.toggleTag('tag-style-anime-style');
    expect(usePromptWizardStore.getState().selectedTagIds).toContain('tag-style-anime-style');

    store.toggleTag('tag-style-anime-style');
    expect(usePromptWizardStore.getState().selectedTagIds).not.toContain('tag-style-anime-style');
  });

  it('applies a quick-fill preset by selecting all its tag IDs', () => {
    const store = usePromptWizardStore.getState();
    store.applyPreset(['tag-1', 'tag-2', 'tag-3']);
    expect(usePromptWizardStore.getState().selectedTagIds).toEqual(['tag-1', 'tag-2', 'tag-3']);
  });

  it('does not duplicate tag IDs when applying preset over existing selection', () => {
    const store = usePromptWizardStore.getState();
    store.toggleTag('tag-1');
    store.applyPreset(['tag-1', 'tag-2']);
    const ids = usePromptWizardStore.getState().selectedTagIds;
    expect(ids.filter((id) => id === 'tag-1')).toHaveLength(1);
  });

  it('clears all selections', () => {
    const store = usePromptWizardStore.getState();
    store.toggleTag('tag-1');
    store.toggleTag('tag-2');
    store.clearSelections();
    expect(usePromptWizardStore.getState().selectedTagIds).toEqual([]);
  });

  it('switches active profile', () => {
    const store = usePromptWizardStore.getState();
    expect(store.activeProfileId).toBe('illustrious');
    store.setActiveProfile('flux');
    expect(usePromptWizardStore.getState().activeProfileId).toBe('flux');
  });

  it('adds a custom tag', () => {
    const store = usePromptWizardStore.getState();
    store.addCustomTag({ text: 'my custom tag', step: 'style' });
    const customs = usePromptWizardStore.getState().customTags;
    expect(customs).toHaveLength(1);
    expect(customs[0].text).toBe('my custom tag');
    expect(customs[0].isCustom).toBe(true);
  });

  it('removes a custom tag and deselects it', () => {
    const store = usePromptWizardStore.getState();
    store.addCustomTag({ text: 'temp tag', step: 'quality' });
    const tagId = usePromptWizardStore.getState().customTags[0].id;
    store.toggleTag(tagId);
    expect(usePromptWizardStore.getState().selectedTagIds).toContain(tagId);

    store.removeCustomTag(tagId);
    expect(usePromptWizardStore.getState().customTags).toHaveLength(0);
    expect(usePromptWizardStore.getState().selectedTagIds).not.toContain(tagId);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd swarmui-react && npx vitest run src/stores/promptWizardStore.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement the store**

```typescript
// swarmui-react/src/stores/promptWizardStore.ts
import { create } from 'zustand';
import { persist, devtools } from 'zustand/middleware';
import type { BuilderStep, PromptTag, PromptPreset } from '../features/promptWizard/types';
import { DEFAULT_PROFILE_ID } from '../features/promptWizard/profiles';

interface PromptWizardStore {
  // State
  selectedTagIds: string[];
  activeProfileId: string;
  activeStep: BuilderStep;
  customTags: PromptTag[];
  customPresets: PromptPreset[];
  migrationVersion: number;

  // Tag selection
  toggleTag: (tagId: string) => void;
  selectTag: (tagId: string) => void;
  deselectTag: (tagId: string) => void;
  clearSelections: () => void;

  // Quick-fill presets
  applyPreset: (tagIds: string[]) => void;

  // Navigation
  setActiveStep: (step: BuilderStep) => void;
  setActiveProfile: (profileId: string) => void;

  // Custom tags
  addCustomTag: (tag: { text: string; step: BuilderStep; subcategory?: string }) => void;
  removeCustomTag: (tagId: string) => void;

  // Custom presets
  addCustomPreset: (preset: Omit<PromptPreset, 'id' | 'isDefault'>) => void;
  removeCustomPreset: (presetId: string) => void;

  // Migration
  setMigrationVersion: (version: number) => void;
}

export const usePromptWizardStore = create<PromptWizardStore>()(
  devtools(
    persist(
      (set) => ({
        selectedTagIds: [],
        activeProfileId: DEFAULT_PROFILE_ID,
        activeStep: 'subject',
        customTags: [],
        customPresets: [],
        migrationVersion: 0,

        toggleTag: (tagId) => {
          set((state) => ({
            selectedTagIds: state.selectedTagIds.includes(tagId)
              ? state.selectedTagIds.filter((id) => id !== tagId)
              : [...state.selectedTagIds, tagId],
          }));
        },

        selectTag: (tagId) => {
          set((state) => ({
            selectedTagIds: state.selectedTagIds.includes(tagId)
              ? state.selectedTagIds
              : [...state.selectedTagIds, tagId],
          }));
        },

        deselectTag: (tagId) => {
          set((state) => ({
            selectedTagIds: state.selectedTagIds.filter((id) => id !== tagId),
          }));
        },

        clearSelections: () => {
          set({ selectedTagIds: [] });
        },

        applyPreset: (tagIds) => {
          set((state) => {
            const existing = new Set(state.selectedTagIds);
            const newIds = tagIds.filter((id) => !existing.has(id));
            return { selectedTagIds: [...state.selectedTagIds, ...newIds] };
          });
        },

        setActiveStep: (step) => {
          set({ activeStep: step });
        },

        setActiveProfile: (profileId) => {
          set({ activeProfileId: profileId });
        },

        addCustomTag: ({ text, step, subcategory }) => {
          const id = `custom-tag-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          const tag: PromptTag = {
            id,
            text,
            step,
            subcategory,
            profiles: ['illustrious'],
            isCustom: true,
          };
          set((state) => ({ customTags: [...state.customTags, tag] }));
        },

        removeCustomTag: (tagId) => {
          set((state) => ({
            customTags: state.customTags.filter((t) => t.id !== tagId),
            selectedTagIds: state.selectedTagIds.filter((id) => id !== tagId),
          }));
        },

        addCustomPreset: (preset) => {
          const id = `custom-preset-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          set((state) => ({
            customPresets: [...state.customPresets, { ...preset, id, isDefault: false }],
          }));
        },

        removeCustomPreset: (presetId) => {
          set((state) => ({
            customPresets: state.customPresets.filter((p) => p.id !== presetId),
          }));
        },

        setMigrationVersion: (version) => {
          set({ migrationVersion: version });
        },
      }),
      {
        name: 'swarmui-prompt-wizard-v1',
        partialize: (state) => ({
          selectedTagIds: state.selectedTagIds,
          activeProfileId: state.activeProfileId,
          customTags: state.customTags,
          customPresets: state.customPresets,
          migrationVersion: state.migrationVersion,
        }),
      }
    ),
    { name: 'PromptWizardStore' }
  )
);
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd swarmui-react && npx vitest run src/stores/promptWizardStore.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add swarmui-react/src/stores/promptWizardStore.ts swarmui-react/src/stores/promptWizardStore.test.ts
git commit -m "feat(promptWizard): add Zustand store with tag selection, profiles, and custom tags"
```

---

## Chunk 4: UI Components

### Task 10: Tag Chip Component

**Files:**
- Create: `swarmui-react/src/components/PromptWizardTagChip.tsx`

- [ ] **Step 1: Create the tag chip component**

```typescript
// swarmui-react/src/components/PromptWizardTagChip.tsx
import { memo } from 'react';
import { SwarmBadge } from './ui';

interface PromptWizardTagChipProps {
  text: string;
  selected: boolean;
  onToggle: () => void;
}

export const PromptWizardTagChip = memo(function PromptWizardTagChip({
  text,
  selected,
  onToggle,
}: PromptWizardTagChipProps) {
  return (
    <SwarmBadge
      tone={selected ? 'primary' : 'secondary'}
      emphasis={selected ? 'solid' : 'soft'}
      style={{ cursor: 'pointer', userSelect: 'none' }}
      onClick={onToggle}
    >
      {text}
    </SwarmBadge>
  );
});
```

- [ ] **Step 2: Commit**

```bash
git add swarmui-react/src/components/PromptWizardTagChip.tsx
git commit -m "feat(promptWizard): add tag chip component"
```

---

### Task 11: Step Navigation Bar

**Files:**
- Create: `swarmui-react/src/components/PromptWizardSteps.tsx`

- [ ] **Step 1: Create the step navigation component**

```typescript
// swarmui-react/src/components/PromptWizardSteps.tsx
import { memo } from 'react';
import { Group, ScrollArea, Stack, Text, UnstyledButton } from '@mantine/core';
import { SwarmBadge } from './ui';
import type { BuilderStep, StepMeta } from '../features/promptWizard/types';

interface PromptWizardStepsProps {
  steps: StepMeta[];
  activeStep: BuilderStep;
  tagCountsByStep: Record<BuilderStep, number>;
  onStepClick: (step: BuilderStep) => void;
}

export const PromptWizardSteps = memo(function PromptWizardSteps({
  steps,
  activeStep,
  tagCountsByStep,
  onStepClick,
}: PromptWizardStepsProps) {
  return (
    <ScrollArea offsetScrollbars>
      <Group gap="xs" wrap="nowrap" px="md" py="sm">
        {steps.map((meta, index) => {
          const isActive = meta.step === activeStep;
          const count = tagCountsByStep[meta.step] ?? 0;
          return (
            <UnstyledButton key={meta.step} onClick={() => onStepClick(meta.step)}>
              <Group
                gap={6}
                wrap="nowrap"
                style={{
                  padding: '6px 12px',
                  borderRadius: 'var(--mantine-radius-md)',
                  background: isActive ? 'var(--elevation-raised)' : undefined,
                  border: isActive ? '1px solid color-mix(in srgb, var(--theme-accent-2) 45%, var(--theme-gray-5))' : '1px solid transparent',
                }}
              >
                <Text size="xs" c="dimmed" fw={600}>{index + 1}</Text>
                <Text size="sm" fw={isActive ? 600 : 400}>{meta.label}</Text>
                {count > 0 && (
                  <SwarmBadge tone="primary" emphasis="solid" size="xs">{count}</SwarmBadge>
                )}
              </Group>
            </UnstyledButton>
          );
        })}
      </Group>
    </ScrollArea>
  );
});
```

- [ ] **Step 2: Commit**

```bash
git add swarmui-react/src/components/PromptWizardSteps.tsx
git commit -m "feat(promptWizard): add step navigation bar component"
```

---

### Task 12: Header Component

**Files:**
- Create: `swarmui-react/src/components/PromptWizardHeader.tsx`

- [ ] **Step 1: Create header component**

```typescript
// swarmui-react/src/components/PromptWizardHeader.tsx
import { memo } from 'react';
import { Group, Select, Stack, Text, TextInput, ThemeIcon } from '@mantine/core';
import { IconSearch, IconSparkles, IconX } from '@tabler/icons-react';
import { SwarmActionIcon, SwarmBadge } from './ui';
import { PROFILES } from '../features/promptWizard/profiles';

interface PromptWizardHeaderProps {
  activeProfileId: string;
  onProfileChange: (profileId: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  totalSelected: number;
  onClose: () => void;
}

export const PromptWizardHeader = memo(function PromptWizardHeader({
  activeProfileId,
  onProfileChange,
  searchQuery,
  onSearchChange,
  totalSelected,
  onClose,
}: PromptWizardHeaderProps) {
  return (
    <Stack gap="md" px="lg" py="md" style={{ borderBottom: '1px solid var(--mantine-color-default-border)', background: 'linear-gradient(180deg, color-mix(in srgb, var(--elevation-raised) 82%, transparent), transparent)' }}>
      <Group justify="space-between" align="flex-start">
        <Group align="flex-start" gap="sm">
          <ThemeIcon size={42} radius="md" variant="light" color="gray" style={{ backgroundColor: 'var(--elevation-paper)' }}>
            <IconSparkles size={20} />
          </ThemeIcon>
          <Stack gap={3}>
            <Group gap="xs">
              <Text fw={700} size="lg">Prompt Wizard</Text>
              <SwarmBadge tone={totalSelected > 0 ? 'primary' : 'secondary'} emphasis="soft">
                {totalSelected > 0 ? `${totalSelected} tags` : 'Ready'}
              </SwarmBadge>
            </Group>
            <Text size="sm" c="dimmed">Build prompts step by step with model-appropriate tag ordering.</Text>
          </Stack>
        </Group>
        <SwarmActionIcon tone="secondary" emphasis="ghost" onClick={onClose} label="Close prompt wizard">
          <IconX size={18} />
        </SwarmActionIcon>
      </Group>
      <Group align="stretch" gap="sm">
        <TextInput
          placeholder="Search tags across all steps..."
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(event) => onSearchChange(event.currentTarget.value)}
          style={{ flex: 1 }}
        />
        <Select
          data={PROFILES.map((p) => ({ value: p.id, label: p.name }))}
          value={activeProfileId}
          onChange={(value) => value && onProfileChange(value)}
          style={{ width: 220 }}
        />
      </Group>
    </Stack>
  );
});
```

- [ ] **Step 2: Commit**

```bash
git add swarmui-react/src/components/PromptWizardHeader.tsx
git commit -m "feat(promptWizard): add header component with profile selector and search"
```

---

### Task 13: Step Content Component

**Files:**
- Create: `swarmui-react/src/components/PromptWizardStepContent.tsx`

- [ ] **Step 1: Create step content component**

This is the main panel showing tags for the active step, organised by subcategory tabs, with quick-fill presets at the top.

```typescript
// swarmui-react/src/components/PromptWizardStepContent.tsx
import { memo, useMemo, useState } from 'react';
import { Box, Divider, Group, ScrollArea, Stack, Tabs, Text } from '@mantine/core';
import { SwarmBadge, SwarmButton, ElevatedCard } from './ui';
import { PromptWizardTagChip } from './PromptWizardTagChip';
import type { BuilderStep, PromptTag, PromptPreset, StepMeta } from '../features/promptWizard/types';

interface PromptWizardStepContentProps {
  stepMeta: StepMeta;
  tags: PromptTag[];
  presets: PromptPreset[];
  selectedTagIds: Set<string>;
  searchQuery: string;
  onToggleTag: (tagId: string) => void;
  onApplyPreset: (tagIds: string[]) => void;
}

export const PromptWizardStepContent = memo(function PromptWizardStepContent({
  stepMeta,
  tags,
  presets,
  selectedTagIds,
  searchQuery,
  onToggleTag,
  onApplyPreset,
}: PromptWizardStepContentProps) {
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);

  const query = searchQuery.trim().toLowerCase();

  const filteredTags = useMemo(() => {
    if (!query) return tags;
    return tags.filter(
      (t) =>
        t.text.toLowerCase().includes(query) ||
        t.aliases?.some((a) => a.toLowerCase().includes(query))
    );
  }, [tags, query]);

  // Group tags: selected pinned to top, then by subcategory
  const subcategories = useMemo(() => ['General', ...stepMeta.subcategories], [stepMeta.subcategories]);
  const activeSubcat = activeSubcategory ?? subcategories[0];

  const visibleTags = useMemo(() => {
    if (activeSubcat === 'General') {
      return filteredTags.filter((t) => !t.subcategory);
    }
    return filteredTags.filter((t) => t.subcategory === activeSubcat);
  }, [filteredTags, activeSubcat]);

  // Sort: selected first, then alphabetical
  const sortedTags = useMemo(() => {
    const selected = visibleTags.filter((t) => selectedTagIds.has(t.id));
    const unselected = visibleTags.filter((t) => !selectedTagIds.has(t.id));
    return [...selected, ...unselected];
  }, [visibleTags, selectedTagIds]);

  const subcatCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const subcat of subcategories) {
      if (subcat === 'General') {
        counts[subcat] = filteredTags.filter((t) => !t.subcategory).length;
      } else {
        counts[subcat] = filteredTags.filter((t) => t.subcategory === subcat).length;
      }
    }
    return counts;
  }, [filteredTags, subcategories]);

  return (
    <Stack gap={0} style={{ flex: 1, minHeight: 0 }}>
      {/* Quick-fill presets */}
      {presets.length > 0 && !query && (
        <Box px="md" py="sm" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
          <Stack gap="xs">
            <Text size="xs" tt="uppercase" fw={600} c="dimmed">Quick Fill</Text>
            <Group gap="xs">
              {presets.map((preset) => (
                <SwarmButton
                  key={preset.id}
                  tone="secondary"
                  emphasis="soft"
                  size="compact-xs"
                  onClick={() => onApplyPreset(preset.tagIds)}
                >
                  {preset.name}
                </SwarmButton>
              ))}
            </Group>
          </Stack>
        </Box>
      )}

      {/* Subcategory tabs */}
      <Box px="md" py="xs" style={{ borderBottom: '1px solid var(--mantine-color-default-border)' }}>
        <ScrollArea offsetScrollbars>
          <Group gap="xs" wrap="nowrap">
            {subcategories.map((subcat) => {
              const isActive = subcat === activeSubcat;
              const count = subcatCounts[subcat] ?? 0;
              if (count === 0 && !isActive) return null;
              return (
                <SwarmBadge
                  key={subcat}
                  tone={isActive ? 'primary' : 'secondary'}
                  emphasis={isActive ? 'solid' : 'soft'}
                  style={{ cursor: 'pointer' }}
                  onClick={() => setActiveSubcategory(subcat)}
                >
                  {subcat} ({count})
                </SwarmBadge>
              );
            })}
          </Group>
        </ScrollArea>
      </Box>

      {/* Tag grid */}
      <ScrollArea style={{ flex: 1 }} offsetScrollbars>
        <Box p="md">
          {sortedTags.length === 0 ? (
            <ElevatedCard elevation="floor" withBorder>
              <Stack align="center" gap="xs" py="xl">
                <Text fw={600}>No tags{query ? ' match your search' : ' in this subcategory'}</Text>
                <Text size="sm" c="dimmed">
                  {query ? 'Try a different search term.' : 'Tags will appear here as the library grows.'}
                </Text>
              </Stack>
            </ElevatedCard>
          ) : (
            <Group gap="xs">
              {sortedTags.map((tag) => (
                <PromptWizardTagChip
                  key={tag.id}
                  text={tag.text}
                  selected={selectedTagIds.has(tag.id)}
                  onToggle={() => onToggleTag(tag.id)}
                />
              ))}
            </Group>
          )}
        </Box>
      </ScrollArea>
    </Stack>
  );
});
```

- [ ] **Step 2: Commit**

```bash
git add swarmui-react/src/components/PromptWizardStepContent.tsx
git commit -m "feat(promptWizard): add step content component with subcategory tabs and tag grid"
```

---

### Task 14: Preview and Action Bar

> **Note:** The spec mentions the preview should be "Editable." For v1, the preview is read-only — users edit the final prompt in PromptInput after applying. Editability can be added later if needed.

**Files:**
- Create: `swarmui-react/src/components/PromptWizardPreview.tsx`

- [ ] **Step 1: Create preview component**

```typescript
// swarmui-react/src/components/PromptWizardPreview.tsx
import { memo } from 'react';
import { Box, Group, Stack, Text, Textarea } from '@mantine/core';
import { IconPlus, IconTrash } from '@tabler/icons-react';
import { SwarmButton } from './ui';

interface PromptWizardPreviewProps {
  positivePreview: string;
  negativePreview: string;
  onApplyToPrompt: () => void;
  onApplyToNegative: () => void;
  onClear: () => void;
  hasSelection: boolean;
}

export const PromptWizardPreview = memo(function PromptWizardPreview({
  positivePreview,
  negativePreview,
  onApplyToPrompt,
  onApplyToNegative,
  onClear,
  hasSelection,
}: PromptWizardPreviewProps) {
  return (
    <Box
      px="lg"
      py="md"
      style={{
        borderTop: '1px solid var(--mantine-color-default-border)',
        background: 'color-mix(in srgb, var(--elevation-table) 92%, transparent)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Text fw={600} size="sm">Prompt Preview</Text>
          <SwarmButton
            tone="secondary"
            emphasis="ghost"
            size="compact-xs"
            leftSection={<IconTrash size={14} />}
            onClick={onClear}
            disabled={!hasSelection}
          >
            Clear all
          </SwarmButton>
        </Group>

        <Textarea
          value={positivePreview}
          readOnly
          autosize
          minRows={2}
          maxRows={4}
          placeholder="Select tags to preview the assembled prompt..."
          styles={{ input: { fontFamily: 'monospace', fontSize: 'var(--mantine-font-size-sm)' } }}
        />

        {negativePreview && (
          <Textarea
            value={negativePreview}
            readOnly
            autosize
            minRows={1}
            maxRows={2}
            placeholder="No negative tags selected"
            styles={{ input: { fontFamily: 'monospace', fontSize: 'var(--mantine-font-size-sm)', color: 'var(--mantine-color-red-text)' } }}
          />
        )}

        <Group grow>
          <SwarmButton
            tone="primary"
            leftSection={<IconPlus size={16} />}
            onClick={onApplyToPrompt}
            disabled={!positivePreview}
          >
            Apply to Prompt
          </SwarmButton>
          <SwarmButton
            tone="danger"
            emphasis="soft"
            leftSection={<IconPlus size={16} />}
            onClick={onApplyToNegative}
            disabled={!negativePreview}
          >
            Apply to Negative
          </SwarmButton>
        </Group>
      </Stack>
    </Box>
  );
});
```

- [ ] **Step 2: Commit**

```bash
git add swarmui-react/src/components/PromptWizardPreview.tsx
git commit -m "feat(promptWizard): add preview and action bar component"
```

---

### Task 15: Root Wizard Modal

**Files:**
- Create: `swarmui-react/src/components/PromptWizard.tsx`

- [ ] **Step 1: Create root wizard component**

This component wires together all subcomponents with the store. It loads tag data, resolves selected tags, runs assembly, and handles apply callbacks.

```typescript
// swarmui-react/src/components/PromptWizard.tsx
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Center, Loader, Modal, Stack, Text } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconChevronRight, IconSparkles } from '@tabler/icons-react';
import { Group, ThemeIcon, UnstyledButton } from '@mantine/core';
import { ElevatedCard, SwarmBadge, SwarmButton } from './ui';
import { PromptWizardHeader } from './PromptWizardHeader';
import { PromptWizardSteps } from './PromptWizardSteps';
import { PromptWizardStepContent } from './PromptWizardStepContent';
import { PromptWizardPreview } from './PromptWizardPreview';
import { usePromptWizardStore } from '../stores/promptWizardStore';
import { STEP_META, getStepMeta } from '../features/promptWizard/steps';
import { getProfile } from '../features/promptWizard/profiles';
import { assemblePrompt } from '../features/promptWizard/assemble';
import type { BuilderStep, PromptTag, PromptPreset } from '../features/promptWizard/types';

interface PromptWizardProps {
  onApplyToPrompt?: (text: string) => void;
  onApplyToNegative?: (text: string) => void;
  compact?: boolean;
}

// Lazy-loaded data
let defaultTagsPromise: Promise<PromptTag[]> | null = null;
let defaultPresetsPromise: Promise<PromptPreset[]> | null = null;

function loadDefaultTags(): Promise<PromptTag[]> {
  if (!defaultTagsPromise) {
    defaultTagsPromise = import('../data/promptTags.json').then((m) => m.default as PromptTag[]);
  }
  return defaultTagsPromise;
}

function loadDefaultPresets(): Promise<PromptPreset[]> {
  if (!defaultPresetsPromise) {
    defaultPresetsPromise = import('../data/promptQuickPresets.json').then((m) => m.default as PromptPreset[]);
  }
  return defaultPresetsPromise;
}

export const PromptWizard = memo(function PromptWizard({
  onApplyToPrompt,
  onApplyToNegative,
  compact = false,
}: PromptWizardProps) {
  const [opened, { open, close }] = useDisclosure(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [defaultTags, setDefaultTags] = useState<PromptTag[]>([]);
  const [defaultPresets, setDefaultPresets] = useState<PromptPreset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const {
    selectedTagIds,
    activeProfileId,
    activeStep,
    customTags,
    toggleTag,
    clearSelections,
    applyPreset,
    setActiveStep,
    setActiveProfile,
  } = usePromptWizardStore();

  // Load data on first open
  useEffect(() => {
    if (!opened || hasLoaded || isLoading) return;
    setIsLoading(true);
    Promise.all([loadDefaultTags(), loadDefaultPresets()])
      .then(([tags, presets]) => {
        setDefaultTags(tags);
        setDefaultPresets(presets);
        setHasLoaded(true);
      })
      .catch(() => {
        notifications.show({
          title: 'Prompt Wizard Unavailable',
          message: 'Could not load tag library.',
          color: 'red',
        });
      })
      .finally(() => setIsLoading(false));
  }, [opened, hasLoaded, isLoading]);

  // Merge default + custom tags
  const allTags = useMemo(() => [...defaultTags, ...customTags], [defaultTags, customTags]);

  // When searching, show tags across all steps; otherwise scope to active step
  const hasSearch = searchQuery.trim().length > 0;
  const stepTags = useMemo(
    () => hasSearch ? allTags : allTags.filter((t) => t.step === activeStep),
    [allTags, activeStep, hasSearch]
  );

  // Presets for active step
  const stepPresets = useMemo(
    () => defaultPresets.filter((p) => p.step === activeStep),
    [defaultPresets, activeStep]
  );

  // Tag counts per step
  const tagCountsByStep = useMemo(() => {
    const counts = {} as Record<BuilderStep, number>;
    for (const meta of STEP_META) {
      counts[meta.step] = selectedTagIds.filter((id) =>
        allTags.some((t) => t.id === id && t.step === meta.step)
      ).length;
    }
    return counts;
  }, [selectedTagIds, allTags]);

  const selectedTagIdSet = useMemo(() => new Set(selectedTagIds), [selectedTagIds]);

  // Assembly
  const profile = getProfile(activeProfileId);
  const selectedTags = useMemo(
    () => selectedTagIds.map((id) => allTags.find((t) => t.id === id)).filter(Boolean) as PromptTag[],
    [selectedTagIds, allTags]
  );
  const assembled = useMemo(
    () => profile ? assemblePrompt(selectedTags, profile) : { positive: '', negative: '' },
    [selectedTags, profile]
  );

  const handleApplyPrompt = useCallback(() => {
    if (!assembled.positive || !onApplyToPrompt) return;
    onApplyToPrompt(assembled.positive);
    notifications.show({ title: 'Prompt Applied', message: 'Tags added to the prompt.', color: 'teal' });
  }, [assembled.positive, onApplyToPrompt]);

  const handleApplyNegative = useCallback(() => {
    if (!assembled.negative || !onApplyToNegative) return;
    onApplyToNegative(assembled.negative);
    notifications.show({ title: 'Negative Applied', message: 'Negative tags added.', color: 'teal' });
  }, [assembled.negative, onApplyToNegative]);

  const totalSelected = selectedTagIds.length;
  const stepMeta = getStepMeta(activeStep)!;

  // Step navigation
  const profileStepOrder = profile?.stepOrder ?? STEP_META.map((m) => m.step);
  const currentStepIndex = profileStepOrder.indexOf(activeStep);
  const canGoPrev = currentStepIndex > 0;
  const canGoNext = currentStepIndex < profileStepOrder.length - 1;
  const goToPrev = useCallback(() => {
    if (canGoPrev) setActiveStep(profileStepOrder[currentStepIndex - 1]);
  }, [canGoPrev, currentStepIndex, profileStepOrder, setActiveStep]);
  const goToNext = useCallback(() => {
    if (canGoNext) setActiveStep(profileStepOrder[currentStepIndex + 1]);
  }, [canGoNext, currentStepIndex, profileStepOrder, setActiveStep]);

  return (
    <>
      {/* Trigger button */}
      <UnstyledButton onClick={open} style={{ width: '100%', textAlign: 'left' }} aria-label="Open prompt wizard">
        <ElevatedCard
          elevation="paper"
          withBorder
          interactive
          className={compact ? 'generate-studio__prompt-library-card--compact' : undefined}
          style={{ padding: compact ? 10 : 14 }}
        >
          <Group justify="space-between" align="center" wrap="nowrap">
            <Group gap="sm" wrap="nowrap">
              <ThemeIcon size={compact ? 32 : 38} radius="md" variant="light" color="gray" style={{ backgroundColor: 'var(--elevation-raised)' }}>
                <IconSparkles size={20} />
              </ThemeIcon>
              <Stack gap={2}>
                <Group gap="xs">
                  <Text fw={600} size="sm">Prompt Wizard</Text>
                  <SwarmBadge tone={totalSelected > 0 ? 'primary' : 'secondary'} emphasis="soft">
                    {totalSelected > 0 ? `${totalSelected} tags` : 'Ready'}
                  </SwarmBadge>
                </Group>
                <Text size="xs" c="dimmed">
                  {compact ? 'Build prompts step by step.' : totalSelected > 0 ? `${totalSelected} tags selected` : 'Build prompts step by step with guided tag selection'}
                </Text>
              </Stack>
            </Group>
            <ThemeIcon size={compact ? 28 : 32} radius="xl" variant="light" color="gray">
              <IconChevronRight size={18} />
            </ThemeIcon>
          </Group>
        </ElevatedCard>
      </UnstyledButton>

      {/* Wizard modal */}
      <Modal
        opened={opened}
        onClose={close}
        size="xl"
        padding={0}
        centered
        styles={{
          content: { overflow: 'hidden', background: 'var(--elevation-table)', display: 'flex', flexDirection: 'column', maxHeight: '85vh' },
          header: { display: 'none' },
          body: { padding: 0, display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 },
        }}
      >
        {isLoading && !hasLoaded ? (
          <Center p="xl" mih={320}>
            <Stack align="center" gap="sm">
              <Loader size="sm" />
              <Text size="sm" c="dimmed">Loading tag library...</Text>
            </Stack>
          </Center>
        ) : (
          <>
            <PromptWizardHeader
              activeProfileId={activeProfileId}
              onProfileChange={setActiveProfile}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              totalSelected={totalSelected}
              onClose={close}
            />

            <PromptWizardSteps
              steps={STEP_META}
              activeStep={activeStep}
              tagCountsByStep={tagCountsByStep}
              onStepClick={setActiveStep}
            />

            <PromptWizardStepContent
              stepMeta={stepMeta}
              tags={stepTags}
              presets={stepPresets}
              selectedTagIds={selectedTagIdSet}
              searchQuery={searchQuery}
              onToggleTag={toggleTag}
              onApplyPreset={applyPreset}
            />

            {/* Next / Previous navigation */}
            <Group justify="space-between" px="md" py="xs" style={{ borderTop: '1px solid var(--mantine-color-default-border)' }}>
              <SwarmButton tone="secondary" emphasis="ghost" onClick={goToPrev} disabled={!canGoPrev}>
                Previous
              </SwarmButton>
              <Text size="sm" c="dimmed">{stepMeta.label} ({currentStepIndex + 1}/{profileStepOrder.length})</Text>
              <SwarmButton tone="secondary" emphasis="ghost" onClick={goToNext} disabled={!canGoNext}>
                Next
              </SwarmButton>
            </Group>

            <PromptWizardPreview
              positivePreview={assembled.positive}
              negativePreview={assembled.negative}
              onApplyToPrompt={handleApplyPrompt}
              onApplyToNegative={handleApplyNegative}
              onClear={clearSelections}
              hasSelection={totalSelected > 0}
            />
          </>
        )}
      </Modal>
    </>
  );
});
```

- [ ] **Step 2: Verify build compiles**

Run: `cd swarmui-react && npx tsc --noEmit`
Expected: No type errors in new files

- [ ] **Step 3: Commit**

```bash
git add swarmui-react/src/components/PromptWizard.tsx
git commit -m "feat(promptWizard): add root wizard modal wiring all subcomponents"
```

---

## Chunk 5: Integration and Swap

### Task 16: Move `prependPromptText` Utility

**Files:**
- Modify: `swarmui-react/src/utils/promptPresetApply.ts` (source — read `prependPromptText` from here)
- Create: `swarmui-react/src/utils/promptTextTools.ts` (if it doesn't already have `prependPromptText`) OR add to existing file

`prependPromptText` is used by `PromptSection.tsx` and will be needed after the old preset system is deleted. Move it to a standalone location before the swap.

- [ ] **Step 1: Check if `prependPromptText` is already in `promptTextTools.ts`**

Run: `grep -n "prependPromptText" swarmui-react/src/utils/promptTextTools.ts`

If it already exists there, skip to Step 3. Otherwise:

- [ ] **Step 2: Copy `prependPromptText` to `promptTextTools.ts`**

Read `prependPromptText` from `swarmui-react/src/utils/promptPresetApply.ts` and add it to `swarmui-react/src/utils/promptTextTools.ts`.

- [ ] **Step 3: Commit**

```bash
git add swarmui-react/src/utils/promptTextTools.ts
git commit -m "refactor: move prependPromptText to promptTextTools for reuse"
```

---

### Task 17: Swap PromptPresetSelector for PromptWizard

**Files:**
- Modify: `swarmui-react/src/pages/GeneratePage/components/ParameterPanel/PromptSection.tsx:6,18,75-83`

- [ ] **Step 1: Update imports**

In `PromptSection.tsx`, change line 6 and line 18:

```typescript
// OLD:
import { PromptPresetSelector } from '../../../../components/PromptPresetSelector';
import { prependPromptText } from '../../../../utils/promptPresetApply';
// NEW:
import { PromptWizard } from '../../../../components/PromptWizard';
import { prependPromptText } from '../../../../utils/promptTextTools';
```

- [ ] **Step 2: Update JSX usage**

In `PromptSection.tsx`, replace the `<PromptPresetSelector>` usage (around lines 75-83):

```typescript
// OLD:
<PromptPresetSelector
    compact
    onApplyToPrompt={(text) => {
        form.setFieldValue('prompt', prependPromptText(form.values.prompt, text));
    }}
    onApplyToNegative={(text) => {
        form.setFieldValue('negativeprompt', prependPromptText(form.values.negativeprompt, text));
    }}
/>
// NEW:
<PromptWizard
    compact
    onApplyToPrompt={(text) => {
        form.setFieldValue('prompt', prependPromptText(form.values.prompt, text));
    }}
    onApplyToNegative={(text) => {
        form.setFieldValue('negativeprompt', prependPromptText(form.values.negativeprompt, text));
    }}
/>
```

- [ ] **Step 3: Verify build compiles**

Run: `cd swarmui-react && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Run all tests**

Run: `cd swarmui-react && npx vitest run`
Expected: All existing tests still pass. The old `promptPresets.test.ts` and `promptPresetApply.test.ts` may still reference the old store — these still pass because the old store/files are not yet removed.

- [ ] **Step 5: Commit**

```bash
git add swarmui-react/src/pages/GeneratePage/components/ParameterPanel/PromptSection.tsx
git commit -m "feat(promptWizard): swap PromptPresetSelector for PromptWizard in PromptSection"
```

---

### Task 18: Manual Smoke Test

- [ ] **Step 1: Run the dev server**

Run: `cd swarmui-react && npm run dev:vite`

- [ ] **Step 2: Verify the following manually**

1. The "Prompt Wizard" trigger card appears where "Prompt Library" used to be
2. Clicking it opens the wizard modal
3. Step navigation bar shows all 7 steps with labels
4. Profile selector shows "Illustrious / Danbooru"
5. Clicking a step shows tags for that step grouped by subcategory
6. Toggling tags updates the count badges on step indicators
7. Quick-fill presets appear at top of steps that have them
8. Live preview at bottom shows assembled prompt in correct order
9. "Apply to Prompt" adds assembled text to the prompt input
10. "Apply to Negative" adds negative text to the negative prompt input
11. Search filters tags across the current step
12. Closing and reopening preserves tag selections (localStorage)

- [ ] **Step 3: Fix any issues found during smoke test**

- [ ] **Step 4: Commit any fixes**

```bash
git add -u
git commit -m "fix(promptWizard): address smoke test issues"
```

---

### Task 19: Cleanup Old Files (after confirming wizard works)

**Files:**
- Remove: `swarmui-react/src/components/PromptPresetSelector.tsx`
- Remove: `swarmui-react/src/stores/promptPresets.ts`
- Remove: `swarmui-react/src/stores/promptPresets.test.ts`
- Remove: `swarmui-react/src/utils/promptPresetApply.ts`
- Remove: `swarmui-react/src/utils/promptPresetApply.test.ts`
- Remove: `swarmui-react/src/data/promptPresets.json`

- [ ] **Step 1: Check for remaining imports of old files**

Search for any remaining imports of `PromptPresetSelector`, `promptPresets` store, `promptPresetApply`, or `promptPresets.json` across the codebase. Update or remove them.

Run: `grep -r "PromptPresetSelector\|from.*promptPresets\|promptPresetApply" swarmui-react/src/ --include="*.ts" --include="*.tsx" -l`

Fix any remaining references before deleting.

- [ ] **Step 2: Update prependPromptText import if needed**

If `prependPromptText` from `promptPresetApply.ts` is used elsewhere, either move it to a general utils file or inline it where needed.

- [ ] **Step 3: Delete old files**

```bash
git rm swarmui-react/src/components/PromptPresetSelector.tsx
git rm swarmui-react/src/stores/promptPresets.ts
git rm swarmui-react/src/stores/promptPresets.test.ts
git rm swarmui-react/src/utils/promptPresetApply.ts
git rm swarmui-react/src/utils/promptPresetApply.test.ts
git rm swarmui-react/src/data/promptPresets.json
```

- [ ] **Step 4: Run all tests**

Run: `cd swarmui-react && npx vitest run`
Expected: All tests pass (old tests removed, new tests pass)

- [ ] **Step 5: Run build**

Run: `cd swarmui-react && npm run build`
Expected: Clean build with no errors

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor(promptWizard): remove old PromptPresetSelector and legacy preset system"
```
