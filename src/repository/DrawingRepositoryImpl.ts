import type { DrawingRepository } from './types';
import type { FolderItem } from '@/store/types';
import { executeTx, STORES } from './db';

export class DrawingRepositoryImpl implements DrawingRepository {
  private getKey(symbol: string): string {
    return symbol.toUpperCase();
  }

  private getFolderKey(symbol: string): string {
    return `FOLDERS_${symbol.toUpperCase()}`;
  }

  async getDrawings(symbol: string): Promise<any[]> {
    if (!symbol) return [];
    const key = this.getKey(symbol);
    const drawings = await executeTx<any[] | undefined>(
      STORES.DRAWINGS,
      'readonly',
      (store) => store.get(key)
    );
    return drawings || [];
  }

  async saveDrawings(symbol: string, drawings: any[]): Promise<void> {
    if (!symbol) return;
    const key = this.getKey(symbol);
    await executeTx(STORES.DRAWINGS, 'readwrite', (store) => store.put(drawings, key));
  }

  async clearDrawings(symbol: string): Promise<void> {
    if (!symbol) return;
    const key = this.getKey(symbol);
    const folderKey = this.getFolderKey(symbol);
    await executeTx(STORES.DRAWINGS, 'readwrite', (store) => {
      store.delete(folderKey);
      return store.delete(key);
    });
  }

  async getFolders(symbol: string): Promise<FolderItem[]> {
    if (!symbol) return [];
    const key = this.getFolderKey(symbol);
    try {
      const folders = await executeTx<FolderItem[] | undefined>(
        STORES.DRAWINGS,
        'readonly',
        (store) => store.get(key)
      );
      if (folders && Array.isArray(folders) && folders.length > 0) {
        return folders;
      }
    } catch (err) {
      console.warn(`[DrawingRepository] Failed to read folders from IndexedDB for ${symbol}:`, err);
    }

    // Backwards-compatibility fallback and migration from localStorage
    try {
      const localSaved = localStorage.getItem(`fx_folders_${symbol}`);
      if (localSaved) {
        const parsed = JSON.parse(localSaved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Asynchronously migrate to IndexedDB
          this.saveFolders(symbol, parsed).catch((e) => {
            console.debug('[DrawingRepository] Migration error:', e);
          });
          return parsed;
        }
      }
    } catch (e) {
      console.debug('[DrawingRepository] localStorage fallback error:', e);
    }

    return [];
  }

  async saveFolders(symbol: string, folders: FolderItem[]): Promise<void> {
    if (!symbol) return;
    const key = this.getFolderKey(symbol);
    try {
      await executeTx(STORES.DRAWINGS, 'readwrite', (store) => store.put(folders, key));
    } catch (err) {
      console.warn(`[DrawingRepository] Failed to save folders to IndexedDB for ${symbol}:`, err);
    }
    // Maintain localStorage mirror for backward compatibility
    try {
      localStorage.setItem(`fx_folders_${symbol}`, JSON.stringify(folders));
    } catch (e) {
      console.debug('[DrawingRepository] localStorage mirror error:', e);
    }
  }
}
