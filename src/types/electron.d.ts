export interface ElectronAPI {
  openExternal: (url: string) => void | Promise<void>;
  setStartup?: (settings: { login: boolean; hidden: boolean }) => void;
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
