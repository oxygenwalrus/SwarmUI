# SwarmUI React Frontend Feature Matrix

This file is the frontend product inventory for the current React app. It is intended to reflect the shipped UI surfaces rather than historical roadmap notes.

## App Shell

| Capability | Status | Notes |
| --- | --- | --- |
| URL-backed top-level routing | Live | Hash routes for `generate`, `history`, `queue`, `workflows`, and `server` with per-page query state. |
| Command palette | Live | `Ctrl/Cmd+K` for page navigation, model search, recent prompts, recent images, and quick actions. |
| Asset catalog | Live | Unified browser for models, LoRAs, embeddings, control nets, upscalers, VAEs, and wildcards. |
| PWA + desktop wrappers | Live | Browser, Electron, and Tauri integration remain supported. |

## Generate Workspace

| Capability | Status | Notes |
| --- | --- | --- |
| Quick, guided, and advanced modes | Live | Workspace modes are route-aware and persisted. |
| Recipes | Live | Reusable workflow recipes sit above presets for intent-level reuse. |
| Workspace snapshot restore | Live | Last generate session can be restored from the workspace deck. |
| Preflight validation | Live | Blocks missing-model runs and warns on incomplete feature combinations. |
| Prompt assistant | Live | Apply or apply-and-generate assistant patches from the current context. |
| Canvas workflow bridge | Live | Canvas edits can sync back into Generate or continue through generate flow. |

## History And Review

| Capability | Status | Notes |
| --- | --- | --- |
| Server-side history search and filtering | Live | Path, prompt, model, seed, metadata, media type, and starred filters. |
| Saved views | Live | Save and reopen route-aware review views. |
| Collections | Live | Add selected items to named collections for batching and review. |
| Compare workspace | Live | Side-by-side comparison for two selected images. |
| Lineage panel | Live | Selected image lineage summary surfaces prompt, model, seed, and resolution. |
| Export ZIP | Live | Export selected or filtered history results. |

## Queue And Workflow Operations

| Capability | Status | Notes |
| --- | --- | --- |
| Queue runner | Live | Start, pause, stop, reorder, prioritize, and inspect jobs. |
| Job provenance | Live | Queue jobs can retain recipe and workspace origin metadata. |
| Scheduled jobs | Live | Queue supports delayed execution. |
| Workflow workspace routing | Live | Guided wizard and ComfyUI editor are route-backed and resumable. |

## Terminology

- `Preset`: saved parameter bundle synced with the backend.
- `Recipe`: reusable workflow intent bundle for the React workspace.
- `Workflow`: guided wizard or ComfyUI graph/editor flow.
- `Queue batch`: grouped jobs processed together.
- `Collection`: user-curated history grouping for review.

## Verification

- Run `npm test` for unit coverage.
- Run `npm run build` for type-check and production bundle verification.
