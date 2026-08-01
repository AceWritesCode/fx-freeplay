import type { DrawingRepository } from './types';
import { executeTx, STORES } from './db';

export class DrawingRepositoryImpl implements DrawingRepository {
  private getKey(symbol: string): string {
    return symbol.toUpperCase();
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
    await executeTx(STORES.DRAWINGS, 'readwrite', (store) => store.delete(key));
  }
}
