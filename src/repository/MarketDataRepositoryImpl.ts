import type { KLineData } from '@/utils/dataUtils';
import type { MarketDataRepository } from './types';
import { executeTx, getStore, STORES } from './db';

export class MarketDataRepositoryImpl implements MarketDataRepository {
  private getKey(symbol: string, timeframe: string): string {
    return `${symbol.toUpperCase()}:${timeframe}`;
  }

  async getSymbols(): Promise<string[]> {
    const { store, tx } = await getStore(STORES.MARKET_BARS, 'readonly');
    return new Promise((resolve, reject) => {
      const keysRequest = store.getAllKeys();
      keysRequest.onsuccess = () => {
        const keys = keysRequest.result as string[];
        const symbols = Array.from(
          new Set(
            keys
              .filter((k) => typeof k === 'string' && k.includes(':'))
              .map((k) => k.split(':')[0])
          )
        );
        resolve(symbols);
      };
      keysRequest.onerror = () => reject(keysRequest.error);
      tx.onerror = () => reject(tx.error);
    });
  }

  async getBars(symbol: string, timeframe: string): Promise<KLineData[]> {
    const key = this.getKey(symbol, timeframe);
    const bars = await executeTx<KLineData[] | undefined>(
      STORES.MARKET_BARS,
      'readonly',
      (store) => store.get(key)
    );
    return bars || [];
  }

  async saveBars(symbol: string, timeframe: string, bars: KLineData[]): Promise<void> {
    const key = this.getKey(symbol, timeframe);
    await executeTx(STORES.MARKET_BARS, 'readwrite', (store) => store.put(bars, key));
  }

  async deleteBars(symbol: string): Promise<void> {
    const { store, tx } = await getStore(STORES.MARKET_BARS, 'readwrite');
    return new Promise((resolve, reject) => {
      const keysRequest = store.getAllKeys();
      keysRequest.onsuccess = () => {
        const keys = keysRequest.result as string[];
        const targetKeys = keys.filter(
          (k) => typeof k === 'string' && k.startsWith(`${symbol.toUpperCase()}:`)
        );
        targetKeys.forEach((k) => store.delete(k));
      };
      keysRequest.onerror = () => reject(keysRequest.error);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clearAll(): Promise<void> {
    await executeTx(STORES.MARKET_BARS, 'readwrite', (store) => store.clear());
  }
}
