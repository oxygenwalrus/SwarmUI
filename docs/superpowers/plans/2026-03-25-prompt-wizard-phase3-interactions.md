# Prompt Wizard Phase 3: Interaction Improvements

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add weight popover, suggestion strip, tag tooltips, and alias display to the Prompt Wizard tag palette.

**Architecture:** Four focused changes to existing components. The weight popover replaces inline +/- buttons in `PromptWizardTagChip`. The suggestion strip is a new collapsible card rendered at the top of `PromptWizardStepContent`, powered by existing `buildStepGuidance` logic. Tag tooltips wrap each chip with contextual info (aliases, negatives, conflicts, pairings). No new store changes needed — all state is component-local or already exists.

**Tech Stack:** React, Mantine UI (Popover, Slider, NumberInput, Tooltip, Tabs, Paper, ActionIcon), Zustand (existing store), @tabler/icons-react.

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/components/PromptWizardTagChip.tsx` | Modify | Replace inline +/- with weight-number click → Popover (Slider + NumberInput). Add Tooltip wrapper with aliases/negatives/conflicts/pairings. |
| `src/components/PromptWizardSuggestionStrip.tsx` | Create | Collapsible suggestion card with tabbed categories. Consumes `buildStepGuidance` output. |
| `src/components/PromptWizardStepContent.tsx` | Modify | Import and render `PromptWizardSuggestionStrip` above the tag palette. Pass required props. |

All paths relative to `swarmui-react/`.

---

## Chunk 1: Weight Popover + Tag Tooltip

### Task 1: Replace inline weight controls with popover in PromptWizardTagChip

**Files:**
- Modify: `src/components/PromptWizardTagChip.tsx`

- [ ] **Step 1: Update imports and interface**

Add Mantine Popover, Slider, NumberInput, Tooltip imports. Extend props interface to accept tooltip data fields (`aliases`, `negativeText`, `conflictTagNames`, `pairingTagNames`).

```tsx
import { memo, useCallback, useState, useMemo } from 'react';
import { Group, UnstyledButton, Popover, Slider, NumberInput, Tooltip, Stack, Text } from '@mantine/core';
import { IconSparkles, IconAlertTriangle } from '@tabler/icons-react';
import { SwarmBadge } from './ui';

interface PromptWizardTagChipProps {
  text: string;
  selected: boolean;
  weight?: number;
  isConflict?: boolean;
  isPairing?: boolean;
  onToggle: () => void;
  onWeightChange?: (weight: number) => void;
  // Tooltip data
  aliases?: string[];
  negativeText?: string;
  conflictTagNames?: string[];
  pairingTagNames?: string[];
}
```

- [ ] **Step 2: Implement weight popover and tooltip**

Replace the entire component body. Key changes:
- Remove `handleIncrease`/`handleDecrease` callbacks and the inline `<Group gap={2}>` with +/- buttons
- Add `weightPopoverOpen` state
- When selected AND weight !== 1.0, show weight as a clickable label that opens Popover
- When selected AND weight === 1.0, clicking the weight area (a small "1.0" label) opens the popover
- Popover contains: `<Stack gap="xs">` with `<Slider>` (min 0.1, max 2.0, step 0.1) and `<NumberInput>` (same range)
- Wrap the entire SwarmBadge in a `<Tooltip>` with `openDelay={400}` and multiline content
- Tooltip content built from: aliases, negativeText, conflictTagNames, pairingTagNames — only showing sections that have data
- If no tooltip data exists, render `<Tooltip disabled>`

```tsx
export const PromptWizardTagChip = memo(function PromptWizardTagChip({
  text,
  selected,
  weight = 1.0,
  isConflict,
  isPairing,
  onToggle,
  onWeightChange,
  aliases,
  negativeText,
  conflictTagNames,
  pairingTagNames,
}: PromptWizardTagChipProps) {
  const [weightPopoverOpen, setWeightPopoverOpen] = useState(false);

  const handleWeightClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setWeightPopoverOpen((o) => !o);
  }, []);

  const handleSliderChange = useCallback((val: number) => {
    onWeightChange?.(Math.round(val * 10) / 10);
  }, [onWeightChange]);

  const handleNumberChange = useCallback((val: string | number) => {
    if (typeof val === 'number') {
      const clamped = Math.max(0.1, Math.min(2.0, Math.round(val * 10) / 10));
      onWeightChange?.(clamped);
    }
  }, [onWeightChange]);

  // Build tooltip content
  const tooltipContent = useMemo(() => {
    const lines: string[] = [];
    if (aliases && aliases.length > 0) {
      lines.push(`Also known as: ${aliases.join(', ')}`);
    }
    if (negativeText) {
      lines.push(`Auto-negative: ${negativeText}`);
    }
    if (conflictTagNames && conflictTagNames.length > 0) {
      lines.push(`Conflicts with: ${conflictTagNames.join(', ')}`);
    }
    if (pairingTagNames && pairingTagNames.length > 0) {
      lines.push(`Pairs well with: ${pairingTagNames.join(', ')}`);
    }
    return lines.length > 0 ? lines.join('\n') : null;
  }, [aliases, negativeText, conflictTagNames, pairingTagNames]);

  // Determine styling based on conflict / pairing
  let tone: any = selected ? 'primary' : 'secondary';
  let emphasis: any = selected ? 'solid' : 'transparent';
  let style: any = { cursor: 'pointer', userSelect: 'none', fontSize: '0.90rem', paddingInline: selected ? 8 : 14, paddingBlock: 4 };

  if (!selected && isConflict) {
    tone = 'danger';
    emphasis = 'soft';
    style.opacity = 0.6;
    style.textDecoration = 'line-through';
  } else if (!selected && isPairing) {
    tone = 'warning';
    emphasis = 'light';
    style.border = '1px solid var(--mantine-color-warning-light)';
  }

  const badge = (
    <SwarmBadge
      tone={tone}
      emphasis={emphasis}
      size="lg"
      style={style}
      onClick={onToggle}
      title={isConflict ? 'Conflicts with current selection' : isPairing ? 'Suggested pairing!' : ''}
    >
      <Group gap={6} wrap="nowrap" align="center">
        {!selected && isPairing && <IconSparkles size={12} />}
        {!selected && isConflict && <IconAlertTriangle size={12} />}
        <span>{text}</span>

        {selected && onWeightChange && (
          <Popover
            opened={weightPopoverOpen}
            onChange={setWeightPopoverOpen}
            position="bottom"
            withArrow
            shadow="md"
            trapFocus={false}
          >
            <Popover.Target>
              <UnstyledButton
                onClick={handleWeightClick}
                style={{
                  background: 'rgba(0,0,0,0.15)',
                  borderRadius: 8,
                  padding: '1px 6px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  lineHeight: 1.4,
                }}
              >
                {weight.toFixed(1)}
              </UnstyledButton>
            </Popover.Target>
            <Popover.Dropdown onClick={(e) => e.stopPropagation()} style={{ padding: 12 }}>
              <Stack gap="xs" style={{ width: 180 }}>
                <Text size="xs" fw={600}>Tag Weight</Text>
                <Slider
                  value={weight}
                  onChange={handleSliderChange}
                  min={0.1}
                  max={2.0}
                  step={0.1}
                  marks={[
                    { value: 0.5, label: '0.5' },
                    { value: 1.0, label: '1.0' },
                    { value: 1.5, label: '1.5' },
                    { value: 2.0, label: '2.0' },
                  ]}
                  size="sm"
                  label={(val) => val.toFixed(1)}
                />
                <NumberInput
                  value={weight}
                  onChange={handleNumberChange}
                  min={0.1}
                  max={2.0}
                  step={0.1}
                  decimalScale={1}
                  size="xs"
                />
              </Stack>
            </Popover.Dropdown>
          </Popover>
        )}
      </Group>
    </SwarmBadge>
  );

  if (tooltipContent) {
    return (
      <Tooltip
        label={tooltipContent}
        multiline
        w={260}
        openDelay={400}
        withArrow
        position="top"
        style={{ whiteSpace: 'pre-line' }}
      >
        {badge}
      </Tooltip>
    );
  }

  return badge;
});
```

- [ ] **Step 3: Verify the build compiles**

Run: `cd swarmui-react && npx tsc --noEmit`
Expected: No type errors related to PromptWizardTagChip

- [ ] **Step 4: Commit**

```bash
git add src/components/PromptWizardTagChip.tsx
git commit -m "feat(prompt-wizard): replace inline weight +/- with click popover and add tag tooltip"
```

### Task 2: Pass tooltip data from PromptWizardStepContent to TagChip

**Files:**
- Modify: `src/components/PromptWizardStepContent.tsx`

- [ ] **Step 1: Build tag name lookup maps for conflicts/pairings**

Inside `PromptWizardStepContent`, add a `useMemo` that creates a `Map<string, string>` mapping tag IDs to tag text for all tags. Then, in the render loop where `<PromptWizardTagChip>` is rendered, compute and pass the tooltip props.

Add after the existing `pairingSet` memo (around line 133):

```tsx
const tagNameById = useMemo(() => {
  const map = new Map<string, string>();
  for (const tag of allTags) {
    map.set(tag.id, tag.text);
  }
  return map;
}, [allTags]);
```

- [ ] **Step 2: Pass tooltip props to PromptWizardTagChip**

In the render section where `<PromptWizardTagChip>` is rendered (around line 447), add the new props:

```tsx
<PromptWizardTagChip
  key={tag.id}
  text={tag.text}
  selected={selectedTagIds.has(tag.id)}
  weight={tagWeights[tag.id]}
  onWeightChange={(w) => setTagWeight(tag.id, w)}
  isConflict={conflictSet.has(tag.id)}
  isPairing={pairingSet.has(tag.id)}
  onToggle={() => onToggleTag(tag.id)}
  aliases={tag.aliases}
  negativeText={tag.negativeText}
  conflictTagNames={tag.conflictTagIds?.map((id) => tagNameById.get(id)).filter((n): n is string => Boolean(n))}
  pairingTagNames={tag.pairingTagIds?.map((id) => tagNameById.get(id)).filter((n): n is string => Boolean(n))}
/>
```

- [ ] **Step 3: Verify build**

Run: `cd swarmui-react && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/components/PromptWizardStepContent.tsx
git commit -m "feat(prompt-wizard): pass tooltip data (aliases, negatives, conflicts, pairings) to tag chips"
```

---

## Chunk 2: Suggestion Strip

### Task 3: Create PromptWizardSuggestionStrip component

**Files:**
- Create: `src/components/PromptWizardSuggestionStrip.tsx`

- [ ] **Step 1: Write the suggestion strip component**

A collapsible card with a Mantine `Tabs` component showing suggestion categories from `buildStepGuidance`. Each tab shows 4-6 tag chips. Collapse state is component-local (not persisted).

```tsx
import { memo, useMemo, useState } from 'react';
import { Box, Group, Stack, Text, Tabs, UnstyledButton, Collapse, Paper } from '@mantine/core';
import { IconChevronDown, IconChevronRight, IconBulb } from '@tabler/icons-react';
import { PromptWizardTagChip } from './PromptWizardTagChip';
import { buildStepGuidance } from '../features/promptWizard/wizardInsights';
import type { PromptTag, StepMeta } from '../features/promptWizard/types';
interface PromptWizardSuggestionStripProps {
  stepMeta: StepMeta;
  allTags: PromptTag[];
  visibleTags: PromptTag[];
  selectedTagIds: Set<string>;
  onToggleTag: (tagId: string) => void;
}

export const PromptWizardSuggestionStrip = memo(function PromptWizardSuggestionStrip({
  stepMeta,
  allTags,
  visibleTags,
  selectedTagIds,
  onToggleTag,
}: PromptWizardSuggestionStripProps) {
  const [collapsed, setCollapsed] = useState(false);

  const selectedTags = useMemo(
    () => allTags.filter((t) => selectedTagIds.has(t.id)),
    [allTags, selectedTagIds]
  );

  const suggestions = useMemo(
    () => buildStepGuidance(stepMeta, allTags, visibleTags, selectedTags, selectedTagIds),
    [stepMeta, allTags, visibleTags, selectedTags, selectedTagIds]
  );

  if (suggestions.length === 0) return null;

  const totalCount = suggestions.reduce((sum, s) => sum + s.tags.length, 0);

  return (
    <Paper
      withBorder
      radius="md"
      style={{
        background: 'var(--elevation-raised)',
        borderColor: `color-mix(in srgb, var(--mantine-color-${stepMeta.tone}-filled) 20%, var(--mantine-color-default-border))`,
      }}
    >
      {/* Header — always visible */}
      <UnstyledButton
        onClick={() => setCollapsed((c) => !c)}
        style={{ width: '100%', padding: '8px 12px' }}
      >
        <Group justify="space-between" align="center">
          <Group gap="xs" align="center">
            {collapsed ? <IconChevronRight size={14} /> : <IconChevronDown size={14} />}
            <IconBulb size={14} style={{ color: `var(--mantine-color-${stepMeta.tone}-filled)` }} />
            <Text size="xs" fw={600}>Suggestions</Text>
            <Text size="xs" c="dimmed">{totalCount} tags</Text>
          </Group>
        </Group>
      </UnstyledButton>

      {/* Body — collapsible */}
      <Collapse in={!collapsed}>
        <Box px={12} pb={12}>
          <Tabs defaultValue={suggestions[0]?.title} variant="pills" radius="xl" size="xs">
            <Tabs.List mb="xs">
              {suggestions.map((set) => (
                <Tabs.Tab key={set.title} value={set.title}>
                  {set.title} ({set.tags.length})
                </Tabs.Tab>
              ))}
            </Tabs.List>

            {suggestions.map((set) => (
              <Tabs.Panel key={set.title} value={set.title}>
                <Stack gap={4}>
                  <Text size="xs" c="dimmed">{set.description}</Text>
                  <Group gap={6}>
                    {set.tags.map((tag) => (
                      <PromptWizardTagChip
                        key={tag.id}
                        text={tag.text}
                        selected={selectedTagIds.has(tag.id)}
                        onToggle={() => onToggleTag(tag.id)}
                      />
                    ))}
                  </Group>
                </Stack>
              </Tabs.Panel>
            ))}
          </Tabs>
        </Box>
      </Collapse>
    </Paper>
  );
});
```

- [ ] **Step 2: Verify build**

Run: `cd swarmui-react && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/PromptWizardSuggestionStrip.tsx
git commit -m "feat(prompt-wizard): add collapsible suggestion strip with tabbed categories"
```

### Task 4: Integrate suggestion strip into PromptWizardStepContent

**Files:**
- Modify: `src/components/PromptWizardStepContent.tsx`

- [ ] **Step 1: Import and render the suggestion strip**

Add import at top:

```tsx
import { PromptWizardSuggestionStrip } from './PromptWizardSuggestionStrip';
```

Inside the render, right after the `<Box p="md">` / `<Stack gap="md">` opening (before the empty-state check around line 369), insert:

```tsx
<PromptWizardSuggestionStrip
  stepMeta={stepMeta}
  allTags={allTags}
  visibleTags={visibleTags}
  selectedTagIds={selectedTagIds}
  onToggleTag={onToggleTag}
/>
```

This places it above all the tag cards but below the header bar, inside the scrollable area.

- [ ] **Step 2: Verify build**

Run: `cd swarmui-react && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/PromptWizardStepContent.tsx
git commit -m "feat(prompt-wizard): integrate suggestion strip into step content"
```

---

## Chunk 3: Minor nice-to-have — Negative pair tab in suggestions

### Task 5: Add negative pair tab to suggestion strip (optional)

**Files:**
- Modify: `src/components/PromptWizardSuggestionStrip.tsx`

- [ ] **Step 1: Add negative pair candidates as extra tab**

Import `buildNegativePairCandidates` from wizardInsights. Compute candidates. If any exist, append an extra tab "Negative pairs" that shows each candidate tag text → negative text, with a click handler that calls a new `onAddNegativePair` prop.

Update the interface:

```tsx
interface PromptWizardSuggestionStripProps {
  stepMeta: StepMeta;
  allTags: PromptTag[];
  visibleTags: PromptTag[];
  selectedTagIds: Set<string>;
  manualNegativeTexts: string[];
  onToggleTag: (tagId: string) => void;
  onAddNegativePair: (text: string) => void;
}
```

Add after `suggestions` memo:

```tsx
const negativeCandidates = useMemo(
  () => buildNegativePairCandidates(selectedTags, manualNegativeTexts),
  [selectedTags, manualNegativeTexts]
);
```

Append to the tabs rendering (after the `suggestions.map` panels), conditionally render a "Negative pairs" tab if `negativeCandidates.length > 0`.

- [ ] **Step 2: Update PromptWizardStepContent to pass new props**

In `PromptWizardStepContent`, destructure `manualNegativeTexts` and `onAddNegativePair` from the component's props (they are declared in the interface but not currently destructured at line ~113). Then pass them through to the strip.

- [ ] **Step 3: Verify build**

Run: `cd swarmui-react && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 4: Commit**

```bash
git add src/components/PromptWizardSuggestionStrip.tsx src/components/PromptWizardStepContent.tsx
git commit -m "feat(prompt-wizard): add negative pair tab to suggestion strip"
```

---

## Final Verification

- [ ] **Step 1: Full build check**

Run: `cd swarmui-react && npm run build`
Expected: Build succeeds with no errors

- [ ] **Step 2: Visual check**

Run: `cd swarmui-react && npm run dev`
Open browser to localhost, navigate to Prompt Wizard:
1. Verify tag chips show tooltip on hover (400ms delay) with aliases/negatives/conflicts
2. Verify clicking weight number opens popover with slider + number input
3. Verify suggestion strip appears above tags with tabbed categories
4. Verify suggestion strip collapses/expands
5. Verify selecting a suggested tag works correctly
