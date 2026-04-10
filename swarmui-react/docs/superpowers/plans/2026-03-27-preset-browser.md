# Preset Browser Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Preset Browser panel within the Prompt Wizard modal that lets users browse, apply, and create granular presets across 5 categories (Characters, Scenes, Styles, Perspectives, Explicit).

**Architecture:** Tab-switched view within the existing wizard — a Steps/Presets segmented control in the header swaps the main content between the existing step-based tag palette and a new preset browser with category tabs and a card grid. Presets are additive (they merge tags into the current selection). User-created presets are stored in zustand; default presets are loaded from JSON.

**Tech Stack:** React 18, TypeScript, Mantine 8.3, Zustand, Vitest

---

## Chunk 1: Types, Store, and Data

### Task 1: Add BrowserPreset types to types.ts

**Files:**
- Modify: `swarmui-react/src/features/promptWizard/types.ts`

- [ ] **Step 1: Add PresetCategory and BrowserPreset types**

Append to the end of `types.ts` (before the closing of the file):

```typescript
export type PresetCategory = 'characters' | 'scenes' | 'styles' | 'perspectives' | 'explicit';

export const PRESET_CATEGORIES: PresetCategory[] = ['characters', 'scenes', 'styles', 'perspectives', 'explicit'];

export const PRESET_CATEGORY_LABELS: Record<PresetCategory, string> = {
  characters: 'Characters',
  scenes: 'Scenes',
  styles: 'Styles',
  perspectives: 'Perspectives',
  explicit: 'Explicit',
};

export interface BrowserPreset {
  id: string;
  name: string;
  category: PresetCategory;
  tagIds: string[];
  description?: string;
  thumbnail?: string;
  isDefault: boolean;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd swarmui-react && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to types.ts

- [ ] **Step 3: Commit**

```bash
git add swarmui-react/src/features/promptWizard/types.ts
git commit -m "feat(presetBrowser): add BrowserPreset and PresetCategory types"
```

---

### Task 2: Add browser preset state and actions to the store

**Files:**
- Modify: `swarmui-react/src/stores/promptWizardStore.ts`

- [ ] **Step 1: Add imports**

Add `BrowserPreset` and `PresetCategory` to the import from types:

```typescript
import type {
  BuilderStep,
  PromptTag,
  PromptPreset,
  PromptBundle,
  PromptRecipe,
  PromptWizardStateSnapshot,
  BrowserPreset,
  PresetCategory,
} from '../features/promptWizard/types';
```

- [ ] **Step 2: Add new state fields to the interface**

After `migrationVersion: number;` in the `PromptWizardStore` interface, add:

```typescript
  // Browser presets
  userBrowserPresets: BrowserPreset[];
  activeView: 'steps' | 'presets';
  activePresetCategory: PresetCategory;
  presetSearchQuery: string;
```

- [ ] **Step 3: Add new actions to the interface**

After `setMigrationVersion`, add:

```typescript
  // Browser preset actions
  setActiveView: (view: 'steps' | 'presets') => void;
  setActivePresetCategory: (category: PresetCategory) => void;
  setPresetSearchQuery: (query: string) => void;
  resetPresetBrowserEphemeral: () => void;
  applyBrowserPreset: (tagIds: string[]) => void;
  addBrowserPreset: (preset: Omit<BrowserPreset, 'id' | 'isDefault'>) => void;
  updateBrowserPreset: (presetId: string, updates: Partial<Pick<BrowserPreset, 'name' | 'description' | 'category' | 'tagIds' | 'thumbnail'>>) => void;
  removeBrowserPreset: (presetId: string) => void;
```

- [ ] **Step 4: Add initial state values**

After `migrationVersion: 0,` in the `create` callback, add:

```typescript
        userBrowserPresets: [],
        activeView: 'steps' as const,
        activePresetCategory: 'characters' as PresetCategory,
        presetSearchQuery: '',
```

- [ ] **Step 5: Add action implementations**

After the `setMigrationVersion` action, add:

```typescript
        setActiveView: (view) => {
          set({ activeView: view });
        },

        setActivePresetCategory: (category) => {
          set({ activePresetCategory: category });
        },

        setPresetSearchQuery: (query) => {
          set({ presetSearchQuery: query });
        },

        resetPresetBrowserEphemeral: () => {
          set({ activeView: 'steps' as const, presetSearchQuery: '' });
        },

        applyBrowserPreset: (tagIds) => {
          set((state) => ({
            selectedTagIds: uniqueStrings([...state.selectedTagIds, ...tagIds]),
          }));
        },

        addBrowserPreset: (preset) => {
          const id = `browser-preset-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
          set((state) => ({
            userBrowserPresets: [...state.userBrowserPresets, { ...preset, id, isDefault: false }],
          }));
        },

        updateBrowserPreset: (presetId, updates) => {
          set((state) => ({
            userBrowserPresets: state.userBrowserPresets.map((p) =>
              p.id === presetId ? { ...p, ...updates } : p
            ),
          }));
        },

        removeBrowserPreset: (presetId) => {
          set((state) => ({
            userBrowserPresets: state.userBrowserPresets.filter((p) => p.id !== presetId),
          }));
        },
```

- [ ] **Step 6: Add to partialize**

In the `partialize` object, add these two fields after `migrationVersion`:

```typescript
          userBrowserPresets: state.userBrowserPresets,
          activePresetCategory: state.activePresetCategory,
```

Do NOT add `activeView` or `presetSearchQuery` — they are ephemeral.

- [ ] **Step 7: Verify TypeScript compiles**

Run: `cd swarmui-react && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors related to promptWizardStore.ts

- [ ] **Step 8: Commit**

```bash
git add swarmui-react/src/stores/promptWizardStore.ts
git commit -m "feat(presetBrowser): add browser preset state and actions to store"
```

---

### Task 3: Write store tests

**Files:**
- Create: `swarmui-react/src/stores/promptWizardStore.test.ts`

- [ ] **Step 1: Write tests for new store actions**

```typescript
import { describe, expect, it, beforeEach } from 'vitest';
import { usePromptWizardStore } from './promptWizardStore';

function resetStore() {
  usePromptWizardStore.setState({
    selectedTagIds: [],
    tagWeights: {},
    userBrowserPresets: [],
    activeView: 'steps',
    activePresetCategory: 'characters',
    presetSearchQuery: '',
  });
}

describe('promptWizardStore — browser presets', () => {
  beforeEach(() => resetStore());

  it('defaults activeView to steps', () => {
    expect(usePromptWizardStore.getState().activeView).toBe('steps');
  });

  it('defaults activePresetCategory to characters', () => {
    expect(usePromptWizardStore.getState().activePresetCategory).toBe('characters');
  });

  it('setActiveView switches view', () => {
    usePromptWizardStore.getState().setActiveView('presets');
    expect(usePromptWizardStore.getState().activeView).toBe('presets');
  });

  it('setActivePresetCategory switches category', () => {
    usePromptWizardStore.getState().setActivePresetCategory('scenes');
    expect(usePromptWizardStore.getState().activePresetCategory).toBe('scenes');
  });

  it('resetPresetBrowserEphemeral resets view and search', () => {
    const store = usePromptWizardStore.getState();
    store.setActiveView('presets');
    store.setPresetSearchQuery('test');
    usePromptWizardStore.getState().resetPresetBrowserEphemeral();
    const state = usePromptWizardStore.getState();
    expect(state.activeView).toBe('steps');
    expect(state.presetSearchQuery).toBe('');
  });

  it('applyBrowserPreset additively merges tag IDs', () => {
    usePromptWizardStore.setState({ selectedTagIds: ['tag-a', 'tag-b'] });
    usePromptWizardStore.getState().applyBrowserPreset(['tag-b', 'tag-c', 'tag-d']);
    expect(usePromptWizardStore.getState().selectedTagIds).toEqual(['tag-a', 'tag-b', 'tag-c', 'tag-d']);
  });

  it('applyBrowserPreset deduplicates against existing tags', () => {
    usePromptWizardStore.setState({ selectedTagIds: ['tag-a'] });
    usePromptWizardStore.getState().applyBrowserPreset(['tag-a', 'tag-b']);
    expect(usePromptWizardStore.getState().selectedTagIds).toEqual(['tag-a', 'tag-b']);
  });

  it('applyBrowserPreset deduplicates within incoming tags', () => {
    usePromptWizardStore.setState({ selectedTagIds: [] });
    usePromptWizardStore.getState().applyBrowserPreset(['tag-x', 'tag-x', 'tag-y']);
    expect(usePromptWizardStore.getState().selectedTagIds).toEqual(['tag-x', 'tag-y']);
  });

  it('addBrowserPreset creates preset with generated id and isDefault false', () => {
    usePromptWizardStore.getState().addBrowserPreset({
      name: 'Test Preset',
      category: 'characters',
      tagIds: ['tag-a', 'tag-b'],
    });
    const presets = usePromptWizardStore.getState().userBrowserPresets;
    expect(presets).toHaveLength(1);
    expect(presets[0].name).toBe('Test Preset');
    expect(presets[0].isDefault).toBe(false);
    expect(presets[0].id).toMatch(/^browser-preset-/);
  });

  it('updateBrowserPreset modifies only matching preset', () => {
    usePromptWizardStore.getState().addBrowserPreset({ name: 'A', category: 'characters', tagIds: ['tag-a'] });
    usePromptWizardStore.getState().addBrowserPreset({ name: 'B', category: 'scenes', tagIds: ['tag-b'] });
    const presetA = usePromptWizardStore.getState().userBrowserPresets[0];
    usePromptWizardStore.getState().updateBrowserPreset(presetA.id, { name: 'A Updated' });
    const presets = usePromptWizardStore.getState().userBrowserPresets;
    expect(presets[0].name).toBe('A Updated');
    expect(presets[1].name).toBe('B');
  });

  it('removeBrowserPreset removes the preset', () => {
    usePromptWizardStore.getState().addBrowserPreset({ name: 'Temp', category: 'styles', tagIds: ['tag-x'] });
    const id = usePromptWizardStore.getState().userBrowserPresets[0].id;
    usePromptWizardStore.getState().removeBrowserPreset(id);
    expect(usePromptWizardStore.getState().userBrowserPresets).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests**

Run: `cd swarmui-react && npx vitest run src/stores/promptWizardStore.test.ts`
Expected: All 11 tests pass

- [ ] **Step 3: Commit**

```bash
git add swarmui-react/src/stores/promptWizardStore.test.ts
git commit -m "test(presetBrowser): add store tests for browser preset actions"
```

---

### Task 4: Create promptBrowserPresets.json data file

**Files:**
- Create: `swarmui-react/src/data/promptBrowserPresets.json`
- Modify: `swarmui-react/src/data/promptTags.json` (add any missing tags)

This is the largest task — curating ~65 presets with tag ID mappings. Each preset's `tagIds` must reference actual tag IDs in `promptTags.json`.

- [ ] **Step 1: Audit existing tags**

Search `promptTags.json` for tags that match the preset roster. Identify which tags already exist and which need to be added. Use `grep` or text search for tag text values like "knight", "castle", "anime style", etc.

- [ ] **Step 2: Add missing tags to promptTags.json**

For each tag text in the preset roster that doesn't have a matching entry in `promptTags.json`, add a new tag object. Follow the existing naming convention:

```json
{
  "id": "tag-{step}-{text-kebab-case}",
  "text": "{tag text}",
  "step": "{appropriate step}",
  "profiles": ["illustrious"],
  "subcategory": "{appropriate subcategory from steps.ts}",
  "majorGroup": "{appropriate group}",
  "minorGroup": "General",
  "groupOrder": 50,
  "minorOrder": 10
}
```

Step assignments for browser preset tags:
- Character descriptor tags → step: `subject`, subcategory: `Character`
- Appearance tags (hair, eyes, clothing) → step: `appearance`, appropriate subcategory
- Scene/location tags → step: `setting`, appropriate subcategory
- Style tags → step: `style`, appropriate subcategory
- Camera/perspective tags → step: `action`, subcategory: `Framing`
- Explicit tags → use subcategory `Explicit` on the appropriate step

- [ ] **Step 3: Create promptBrowserPresets.json**

Create the file with all ~65 presets. Structure for each:

```json
{
  "id": "bp-{category}-{name-kebab}",
  "name": "{Display Name}",
  "category": "{characters|scenes|styles|perspectives|explicit}",
  "tagIds": ["tag-id-1", "tag-id-2", "tag-id-3"],
  "description": "{One-line description}",
  "thumbnail": "{emoji}",
  "isDefault": true
}
```

Full roster — 5 categories, ~65 presets total. Refer to the spec at `docs/superpowers/specs/2026-03-27-preset-browser-design.md` section "Default Preset Roster" for the complete list and example tags per preset.

- [ ] **Step 4: Validate JSON**

Run: `cd swarmui-react && node -e "const d = require('./src/data/promptBrowserPresets.json'); console.log(d.length + ' presets loaded'); const cats = {}; d.forEach(p => cats[p.category] = (cats[p.category]||0)+1); console.log(cats)"`
Expected: ~65 presets loaded, roughly 15/15/12/10/12 per category

- [ ] **Step 5: Validate all tagIds reference existing tags**

Run: `cd swarmui-react && node -e "const tags = require('./src/data/promptTags.json'); const presets = require('./src/data/promptBrowserPresets.json'); const tagIds = new Set(tags.map(t => t.id)); const missing = []; presets.forEach(p => p.tagIds.forEach(id => { if (!tagIds.has(id)) missing.push(id + ' in ' + p.name) })); if (missing.length) { console.error('MISSING:', missing); process.exit(1); } else console.log('All tag IDs valid')"`
Expected: "All tag IDs valid"

- [ ] **Step 6: Commit**

```bash
git add swarmui-react/src/data/promptBrowserPresets.json swarmui-react/src/data/promptTags.json
git commit -m "feat(presetBrowser): add ~65 curated browser presets and missing tags"
```

---

## Chunk 2: UI Components

### Task 5: PromptWizardPresetCard component

**Files:**
- Create: `swarmui-react/src/components/PromptWizardPresetCard.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { memo, useCallback } from 'react';
import { Group, Stack, Text, UnstyledButton } from '@mantine/core';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { ElevatedCard, SwarmActionIcon, SwarmBadge, SwarmButton } from './ui';

interface PromptWizardPresetCardProps {
  name: string;
  description?: string;
  thumbnail?: string;
  tagCount: number;
  isDefault: boolean;
  onApply: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export const PromptWizardPresetCard = memo(function PromptWizardPresetCard({
  name,
  description,
  thumbnail,
  tagCount,
  isDefault,
  onApply,
  onEdit,
  onDelete,
}: PromptWizardPresetCardProps) {
  return (
    <ElevatedCard
      elevation="paper"
      withBorder
      style={{
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        minHeight: 100,
      }}
    >
      <Group justify="space-between" align="flex-start" wrap="nowrap" gap="xs">
        <Group gap="xs" wrap="nowrap" style={{ minWidth: 0 }}>
          {thumbnail && <Text size="lg">{thumbnail}</Text>}
          <Text fw={600} size="sm" lineClamp={1}>{name}</Text>
        </Group>
        <SwarmBadge tone="secondary" emphasis="soft">
          {tagCount} {tagCount === 1 ? 'tag' : 'tags'}
        </SwarmBadge>
      </Group>
      {description && (
        <Text size="xs" c="dimmed" lineClamp={1}>{description}</Text>
      )}
      <Group gap="xs" mt="auto">
        <SwarmButton tone="primary" emphasis="soft" size="compact-xs" onClick={onApply} style={{ flex: 1 }}>
          Apply
        </SwarmButton>
        {!isDefault && onEdit && (
          <SwarmActionIcon tone="secondary" emphasis="ghost" onClick={onEdit} label="Edit preset">
            <IconEdit size={14} />
          </SwarmActionIcon>
        )}
        {!isDefault && onDelete && (
          <SwarmActionIcon tone="danger" emphasis="ghost" onClick={onDelete} label="Delete preset">
            <IconTrash size={14} />
          </SwarmActionIcon>
        )}
      </Group>
    </ElevatedCard>
  );
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd swarmui-react && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add swarmui-react/src/components/PromptWizardPresetCard.tsx
git commit -m "feat(presetBrowser): add PromptWizardPresetCard component"
```

---

### Task 6: PromptWizardPresetCreator component

**Files:**
- Create: `swarmui-react/src/components/PromptWizardPresetCreator.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { memo, useCallback, useMemo, useState } from 'react';
import { Group, Select, Stack, Text, TextInput, UnstyledButton } from '@mantine/core';
import { SwarmBadge, SwarmButton } from './ui';
import { PRESET_CATEGORIES, PRESET_CATEGORY_LABELS } from '../features/promptWizard/types';
import type { PresetCategory, PromptTag } from '../features/promptWizard/types';

interface PromptWizardPresetCreatorProps {
  activeCategory: PresetCategory;
  selectedTagIds: string[];
  allTags: PromptTag[];
  onSave: (preset: { name: string; description?: string; category: PresetCategory; tagIds: string[]; thumbnail?: string }) => void;
  onCancel: () => void;
  initialName?: string;
  initialDescription?: string;
  initialCategory?: PresetCategory;
}

export const PromptWizardPresetCreator = memo(function PromptWizardPresetCreator({
  activeCategory,
  selectedTagIds,
  allTags,
  onSave,
  onCancel,
  initialName,
  initialDescription,
  initialCategory,
}: PromptWizardPresetCreatorProps) {
  const [name, setName] = useState(initialName ?? '');
  const [description, setDescription] = useState(initialDescription ?? '');
  const [category, setCategory] = useState<PresetCategory>(initialCategory ?? activeCategory);
  const [includedTagIds, setIncludedTagIds] = useState<Set<string>>(new Set(selectedTagIds));

  const selectedTags = useMemo(
    () => selectedTagIds.map((id) => allTags.find((t) => t.id === id)).filter(Boolean) as PromptTag[],
    [selectedTagIds, allTags]
  );

  const toggleInclude = useCallback((tagId: string) => {
    setIncludedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  }, []);

  const canSave = name.trim().length > 0 && includedTagIds.size > 0;

  const handleSave = useCallback(() => {
    if (!canSave) return;
    onSave({
      name: name.trim(),
      description: description.trim() || undefined,
      category,
      tagIds: Array.from(includedTagIds),
    });
  }, [canSave, name, description, category, includedTagIds, onSave]);

  const categoryData = PRESET_CATEGORIES.map((c) => ({ value: c, label: PRESET_CATEGORY_LABELS[c] }));

  return (
    <Stack gap="md" p="md">
      <Group justify="space-between">
        <Text fw={600} size="sm">Create New Preset</Text>
        <SwarmButton tone="secondary" emphasis="ghost" size="compact-xs" onClick={onCancel}>
          Cancel
        </SwarmButton>
      </Group>

      <TextInput
        label="Name"
        placeholder="e.g., Heroic Knight"
        value={name}
        onChange={(e) => setName(e.currentTarget.value)}
        required
        size="sm"
      />

      <TextInput
        label="Description"
        placeholder="Optional short description"
        value={description}
        onChange={(e) => setDescription(e.currentTarget.value)}
        size="sm"
      />

      <Select
        label="Category"
        data={categoryData}
        value={category}
        onChange={(val) => val && setCategory(val as PresetCategory)}
        size="sm"
      />

      <Stack gap="xs">
        <Text size="sm" fw={500}>Include Tags ({includedTagIds.size} selected)</Text>
        {selectedTags.length === 0 ? (
          <Text size="xs" c="dimmed" ta="center" py="md">
            No tags selected. Switch to Steps view and select some tags first, then come back here to save them as a preset.
          </Text>
        ) : (
          <Group gap={6} wrap="wrap">
            {selectedTags.map((tag) => (
              <UnstyledButton key={tag.id} onClick={() => toggleInclude(tag.id)}>
                <SwarmBadge
                  tone={includedTagIds.has(tag.id) ? 'primary' : 'secondary'}
                  emphasis={includedTagIds.has(tag.id) ? 'filled' : 'ghost'}
                >
                  {tag.text}
                </SwarmBadge>
              </UnstyledButton>
            ))}
          </Group>
        )}
      </Stack>

      <Group justify="flex-end" gap="xs">
        <SwarmButton tone="secondary" emphasis="ghost" size="compact-sm" onClick={onCancel}>
          Cancel
        </SwarmButton>
        <SwarmButton tone="primary" emphasis="filled" size="compact-sm" onClick={handleSave} disabled={!canSave}>
          Save Preset
        </SwarmButton>
      </Group>
    </Stack>
  );
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd swarmui-react && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add swarmui-react/src/components/PromptWizardPresetCreator.tsx
git commit -m "feat(presetBrowser): add PromptWizardPresetCreator component"
```

---

### Task 7: PromptWizardBrowser component

**Files:**
- Create: `swarmui-react/src/components/PromptWizardBrowser.tsx`

- [ ] **Step 1: Create the component**

```tsx
import { memo, useCallback, useMemo, useState } from 'react';
import { Box, ScrollArea, SimpleGrid, Stack, Tabs, Text, TextInput } from '@mantine/core';
import { IconPlus, IconSearch } from '@tabler/icons-react';
import { SwarmButton } from './ui';
import { PromptWizardPresetCard } from './PromptWizardPresetCard';
import { PromptWizardPresetCreator } from './PromptWizardPresetCreator';
import { PRESET_CATEGORIES, PRESET_CATEGORY_LABELS } from '../features/promptWizard/types';
import type { BrowserPreset, PresetCategory, PromptTag } from '../features/promptWizard/types';

interface PromptWizardBrowserProps {
  defaultPresets: BrowserPreset[];
  userPresets: BrowserPreset[];
  activeCategory: PresetCategory;
  searchQuery: string;
  selectedTagIds: string[];
  allTags: PromptTag[];
  onCategoryChange: (category: PresetCategory) => void;
  onSearchChange: (query: string) => void;
  onApplyPreset: (tagIds: string[]) => void;
  onAddPreset: (preset: Omit<BrowserPreset, 'id' | 'isDefault'>) => void;
  onUpdatePreset: (presetId: string, updates: Partial<Pick<BrowserPreset, 'name' | 'description' | 'category' | 'tagIds' | 'thumbnail'>>) => void;
  onRemovePreset: (presetId: string) => void;
}

export const PromptWizardBrowser = memo(function PromptWizardBrowser({
  defaultPresets,
  userPresets,
  activeCategory,
  searchQuery,
  selectedTagIds,
  allTags,
  onCategoryChange,
  onSearchChange,
  onApplyPreset,
  onAddPreset,
  onUpdatePreset,
  onRemovePreset,
}: PromptWizardBrowserProps) {
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);

  const allPresets = useMemo(
    () => [...defaultPresets, ...userPresets],
    [defaultPresets, userPresets]
  );

  const filteredPresets = useMemo(() => {
    let result = allPresets.filter((p) => p.category === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (p) => p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [allPresets, activeCategory, searchQuery]);

  const handleSavePreset = useCallback(
    (preset: Omit<BrowserPreset, 'id' | 'isDefault'>) => {
      if (editingPresetId) {
        onUpdatePreset(editingPresetId, preset);
        setEditingPresetId(null);
      } else {
        onAddPreset(preset);
      }
      setCreatorOpen(false);
    },
    [editingPresetId, onAddPreset, onUpdatePreset]
  );

  const handleEditPreset = useCallback((preset: BrowserPreset) => {
    setEditingPresetId(preset.id);
    setCreatorOpen(true);
  }, []);

  const handleCancelCreator = useCallback(() => {
    setCreatorOpen(false);
    setEditingPresetId(null);
  }, []);

  const editingPreset = editingPresetId
    ? allPresets.find((p) => p.id === editingPresetId)
    : undefined;

  return (
    <Stack gap={0} style={{ height: '100%', minHeight: 0 }}>
      {/* Category tabs */}
      <Tabs
        value={activeCategory}
        onChange={(val) => val && onCategoryChange(val as PresetCategory)}
        variant="outline"
        style={{ flexShrink: 0 }}
      >
        <Tabs.List px="md" pt="sm">
          {PRESET_CATEGORIES.map((cat) => (
            <Tabs.Tab key={cat} value={cat}>
              {PRESET_CATEGORY_LABELS[cat]}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs>

      {/* Search */}
      <Box px="md" py="xs" style={{ flexShrink: 0 }}>
        <TextInput
          placeholder="Search presets..."
          leftSection={<IconSearch size={16} />}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.currentTarget.value)}
          size="sm"
        />
      </Box>

      {/* Content: creator or grid */}
      <ScrollArea style={{ flex: 1, minHeight: 0 }} px="md" pb="md">
        {creatorOpen ? (
          <PromptWizardPresetCreator
            activeCategory={activeCategory}
            selectedTagIds={editingPreset ? editingPreset.tagIds : selectedTagIds}
            allTags={allTags}
            onSave={handleSavePreset}
            onCancel={handleCancelCreator}
            initialName={editingPreset?.name}
            initialDescription={editingPreset?.description}
            initialCategory={editingPreset?.category}
          />
        ) : (
          <Stack gap="md">
            {filteredPresets.length === 0 ? (
              <Text size="sm" c="dimmed" ta="center" py="xl">
                {searchQuery.trim() ? 'No presets match your search.' : 'No presets in this category yet.'}
              </Text>
            ) : (
              <SimpleGrid cols={{ base: 2, sm: 3, md: 4 }} spacing="sm">
                {filteredPresets.map((preset) => (
                  <PromptWizardPresetCard
                    key={preset.id}
                    name={preset.name}
                    description={preset.description}
                    thumbnail={preset.thumbnail}
                    tagCount={preset.tagIds.length}
                    isDefault={preset.isDefault}
                    onApply={() => onApplyPreset(preset.tagIds)}
                    onEdit={!preset.isDefault ? () => handleEditPreset(preset) : undefined}
                    onDelete={!preset.isDefault ? () => onRemovePreset(preset.id) : undefined}
                  />
                ))}
              </SimpleGrid>
            )}
            <SwarmButton
              tone="secondary"
              emphasis="soft"
              size="compact-sm"
              leftSection={<IconPlus size={14} />}
              onClick={() => setCreatorOpen(true)}
              style={{ alignSelf: 'flex-start' }}
            >
              Create Preset
            </SwarmButton>
          </Stack>
        )}
      </ScrollArea>
    </Stack>
  );
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd swarmui-react && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add swarmui-react/src/components/PromptWizardBrowser.tsx
git commit -m "feat(presetBrowser): add PromptWizardBrowser component"
```

---

## Chunk 3: Integration

### Task 8: Add Steps/Presets toggle to the header

**Files:**
- Modify: `swarmui-react/src/components/PromptWizardHeader.tsx`

- [ ] **Step 1: Add new props to the interface**

Add these props to `PromptWizardHeaderProps`:

```typescript
  activeView: 'steps' | 'presets';
  onViewChange: (view: 'steps' | 'presets') => void;
```

And destructure them in the component function params.

- [ ] **Step 2: Add the segmented control**

In the second `<Group>` (the one with search input, line 72), insert a `SwarmSegmentedControl` **before** the search input:

```tsx
        <SwarmSegmentedControl
          value={activeView}
          onChange={(value) => onViewChange(value as 'steps' | 'presets')}
          data={[
            { label: 'Steps', value: 'steps' },
            { label: 'Presets', value: 'presets' },
          ]}
          style={{ flex: '0 0 160px' }}
        />
```

- [ ] **Step 3: Conditionally hide tag search when in Presets view**

Wrap the existing `TextInput` and search scope `SwarmSegmentedControl` in a conditional:

```tsx
        {activeView === 'steps' && (
          <>
            <TextInput
              placeholder={searchScope === 'global' ? 'Search tags across all steps...' : 'Search only in the current step...'}
              leftSection={<IconSearch size={16} />}
              value={searchQuery}
              onChange={(event) => onSearchChange(event.currentTarget.value)}
              size="sm"
              style={{ flex: '1 1 360px', minWidth: 280 }}
            />
            <SwarmSegmentedControl
              value={searchScope}
              onChange={(value) => onSearchScopeChange(value as 'global' | 'step')}
              data={[
                { label: 'Global', value: 'global' },
                { label: 'This Step', value: 'step' },
              ]}
              style={{ flex: '0 0 176px' }}
            />
          </>
        )}
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd swarmui-react && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: Errors about missing props in PromptWizard.tsx (expected — we fix that next)

- [ ] **Step 5: Commit**

```bash
git add swarmui-react/src/components/PromptWizardHeader.tsx
git commit -m "feat(presetBrowser): add Steps/Presets toggle to wizard header"
```

---

### Task 9: Wire everything together in PromptWizard.tsx

**Files:**
- Modify: `swarmui-react/src/components/PromptWizard.tsx`

This is the main integration task. Changes:

- [ ] **Step 1: Add imports**

Add to the imports at the top:

```typescript
import { PromptWizardBrowser } from './PromptWizardBrowser';
import type { BrowserPreset } from '../features/promptWizard/types';
```

- [ ] **Step 2: Add lazy loader for browser presets**

After the existing `loadDefaultPresets` function, add:

```typescript
let defaultBrowserPresetsPromise: Promise<BrowserPreset[]> | null = null;

function loadDefaultBrowserPresets(): Promise<BrowserPreset[]> {
  if (!defaultBrowserPresetsPromise) {
    defaultBrowserPresetsPromise = import('../data/promptBrowserPresets.json').then((m) => m.default as BrowserPreset[]);
  }
  return defaultBrowserPresetsPromise;
}
```

- [ ] **Step 3: Add state for default browser presets**

After the existing `const [defaultPresets, setDefaultPresets] = useState<PromptPreset[]>([]);` line, add:

```typescript
  const [defaultBrowserPresets, setDefaultBrowserPresets] = useState<BrowserPreset[]>([]);
```

- [ ] **Step 4: Add store destructuring for new fields**

Add these to the existing store destructuring block:

```typescript
    userBrowserPresets,
    activeView,
    activePresetCategory,
    presetSearchQuery,
    setActiveView,
    setActivePresetCategory,
    setPresetSearchQuery,
    resetPresetBrowserEphemeral,
    applyBrowserPreset,
    addBrowserPreset,
    updateBrowserPreset,
    removeBrowserPreset,
```

- [ ] **Step 5: Update handleOpen to also load browser presets**

Change the `Promise.all` in `handleOpen` to include browser presets:

```typescript
    Promise.all([loadDefaultTags(), loadDefaultPresets(), loadDefaultBrowserPresets()])
      .then(([tags, presets, browserPresets]) => {
        setDefaultTags(tags);
        setDefaultPresets(presets);
        setDefaultBrowserPresets(browserPresets);
        setHasLoaded(true);
      })
```

- [ ] **Step 6: Add close handler that resets ephemeral state**

Create a new close handler that resets browser state:

```typescript
  const handleClose = useCallback(() => {
    close();
    resetPresetBrowserEphemeral();
  }, [close, resetPresetBrowserEphemeral]);
```

Replace all references to `close` in the JSX with `handleClose`:
- The `onClose` prop on the `<Modal>` component
- The `onClose` prop passed to `<PromptWizardHeader>`

- [ ] **Step 7: Pass new props to PromptWizardHeader**

Add `activeView` and `onViewChange` props:

```tsx
            <PromptWizardHeader
              activeProfileId={activeProfileId}
              onProfileChange={setActiveProfile}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              searchScope={searchScope}
              onSearchScopeChange={setSearchScope}
              totalSelected={totalSelected}
              onClose={handleClose}
              onOpenLibrary={sidebarHandlers.open}
              canvasVisible={canvasVisible}
              onToggleCanvas={toggleCanvas}
              activeView={activeView}
              onViewChange={setActiveView}
            />
```

- [ ] **Step 8: Conditionally render browser vs steps in the main body**

Replace the existing Column 1 (step rail) and Column 2 (tag palette) content with a conditional based on `activeView`:

```tsx
              {activeView === 'steps' ? (
                <>
                  {/* Column 1: Vertical step rail (hidden when narrow) */}
                  {!isNarrow && (
                    <PromptWizardSteps
                      steps={orderedStepMeta}
                      activeStep={activeStep}
                      tagCountsByStep={tagCountsByStep}
                      completionByStep={completionByStep}
                      onStepClick={setActiveStep}
                    />
                  )}

                  {/* Column 2: Tag Palette */}
                  <Box style={{ flex: 1, minWidth: 0, minHeight: 0, height: '100%', overflow: 'hidden' }}>
                    <PromptWizardStepContent
                      stepMeta={stepMeta}
                      tags={stepTags}
                      allTags={allTags}
                      selectedTagIds={selectedTagIdSet}
                      manualNegativeTexts={manualNegativeTexts}
                      searchQuery={searchQuery}
                      onToggleTag={handleToggleTag}
                      onAddNegativePair={toggleManualNegativeText}
                      onFocusGroup={recordGroupFocus}
                    />
                  </Box>
                </>
              ) : (
                /* Preset Browser — replaces step rail + tag palette */
                <Box style={{ flex: 1, minWidth: 0, minHeight: 0, height: '100%', overflow: 'hidden' }}>
                  <PromptWizardBrowser
                    defaultPresets={defaultBrowserPresets}
                    userPresets={userBrowserPresets}
                    activeCategory={activePresetCategory}
                    searchQuery={presetSearchQuery}
                    selectedTagIds={selectedTagIds}
                    allTags={allTags}
                    onCategoryChange={setActivePresetCategory}
                    onSearchChange={setPresetSearchQuery}
                    onApplyPreset={applyBrowserPreset}
                    onAddPreset={addBrowserPreset}
                    onUpdatePreset={updateBrowserPreset}
                    onRemovePreset={removeBrowserPreset}
                  />
                </Box>
              )}
```

- [ ] **Step 9: Conditionally render footer nav with presets-view footer**

Replace the footer Group with a conditional that shows step nav in Steps view and a simplified bar in Presets view:

```tsx
            {activeView === 'steps' ? (
              <Group
                justify="space-between"
                px="sm"
                py={6}
                style={{
                  borderTop: '1px solid var(--mantine-color-default-border)',
                  flexShrink: 0,
                }}
              >
                <SwarmButton tone="secondary" emphasis="ghost" size="compact-sm" onClick={goToPrev} disabled={!canGoPrev}>
                  Previous
                </SwarmButton>
                <Text size="xs" c="dimmed">{stepMeta.label} ({currentStepIndex + 1}/{profileStepOrder.length})</Text>
                <SwarmButton tone="secondary" emphasis="ghost" size="compact-sm" onClick={goToNext} disabled={!canGoNext}>
                  Next
                </SwarmButton>
              </Group>
            ) : (
              <Group
                justify="space-between"
                px="sm"
                py={6}
                style={{
                  borderTop: '1px solid var(--mantine-color-default-border)',
                  flexShrink: 0,
                }}
              >
                <Text size="xs" c="dimmed">{totalSelected} tags selected</Text>
                <SwarmButton tone="secondary" emphasis="ghost" size="compact-sm" onClick={() => setActiveView('steps')}>
                  Switch to Steps
                </SwarmButton>
              </Group>
            )}
```

- [ ] **Step 10: Also conditionally render the horizontal step tabs for narrow layout**

Wrap the existing narrow-mode horizontal step tabs (between the header and the main `<Box>`) in a view conditional:

```tsx
            {activeView === 'steps' && isNarrow && (
              <PromptWizardSteps
                steps={orderedStepMeta}
                activeStep={activeStep}
                tagCountsByStep={tagCountsByStep}
                completionByStep={completionByStep}
                onStepClick={setActiveStep}
                horizontal
              />
            )}
```

- [ ] **Step 11: Fix pre-existing bug in bottom stacked preview**

The existing `PromptWizard.tsx` bottom stacked preview (around line 485–503) references undefined callbacks. Replace the broken props in the bottom stacked `<PromptWizardPreview>` to match the side panel preview exactly. The broken lines are:

```tsx
// BROKEN (remove these two lines):
                  onApplyToPrompt={handleApplyPrompt}
                  onApplyToNegative={handleApplyNegative}
```

Replace the entire bottom stacked `<PromptWizardPreview>` props to match the side panel instance:

```tsx
                <PromptWizardPreview
                  positivePreview={assembled.positive}
                  negativePreview={mergedNegativePreview}
                  positiveCount={selectedTags.length}
                  negativeCount={mergedNegativePreview ? mergedNegativePreview.split(profile?.tagSeparator ?? ', ').filter(Boolean).length : 0}
                  explicitCount={explicitCount}
                  profileName={profile?.name ?? 'Unknown'}
                  profileStepSummary={profileStepSummary}
                  healthIssues={promptHealth}
                  onSendToGenerate={handleSendToGenerate}
                  onAppendToGenerate={handleAppendToGenerate}
                  onCopyPositive={handleCopyPositive}
                  onCopyNegative={handleCopyNegative}
                  onClear={clearSelections}
                  hasSelection={totalSelected > 0}
                  selectedTags={selectedTags}
                  tagWeights={tagWeights}
                  onDeselectTag={deselectTag}
                  activeStep={activeStep}
                  onJumpStep={setActiveStep}
                />
```

- [ ] **Step 12: Verify TypeScript compiles**

Run: `cd swarmui-react && npx tsc --noEmit --pretty 2>&1 | head -20`
Expected: No errors

- [ ] **Step 13: Run all existing tests**

Run: `cd swarmui-react && npx vitest run`
Expected: All tests pass (existing + new store tests)

- [ ] **Step 14: Commit**

```bash
git add swarmui-react/src/components/PromptWizard.tsx
git commit -m "feat(presetBrowser): wire browser into wizard with view toggle and ephemeral reset"
```

---

### Task 10: Manual Smoke Test

- [ ] **Step 1: Start the dev server**

Run: `cd swarmui-react && npm run dev:vite`

- [ ] **Step 2: Verify the wizard opens**

Open the Prompt Wizard modal. Confirm the Steps/Presets toggle appears in the header.

- [ ] **Step 3: Test preset browser view**

Click "Presets" toggle. Verify:
- Category tabs appear (Characters, Scenes, Styles, Perspectives, Explicit)
- Preset cards show in a grid with name, tag count, and Apply button
- Clicking a category tab filters to that category
- Search filters presets by name
- Tag search bar from Steps view is hidden

- [ ] **Step 4: Test applying a preset**

Click "Apply" on a preset. Verify:
- Tags are added to the selection (visible in preview panel)
- Apply is additive — applying a second preset adds more tags without removing existing ones

- [ ] **Step 5: Test preset creation**

1. Switch to Steps view, select some tags
2. Switch to Presets view, click "Create Preset"
3. Fill in name, pick category, toggle tags to include
4. Save — verify it appears in the grid
5. Verify it persists after page reload

- [ ] **Step 6: Test closing and reopening**

Close the wizard modal. Reopen. Verify:
- View resets to Steps (not stuck on Presets)
- Preset search is cleared
- Category tab persists (stays on last-used category)

- [ ] **Step 7: Report results**

Document any issues found and fix them before marking complete.
