# SwarmUI React Frontend

A React-first interface for SwarmUI with browser, Electron, and Tauri targets.

## Quick Start

1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the browser app:
   ```bash
   npm run dev
   ```
3. Build for production:
   ```bash
   npm run build
   ```

## Current Product Surfaces

- URL-backed routing for `generate`, `history`, `queue`, `workflows`, and `server`
- Command palette for navigation, quick actions, model search, recent prompts, and recent images
- Unified asset catalog across models, LoRAs, embeddings, control nets, upscalers, VAEs, and wildcards
- Generate workspace modes: quick, guided, and advanced
- Recipe management, workspace restore, and generation preflight validation
- History saved views, collections, compare, export, and lineage summary
- Queue provenance metadata for recipe/workspace-aware jobs
- Guided workflow and ComfyUI workspace routing

## Documentation

- [FEATURES.md](FEATURES.md): living feature matrix and terminology
- [QUICK_START.md](QUICK_START.md): setup guide
- [INTEGRATION_GUIDE.md](INTEGRATION_GUIDE.md): integration into the main SwarmUI install
- [ELECTRON_README.md](ELECTRON_README.md): desktop wrapper notes

## Development

```bash
npm run dev
npm run test
npm run build
```
