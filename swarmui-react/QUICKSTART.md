# SwarmUI React Frontend - Quick Start

## ✅ Status: Ready to Use!

The React frontend is now running successfully at **http://localhost:5173**

## What You Have

A modern React-based UI for SwarmUI featuring:
- **Generate Page**: Create images with real-time progress and preview
- **Gallery Page**: Browse, star, and manage your generated images
- **Mantine UI**: Beautiful, responsive components
- **TypeScript**: Full type safety
- **WebSocket Support**: Real-time generation updates

## How to Test Right Now

### Option 1: Test in Browser

1. Make sure SwarmUI is running:
   ```bash
   cd ../adoring-bouman
   launch-windows.bat
   ```

2. The React dev server is already running at:
   **http://localhost:5173**

3. Open that URL in your browser to see the React UI!

### Option 2: Test with Electron

1. First, make sure both are running:
   - SwarmUI backend: `http://localhost:7801`
   - React dev server: `http://localhost:5173` (already running!)

2. Start Electron:
   ```bash
   cd ../adoring-bouman/electron
   launch-electron.bat
   ```

3. The Electron app will load the React frontend by default!

## Testing the Features

### Generate Page

1. Navigate to the **Generate** tab
2. Enter a prompt (e.g., "A beautiful mountain landscape")
3. Adjust parameters:
   - Width/Height: 512x512 (default)
   - Steps: 20
   - CFG Scale: 7
4. Click **Generate**
5. Watch the real-time progress bar and preview
6. See the final image(s) appear

### Gallery Page

1. Click the **Gallery** tab
2. View all your generated images
3. Click a star icon to favorite an image
4. Click trash icon to delete
5. Click an image to view full size
6. Use search to filter by metadata

### Navigation

- **Generate** → Main image generation interface
- **Gallery** → Browse your image history
- **Settings & Admin →** → Opens original SwarmUI in new tab

## Current Setup

```
┌─────────────────────────────────────┐
│  Electron Desktop Wrapper           │
│  (Port configurable via settings)   │
└─────────────────────────────────────┘
                 │
                 ├── React Frontend (http://localhost:5173)
                 │   ├── Generate Page (Mantine UI)
                 │   └── Gallery Page (Mantine UI)
                 │
                 └── Original SwarmUI (http://localhost:7801)
                     ├── Settings Pages
                     └── Admin Dashboard
```

## File Structure

```
swarmui-react/
├── src/
│   ├── api/
│   │   ├── client.ts          ✅ Complete API client
│   │   └── types.ts           ✅ TypeScript types
│   ├── pages/
│   │   ├── GeneratePage.tsx   ✅ Image generation UI
│   │   └── GalleryPage.tsx    ✅ Image gallery UI
│   ├── stores/
│   │   └── session.ts         ✅ Session management
│   └── App.tsx                ✅ Main app with navigation
├── package.json               ✅ Dependencies installed
└── vite.config.ts             ✅ Configured with proxy
```

## Troubleshooting

### "Connection Error" in React App

**Problem**: Can't connect to SwarmUI API

**Solution**:
1. Make sure SwarmUI is running on port 7801
2. Check: `http://localhost:7801/API/GetNewSession` in browser
3. If not working, restart SwarmUI

### React Dev Server Won't Start

**Solution**:
```bash
cd swarmui-react
npm install
npm run dev
```

### Electron Shows Blank Screen

**Causes**:
1. React dev server not running
2. SwarmUI backend not running
3. Wrong URL in Electron config

**Solution**:
1. Verify React is at `http://localhost:5173`
2. Verify SwarmUI is at `http://localhost:7801`
3. Check Electron console for errors (F12)

### Images Not Loading in Gallery

**Cause**: Image paths not proxied correctly

**Solution**: Images are served from SwarmUI at `http://localhost:7801/View/...`
- Check Vite proxy config in `vite.config.ts`
- Verify `/View` routes are proxied

## Next Steps

### Immediate Testing

1. ✅ React dev server is running
2. Open `http://localhost:5173` in browser
3. Test Generate page
4. Test Gallery page
5. Test Settings link

### Integrate with Electron

The Electron wrapper is already configured:
- Toggle "Use React Frontend" in Electron settings
- Restart Electron app
- It will load React from `http://localhost:5173`

### Customize

Want to modify the UI?
1. Edit files in `swarmui-react/src/`
2. Changes appear instantly (HMR)
3. No restart needed!

## Development Workflow

```bash
# Terminal 1: Run SwarmUI backend
cd adoring-bouman
launch-windows.bat

# Terminal 2: Run React dev server (ALREADY RUNNING!)
cd swarmui-react
npm run dev

# Terminal 3: Run Electron (optional)
cd adoring-bouman/electron
launch-electron.bat
```

## Configuration

### Change React Port

Edit `swarmui-react/vite.config.ts`:
```typescript
server: {
  port: 5173,  // Change this
}
```

### Change SwarmUI API URL

Edit `swarmui-react/src/api/client.ts`:
```typescript
constructor(baseUrl: string = 'http://localhost:7801')
```

### Toggle Between React and Original UI

In Electron settings:
- ☑ Use React Frontend → Modern React UI
- ☐ Use React Frontend → Original SwarmUI UI

## What's Working

✅ Session initialization
✅ API client with TypeScript
✅ WebSocket connections
✅ Image generation with progress
✅ Gallery with star/delete
✅ Mantine UI components
✅ Dark theme
✅ Responsive layout
✅ Error handling
✅ Navigation between pages

## Known Limitations

- Model selection not yet implemented (uses default model)
- Some advanced parameters not exposed in UI yet
- Gallery loads all images at once (no pagination)
- No preset management yet

These can be added as needed!

## Quick Commands

```bash
# Start React dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Success Indicators

When everything is working, you should see:

1. **Terminal**: `VITE ready in XXX ms` and `Local: http://localhost:5173/`
2. **Browser**: React app loads with Generate and Gallery tabs
3. **Electron**: Loads React UI automatically if configured
4. **Generation**: Progress bar, preview, and final images appear
5. **Gallery**: Images display in grid, star/delete work

## You're All Set! 🎉

The React frontend is ready to use. Open http://localhost:5173 and start generating!

For questions or issues, check:
- Browser console (F12)
- React dev server terminal
- SwarmUI logs
