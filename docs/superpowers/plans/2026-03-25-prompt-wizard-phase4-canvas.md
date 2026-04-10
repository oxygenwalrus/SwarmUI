# Prompt Wizard Phase 4: Collapsible Canvas + Send to Generate

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing Prompt Canvas (right panel) collapsible, and add a unified "Send to Generate" split button that sends both positive and negative prompts to the generate page in one action.

**Architecture:** The canvas (`PromptWizardPreview`) already exists as a full 3rd-column panel with structured pills, text preview, and health issues. Phase 4 adds: (1) a collapse toggle in the header that hides/shows the canvas column, (2) a "Send to Generate" split button (primary = replace, dropdown = append) that fires both `onApplyToPrompt` and `onApplyToNegative` in one click. The current separate "Apply" and "Negative" buttons are replaced by this unified action.

**Tech Stack:** React, Mantine UI (Menu, ActionIcon, Button), existing Zustand store (no changes needed).

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `src/components/PromptWizardPreview.tsx` | Modify | Replace separate Apply/Negative buttons with unified "Send to Generate" split button. Add "Copy to clipboard" action. |
| `src/components/PromptWizard.tsx` | Modify | Add `canvasCollapsed` state. Toggle canvas column visibility. Pass toggle state to header. |
| `src/components/PromptWizardHeader.tsx` | Modify | Add canvas toggle button (eye icon) to header toolbar. |

All paths relative to `swarmui-react/`.

---

## Chunk 1: Canvas Collapse Toggle

### Task 1: Add canvas toggle button to header

**Files:**
- Modify: `src/components/PromptWizardHeader.tsx`

- [ ] **Step 1: Extend header interface and add toggle button**

Add two new props: `canvasVisible: boolean` and `onToggleCanvas: () => void`. Add a toggle button next to the library button using `IconLayoutSidebarRight` (visible) / `IconLayoutSidebarRightCollapse` (collapsed).

In the imports, add:
```tsx
import { IconLayoutSidebarRight, IconLayoutSidebarRightCollapse } from '@tabler/icons-react';
```

Extend the interface:
```tsx
interface PromptWizardHeaderProps {
  // ... existing props ...
  canvasVisible?: boolean;
  onToggleCanvas?: () => void;
}
```

Add to the destructuring, then in the toolbar Group (next to the library button), add:
```tsx
{onToggleCanvas && (
  <SwarmActionIcon
    tone={canvasVisible ? 'primary' : 'secondary'}
    emphasis={canvasVisible ? 'soft' : 'ghost'}
    onClick={onToggleCanvas}
    label={canvasVisible ? 'Hide prompt canvas' : 'Show prompt canvas'}
  >
    {canvasVisible ? <IconLayoutSidebarRight size={18} /> : <IconLayoutSidebarRightCollapse size={18} />}
  </SwarmActionIcon>
)}
```

- [ ] **Step 2: Verify build**

Run: `cd swarmui-react && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/PromptWizardHeader.tsx
git commit -m "feat(prompt-wizard): add canvas toggle button to header"
```

### Task 2: Wire canvas collapse state in PromptWizard

**Files:**
- Modify: `src/components/PromptWizard.tsx`

- [ ] **Step 1: Add canvasCollapsed state and wire to layout**

Add state near other disclosure states (around line 52):
```tsx
const [canvasVisible, setCanvasVisible] = useState(true);
const toggleCanvas = useCallback(() => setCanvasVisible((v) => !v), []);
```

Pass to `PromptWizardHeader`:
```tsx
<PromptWizardHeader
  // ... existing props ...
  canvasVisible={canvasVisible}
  onToggleCanvas={toggleCanvas}
/>
```

Update the Column 3 condition. Currently (line 412):
```tsx
{!isStackedCanvas && (
```
Change to:
```tsx
{!isStackedCanvas && canvasVisible && (
```

Update the bottom fallback condition. Currently (line 457):
```tsx
{isStackedCanvas && (
```
Change to:
```tsx
{(isStackedCanvas || !canvasVisible) && (
```

This means: when canvas is collapsed in wide view, it falls back to the compact bottom strip — so users never lose access to the preview entirely.

- [ ] **Step 2: Verify build**

Run: `cd swarmui-react && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 3: Commit**

```bash
git add src/components/PromptWizard.tsx
git commit -m "feat(prompt-wizard): wire collapsible canvas state to 3-column layout"
```

---

## Chunk 2: Unified Send to Generate Button

### Task 3: Replace Apply/Negative buttons with Send to Generate split button

**Files:**
- Modify: `src/components/PromptWizardPreview.tsx`

- [ ] **Step 1: Update imports**

Add `Menu` to the Mantine import:
```tsx
import { Box, Group, Menu, ScrollArea, Stack, Text, Textarea } from '@mantine/core';
```

Add `IconChevronDown`, `IconSend` to tabler imports:
```tsx
import { IconAlertTriangle, IconChevronDown, IconCopy, IconSend, IconSparkles, IconTrash, IconX } from '@tabler/icons-react';
```

- [ ] **Step 2: Add onSendToGenerate and onAppendToGenerate props**

Update the interface — replace `onApplyToPrompt` and `onApplyToNegative` with:
```tsx
interface PromptWizardPreviewProps {
  positivePreview: string;
  negativePreview: string;
  positiveCount: number;
  negativeCount: number;
  explicitCount: number;
  profileName: string;
  profileStepSummary: string;
  healthIssues: PromptHealthIssue[];
  onSendToGenerate: () => void;
  onAppendToGenerate: () => void;
  onCopyPositive: () => void;
  onCopyNegative: () => void;
  onClear: () => void;
  hasSelection: boolean;
  selectedTags?: PromptTag[];
  tagWeights?: Record<string, number>;
  onDeselectTag?: (tagId: string) => void;
  activeStep?: BuilderStep;
  onJumpStep?: (step: BuilderStep) => void;
}
```

Update destructuring to match.

- [ ] **Step 3: Replace the button section**

Replace the existing `<Group grow gap={6}>` section (the Apply + Negative buttons, lines 241-273) with:

```tsx
<Group grow gap={6}>
  {/* Split button: Send to Generate (replace) + dropdown (append) */}
  <Group gap={0} grow style={{ position: 'relative' }}>
    <SwarmButton
      tone="primary"
      size="compact-sm"
      leftSection={<IconSend size={14} />}
      onClick={onSendToGenerate}
      disabled={!positivePreview}
      style={{ borderTopRightRadius: 0, borderBottomRightRadius: 0, flex: 1 }}
    >
      Send to Generate
    </SwarmButton>
    <Menu position="bottom-end" withArrow shadow="md">
      <Menu.Target>
        <SwarmButton
          tone="primary"
          size="compact-sm"
          disabled={!positivePreview}
          style={{
            borderTopLeftRadius: 0,
            borderBottomLeftRadius: 0,
            borderLeft: '1px solid rgba(255,255,255,0.2)',
            paddingInline: 6,
            minWidth: 'auto',
          }}
        >
          <IconChevronDown size={14} />
        </SwarmButton>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item leftSection={<IconSend size={14} />} onClick={onSendToGenerate} disabled={!positivePreview}>
          Replace prompt
        </Menu.Item>
        <Menu.Item leftSection={<IconPlus size={14} />} onClick={onAppendToGenerate} disabled={!positivePreview}>
          Append to prompt
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item leftSection={<IconCopy size={14} />} onClick={onCopyPositive} disabled={!positivePreview}>
          Copy positive
        </Menu.Item>
        {negativePreview && (
          <Menu.Item leftSection={<IconCopy size={14} />} onClick={onCopyNegative}>
            Copy negative
          </Menu.Item>
        )}
      </Menu.Dropdown>
    </Menu>
  </Group>
</Group>

<SwarmButton
  tone="secondary"
  emphasis="ghost"
  size="compact-xs"
  leftSection={<IconTrash size={12} />}
  onClick={onClear}
  disabled={!hasSelection}
  fullWidth
>
  Clear all
</SwarmButton>
```

- [ ] **Step 4: Verify build**

Run: `cd swarmui-react && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 5: Commit**

```bash
git add src/components/PromptWizardPreview.tsx
git commit -m "feat(prompt-wizard): replace Apply/Negative with unified Send to Generate split button"
```

### Task 4: Wire new Preview props in PromptWizard

**Files:**
- Modify: `src/components/PromptWizard.tsx`

- [ ] **Step 1: Add send/append/copy handlers**

Add these handlers after the existing `handleApplyNegative` (around line 186):

```tsx
const handleSendToGenerate = useCallback(() => {
  if (!assembled.positive || !onApplyToPrompt) return;
  onApplyToPrompt(assembled.positive);
  if (mergedNegativePreview && onApplyToNegative) {
    onApplyToNegative(mergedNegativePreview);
  }
  notifications.show({ title: 'Sent to Generate', message: 'Prompt and negatives applied.', color: 'teal' });
}, [assembled.positive, mergedNegativePreview, onApplyToPrompt, onApplyToNegative]);

const handleAppendToGenerate = useCallback(() => {
  if (!assembled.positive || !onApplyToPrompt) return;
  // For append mode, we prefix with ", " so it appends rather than replaces
  onApplyToPrompt(assembled.positive);
  if (mergedNegativePreview && onApplyToNegative) {
    onApplyToNegative(mergedNegativePreview);
  }
  notifications.show({ title: 'Appended to Prompt', message: 'Tags appended to existing prompt.', color: 'teal' });
}, [assembled.positive, mergedNegativePreview, onApplyToPrompt, onApplyToNegative]);

const handleCopyPositive = useCallback(() => {
  if (assembled.positive) {
    navigator.clipboard.writeText(assembled.positive);
    notifications.show({ title: 'Copied', message: 'Positive prompt copied to clipboard.', color: 'teal' });
  }
}, [assembled.positive]);

const handleCopyNegative = useCallback(() => {
  if (mergedNegativePreview) {
    navigator.clipboard.writeText(mergedNegativePreview);
    notifications.show({ title: 'Copied', message: 'Negative prompt copied to clipboard.', color: 'teal' });
  }
}, [mergedNegativePreview]);
```

**Important note about append vs replace:** The current `onApplyToPrompt` prop is a simple `(text: string) => void` callback. Whether it replaces or appends depends on the caller (the GeneratePage that renders `PromptWizard`). We need to either:
- (a) Add a second callback `onAppendToPrompt?: (text: string) => void` to the `PromptWizardProps` interface, or
- (b) Change the existing callback signature to `(text: string, mode: 'replace' | 'append') => void`

Option (b) is cleaner. Update the `PromptWizardProps` interface:

```tsx
interface PromptWizardProps {
  onApplyToPrompt?: (text: string, mode?: 'replace' | 'append') => void;
  onApplyToNegative?: (text: string, mode?: 'replace' | 'append') => void;
  compact?: boolean;
}
```

Then the handlers become:
```tsx
const handleSendToGenerate = useCallback(() => {
  if (!assembled.positive || !onApplyToPrompt) return;
  onApplyToPrompt(assembled.positive, 'replace');
  if (mergedNegativePreview && onApplyToNegative) {
    onApplyToNegative(mergedNegativePreview, 'replace');
  }
  notifications.show({ title: 'Sent to Generate', message: 'Prompt and negatives applied.', color: 'teal' });
}, [assembled.positive, mergedNegativePreview, onApplyToPrompt, onApplyToNegative]);

const handleAppendToGenerate = useCallback(() => {
  if (!assembled.positive || !onApplyToPrompt) return;
  onApplyToPrompt(assembled.positive, 'append');
  if (mergedNegativePreview && onApplyToNegative) {
    onApplyToNegative(mergedNegativePreview, 'append');
  }
  notifications.show({ title: 'Appended to Prompt', message: 'Tags appended to existing prompt.', color: 'teal' });
}, [assembled.positive, mergedNegativePreview, onApplyToPrompt, onApplyToNegative]);
```

- [ ] **Step 2: Update both PromptWizardPreview render sites**

Replace props on both the wide-view (Column 3, around line 414) and the stacked-view (bottom fallback, around line 459) `<PromptWizardPreview>` instances. Change:

```
onApplyToPrompt={handleApplyPrompt}
onApplyToNegative={handleApplyNegative}
```

To:

```
onSendToGenerate={handleSendToGenerate}
onAppendToGenerate={handleAppendToGenerate}
onCopyPositive={handleCopyPositive}
onCopyNegative={handleCopyNegative}
```

Remove the now-unused `handleApplyPrompt` and `handleApplyNegative` callbacks.

- [ ] **Step 3: Find and update the GeneratePage caller**

The `PromptWizard` is rendered somewhere in the GeneratePage with `onApplyToPrompt` and `onApplyToNegative` callbacks. Find that call site and update it to handle the new `mode` parameter:
- `'replace'`: set the prompt text directly (existing behavior)
- `'append'`: append to the existing prompt text with a separator (`, `)

Use `grep` to find the call site: search for `onApplyToPrompt` in files other than PromptWizard.tsx.

- [ ] **Step 4: Verify build**

Run: `cd swarmui-react && npx tsc --noEmit`
Expected: No type errors

- [ ] **Step 5: Commit**

```bash
git add src/components/PromptWizard.tsx src/components/PromptWizardPreview.tsx
git commit -m "feat(prompt-wizard): wire Send to Generate with replace/append modes and clipboard copy"
```

---

## Final Verification

- [ ] **Step 1: Full type check**

Run: `cd swarmui-react && npx tsc --noEmit`
Expected: No type errors in Prompt Wizard files

- [ ] **Step 2: Visual check**

Run: `cd swarmui-react && npm run dev`
Open browser to localhost, navigate to Prompt Wizard:
1. Verify canvas toggle button in header shows/hides the right panel
2. When collapsed, verify bottom strip preview appears as fallback
3. Verify "Send to Generate" button sends both positive and negative
4. Verify dropdown menu shows: Replace, Append, Copy positive, Copy negative
5. Verify Copy actions work
6. Verify Clear all still works
