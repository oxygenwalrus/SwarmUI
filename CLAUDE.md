# SwarmUI Fork - Claude Context

## Repository Overview
This is a fork of [mcmonkeyprojects/SwarmUI](https://github.com/mcmonkeyprojects/SwarmUI) with a custom React frontend built on top.

- **Origin (fork):** https://github.com/oxygenwalrus/SwarmUI
- **Upstream (source):** https://github.com/mcmonkeyprojects/SwarmUI

## Custom Work in This Fork

### React Frontend (`swarmui-react/`)
A full React/TypeScript frontend built with Vite, Mantine UI, and Zustand.
- Source lives in `swarmui-react/src/`
- Built output deploys to `src/wwwroot/react/`
- Main feature branch: `feature/roleplay-chat-page`

### Modified Backend Files
These C# files have been changed from upstream and may conflict on future merges:
- `src/WebAPI/AdminAPI.cs` — improved UpdateAndRestart (fetch+checkout+pull with autostash, bug fix in extension hash logging)
- `src/WebAPI/T2IAPI.cs` — added ListImagesV2, ExportHistoryZip endpoints, WebSocket ping/signal handling, model validation, diagnostic logging

## Syncing with Upstream
Run `sync-upstream.bat` (Windows) or `sync-upstream.sh` (bash) to pull in new upstream releases.

```bash
./sync-upstream.sh
# or on Windows:
sync-upstream.bat
```

**Watch for merge conflicts in:** `AdminAPI.cs` and `T2IAPI.cs`

## Git Remotes
- `origin` — your fork (push here)
- `upstream` — mcmonkeyprojects repo (fetch only, push is disabled)

## File Structure Notes
- `swarmui-react/node_modules/`, `swarmui-react/dist/` — gitignored, not committed
- `/Output`, `/Data`, `/Models` — gitignored, never commit these
- `.claude/worktrees/` — gitignored (Claude Code internal)
