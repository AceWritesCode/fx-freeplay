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
  setStartup: (settings) => ipcRenderer.send('set-startup', settings),
  mt5: {
    checkSystem: () => ipcRenderer.invoke('mt5-check-system'),
    listTerminals: () => ipcRenderer.invoke('mt5-list-terminals'),
    getActiveChart: (params) => ipcRenderer.invoke('mt5-get-active-chart', params),
    syncChart: (params) => ipcRenderer.invoke('mt5-sync-chart', params),
    getStoredSeries: (params) => ipcRenderer.invoke('mt5-get-stored-series', params),
    fetchTimeframe: (params) => ipcRenderer.invoke('mt5-fetch-timeframe', params),
    refreshIncremental: (params) => ipcRenderer.invoke('mt5-refresh-incremental', params),
    subscribeStream: (params) => ipcRenderer.invoke('mt5-subscribe-stream', params),
    unsubscribeStream: () => ipcRenderer.invoke('mt5-unsubscribe-stream'),
    onLiveFeed: (callback) => {
      const listener = (_event, data) => callback(data);
      ipcRenderer.on('mt5:live-feed', listener);
      return () => {
        ipcRenderer.removeListener('mt5:live-feed', listener);
      };
    },
  },
});
