import type { SymbolProfile } from '@/domain/market';
import type { SymbolProfileRepository } from './types';
import { executeTx, STORES } from './db';

/**
 * Persists Symbol Profiles in the METADATA object store.
 * Keys are namespaced as `symbolProfile:{SYMBOL_UPPERCASE}`.
 *
 * No database version bump is required — STORES.METADATA was provisioned
 * in the initial schema (version 1).
 */
export class SymbolProfileRepositoryImpl implements SymbolProfileRepository {
  private getKey(symbol: string): string {
    return `symbolProfile:${symbol.toUpperCase()}`;
  }

  async getSymbolProfile(symbol: string): Promise<SymbolProfile | null> {
    const key = this.getKey(symbol);
    const profile = await executeTx<SymbolProfile | undefined>(
      STORES.METADATA,
      'readonly',
      (store) => store.get(key)
    );
    return profile ?? null;
  }

  async saveSymbolProfile(symbol: string, profile: SymbolProfile): Promise<void> {
    const key = this.getKey(symbol);
    await executeTx(STORES.METADATA, 'readwrite', (store) => store.put(profile, key));
  }

  async deleteSymbolProfile(symbol: string): Promise<void> {
    const key = this.getKey(symbol);
    await executeTx(STORES.METADATA, 'readwrite', (store) => store.delete(key));
  }
}
