const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('updaterAPI', {
  checkForUpdates: () => ipcRenderer.send('check-for-updates'),
  downloadUpdate: () => ipcRenderer.send('download-update'),
  installUpdate: () => ipcRenderer.send('install-update'),
  onUpdateEvent: (callback) => {
    const listener = (_event, message, data) => callback(message, data);
    ipcRenderer.on('update-event', listener);
    return () => {
      ipcRenderer.removeListener('update-event', listener);
    };
  },
});

contextBridge.exposeInMainWorld('electronAPI', {
  openExternal: (url) => ipcRenderer.send('open-external', url),
});
