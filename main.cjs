const { app, BrowserWindow, ipcMain, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const { autoUpdater } = require('electron-updater');

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
