const { app, BrowserWindow, Menu, Tray, dialog, ipcMain, shell } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Try to require optional dependencies
let remoteMain, autoUpdater;
try {
  remoteMain = require('@electron/remote/main');
  remoteMain.initialize();
} catch (e) {
  console.log('@electron/remote not installed, settings window will be limited');
}
try {
  autoUpdater = require('electron-updater').autoUpdater;
} catch (e) {
  console.log('electron-updater not installed, auto-updates disabled');
}

// Global state
let mainWindow = null;
let loadingWindow = null;
let tray = null;
let swarmUIProcess = null;
let viteDevServer = null;
let ownsSwarmUIProcess = false;
let ownsViteDevServer = false;
let serverUrl = 'http://localhost:7801';
let isQuitting = false;
let serverReady = false;
let windowState = {};
let settingsWindow = null;
let stopProcessesPromise = null;
const ignoredWordsByWebContentsId = new Map();
const activePromptTargetByWebContentsId = new Map();

const ENABLE_DESKTOP_NATIVE_SPELL_CONTEXT_MENU =
  process.env.SWARMUI_NATIVE_SPELL_CONTEXT_MENU !== '0';

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const SWARMUI_PORT = 7801;
const DEFAULT_VITE_PORT = Number(process.env.VITE_PORT) || 5173;
const MAX_VITE_PORT_SCAN = 6;
const OPEN_DEVTOOLS = process.env.SWARMUI_ELECTRON_DEVTOOLS === '1';
const MAX_DEV_LOAD_RETRIES = 3;
const DEV_LOAD_RETRY_DELAY_MS = 1200;
let vitePort = DEFAULT_VITE_PORT;

function stripAnsiCodes(value) {
  return value.replace(/\u001b\[[0-9;]*m/g, '');
}

function updateVitePortFromOutput(output) {
  const match = output.match(/https?:\/\/localhost:(\d+)/i) || output.match(/localhost:(\d+)/i);
  if (!match) {
    return null;
  }

  const parsed = Number(match[1]);
  if (Number.isNaN(parsed)) {
    return null;
  }

  vitePort = parsed;
  return parsed;
}

// Paths
const SWARMUI_DIR = path.join(__dirname, '..', '..'); // Parent directory of swarmui-react
const SWARMUI_EXECUTABLE = process.platform === 'win32'
  ? path.join(SWARMUI_DIR, 'launch-windows.bat')
  : path.join(SWARMUI_DIR, 'launch-linux.sh');

// Configuration paths
const configPath = path.join(app.getPath('userData'), 'config.json');
const windowStatePath = path.join(app.getPath('userData'), 'window-state.json');

// ============================================================================
// Configuration Management
// ============================================================================

function loadConfig() {
  try {
    if (fs.existsSync(configPath)) {
      return JSON.parse(fs.readFileSync(configPath, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading config:', error);
  }
  return {
    minimizeToTray: true,
    startMinimized: false,
    checkUpdates: true,
    multipleWindows: true
  };
}

function saveConfig(config) {
  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  } catch (error) {
    console.error('Error saving config:', error);
  }
}

// ============================================================================
// Window State Persistence
// ============================================================================

function loadWindowState() {
  try {
    if (fs.existsSync(windowStatePath)) {
      return JSON.parse(fs.readFileSync(windowStatePath, 'utf8'));
    }
  } catch (error) {
    console.error('Error loading window state:', error);
  }
  return {
    width: 1600,
    height: 1000,
    x: undefined,
    y: undefined,
    isMaximized: false
  };
}

function saveWindowState() {
  if (!mainWindow) return;

  try {
    const bounds = mainWindow.getBounds();
    const state = {
      width: bounds.width,
      height: bounds.height,
      x: bounds.x,
      y: bounds.y,
      isMaximized: mainWindow.isMaximized()
    };
    fs.writeFileSync(windowStatePath, JSON.stringify(state, null, 2));
  } catch (error) {
    console.error('Error saving window state:', error);
  }
}

// ============================================================================
// Loading Window
// ============================================================================

function createLoadingWindow() {
  loadingWindow = new BrowserWindow({
    width: 400,
    height: 320,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  loadingWindow.loadFile(path.join(__dirname, 'loading.html'));
  loadingWindow.center();
}

function updateLoadingProgress(message) {
  if (loadingWindow && !loadingWindow.isDestroyed()) {
    loadingWindow.webContents.send('loading-progress', message);
  }
}

function closeLoadingWindow() {
  if (loadingWindow && !loadingWindow.isDestroyed()) {
    loadingWindow.close();
    loadingWindow = null;
  }
}

// ============================================================================
// SwarmUI Backend Management
// ============================================================================

async function isSwarmServerAvailable(port) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1500);

  try {
    const response = await fetch(`http://localhost:${port}/API/GetCurrentStatus`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: '{}',
      signal: controller.signal,
    });

    return response.ok || response.status === 400 || response.status === 401 || response.status === 403;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function isViteServerAvailable(port) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1200);

  try {
    const response = await fetch(`http://localhost:${port}`, {
      method: 'GET',
      signal: controller.signal,
    });
    if (!response.ok) {
      return false;
    }

    const html = await response.text();
    return html.includes('/@vite/client') || html.toLowerCase().includes('vite');
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function detectExistingVitePort() {
  for (let offset = 0; offset < MAX_VITE_PORT_SCAN; offset++) {
    const port = DEFAULT_VITE_PORT + offset;
    if (await isViteServerAvailable(port)) {
      return port;
    }
  }
  return null;
}

async function detectExistingSwarmPort() {
  const candidatePorts = [SWARMUI_PORT, SWARMUI_PORT + 1];
  for (const port of candidatePorts) {
    if (await isSwarmServerAvailable(port)) {
      return port;
    }
  }
  return null;
}

function startSwarmUI() {
  return new Promise((resolve, reject) => {
    const start = async () => {
      console.log('Starting SwarmUI backend...');
      console.log('SwarmUI directory:', SWARMUI_DIR);
      console.log('SwarmUI executable:', SWARMUI_EXECUTABLE);
      updateLoadingProgress('Checking SwarmUI installation...');

      if (!fs.existsSync(SWARMUI_EXECUTABLE)) {
        const errorMsg = `SwarmUI not found at ${SWARMUI_EXECUTABLE}`;
        console.error(errorMsg);
        dialog.showErrorBox('SwarmUI Not Found', errorMsg);
        reject(new Error(errorMsg));
        return;
      }

      const existingPort = await detectExistingSwarmPort();
      if (existingPort !== null) {
        serverUrl = `http://localhost:${existingPort}`;
        serverReady = true;
        ownsSwarmUIProcess = false;
        console.log(`Using existing SwarmUI backend at ${serverUrl}`);
        updateLoadingProgress(`Using existing SwarmUI server on port ${existingPort}...`);
        resolve();
        return;
      }

      updateLoadingProgress('Starting SwarmUI server...');

      const isWindows = process.platform === 'win32';

      if (isWindows) {
        swarmUIProcess = spawn('cmd.exe', ['/c', SWARMUI_EXECUTABLE], {
          cwd: SWARMUI_DIR,
          stdio: 'pipe',
          windowsHide: true,
        });
      } else {
        swarmUIProcess = spawn('bash', [SWARMUI_EXECUTABLE], {
          cwd: SWARMUI_DIR,
          stdio: 'pipe',
        });
      }
      ownsSwarmUIProcess = true;
      let startupSettled = false;
      const startupTimeout = setTimeout(() => {
        if (!startupSettled && !serverReady) {
          startupSettled = true;
          reject(new Error('SwarmUI backend did not become ready within 60 seconds.'));
        }
      }, 60000);

      const markReady = () => {
        if (startupSettled) {
          return;
        }
        startupSettled = true;
        clearTimeout(startupTimeout);
        resolve();
      };

      const markFailed = (error) => {
        if (startupSettled) {
          return;
        }
        startupSettled = true;
        clearTimeout(startupTimeout);
        reject(error);
      };

      swarmUIProcess.stdout.on('data', (data) => {
        const output = data.toString();
        console.log('[SwarmUI]:', output);

        // Update loading progress based on output
        if (output.includes('Loading models')) {
          updateLoadingProgress('Loading AI models...');
        } else if (output.includes('Loading backends')) {
          updateLoadingProgress('Loading backends...');
        } else if (output.includes('Starting webserver')) {
          updateLoadingProgress('Starting web server...');
        }

        // Detect when server is ready
        if (output.includes('Now listening on:') ||
          output.includes('is now running') ||
          output.includes(`localhost:${SWARMUI_PORT}`)) {
          serverReady = true;
          console.log('SwarmUI backend is ready!');
          markReady();
        }

        if (output.includes('Press any key to continue')) {
          markFailed(new Error('SwarmUI launch script paused after a backend startup failure.'));
        }

        // Detect port changes
        const portMatch = output.match(/localhost:(\d+)/);
        if (portMatch) {
          serverUrl = `http://localhost:${portMatch[1]}`;
        }
      });

      swarmUIProcess.stderr.on('data', (data) => {
        console.error('[SwarmUI Error]:', data.toString());
      });

      swarmUIProcess.on('error', (error) => {
        console.error('Failed to start SwarmUI:', error);
        markFailed(error);
      });

      swarmUIProcess.on('close', (code) => {
        console.log(`SwarmUI process exited with code ${code}`);

        // Exit code 42 means restart requested
        if (code === 42 && !isQuitting) {
          console.log('Restarting SwarmUI...');
          serverReady = false;
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.close();
          }
          createLoadingWindow();
          setTimeout(() => startSwarmUI(), 1000);
        }

        swarmUIProcess = null;
        ownsSwarmUIProcess = false;

        if (!serverReady && !isQuitting) {
          markFailed(new Error(`SwarmUI process exited before server became ready (exit code ${code}).`));
        }
      });
    };

    start().catch((error) => {
      reject(error);
    });
  });
}

// ============================================================================
// Vite Dev Server (Development Only)
// ============================================================================

function startViteDevServer() {
  return new Promise((resolve, reject) => {
    const start = async () => {
      const existingVitePort = await detectExistingVitePort();
      if (existingVitePort !== null) {
        vitePort = existingVitePort;
        ownsViteDevServer = false;
        console.log(`Using existing Vite dev server on port ${vitePort}`);
        updateLoadingProgress(`Using existing React dev server on port ${vitePort}...`);
        resolve();
        return;
      }

      console.log('Starting Vite dev server...');
      updateLoadingProgress('Starting React dev server...');

      const viteDir = path.join(__dirname, '..');
      let readyResolved = false;
      const viteSpawnCommand = process.platform === 'win32' ? (process.env.ComSpec || 'cmd.exe') : 'npm';
      const viteSpawnArgs = process.platform === 'win32'
        ? ['/d', '/s', '/c', 'npm', 'run', 'dev:vite']
        : ['run', 'dev:vite'];

      viteDevServer = spawn(viteSpawnCommand, viteSpawnArgs, {
        cwd: viteDir,
        stdio: 'pipe',
        windowsHide: true,
        env: {
          ...process.env,
          VITE_RUNTIME_TARGET: 'electron',
        },
      });
      ownsViteDevServer = true;

      const markReady = () => {
        if (readyResolved) return;
        readyResolved = true;
        console.log(`Vite dev server is ready on port ${vitePort}!`);
        resolve();
      };

      viteDevServer.stdout.on('data', (data) => {
        const rawOutput = data.toString();
        console.log('[Vite]:', rawOutput);
        const output = stripAnsiCodes(rawOutput);

        const detectedPort = updateVitePortFromOutput(output);
        if (detectedPort !== null) {
          console.log(`[Vite] Using detected port ${detectedPort}`);
        }

        if (output.includes('Local:') || output.includes('ready in')) {
          markReady();
        }
      });

      viteDevServer.stderr.on('data', (data) => {
        const rawOutput = data.toString();
        console.error('[Vite Error]:', rawOutput);
        const output = stripAnsiCodes(rawOutput);
        updateVitePortFromOutput(output);
      });

      viteDevServer.on('error', (error) => {
        console.error('Failed to start Vite:', error);
        reject(error);
      });

      viteDevServer.on('close', (code) => {
        console.log(`Vite process exited with code ${code}`);
        if (!readyResolved && code && code !== 0) {
          reject(new Error(`Vite process exited before becoming ready (exit code ${code})`));
        }
        viteDevServer = null;
        ownsViteDevServer = false;
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        if (viteDevServer && !readyResolved) {
          console.log(`Vite dev server startup timeout reached, assuming ready on port ${vitePort}`);
          markReady();
        }
      }, 30000);
    };

    start().catch((error) => {
      reject(error);
    });
  });
}

// ============================================================================
// System Tray
// ============================================================================

function createTray() {
  const iconPath = path.join(__dirname, 'icon.png');

  // Use a nativeImage if icon exists, otherwise skip tray
  if (!fs.existsSync(iconPath)) {
    console.log('Tray icon not found, skipping tray creation');
    return;
  }

  try {
    tray = new Tray(iconPath);
  } catch (error) {
    console.log('Failed to create tray:', error);
    return;
  }

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show SwarmUI React',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else if (serverReady) {
          createWindow();
        }
      }
    },
    {
      label: 'New Window',
      click: () => {
        const config = loadConfig();
        if (config.multipleWindows) {
          createWindow();
        } else {
          dialog.showMessageBox({
            type: 'info',
            title: 'Multiple Windows Disabled',
            message: 'Multiple windows are disabled in settings.',
            buttons: ['OK']
          });
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        createSettingsWindow();
      }
    },
    {
      label: 'Check for Updates',
      click: () => {
        checkForUpdates(true);
      }
    },
    { type: 'separator' },
    {
      label: 'Restart SwarmUI',
      click: () => {
        if (swarmUIProcess) {
          serverReady = false;
          swarmUIProcess.kill();
        }
      }
    },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('SwarmUI React');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    } else if (serverReady) {
      createWindow();
    }
  });
}

function setupPromptContextMenu(window) {
  if (!ENABLE_DESKTOP_NATIVE_SPELL_CONTEXT_MENU) {
    return;
  }

  const webContentsId = window.webContents.id;
  const ignoredWords = ignoredWordsByWebContentsId.get(webContentsId) || new Set();

  window.webContents.on('context-menu', (_event, params) => {
    const items = [];
    const misspelledWord = (params.misspelledWord || '').trim();
    const misspelledKey = misspelledWord.toLowerCase();
    const isIgnored = misspelledKey.length > 0 && ignoredWords.has(misspelledKey);

    if (misspelledWord && !isIgnored) {
      const suggestions = (params.dictionarySuggestions || []).slice(0, 5);

      for (const suggestion of suggestions) {
        items.push({
          label: suggestion,
          click: () => window.webContents.replaceMisspelling(suggestion),
        });
      }

      if (suggestions.length === 0) {
        items.push({ label: 'No spelling suggestions', enabled: false });
      }

      items.push(
        {
          label: 'Add to Dictionary',
          click: () => {
            try {
              window.webContents.session.addWordToSpellCheckerDictionary(misspelledWord);
              ignoredWords.delete(misspelledKey);
              window.webContents.send('ignored-spell-words-updated', Array.from(ignoredWords));
            } catch (error) {
              console.error('Failed to add word to dictionary:', error);
            }
          },
        },
        {
          label: 'Ignore (Session)',
          click: () => {
            ignoredWords.add(misspelledKey);
            window.webContents.send('ignored-spell-words-updated', Array.from(ignoredWords));
          },
        },
        { type: 'separator' }
      );
    }

    if (params.isEditable) {
      if (params.editFlags.canCut) items.push({ role: 'cut' });
      if (params.editFlags.canCopy) items.push({ role: 'copy' });
      if (params.editFlags.canPaste) items.push({ role: 'paste' });
      if (params.editFlags.canSelectAll) items.push({ role: 'selectAll' });
    } else if (params.selectionText && params.selectionText.trim()) {
      items.push({ role: 'copy' });
    }

    const hasActivePromptTarget = !!activePromptTargetByWebContentsId.get(webContentsId);

    items.push(
      { type: 'separator' },
      {
        label: 'Auto-correct Format',
        enabled: hasActivePromptTarget,
        click: () => {
          window.webContents.send('prompt-context-action', { action: 'autocorrect-format' });
        },
      },
      {
        label: 'Check & Fix Grammar',
        enabled: hasActivePromptTarget,
        click: () => {
          window.webContents.send('prompt-context-action', { action: 'grammar-check' });
        },
      }
    );

    const menu = Menu.buildFromTemplate(items);
    menu.popup({ window });
  });
}

// ============================================================================
// Main Window
// ============================================================================

function createWindow() {
  const config = loadConfig();

  // Don't allow multiple windows if disabled
  if (mainWindow && !config.multipleWindows) {
    mainWindow.show();
    mainWindow.focus();
    return;
  }

  // Load saved window state
  if (!mainWindow) {
    windowState = loadWindowState();
  }

  const newWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    x: windowState.x,
    y: windowState.y,
    minWidth: 1024,
    minHeight: 768,
    backgroundColor: '#1b1b20',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    title: 'SwarmUI React',
    show: false,
    icon: path.join(__dirname, 'icon.png')
  });
  const webContentsId = newWindow.webContents.id;
  let devLoadRetryCount = 0;
  let devLoadRecoveryInProgress = false;
  ignoredWordsByWebContentsId.set(webContentsId, new Set());
  activePromptTargetByWebContentsId.set(webContentsId, false);
  setupPromptContextMenu(newWindow);

  // Restore maximized state
  if (windowState.isMaximized) {
    newWindow.maximize();
  }

  // Remove default menu
  Menu.setApplicationMenu(null);

  // Load the app
  if (isDev) {
    // Development mode - load from Vite dev server
    newWindow.loadURL(`http://localhost:${vitePort}`);
  } else {
    // Production mode - load from built files
    newWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }

  if (isDev) {
    newWindow.webContents.on('did-fail-load', async (_event, errorCode, errorDescription, validatedURL, isMainFrame) => {
      if (!isMainFrame || !validatedURL || !validatedURL.startsWith('http://localhost:')) {
        return;
      }
      if (errorCode !== -102) { // ERR_CONNECTION_REFUSED
        return;
      }
      if (devLoadRecoveryInProgress || devLoadRetryCount >= MAX_DEV_LOAD_RETRIES) {
        return;
      }
      devLoadRecoveryInProgress = true;
      devLoadRetryCount++;
      try {
        console.warn(
          `Failed to load renderer (${errorDescription}) from ${validatedURL}. Recovery attempt ${devLoadRetryCount}/${MAX_DEV_LOAD_RETRIES}.`
        );
        if (!viteDevServer) {
          await startViteDevServer();
        }
        setTimeout(() => {
          if (!newWindow.isDestroyed()) {
            newWindow.loadURL(`http://localhost:${vitePort}`);
          }
        }, DEV_LOAD_RETRY_DELAY_MS);
      } catch (error) {
        console.error('Failed to recover Vite dev server after renderer load failure:', error);
      } finally {
        devLoadRecoveryInProgress = false;
      }
    });

    newWindow.webContents.on('did-finish-load', () => {
      devLoadRetryCount = 0;
    });
  }

  // Show window when ready
  newWindow.once('ready-to-show', () => {
    if (!config.startMinimized) {
      newWindow.show();
    }
  });

  // Open DevTools in development
  if (isDev && OPEN_DEVTOOLS) {
    newWindow.webContents.openDevTools();
  }

  // Handle window close
  newWindow.on('close', (event) => {
    const canMinimizeToTray = config.minimizeToTray && tray && !tray.isDestroyed();
    if (!isQuitting && canMinimizeToTray) {
      event.preventDefault();
      newWindow.hide();
    } else {
      if (newWindow === mainWindow) {
        saveWindowState();
      }
    }
  });

  newWindow.on('closed', () => {
    ignoredWordsByWebContentsId.delete(webContentsId);
    activePromptTargetByWebContentsId.delete(webContentsId);
    if (newWindow === mainWindow) {
      mainWindow = null;
    }
  });

  // Save state on resize/move
  newWindow.on('resize', () => {
    if (newWindow === mainWindow) {
      clearTimeout(newWindow.stateTimeout);
      newWindow.stateTimeout = setTimeout(saveWindowState, 500);
    }
  });

  newWindow.on('move', () => {
    if (newWindow === mainWindow) {
      clearTimeout(newWindow.stateTimeout);
      newWindow.stateTimeout = setTimeout(saveWindowState, 500);
    }
  });

  // Handle external links
  newWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (config.multipleWindows && (url.startsWith(serverUrl) || url.includes('localhost'))) {
      return { action: 'allow' };
    } else {
      shell.openExternal(url);
      return { action: 'deny' };
    }
  });

  // Set as main window if it's the first
  if (!mainWindow) {
    mainWindow = newWindow;
  }

  return newWindow;
}

// ============================================================================
// Settings Window
// ============================================================================

function createSettingsWindow() {
  if (settingsWindow) {
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 600,
    height: 500,
    modal: true,
    parent: mainWindow,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    title: 'SwarmUI Settings',
    backgroundColor: '#1b1b20'
  });

  // Enable remote for settings window if available
  if (remoteMain) {
    remoteMain.enable(settingsWindow.webContents);
  }

  settingsWindow.loadFile(path.join(__dirname, 'settings.html'));
  settingsWindow.setMenu(null);

  settingsWindow.on('closed', () => {
    settingsWindow = null;
  });
}

// ============================================================================
// Auto-Updater
// ============================================================================

function setupAutoUpdater() {
  if (!autoUpdater) {
    console.log('Auto-updater not available');
    return;
  }

  const config = loadConfig();

  if (!config.checkUpdates || !app.isPackaged) {
    return;
  }

  autoUpdater.autoDownload = false;

  autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Available',
      message: `A new version (${info.version}) is available!`,
      buttons: ['Download', 'Later'],
      defaultId: 0
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.downloadUpdate();
      }
    });
  });

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox({
      type: 'info',
      title: 'Update Ready',
      message: 'Update downloaded. Restart to apply?',
      buttons: ['Restart', 'Later'],
      defaultId: 0
    }).then((result) => {
      if (result.response === 0) {
        isQuitting = true;
        autoUpdater.quitAndInstall();
      }
    });
  });

  autoUpdater.on('error', (error) => {
    console.error('Update error:', error);
  });

  // Check for updates on startup
  setTimeout(() => {
    checkForUpdates(false);
  }, 3000);
}

function checkForUpdates(showNoUpdateDialog = false) {
  if (!autoUpdater) {
    if (showNoUpdateDialog) {
      dialog.showMessageBox({
        type: 'info',
        title: 'Updates Not Available',
        message: 'Auto-update is not configured for this build.',
        buttons: ['OK']
      });
    }
    return;
  }

  if (!app.isPackaged) {
    if (showNoUpdateDialog) {
      dialog.showMessageBox({
        type: 'info',
        title: 'Development Mode',
        message: 'Auto-update is only available in packaged builds.',
        buttons: ['OK']
      });
    }
    return;
  }

  autoUpdater.checkForUpdates().then((result) => {
    if (showNoUpdateDialog && !result.updateInfo) {
      dialog.showMessageBox({
        type: 'info',
        title: 'No Updates',
        message: 'You are running the latest version!',
        buttons: ['OK']
      });
    }
  }).catch((error) => {
    if (showNoUpdateDialog) {
      dialog.showMessageBox({
        type: 'error',
        title: 'Update Check Failed',
        message: 'Could not check for updates.',
        detail: error.message,
        buttons: ['OK']
      });
    }
  });
}

// ============================================================================
// Process Management
// ============================================================================

function killProcessTree(pid, label) {
  if (!pid) {
    return Promise.resolve();
  }

  if (process.platform === 'win32') {
    return new Promise((resolve) => {
      const killer = spawn('taskkill', ['/pid', String(pid), '/f', '/t'], { stdio: 'ignore' });
      killer.on('close', resolve);
      killer.on('error', (error) => {
        console.warn(`Failed to taskkill ${label} (pid=${pid}):`, error);
        resolve();
      });
    });
  }

  return new Promise((resolve) => {
    try {
      process.kill(pid, 'SIGTERM');
    } catch (error) {
      console.warn(`Failed to SIGTERM ${label} (pid=${pid}):`, error);
      resolve();
      return;
    }

    const timeout = setTimeout(() => {
      try {
        process.kill(pid, 'SIGKILL');
      } catch {
        // Best-effort fallback.
      }
      resolve();
    }, 4000);

    const checkExited = setInterval(() => {
      try {
        process.kill(pid, 0);
      } catch {
        clearInterval(checkExited);
        clearTimeout(timeout);
        resolve();
      }
    }, 250);
  });
}

function stopProcesses() {
  if (stopProcessesPromise) {
    return stopProcessesPromise;
  }

  stopProcessesPromise = (async () => {
    console.log('Stopping processes...');

    const kills = [];

    if (swarmUIProcess && ownsSwarmUIProcess) {
      console.log('Stopping SwarmUI...');
      kills.push(killProcessTree(swarmUIProcess.pid, 'SwarmUI'));
    }

    if (viteDevServer && ownsViteDevServer) {
      console.log('Stopping Vite dev server...');
      kills.push(killProcessTree(viteDevServer.pid, 'Vite'));
    }

    await Promise.all(kills);
    swarmUIProcess = null;
    viteDevServer = null;
    ownsSwarmUIProcess = false;
    ownsViteDevServer = false;
  })().finally(() => {
    stopProcessesPromise = null;
  });

  return stopProcessesPromise;
}

// ============================================================================
// IPC Handlers
// ============================================================================

ipcMain.on('get-config', (event) => {
  event.returnValue = loadConfig();
});

ipcMain.on('save-config', (event, config) => {
  saveConfig(config);
  event.returnValue = true;
});

ipcMain.handle('get-swarmui-status', async () => {
  return {
    running: swarmUIProcess !== null,
    serverReady: serverReady,
    port: SWARMUI_PORT,
  };
});

ipcMain.handle('restart-swarmui', async () => {
  await stopProcesses();
  await startSwarmUI();
  return { success: true };
});

ipcMain.on('set-prompt-target-active', (event, payload) => {
  const wcId = event.sender.id;
  const isActive = !!(payload && payload.active);
  activePromptTargetByWebContentsId.set(wcId, isActive);
});

ipcMain.handle('get-ignored-spell-words', (event) => {
  const wcId = event.sender.id;
  const words = ignoredWordsByWebContentsId.get(wcId) || new Set();
  return Array.from(words);
});

ipcMain.handle('is-native-spell-context-menu-enabled', () => {
  return ENABLE_DESKTOP_NATIVE_SPELL_CONTEXT_MENU;
});

ipcMain.handle('select-folder', async (event, startPath) => {
  const focusedWindow = BrowserWindow.fromWebContents(event.sender) || mainWindow;
  const options = {
    title: 'Select Destination Folder',
    properties: ['openDirectory'],
  };
  if (typeof startPath === 'string' && startPath.trim()) {
    options.defaultPath = startPath;
  }
  const result = await dialog.showOpenDialog(focusedWindow || undefined, options);
  if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

// ============================================================================
// App Lifecycle
// ============================================================================

app.whenReady().then(async () => {
  const startupBegin = Date.now();
  try {
    const session = require('electron').session.defaultSession;
    session.setSpellCheckerLanguages(['en-US']);
  } catch (error) {
    console.warn('Unable to set spellchecker languages:', error);
  }
  createLoadingWindow();
  createTray();
  setupAutoUpdater();

  try {
    const startupTasks = [startSwarmUI()];
    if (isDev) {
      startupTasks.push(startViteDevServer());
    }
    await Promise.all(startupTasks);

    updateLoadingProgress('Opening SwarmUI React...');
    createWindow();
    closeLoadingWindow();
    console.log(`Startup complete in ${Date.now() - startupBegin}ms`);

  } catch (error) {
    console.error('Failed to start application:', error);
    closeLoadingWindow();
    dialog.showErrorBox('Startup Error', error.message);
    app.quit();
  }
});

app.on('window-all-closed', async () => {
  const config = loadConfig();
  if (process.platform !== 'darwin' && !config.minimizeToTray) {
    isQuitting = true;
    await stopProcesses();
    app.quit();
  }
});

app.on('before-quit', async () => {
  isQuitting = true;
  await stopProcesses();
});

app.on('will-quit', async () => {
  isQuitting = true;
  await stopProcesses();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0 && serverReady) {
    createWindow();
  }
});

// Handle crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  dialog.showErrorBox('Application Error', 'An unexpected error occurred: ' + error.message);
});

process.on('SIGINT', async () => {
  isQuitting = true;
  await stopProcesses();
  app.quit();
});

process.on('SIGTERM', async () => {
  isQuitting = true;
  await stopProcesses();
  app.quit();
});
