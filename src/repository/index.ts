import { MarketDataRepositoryImpl } from './MarketDataRepositoryImpl';
import { WatchlistRepositoryImpl } from './WatchlistRepositoryImpl';
import { WorkspaceLayoutRepositoryImpl } from './WorkspaceLayoutRepositoryImpl';
import { DrawingRepositoryImpl } from './DrawingRepositoryImpl';
import { SettingsRepositoryImpl } from './SettingsRepositoryImpl';
import { DataManagementRepositoryImpl } from './DataManagementRepositoryImpl';
import { initDatabase, migrateLegacyData } from './db';

export * from './types';
export * from './db';
export * from './DataManagementRepository';
export * from './DataManagementRepositoryImpl';

export const marketDataRepository = new MarketDataRepositoryImpl();
export const watchlistRepository = new WatchlistRepositoryImpl();
export const workspaceLayoutRepository = new WorkspaceLayoutRepositoryImpl();
export const drawingRepository = new DrawingRepositoryImpl();
export const settingsRepository = new SettingsRepositoryImpl();
export const dataManagementRepository = new DataManagementRepositoryImpl();

export async function initRepositories(): Promise<void> {
  const db = await initDatabase();
  await migrateLegacyData(db);
}
