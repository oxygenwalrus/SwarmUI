# SwarmUI Electron Desktop Application

This directory contains an Electron wrapper for the SwarmUI React interface, allowing you to run SwarmUI as a native desktop application.

## Features

- 🚀 **Automatic SwarmUI Backend Startup**: The app automatically starts the SwarmUI backend when launched
- 🎨 **Native Desktop Experience**: Full desktop application with native window controls
- 🔄 **Auto-reload in Development**: Hot module replacement for rapid development
- 📦 **Easy Distribution**: Build standalone installers for Windows, Mac, and Linux
- 🔒 **Secure**: Uses context isolation and preload scripts for security

## Prerequisites

- Node.js 18+ installed
- SwarmUI installed in the parent directory (one level up from `swarmui-react`)
- All SwarmUI dependencies properly configured

## Installation

1. Install dependencies:
```bash
cd swarmui-react
npm install
```

## Development

### Option 1: Just React (Browser-based)
```bash
npm run dev
```
This starts only the Vite dev server. Access at http://localhost:5173

### Option 2: Electron App (Desktop)
```bash
npm run electron:dev
```
This will:
1. Start the SwarmUI backend server automatically
2. Start the Vite dev server
3. Open the Electron window pointing to the dev server
4. Enable hot module replacement

**Note**: In development mode, the app expects SwarmUI to be in the parent directory:
- `SwarmUI/launch-windows.bat` (Windows)
- `SwarmUI/launch-linux.sh` (Linux/Mac)

## Building for Production

### Build for Current Platform
```bash
npm run electron:build
```

### Build for Specific Platforms
```bash
# Windows
npm run electron:build:win

# macOS
npm run electron:build:mac

# Linux
npm run electron:build:linux
```

The built application will be in the `release/` directory.

### Build Outputs

- **Windows**: `.exe` installer and portable `.exe`
- **macOS**: `.dmg` installer and `.zip` archive
- **Linux**: `.AppImage` and `.deb` package

## Project Structure

```
swarmui-react/
├── electron/
│   ├── main.js          # Electron main process
│   ├── preload.js       # Preload script for security
│   └── icon.png         # Application icon
├── src/                 # React application source
├── dist/                # Built React app (production)
├── release/             # Electron build output
└── package.json         # Dependencies and build config
```

## How It Works

### Development Mode
1. Electron launches
2. `main.js` starts the SwarmUI backend (`launch-windows.bat` or `launch-linux.sh`)
3. Waits for SwarmUI to be ready on port 7801
4. Separately, Vite dev server runs on port 5173
5. Electron window loads from `http://localhost:5173`

### Production Mode
1. Electron launches
2. `main.js` starts the SwarmUI backend
3. Electron window loads from the built `dist/index.html` file
4. All SwarmUI files are bundled in `resources/swarmui/`

## Configuration

### SwarmUI Backend Path

Edit `electron/main.js` to adjust the SwarmUI paths if needed:

```javascript
// SwarmUI paths - adjust these based on your installation
const SWARMUI_DIR = path.join(__dirname, '..', '..'); // Parent directory
const SWARMUI_EXECUTABLE = process.platform === 'win32'
  ? path.join(SWARMUI_DIR, 'launch-windows.bat')
  : path.join(SWARMUI_DIR, 'launch-linux.sh');
```

### Ports

Default ports (change in `electron/main.js` if needed):
- SwarmUI Backend: `7801`
- Vite Dev Server: `5173`

### Build Configuration

Edit the `build` section in `package.json` to customize:
- App icon
- Installer types
- File inclusions/exclusions
- Platform-specific settings

## Adding an Application Icon

1. Create or find an icon file (PNG, ICNS, or ICO format)
2. Place it at `electron/icon.png`
3. For platform-specific icons:
   - Windows: Use `.ico` format (256x256 recommended)
   - macOS: Use `.icns` format
   - Linux: Use `.png` format (512x512 recommended)

## Troubleshooting

### SwarmUI Doesn't Start
- Check that SwarmUI is installed in the correct directory
- Verify the launch script path in `electron/main.js`
- Check console logs in the Electron dev tools

### Electron Window Shows Blank Screen
- Ensure Vite dev server is running (check console)
- Verify the port (5173) is not blocked
- Check browser console in Electron dev tools (View > Toggle Developer Tools)

### Build Fails
- Make sure all dependencies are installed: `npm install`
- Verify the `dist/` directory exists after `npm run build`
- Check that Node.js version is 18+

### Backend Process Doesn't Stop
- The app should automatically kill the SwarmUI process on exit
- If not, manually stop the process via Task Manager (Windows) or Activity Monitor (Mac)

## Security Features

- **Context Isolation**: Renderer process is isolated from Node.js
- **Preload Script**: Only specific APIs are exposed to the renderer
- **No Node Integration**: Prevents direct Node.js access from the UI

## IPC Communication

The app exposes these APIs to the renderer via the preload script:

```javascript
window.electron.getSwarmUIStatus()  // Get SwarmUI backend status
window.electron.restartSwarmUI()    // Restart SwarmUI backend
window.electron.platform            // Get OS platform
window.electron.isElectron          // Check if running in Electron
```

## Advanced: Custom Build

For advanced customization, refer to:
- [Electron Documentation](https://www.electronjs.org/docs)
- [electron-builder Documentation](https://www.electron.build/)
- [Vite Documentation](https://vitejs.dev/)

## License

Same as SwarmUI project.
