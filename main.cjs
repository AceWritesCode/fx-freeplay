const { app, BrowserWindow, ipcMain, shell, Menu, nativeTheme } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { autoUpdater } = require('electron-updater');

// Global safety net for unhandled errors
process.on('uncaughtException', (err) => {
  console.error('[Electron Main uncaughtException]:', err);
});

// Disable automatic downloads so UI controls when download starts
autoUpdater.autoDownload = false;

function createWindow() {
  const iconPath = fs.existsSync(path.join(__dirname, 'assets', 'icon-256.ico'))
    ? path.join(__dirname, 'assets', 'icon-256.ico')
    : path.join(__dirname, 'dist', 'favicon.svg');

  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    backgroundColor: '#131722',
    autoHideMenuBar: true,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  });

  // Ensure default application menu is completely removed
  Menu.setApplicationMenu(null);

  // Prevent internal navigation to external sites; open in system default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      require('electron').shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (url !== win.webContents.getURL() && (url.startsWith('http:') || url.startsWith('https:'))) {
      event.preventDefault();
      require('electron').shell.openExternal(url);
    }
  });

  // Forward autoUpdater events to the renderer UI
  autoUpdater.removeAllListeners();

  autoUpdater.on('checking-for-update', () => {
    if (!win.isDestroyed()) {
      win.webContents.send('update-event', 'checking');
    }
  });

  autoUpdater.on('update-available', (info) => {
    if (!win.isDestroyed()) {
      win.webContents.send('update-event', 'available', info);
    }
  });

  autoUpdater.on('update-not-available', (info) => {
    if (!win.isDestroyed()) {
      win.webContents.send('update-event', 'not-available', info);
    }
  });

  autoUpdater.on('download-progress', (progressObj) => {
    if (!win.isDestroyed()) {
      win.webContents.send('update-event', 'progress', progressObj);
    }
  });

  autoUpdater.on('update-downloaded', (info) => {
    if (!win.isDestroyed()) {
      win.webContents.send('update-event', 'downloaded', info);
    }
  });

  autoUpdater.on('error', (err) => {
    if (!win.isDestroyed()) {
      win.webContents.send('update-event', 'error', err == null ? 'unknown' : (err.message || String(err)));
    }
  });

  win.loadFile(path.join(__dirname, 'dist', 'index.html'));
}

// Receive commands from frontend UI
ipcMain.on('check-for-updates', () => {
  autoUpdater.checkForUpdates().catch((err) => {
    const wins = BrowserWindow.getAllWindows();
    if (wins.length > 0 && !wins[0].isDestroyed()) {
      wins[0].webContents.send('update-event', 'error', err?.message || String(err));
    }
  });
});

ipcMain.on('download-update', () => {
  autoUpdater.downloadUpdate().catch((err) => {
    const wins = BrowserWindow.getAllWindows();
    if (wins.length > 0 && !wins[0].isDestroyed()) {
      wins[0].webContents.send('update-event', 'error', err?.message || String(err));
    }
  });
});

ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall();
});

ipcMain.on('open-external', (_event, url) => {
  if (url) {
    shell.openExternal(url);
  }
});

ipcMain.on('set-startup', (event, { login, hidden }) => {
  app.setLoginItemSettings({ openAtLogin: login, openAsHidden: hidden, path: app.getPath('exe') });
});

ipcMain.on('update-theme-mode', (_event, mode) => {
  try {
    nativeTheme.themeSource = mode === 'light' ? 'light' : 'dark';
  } catch (e) {
    console.warn('[Electron Main] Failed to update nativeTheme.themeSource:', e);
  }
});

// --- MT5 Python Bridge IPC ---
let activeStreamPyProcess = null;
let streamStdoutBuffer = '';

function stopActiveStreamProcess() {
  if (activeStreamPyProcess) {
    const py = activeStreamPyProcess;
    activeStreamPyProcess = null;
    streamStdoutBuffer = '';
    try {
      if (py.stdin && !py.stdin.destroyed && py.stdin.writable) {
        py.stdin.write(JSON.stringify({ cmd: 'stop_stream' }) + '\n');
      }
    } catch (_) {}
    try {
      py.kill();
    } catch (_) {}
  }
}

function executePythonBridge(req) {
  return new Promise((resolve) => {
    const scriptPath = path.join(__dirname, 'src', 'bridge', 'mt5_bridge.py');
    const py = spawn('python', [scriptPath], {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Guard stdin against EPIPE / write-after-close errors
    py.stdin.on('error', (err) => {
      console.warn(`[ExecutePy stdin error]: ${err.message}`);
    });

    let stdoutData = '';
    let stderrData = '';

    py.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString('utf-8');
    });

    py.stderr.on('data', (chunk) => {
      stderrData += chunk.toString('utf-8');
    });

    py.on('error', (err) => {
      resolve({
        status: 'error',
        error: `Failed to execute python: ${err.message}. Is Python installed and added to PATH?`,
        python_missing: true,
      });
    });

    py.on('close', (code) => {
      if (stdoutData.trim()) {
        try {
          const parsed = JSON.parse(stdoutData.trim());
          resolve(parsed);
          return;
        } catch (e) {
          // JSON parse failed
        }
      }
      resolve({
        status: 'error',
        error: stderrData.trim() || `Python process exited with code ${code}`,
      });
    });

    try {
      py.stdin.write(JSON.stringify(req) + '\n');
      py.stdin.end();
    } catch (e) {
      resolve({ status: 'error', error: e.message });
    }
  });
}

ipcMain.handle('mt5-check-system', async () => {
  return executePythonBridge({ cmd: 'check_system' });
});

ipcMain.handle('mt5-list-terminals', async () => {
  return executePythonBridge({ cmd: 'list_terminals' });
});

ipcMain.handle('mt5-get-active-chart', async (_event, params) => {
  return executePythonBridge({ cmd: 'get_active_chart', params: params || {} });
});

ipcMain.handle('mt5-sync-chart', async (_event, params) => {
  return executePythonBridge({ cmd: 'sync_chart', params: params || {} });
});

ipcMain.handle('mt5-get-tradable-symbols', async (_event, params) => {
  return executePythonBridge({ cmd: 'get_tradable_symbols', params: params || {} });
});

ipcMain.handle('mt5-get-symbols-ticks', async (_event, params) => {
  return executePythonBridge({ cmd: 'get_symbols_ticks', params: params || {} });
});

ipcMain.handle('mt5-get-stored-series', async (_event, params) => {
  return executePythonBridge({ cmd: 'get_stored_series', params: params || {} });
});

ipcMain.handle('mt5-fetch-timeframe', async (_event, params) => {
  return executePythonBridge({ cmd: 'fetch_timeframe', params: params || {} });
});

ipcMain.handle('mt5-refresh-incremental', async (_event, params) => {
  return executePythonBridge({ cmd: 'refresh_incremental', params: params || {} });
});

ipcMain.handle('mt5-subscribe-stream', async (event, params) => {
  stopActiveStreamProcess();

  const scriptPath = path.join(__dirname, 'src', 'bridge', 'mt5_bridge.py');
  const py = spawn('python', [scriptPath], {
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  activeStreamPyProcess = py;
  streamStdoutBuffer = '';

  const sender = event.sender;

  // Guard stream stdin against EPIPE on shutdown / retarget
  py.stdin.on('error', (err) => {
    console.warn(`[StreamPy stdin error]: ${err.message}`);
  });

  py.stdout.on('data', (chunk) => {
    streamStdoutBuffer += chunk.toString('utf-8');
    const lines = streamStdoutBuffer.split('\n');
    streamStdoutBuffer = lines.pop() || '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed.type === 'stream_update' || parsed.type === 'stream_error') {
          if (!sender.isDestroyed()) {
            sender.send('mt5:live-feed', parsed);
          }
        }
      } catch (_) {}
    }
  });

  py.stderr.on('data', (chunk) => {
    console.error(`[MT5 Stream Py stderr]: ${chunk.toString('utf-8')}`);
  });

  py.on('error', (err) => {
    console.error('[MT5 Stream Py Error]:', err);
    if (!sender.isDestroyed()) {
      sender.send('mt5:live-feed', { type: 'stream_error', error: err.message });
    }
  });

  py.on('close', (code) => {
    console.log(`[MT5 Stream Py Closed]: code ${code}`);
    if (activeStreamPyProcess === py) {
      activeStreamPyProcess = null;
    }
  });

  try {
    py.stdin.write(JSON.stringify({ cmd: 'start_stream', params: params || {} }) + '\n');
    return { status: 'ok', streaming: true };
  } catch (e) {
    return { status: 'error', error: e.message };
  }
});

ipcMain.handle('mt5-unsubscribe-stream', async () => {
  stopActiveStreamProcess();
  return { status: 'ok', streaming: false };
});

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
