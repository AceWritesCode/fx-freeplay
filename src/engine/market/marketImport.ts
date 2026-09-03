import { TIMEZONE_OPTIONS } from '@/config';
import { parseCSV } from '@/utils/dataUtils';
import { matchFileToTimeframe } from '@/domain/market';

export interface ValidatedSymbolProfile {
  symbol: string;
  pricePrecision: number;
  brokerTimezoneOffset: number;
  brokerTimezoneLabel: string;
}

export interface SymbolValidationResult {
  isValid: boolean;
  errorMsg?: string;
  profileData?: ValidatedSymbolProfile;
}

export interface ScannedMarketDirectory {
  symbolMap: Record<string, Record<string, File>>;
  profileMap: Record<string, File>;
}

/**
 * Parses a timezone string (e.g. 'UTC', 'UTC+3', 'UTC-5:30') into its display label and offset in minutes.
 */
export function parseTimezoneToLabelAndOffset(tz: string): { label: string; offset: number } {
  const normalized = tz.toUpperCase().trim();
  if (normalized === 'UTC' || normalized === 'UTC+0' || normalized === 'UTC-0') {
    return { label: 'UTC', offset: 0 };
  }

  const match = normalized.match(/^UTC([+-]\d+(?::\d+)?)$/);
  if (match) {
    const tzStr = match[1]; // e.g. "+3", "+3:30", "-5"
    const targetPrefix = `(UTC${tzStr})`;
    const found = TIMEZONE_OPTIONS.find(opt => opt.label.startsWith(targetPrefix));
    if (found) {
      return { label: found.label, offset: found.value as number };
    }

    const parts = tzStr.split(':');
    const hours = parseInt(parts[0], 10);
    const minutes = parts[1] ? parseInt(parts[1], 10) : 0;
    const sign = hours < 0 ? -1 : 1;
    const offset = hours * 60 + sign * minutes;
    return { label: `(UTC${tzStr}) Custom`, offset };
  }

  return { label: 'UTC', offset: 0 };
}

/**
 * Recursively traverses a FileSystemDirectoryHandle and maps all discovered CSV and _info.json files.
 */
export async function processDirectoryHandle(
  dirHandle: any,
  symbolMap: Record<string, Record<string, File>>,
  profileMap: Record<string, File>,
  currentPath: string = ''
): Promise<void> {
  for await (const entry of dirHandle.values()) {
    if (entry.kind === 'file') {
      const lowerName = entry.name.toLowerCase();
      if (lowerName.endsWith('.csv')) {
        const file = await entry.getFile();
        const relativePath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
        const parts = relativePath.split('/');

        let symbol: string;
        let filename: string;

        if (parts.length >= 3) {
          symbol = parts[parts.length - 2].toUpperCase();
          filename = parts[parts.length - 1];
        } else if (parts.length === 2) {
          symbol = parts[0].toUpperCase();
          filename = parts[1];
        } else {
          const namePart = file.name.split(/[._-]/)[0];
          symbol = namePart ? namePart.toUpperCase() : 'SYMBOL';
          filename = file.name;
        }

        const tf = matchFileToTimeframe(filename);
        if (tf) {
          if (!symbolMap[symbol]) {
            symbolMap[symbol] = {};
          }
          symbolMap[symbol][tf] = file;
        }
      } else if (lowerName.endsWith('_info.json')) {
        const file = await entry.getFile();
        const relativePath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
        const parts = relativePath.split('/');

        let symbol: string;
        if (parts.length >= 2) {
          symbol = parts[parts.length - 2].toUpperCase();
        } else {
          const baseName = entry.name.slice(0, -10);
          symbol = baseName.toUpperCase();
        }
        if (symbol) {
          profileMap[symbol] = file;
        }
      }
    } else if (entry.kind === 'directory') {
      const nextPath = currentPath ? `${currentPath}/${entry.name}` : entry.name;
      await processDirectoryHandle(entry, symbolMap, profileMap, nextPath);
    }
  }
}

/**
 * Scans an array of FileSystemDirectoryHandles and aggregates discovered symbol files and profiles.
 */
export async function scanDirectoryHandles(handles: any[]): Promise<ScannedMarketDirectory> {
  const mergedSymbolMap: Record<string, Record<string, File>> = {};
  const mergedProfileMap: Record<string, File> = {};

  for (const dirHandle of handles) {
    const symbolMap: Record<string, Record<string, File>> = {};
    const profileMap: Record<string, File> = {};
    await processDirectoryHandle(dirHandle, symbolMap, profileMap, dirHandle.name);

    Object.entries(symbolMap).forEach(([sym, files]) => {
      mergedSymbolMap[sym] = {
        ...(mergedSymbolMap[sym] || {}),
        ...files,
      };
    });

    Object.entries(profileMap).forEach(([sym, file]) => {
      mergedProfileMap[sym] = file;
    });
  }

  return {
    symbolMap: mergedSymbolMap,
    profileMap: mergedProfileMap,
  };
}

/**
 * Validates symbol configuration metadata and timeframe candlestick files for an imported symbol.
 */
export async function validateImportedSymbol(
  symbol: string,
  timeframeFiles: Record<string, File>,
  profileFile?: File
): Promise<SymbolValidationResult> {
  // 1. Validate Symbol Info if provided
  let profileData: ValidatedSymbolProfile | undefined;
  if (profileFile) {
    try {
      const text = await profileFile.text();
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object') {
        return { isValid: false, errorMsg: `Symbol Info for ${symbol} is not a valid JSON object.` };
      }
      if (!parsed.symbol || typeof parsed.symbol !== 'string' || parsed.symbol.trim() === '') {
        return { isValid: false, errorMsg: `Symbol Info for ${symbol} must contain a non-empty 'symbol' string.` };
      }
      const fileSym = parsed.symbol.toUpperCase();
      const folderSym = symbol.toUpperCase();
      if (fileSym !== folderSym && !folderSym.startsWith(fileSym)) {
        return { isValid: false, errorMsg: `Symbol Info symbol '${parsed.symbol}' does not match folder symbol '${symbol}'.` };
      }
      if (parsed.digits === undefined || parsed.timezone === undefined) {
        return {
          isValid: false,
          errorMsg: `Symbol Info for ${symbol} must contain required fields: digits, timezone.`,
        };
      }
      const tzInfo = parseTimezoneToLabelAndOffset(parsed.timezone);
      profileData = {
        symbol: parsed.symbol,
        pricePrecision: parsed.digits,
        brokerTimezoneOffset: tzInfo.offset,
        brokerTimezoneLabel: tzInfo.label,
      };
    } catch (err) {
      return { isValid: false, errorMsg: `Failed to parse Symbol Info JSON for ${symbol}: ${(err as Error).message}` };
    }
  } else {
    return { isValid: false, errorMsg: `Missing Symbol Info JSON (*_info.json) for ${symbol} in the selected folder.` };
  }

  // 2. Validate Timeframe CSV files
  const timeframes = Object.keys(timeframeFiles);
  if (timeframes.length === 0) {
    return { isValid: false, errorMsg: `No timeframe CSV files found for symbol ${symbol}.` };
  }

  for (const tf of timeframes) {
    const file = timeframeFiles[tf];
    try {
      const text = await file.text();
      const parsed = parseCSV(text);
      if (parsed.parsedCount === 0) {
        return { isValid: false, errorMsg: `File ${file.name} for timeframe ${tf} contains no valid candlestick data.` };
      }
    } catch (err) {
      return { isValid: false, errorMsg: `Failed to parse CSV file ${file.name}: ${(err as Error).message}` };
    }
  }

  return { isValid: true, profileData };
}
