export interface ElectronAPI {
  openExternal: (url: string) => Promise<void>;
}

export interface UpdaterAPI {
  checkForUpdates: () => void;
  downloadUpdate: () => void;
  installUpdate: () => void;
  onUpdateEvent: (callback: (message: string, data: any) => void) => () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
    updaterAPI?: UpdaterAPI;
  }
}
