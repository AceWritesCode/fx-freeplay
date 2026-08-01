import type { MigrationScript } from './types';

const DB_NAME = 'FXFreeplayDB';
const CURRENT_VERSION = 1;

export const STORES = {
  MARKET_BARS: 'market_bars',
  WATCHLIST: 'watchlist',
  WORKSPACE_LAYOUT: 'workspace_layout',
  DRAWINGS: 'drawings',
  SETTINGS: 'settings',
  METADATA: 'metadata',
} as const;

const MIGRATIONS: MigrationScript[] = [
  {
    version: 1,
    description: 'Initial schema initialization with stores for market bars, watchlist, layouts, drawings, settings, and metadata',
    up: (db: IDBDatabase) => {
      if (!db.objectStoreNames.contains(STORES.MARKET_BARS)) {
        db.createObjectStore(STORES.MARKET_BARS);
      }
      if (!db.objectStoreNames.contains(STORES.WATCHLIST)) {
        db.createObjectStore(STORES.WATCHLIST);
      }
      if (!db.objectStoreNames.contains(STORES.WORKSPACE_LAYOUT)) {
        db.createObjectStore(STORES.WORKSPACE_LAYOUT);
      }
      if (!db.objectStoreNames.contains(STORES.DRAWINGS)) {
        db.createObjectStore(STORES.DRAWINGS);
      }
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS);
      }
      if (!db.objectStoreNames.contains(STORES.METADATA)) {
        db.createObjectStore(STORES.METADATA);
      }
    },
  },
];

let dbInstance: IDBDatabase | null = null;
let initPromise: Promise<IDBDatabase> | null = null;

export async function initDatabase(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;
  if (initPromise) return initPromise;

  initPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, CURRENT_VERSION);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = request.result;
      const oldVersion = event.oldVersion || 0;

      for (const migration of MIGRATIONS) {
        if (migration.version > oldVersion && migration.version <= CURRENT_VERSION) {
          migration.up(db);
        }
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      dbInstance.onversionchange = () => {
        dbInstance?.close();
        dbInstance = null;
      };
      resolve(dbInstance);
    };

    request.onerror = () => {
      initPromise = null;
      reject(request.error);
    };
  });

  return initPromise;
}

export async function getStore(
  storeName: string,
  mode: IDBTransactionMode = 'readonly'
): Promise<{ db: IDBDatabase; tx: IDBTransaction; store: IDBObjectStore }> {
  const db = await initDatabase();
  const tx = db.transaction(storeName, mode);
  const store = tx.objectStore(storeName);
  return { db, tx, store };
}

export async function executeTx<T>(
  storeName: string,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest | Promise<T>
): Promise<T> {
  const { tx, store } = await getStore(storeName, mode);

  return new Promise((resolve, reject) => {
    let result: any;
    try {
      const opResult = operation(store);
      if (opResult && 'onsuccess' in opResult) {
        (opResult as IDBRequest).onsuccess = () => {
          result = (opResult as IDBRequest).result;
        };
      } else {
        result = opResult;
      }
    } catch (err) {
      reject(err);
      return;
    }

    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error || new Error('Transaction aborted'));
  });
}

export async function migrateLegacyData(db: IDBDatabase): Promise<void> {
  const legacyMigratedKey = 'fx_legacy_data_migrated';
  if (localStorage.getItem(legacyMigratedKey) === 'true') return;

  try {
    const legacyDBExists = await new Promise<boolean>((resolve) => {
      const req = indexedDB.open('FXReplayDB');
      let existed = true;
      req.onupgradeneeded = () => {
        existed = false;
      };
      req.onsuccess = () => {
        req.result.close();
        if (!existed) {
          indexedDB.deleteDatabase('FXReplayDB');
        }
        resolve(existed);
      };
      req.onerror = () => resolve(false);
    });

    if (!legacyDBExists) {
      localStorage.setItem(legacyMigratedKey, 'true');
      return;
    }

    const legacyDB = await new Promise<IDBDatabase>((resolve, reject) => {
      const req = indexedDB.open('FXReplayDB');
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (!legacyDB.objectStoreNames.contains('chartState')) {
      legacyDB.close();
      localStorage.setItem(legacyMigratedKey, 'true');
      return;
    }

    const legacyData = await new Promise<any>((resolve, reject) => {
      const tx = legacyDB.transaction('chartState', 'readonly');
      const store = tx.objectStore('chartState');
      const rawRequest = store.get('raw1mData');
      const nameRequest = store.get('assetName');
      const watchlistRequest = store.get('watchlistSymbols');
      
      tx.oncomplete = () => {
        resolve({
          raw1mData: rawRequest.result,
          assetName: nameRequest.result,
          watchlistSymbols: watchlistRequest.result,
        });
      };
      tx.onerror = () => reject(tx.error);
    });

    legacyDB.close();

    if (legacyData.watchlistSymbols && legacyData.watchlistSymbols.length > 0) {
      const tx = db.transaction([STORES.WATCHLIST, STORES.MARKET_BARS], 'readwrite');
      tx.objectStore(STORES.WATCHLIST).put(legacyData.watchlistSymbols, 'watchlist_symbols');
      if (legacyData.assetName) {
        tx.objectStore(STORES.WATCHLIST).put(legacyData.assetName, 'active_symbol');
        if (legacyData.raw1mData && legacyData.raw1mData.length > 0) {
          tx.objectStore(STORES.MARKET_BARS).put(legacyData.raw1mData, `${legacyData.assetName.toUpperCase()}:1m`);
        }
      }
      await new Promise<void>((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }

    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase('FXReplayDB');
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    localStorage.setItem(legacyMigratedKey, 'true');
    console.log('[DEBUG] One-time legacy IndexedDB migration completed successfully.');
  } catch (err) {
    console.error('Failed to migrate legacy IndexedDB data:', err);
  }
}
