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
|  200-400px (resize) |  flex (fills center)   |  320px fixed             |
|  initial: 260px     |                        |  (toggleable)            |
|                     |                        |                          |
|  [Active Character  |  [Header w/ border]    |  [Connection Status]     |
|   Portrait + Info]  |  [Messages area,       |  [LLM Parameters]        |
|                     |   darker background]   |  [Image Gen Parameters]  |
|  [Character List]   |  [Input: Enter=send]   |                          |
+---------+-----------+------------+-----------+-------------+------------+
```

- Header toggle renamed from "Show/Hide Scene" to "Show/Hide Controls"
- Connection badge removed from header (info now in Controls panel)
- Same responsive behavior: Controls panel hidden on narrow screens, toggleable on wide (1366px+ breakpoint)
- Controls panel starts closed on narrow screens (same as current ScenePanel default)

## Controls Panel (new file: `ControlsPanel.tsx`, replaces `ScenePanel.tsx`)

A scrollable panel with collapsible accordion sections. Width: 320px fixed.

### Props

`ControlsPanel` receives the following props from `index.tsx`:
- `onProbeConnection: () => void` — moved from `CharacterSidebar`, calls the existing `probeConnection` callback in `index.tsx`
- `onRegisterGenerate` and `onRegisterGenerateWithPrompt` — same ref-registration pattern currently used by `ScenePanel` for cross-panel image generation coordination with `ChatPanel`

### Connection Status Section

Collapsible. Default open when LM Studio is disconnected, auto-collapses when connected. SwarmUI connectivity is inferred from the app being loaded (it is the host), not tracked separately in the store.

**LM Studio card:**
- Green/red dot status indicator
- Endpoint URL (editable TextInput)
- Detected API mode label (e.g. "openai-compatible", "openai-responses", "legacy-lmstudio")
- Currently loaded model name
- "Test Connection" button (calls `onProbeConnection`)

**SwarmUI card:**
- Green dot (always assumed connected since the React app is served by SwarmUI)
- Base URL display (from `runtimeEndpoints` config)

**Collapsed summary line** (when connected): "LM Studio: model-name | SwarmUI: Ready"

### LLM Parameters Section

Collapsible. Default open.

- **Model selector**: Dropdown populated from `availableModels` in store, bound to `selectedModelId`
- **Temperature slider**: 0.0-2.0, step 0.1, default 0.8
- **Max tokens slider**: 256-8192, step 256, default 2048

### Image Generation Section

Collapsible. Default open.

- **Image model selector**: Bound to `imageModelId` in store. Shows fallback hint when empty (uses generate page model). Includes "Load Model" button with progress indicator — same behavior as current ScenePanel's model selector.
- **Aspect ratio selector**: Landscape (768x512), Portrait (512x768), Square (512x512), Wide (1024x768) — same options as current ScenePanel
- **Steps slider**: 1-150, default 20 (marks at 20, 50)
- **CFG Scale slider**: 1-30, step 0.5, default 7 (marks at 7, 15)
- **CLIP Stop-at-Layer**: Checkbox to enable, slider -24 to -1 when enabled
- **Generate Scene button**: Same generate/regenerate button currently in ScenePanel. Triggers image generation using the scene description from the LLM or from a `[SCENE: ...]` tag prompt.

### Image Generation Logic

The image generation functions (`generateImageWithPrompt`, `handleGenerateScene`, `handleGenerateSceneWithPrompt`) move from `ScenePanel.tsx` into `ControlsPanel.tsx`. They use the same SwarmUI client API calls, LoRA/IP-Adapter configuration from the active character, and the image parameters from the store/local state.

The `onRegisterGenerate` and `onRegisterGenerateWithPrompt` ref-registration pattern is preserved so that `ChatPanel`'s scene suggestion cards can still trigger image generation via the Controls panel.

Scene image display: Generated scene images are attached to chat messages via `attachSceneImageToLastMessage` and displayed inline in the chat. The Controls panel does not need its own image display area. The `setSceneImage()` calls in the migrated generation logic should be removed — `sceneImage` becomes an orphaned store field. Remove `sceneImage`, `setSceneImage`, and `isGeneratingImage`/`setGeneratingImage` from the store since the image display no longer lives in a dedicated panel. Image generation loading state can be tracked locally in `ControlsPanel` instead.

All values persist to localStorage via Zustand store.

## Character Sidebar (modified: `CharacterSidebar.tsx`)

### Props Changes

- **Remove**: `onProbeConnection` prop (moved to `ControlsPanel`)
- Keep all other existing props

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

- **Enter** sends the message (calls `handleSend`). Must call `e.preventDefault()` to stop Mantine's Textarea from inserting a newline.
- **Shift+Enter** inserts a newline (default Textarea behavior, no handler needed)
- Placeholder text updated: `(Shift+Enter for new line)`
- Previous Ctrl+Enter behavior removed

### No Other Changes

Message bubbles, streaming indicator, scene suggestion cards, abort behavior, and auto-scroll all remain unchanged.

## Store Changes (`roleplayStore.ts`)

### New State Fields (persisted)

```typescript
chatTemperature: number    // default 0.8, range 0.0-2.0
chatMaxTokens: number      // default 2048, range 256-8192
imageWidth: number          // default 768
imageHeight: number         // default 512
```

### New Actions

```typescript
setChatTemperature: (v: number) => void
setChatMaxTokens: (v: number) => void
setImageDimensions: (width: number, height: number) => void
// Note: setImageDimensions replaces the local setImageWidth/setImageHeight
// calls in ScenePanel.tsx. The aspect ratio Select onChange calls
// setImageDimensions(w, h) as a single atomic update.
```

### Updated Persistence

Add `chatTemperature`, `chatMaxTokens`, `imageWidth`, and `imageHeight` to the `partialize` function.

### Migration Note

No store version bump needed. The existing Zustand `persist` middleware with `partialize` gracefully handles missing fields in old snapshots — new fields will initialize to their defaults when not present in localStorage. The defaults are set in the store's initial state, not derived from the snapshot.

## Service Changes (`roleplayChatService.ts`)

### Pass-through Parameters

The `StreamChatInput` interface gains two optional fields:

```typescript
temperature?: number;   // falls back to 0.8 if omitted
maxTokens?: number;     // falls back to 2048 if omitted
```

`streamRoleplayChat()` maps these to `buildChatBody()`'s options: `temperature` passes directly, `maxTokens` maps to `max_tokens` (snake_case) to match `buildChatBody`'s existing options interface. The change is adding the fields to `StreamChatInput` and forwarding them with the name mapping — `buildChatBody` itself needs no changes.

`ChatPanel.tsx` reads `chatTemperature` and `chatMaxTokens` from the store and passes them to `streamRoleplayChat()`.

## Page Orchestrator Changes (`index.tsx`)

- Import `ControlsPanel` instead of `ScenePanel`
- Rename "Show/Hide Scene" toggle to "Show/Hide Controls"
- Remove connection badge from header
- Pass `onProbeConnection` to `ControlsPanel` (instead of `CharacterSidebar`)
- Pass `onRegisterGenerate` and `onRegisterGenerateWithPrompt` refs to `ControlsPanel` (same pattern as current `ScenePanel`)
- Pass same responsive/toggle props to `ControlsPanel`

## Files Changed

| File | Action | Scope |
|------|--------|-------|
| `ControlsPanel.tsx` | **Create** | New file, ~400-500 lines |
| `ScenePanel.tsx` | **Delete** | Fully replaced |
| `CharacterSidebar.tsx` | **Modify** | Remove connection UI + `onProbeConnection` prop, add active character profile |
| `ChatPanel.tsx` | **Modify** | Enter-to-send, darker background, pass temperature/maxTokens |
| `index.tsx` | **Modify** | Swap panel references, rename toggle, move `onProbeConnection` to `ControlsPanel` |
| `roleplayStore.ts` | **Modify** | Add chatTemperature, chatMaxTokens, imageWidth, imageHeight; remove sceneImage, isGeneratingImage |
| `roleplayChatService.ts` | **Modify** | Add temperature/maxTokens to `StreamChatInput` interface |

## What Is NOT Changing

- CharacterEditor modal (no changes)
- CharacterAvatar component (no changes)
- Message bubble rendering (no changes)
- Streaming/abort logic (no changes)
- Scene suggestion card system (no changes)
- Prompt presets system (no changes)
- LoRA/IP-Adapter configuration (stays in CharacterEditor)
- Responsive breakpoint behavior (same 1366px threshold)
- Resizable sidebar hook (same 200-400px range, initial 260px)
- Image generation SwarmUI API calls (same client, same parameters, just relocated)
