# Roleplay Page UI/UX Overhaul

**Date:** 2026-03-17
**Status:** Approved
**Approach:** Replace-in-place (Approach A)

## Summary

Overhaul the Roleplay page by replacing the Scene panel with a Controls panel, enriching the Character sidebar, and improving the Chat panel visuals and input behavior. No architectural changes to the page layout — same three-panel flex structure, same resizable sidebar, same responsive behavior.

## Layout

```
+-- Header: "Roleplay" + subtitle + "Show/Hide Controls" toggle --------+
|                                                                         |
+- Character Sidebar -+- Chat Panel ----------+- Controls Panel ---------+
|  260-400px (resize) |  flex (fills center)   |  320px fixed             |
|                     |                        |  (toggleable)            |
|  [Active Character  |  [Header w/ border]    |  [Connection Status]     |
|   Portrait + Info]  |  [Messages area,       |  [LLM Parameters]        |
|                     |   darker background]   |  [Image Gen Parameters]  |
|  [Character List]   |  [Input: Enter=send]   |                          |
+---------+-----------+------------+-----------+-------------+------------+
```

- Header toggle renamed from "Show/Hide Scene" to "Show/Hide Controls"
- Connection badge removed from header (info now in Controls panel)
- Same responsive behavior: Controls panel hidden on narrow screens, toggleable on wide (1366px+ breakpoint)

## Controls Panel (new file: `ControlsPanel.tsx`, replaces `ScenePanel.tsx`)

A scrollable panel with collapsible accordion sections. Width: 320px fixed.

### Connection Status Section

Collapsible. Default open when disconnected, auto-collapses when both services connected.

**LM Studio card:**
- Green/red dot status indicator
- Endpoint URL (editable TextInput)
- Detected API mode label (e.g. "openai-compatible", "openai-responses", "legacy-lmstudio")
- Currently loaded model name
- "Test Connection" button

**SwarmUI card:**
- Green/red dot status indicator
- Base URL display
- Connection state

**Collapsed summary line** (when both connected): "LM Studio: model-name | SwarmUI: Connected"

### LLM Parameters Section

Collapsible. Default open.

- **Model selector**: Dropdown populated from `availableModels` in store
- **Temperature slider**: 0.0-2.0, step 0.1, default 0.8
- **Max tokens slider**: 256-8192, step 256, default 2048

### Image Generation Section

Collapsible. Default open.

- **Aspect ratio selector**: Landscape (768x512), Portrait (512x768), Square (512x512), Wide (1024x768) — same options as current ScenePanel
- **Steps slider**: 1-150, default 20 (marks at 20, 50)
- **CFG Scale slider**: 1-30, step 0.5, default 7 (marks at 7, 15)
- **CLIP Stop-at-Layer**: Checkbox to enable, slider -24 to -1 when enabled

All values persist to localStorage via Zustand store.

## Character Sidebar (modified: `CharacterSidebar.tsx`)

### Active Character Profile (new, top of sidebar)

- Large circular portrait (~120px) with initial-letter fallback
- Character name in bold below portrait
- Personality text in dimmed smaller font, 2-3 line clamp
- Edit button to open CharacterEditor modal

### Character List (existing, below profile)

- Same card-per-character pattern
- Each card: small avatar (28px), name, truncated personality
- Click to switch active character
- Edit/delete action icons on hover
- "+" button to add new character

### Removed from Sidebar

- Connection settings popover (moved to Controls panel)
- "Connected" badge at bottom (redundant)

## Chat Panel (modified: `ChatPanel.tsx`)

### Visual Changes

- Messages area background: darker shade using `var(--elevation-floor)` for visual depth
- Chat header border: keep existing `borderBottom: 1px solid var(--theme-gray-5)`
- Input area border: keep existing `borderTop: 1px solid var(--theme-gray-5)`

### Input Behavior Change

- **Enter** sends the message (calls `handleSend`)
- **Shift+Enter** inserts a newline
- Placeholder text updated: `(Shift+Enter for new line)`
- Previous Ctrl+Enter behavior removed

### No Other Changes

Message bubbles, streaming indicator, scene suggestion cards, abort behavior, and auto-scroll all remain unchanged.

## Store Changes (`roleplayStore.ts`)

### New State Fields (persisted)

```typescript
chatTemperature: number    // default 0.8, range 0.0-2.0
chatMaxTokens: number      // default 2048, range 256-8192
```

### New Actions

```typescript
setChatTemperature: (v: number) => void
setChatMaxTokens: (v: number) => void
```

### Updated Persistence

Add `chatTemperature` and `chatMaxTokens` to the `partialize` function so they persist to localStorage.

## Service Changes (`roleplayChatService.ts`)

### Pass-through Parameters

Replace hardcoded `temperature: 0.8` and `max_tokens: 2048` in `streamRoleplayChat()` with parameters passed from the caller. The `StreamChatInput` interface gains optional `temperature` and `maxTokens` fields.

`ChatPanel.tsx` reads `chatTemperature` and `chatMaxTokens` from the store and passes them through.

## Page Orchestrator Changes (`index.tsx`)

- Import `ControlsPanel` instead of `ScenePanel`
- Rename "Show/Hide Scene" toggle to "Show/Hide Controls"
- Remove connection badge from header
- Pass same responsive/toggle props to `ControlsPanel`

## Files Changed

| File | Action | Scope |
|------|--------|-------|
| `ControlsPanel.tsx` | **Create** | New file, ~350-450 lines |
| `ScenePanel.tsx` | **Delete** | Fully replaced |
| `CharacterSidebar.tsx` | **Modify** | Remove connection UI, add active character profile |
| `ChatPanel.tsx` | **Modify** | Enter-to-send, darker background, pass temperature/maxTokens |
| `index.tsx` | **Modify** | Swap panel references, rename toggle |
| `roleplayStore.ts` | **Modify** | Add chatTemperature, chatMaxTokens state + actions |
| `roleplayChatService.ts` | **Modify** | Accept temperature/maxTokens params instead of hardcoding |

## What Is NOT Changing

- CharacterEditor modal (no changes)
- CharacterAvatar component (no changes)
- Message bubble rendering (no changes)
- Streaming/abort logic (no changes)
- Scene suggestion card system (no changes)
- Prompt presets system (no changes)
- LoRA/IP-Adapter configuration (stays in CharacterEditor)
- Responsive breakpoint behavior (same 1366px threshold)
- Resizable sidebar hook (same 260-400px range)
