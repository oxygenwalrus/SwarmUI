# 🚀 Quick Start Guide - React Frontend

## ⚠️ IMPORTANT: You Need BOTH Running

The React frontend needs SwarmUI backend to be running. You need **TWO** terminals.

## Step-by-Step Instructions

### Terminal 1: Start SwarmUI Backend

```bash
cd C:\Users\phala\.claude-worktrees\SwarmUI\adoring-bouman
launch-windows.bat
```

**Wait until you see:**
```
SwarmUI v0.9.7.3 - Local is now running.
```

**DO NOT CLOSE THIS TERMINAL!** Keep it running.

### Terminal 2: Start React Frontend

```bash
cd C:\Users\phala\.claude-worktrees\SwarmUI\swarmui-react
npm run dev
```

**You should see:**
```
VITE ready in XXX ms
Local: http://localhost:5175/
```

### Step 3: Open Browser

Open: **http://localhost:5175**

## Quick Test

If you see "Connection Error", test this:

```bash
# This should return JSON (not an error)
curl http://localhost:7801/API/GetNewSession
```

If curl fails, SwarmUI isn't running on port 7801.

## Common Issues

### "Failed to connect to localhost port 7801"

**Problem**: SwarmUI isn't running

**Solution**:
1. Open Terminal 1
2. Run `launch-windows.bat` in the SwarmUI directory
3. Wait for "Local is now running"

### "Port 5173/5174/5175 is in use"

**Problem**: Multiple dev servers running

**Solution**: Vite will auto-find next available port (this is fine!)

### "Unexpected end of JSON input"

**Problem**: SwarmUI not responding properly

**Solution**:
1. Check SwarmUI terminal for errors
2. Try restarting SwarmUI
3. Verify `http://localhost:7801` loads in browser

## Checklist

- [ ] SwarmUI running on port 7801
- [ ] React dev server running on port 5175 (or similar)
- [ ] Browser open to React URL
- [ ] No "Connection Error" message

## All Working?

You should see:
1. Generate tab with parameter controls
2. Gallery tab (empty at first)
3. "Settings & Admin →" link

Try generating an image to test!
