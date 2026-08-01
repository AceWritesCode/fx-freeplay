import { MarketDataRepositoryImpl } from './MarketDataRepositoryImpl';
import { WatchlistRepositoryImpl } from './WatchlistRepositoryImpl';
import { WorkspaceLayoutRepositoryImpl } from './WorkspaceLayoutRepositoryImpl';
import { DrawingRepositoryImpl } from './DrawingRepositoryImpl';
import { SettingsRepositoryImpl } from './SettingsRepositoryImpl';
import { initDatabase } from './db';

export * from './types';
export * from './db';

export const marketDataRepository = new MarketDataRepositoryImpl();
export const watchlistRepository = new WatchlistRepositoryImpl();
export const workspaceLayoutRepository = new WorkspaceLayoutRepositoryImpl();
export const drawingRepository = new DrawingRepositoryImpl();
export const settingsRepository = new SettingsRepositoryImpl();

export async function initRepositories(): Promise<void> {
  await initDatabase();
}
