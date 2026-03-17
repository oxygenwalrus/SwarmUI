# SwarmUI React Integration Guide

This guide will help you integrate the React interface into your main SwarmUI installation.

## Current Setup

You're currently in a Claude worktree at:
```
C:\Users\phala\.claude-worktrees\SwarmUI\swarmui-react\
```

Your main SwarmUI installation is likely at a different location. Let's call it `YOUR_SWARMUI_DIR`.

## Integration Steps

### Option 1: Copy React Frontend to Main SwarmUI (Recommended)

This keeps the React interface as part of your SwarmUI installation.

#### Step 1: Locate Your Main SwarmUI Directory

Find where SwarmUI is installed. Common locations:
- `C:\SwarmUI\`
- `C:\Users\YourName\SwarmUI\`
- `D:\SwarmUI\`

#### Step 2: Copy the React Interface

Copy the entire `swarmui-react` folder to your main SwarmUI directory:

**Using Command Prompt (Windows):**
```cmd
xcopy "C:\Users\phala\.claude-worktrees\SwarmUI\swarmui-react" "YOUR_SWARMUI_DIR\swarmui-react" /E /I /H /Y
```

**Using PowerShell (Windows):**
```powershell
Copy-Item -Path "C:\Users\phala\.claude-worktrees\SwarmUI\swarmui-react" -Destination "YOUR_SWARMUI_DIR\swarmui-react" -Recurse -Force
```

**Using Terminal (Linux/Mac):**
```bash
cp -r "C:/Users/phala/.claude-worktrees/SwarmUI/swarmui-react" "YOUR_SWARMUI_DIR/swarmui-react"
```

#### Step 3: Install Dependencies

Navigate to the copied directory and install:

```bash
cd YOUR_SWARMUI_DIR/swarmui-react
npm install
```

#### Step 4: Test the Integration

**Browser Mode (React only):**
```bash
npm run dev
```
Then open http://localhost:5173

**Electron Desktop App:**
```bash
npm run electron:dev
```

### Option 2: Move from Worktree to Main Installation

If you want to completely move (not copy):

**Windows:**
```cmd
move "C:\Users\phala\.claude-worktrees\SwarmUI\swarmui-react" "YOUR_SWARMUI_DIR\swarmui-react"
```

**Linux/Mac:**
```bash
mv "C:/Users/phala/.claude-worktrees/SwarmUI/swarmui-react" "YOUR_SWARMUI_DIR/swarmui-react"
```

## Clean Up Mock Data (Already Done!)

✅ The codebase is already clean and production-ready. All data comes from the SwarmUI API endpoints.

**What's Using Real API Data:**
- ✅ Model list - `swarmClient.listModels()`
- ✅ VAE list - `swarmClient.listVAEs()`
- ✅ LoRA list - `swarmClient.listLoRAs()`
- ✅ ControlNet list - `swarmClient.listControlNets()`
- ✅ Backend list - `swarmClient.listBackends()`
- ✅ Image generation - `swarmClient.generateImage()`
- ✅ Image gallery - `swarmClient.listImages()`

**No Mock Data Present** - Everything connects to your real SwarmUI backend!

## Directory Structure After Integration

```
YOUR_SWARMUI_DIR/
├── launch-windows.bat          # SwarmUI backend launcher
├── launch-linux.sh             # SwarmUI backend launcher (Linux/Mac)
├── src/                        # SwarmUI C# backend source
├── Models/                     # Your AI models
├── Output/                     # Generated images
├── swarmui-react/             # NEW: React frontend
│   ├── src/                   # React source code
│   ├── electron/              # Electron wrapper
│   ├── dist/                  # Built React app
│   ├── node_modules/          # Dependencies
│   ├── package.json
│   ├── vite.config.ts
│   ├── start-electron.bat     # Windows launcher
│   ├── start-electron.sh      # Linux/Mac launcher
│   ├── QUICK_START.md
│   └── ELECTRON_README.md
```

## Running After Integration

### 1. Browser Mode (Development)

Start SwarmUI backend (from main directory):
```bash
cd YOUR_SWARMUI_DIR
./launch-windows.bat    # Windows
./launch-linux.sh       # Linux/Mac
```

Start React frontend (separate terminal):
```bash
cd YOUR_SWARMUI_DIR/swarmui-react
npm run dev
```

Open http://localhost:5173

### 2. Electron Desktop App

Just run from the React directory:
```bash
cd YOUR_SWARMUI_DIR/swarmui-react
npm run electron:dev
```

This automatically starts the SwarmUI backend!

### 3. Production Build (Browser)

Build the React app:
```bash
cd YOUR_SWARMUI_DIR/swarmui-react
npm run build
```

Serve the built files:
```bash
npm run preview
```

Or configure SwarmUI to serve the `dist/` folder directly.

### 4. Production Build (Electron Standalone)

Build desktop installers:
```bash
cd YOUR_SWARMUI_DIR/swarmui-react
npm run electron:build
```

Distributable apps will be in `release/` folder.

## Configuring SwarmUI to Serve React UI

If you want SwarmUI to serve the React interface directly (instead of running separate servers):

1. Build the React app:
   ```bash
   cd YOUR_SWARMUI_DIR/swarmui-react
   npm run build
   ```

2. The built files will be in `swarmui-react/dist/`

3. Configure SwarmUI's web server to serve these files at a specific route (e.g., `/ui/`)

4. Or replace SwarmUI's default UI with the React version by pointing it to the `dist/` folder

## Updating the React Interface

When you make changes to the React code:

1. Edit files in `swarmui-react/src/`
2. In development mode (`npm run dev`), changes auto-reload
3. For production, rebuild: `npm run build`

## Environment Variables (Optional)

Create `swarmui-react/.env` for custom configuration:

```env
# SwarmUI backend URL (default: http://localhost:7801)
VITE_SWARMUI_URL=http://localhost:7801

# Development mode Vite port (default: 5173)
VITE_PORT=5173
```

## Troubleshooting

### "SwarmUI backend not found"

Update the path in `electron/main.js`:
```javascript
const SWARMUI_DIR = path.join(__dirname, '..', '..'); // Adjust if needed
```

### Port Conflicts

If port 7801 or 5173 is in use, update:
- SwarmUI backend port: Configure in SwarmUI settings
- Vite dev server port: Edit `vite.config.ts`
- Electron port references: Edit `electron/main.js`

### Dependencies Won't Install

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Build Fails

Make sure you have:
- Node.js 18 or higher
- npm 9 or higher
- Enough disk space for dependencies (~500MB)

## Git Integration (Optional)

If you want to track changes:

```bash
cd YOUR_SWARMUI_DIR/swarmui-react
git init
git add .
git commit -m "Initial React interface integration"
```

Add to `.gitignore`:
```
node_modules/
dist/
release/
.env
.vite/
*.log
```

## Next Steps

1. ✅ Copy/move the React interface to your main SwarmUI directory
2. ✅ Install dependencies: `npm install`
3. ✅ Test browser mode: `npm run dev`
4. ✅ Test Electron mode: `npm run electron:dev`
5. ✅ Build for production when ready: `npm run electron:build`

## Need Help?

- See `QUICK_START.md` for basic usage
- See `ELECTRON_README.md` for Electron-specific details
- Check SwarmUI documentation for backend configuration

Your React interface is production-ready and uses real SwarmUI API data!
