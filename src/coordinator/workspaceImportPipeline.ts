import { parseCSV } from '@/utils/dataUtils';
import type { KLineData } from '@/utils/dataUtils';
import { marketDataRepository, watchlistRepository } from '@/repository';
import { validateImportedSymbol } from '@/engine/market';
import { setSymbolProfileCache, setTimezoneAdjustedBars } from './workspaceCache';

export interface ImportProgressState {
  status: 'idle' | 'scanning' | 'validating' | 'importing' | 'preparing' | 'error';
  currentActivity: string;
  processedCount: number;
  totalCount: number;
  currentSymbol?: string;
  errorMessage?: string;
}

export interface ImportPipelineResult {
  validSymbols: string[];
  validationErrors: string[];
  parsedProfiles: Record<string, any>;
}

export interface ExecuteImportPipelineParams {
  symbolsList: string[];
  mergedSymbolMap: Record<string, Record<string, File>>;
  mergedProfileMap: Record<string, File>;
  adjustTimezone: (bars: KLineData[]) => KLineData[];
  onProgress: (progress: ImportProgressState) => void;
}

/**
 * Validates discovered symbol folders and imports valid MT5 CSV data and profiles into
 * repositories and in-memory caches, with granular progress callbacks.
 */
export async function executeImportPipeline({
  symbolsList,
  mergedSymbolMap,
  mergedProfileMap,
  adjustTimezone,
  onProgress,
}: ExecuteImportPipelineParams): Promise<ImportPipelineResult> {
  // 1. Validate all discovered symbols
  onProgress({
    status: 'validating',
    currentActivity: `Validating ${symbolsList.length} symbol folders...`,
    processedCount: 0,
    totalCount: symbolsList.length,
  });

  const validSymbols: string[] = [];
  const validationErrors: string[] = [];
  const parsedProfiles: Record<string, any> = {};

  for (let i = 0; i < symbolsList.length; i++) {
    const sym = symbolsList[i];
    onProgress({
      status: 'validating',
      currentActivity: `Validating ${sym}...`,
      processedCount: i,
      totalCount: symbolsList.length,
      currentSymbol: sym,
    });

    const profileFile = mergedProfileMap[sym];
    const tfFiles = mergedSymbolMap[sym];

    const validationResult = await validateImportedSymbol(sym, tfFiles, profileFile);
    if (validationResult.isValid) {
      validSymbols.push(sym);
      parsedProfiles[sym] = validationResult.profileData;
    } else {
      validationErrors.push(validationResult.errorMsg || `Validation failed for ${sym}`);
    }
  }

  if (validSymbols.length === 0) {
    return {
      validSymbols,
      validationErrors,
      parsedProfiles,
    };
  }

  // 2. Commit valid symbols' data and profiles to persistent storage & in-memory caches
  let completedSymbols = 0;
  onProgress({
    status: 'importing',
    currentActivity: `Importing ${validSymbols.length} market symbols...`,
    processedCount: 0,
    totalCount: validSymbols.length,
  });

  for (const sym of validSymbols) {
    onProgress({
      status: 'importing',
      currentActivity: `Processing market data for ${sym}...`,
      processedCount: completedSymbols,
      totalCount: validSymbols.length,
      currentSymbol: sym,
    });

    const profile = parsedProfiles[sym];
    await watchlistRepository.saveSymbolProfile(sym, profile);
    setSymbolProfileCache(sym, profile);

    const tfFiles = mergedSymbolMap[sym];
    const importPromises = Object.entries(tfFiles).map(async ([tf, file]) => {
      const text = await file.text();
      const parsed = parseCSV(text);
      if (parsed.parsedCount > 0) {
        await marketDataRepository.saveBars(sym, tf, parsed.data);

        // Pre-populate in-memory cache so switching after import is instant with zero loading screen
        const adjusted = adjustTimezone(parsed.data);
        setTimezoneAdjustedBars(sym, tf, adjusted);
      }
    });
    await Promise.all(importPromises);
    completedSymbols++;

    onProgress({
      status: 'importing',
      currentActivity: `Imported ${sym} (${completedSymbols} of ${validSymbols.length})`,
      processedCount: completedSymbols,
      totalCount: validSymbols.length,
      currentSymbol: sym,
    });
  }

  return {
    validSymbols,
    validationErrors,
    parsedProfiles,
  };
}
