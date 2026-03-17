# Quick Start Guide - SwarmUI Electron Desktop App

## Installation (One-Time Setup)

### Windows

1. Open Command Prompt or PowerShell in the `swarmui-react` directory
2. Run:
   ```cmd
   npm install
   ```

### Linux/Mac

1. Open Terminal in the `swarmui-react` directory
2. Make the start script executable:
   ```bash
   chmod +x start-electron.sh
   ```
3. Install dependencies:
   ```bash
   npm install
   ```

## Running the App

### Windows

**Easy Way** - Just double-click:
- `start-electron.bat`

**Or via Command Line:**
```cmd
npm run electron:dev
```

### Linux/Mac

**Easy Way:**
```bash
./start-electron.sh
```

**Or:**
```bash
npm run electron:dev
```

## What Happens When You Start

1. ✅ SwarmUI backend starts automatically (port 7801)
2. ✅ Vite dev server starts (port 5173)
3. ✅ Electron window opens with the React UI
4. ✅ Hot reload enabled for development

## Building Standalone App

### For Current Platform
```bash
npm run electron:build
```

### For Specific Platform
```bash
# Windows installer
npm run electron:build:win

# macOS app
npm run electron:build:mac

# Linux package
npm run electron:build:linux
```

The built app will be in the `release/` folder.

## Stopping the App

Just close the Electron window. The app will automatically stop:
- SwarmUI backend process
- Vite dev server (if running)

## Troubleshooting

**Problem: "SwarmUI executable not found"**
- Make sure SwarmUI is installed in the parent directory
- Check that `launch-windows.bat` (Windows) or `launch-linux.sh` (Linux/Mac) exists

**Problem: Blank window appears**
- Wait a few seconds for SwarmUI backend to start
- Check the console logs in the Electron window (View > Toggle Developer Tools)
- Verify port 7801 is not already in use

**Problem: npm install fails**
- Make sure Node.js 18+ is installed
- Try deleting `node_modules` folder and running `npm install` again

**Problem: Hot reload not working**
- This is normal - save your files and changes should appear
- If not, close and restart the Electron app

## Development vs Production

**Development** (`npm run electron:dev`):
- Uses Vite dev server for hot reload
- SwarmUI backend runs from source
- Developer tools enabled

**Production** (`npm run electron:build`):
- Creates standalone installer
- Bundles all files together
- No dev tools or hot reload

## Need Help?

See `ELECTRON_README.md` for detailed documentation.
