import Papa from 'papaparse';

export interface KLineData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface ParseResult {
  data: KLineData[];
  errors: string[];
  headers: string[];
  rowCount: number;
  parsedCount: number;
  skippedCount: number;
}

// Robust custom date string parser supporting standard ISO, slash formats, and MT4/MT5 dots formats
export function parseDateStringToTimestamp(dateStr: string): number {
  if (!dateStr) return NaN;
  
  let cleaned = dateStr.trim();
  
  // Pattern 1: YYYY-MM-DD HH:mm:ss (or YYYY/MM/DD, YYYY.MM.DD)
  const ymdRegex = /^(\d{4})[-./](\d{1,2})[-./](\d{1,2})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/;
  let match = cleaned.match(ymdRegex);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // 0-indexed month
    const day = parseInt(match[3], 10);
    const hour = match[4] ? parseInt(match[4], 10) : 0;
    const minute = match[5] ? parseInt(match[5], 10) : 0;
    const second = match[6] ? parseInt(match[6], 10) : 0;
    return new Date(year, month, day, hour, minute, second).getTime();
  }
  
  // Pattern 2: DD-MM-YYYY HH:mm:ss (or DD/MM/YYYY, DD.MM.DD)
  const dmyRegex = /^(\d{1,2})[-./](\d{1,2})[-./](\d{4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/;
  match = cleaned.match(dmyRegex);
  if (match) {
    const num1 = parseInt(match[1], 10);
    const num2 = parseInt(match[2], 10);
    const year = parseInt(match[3], 10);
    const hour = match[4] ? parseInt(match[4], 10) : 0;
    const minute = match[5] ? parseInt(match[5], 10) : 0;
    const second = match[6] ? parseInt(match[6], 10) : 0;
    
    let month = 0;
    let day = 1;
    
    if (num1 > 12) {
      // First number is day (DD/MM/YYYY)
      day = num1;
      month = num2 - 1;
    } else if (num2 > 12) {
      // Second number is day (MM/DD/YYYY)
      day = num2;
      month = num1 - 1;
    } else {
      // Ambiguous: default to DD/MM/YYYY since it is most common in MT4 export tables
      day = num1;
      month = num2 - 1;
    }
    return new Date(year, month, day, hour, minute, second).getTime();
  }

  // Fallback to standard javascript date parser (replacing dots with slashes)
  cleaned = cleaned.replace(/\./g, '/');
  return new Date(cleaned).getTime();
}

// Normalizes and parses the CSV data client-side with validation feedback
export function parseCSV(csvText: string): ParseResult {
  const errors: string[] = [];
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors && parsed.errors.length > 0) {
    parsed.errors.forEach(err => {
      errors.push(`CSV parsing error on row ${err.row || 'unknown'}: ${err.message}`);
    });
  }

  const rowCount = parsed.data.length;
  if (rowCount === 0) {
    errors.push('No data rows found in the CSV file.');
    return { data: [], errors, headers: [], rowCount, parsedCount: 0, skippedCount: 0 };
  }

  // Set hard limit of 300k rows (reading from bottom/latest to top/older)
  const MAX_ROWS = 300000;
  let rowsToParse = parsed.data;
  let offset = 0;
  if (rowCount > MAX_ROWS) {
    rowsToParse = parsed.data.slice(-MAX_ROWS);
    offset = rowCount - MAX_ROWS;
    errors.push(`File exceeds the limit of ${MAX_ROWS.toLocaleString()} rows. Only the most recent ${MAX_ROWS.toLocaleString()} rows (from the bottom of the file) were imported.`);
  }

  const sampleRow = rowsToParse[0] as any;
  const headers = Object.keys(sampleRow);

  // Detect separate Date and Time columns (common in MT4/MT5 exports like <DATE> and <TIME>)
  const dateKey = headers.find(k => /date/i.test(k) && !/time/i.test(k));
  const timeKey = headers.find(k => /time/i.test(k) && !/date/i.test(k));
  
  // Or standard combined timestamp header
  const timestampKey = headers.find(k => /timestamp|datetime|date_time/i.test(k)) || headers.find(k => /date|time/i.test(k));

  const openKey = headers.find(k => /open/i.test(k));
  const highKey = headers.find(k => /high/i.test(k));
  const lowKey = headers.find(k => /low/i.test(k));
  const closeKey = headers.find(k => /close/i.test(k));
  const volumeKey = headers.find(k => /volume|tickvol/i.test(k));

  const missingColumns: string[] = [];
  if (!dateKey && !timestampKey) missingColumns.push('Timestamp/Date');
  if (!openKey) missingColumns.push('Open');
  if (!highKey) missingColumns.push('High');
  if (!lowKey) missingColumns.push('Low');
  if (!closeKey) missingColumns.push('Close');

  if (missingColumns.length > 0) {
    errors.push(`Missing required columns: ${missingColumns.join(', ')}. Available headers: [${headers.join(', ')}]`);
    return { data: [], errors, headers, rowCount, parsedCount: 0, skippedCount: rowCount };
  }

  const data: KLineData[] = [];
  let skippedCount = 0;

  for (let idx = 0; idx < rowsToParse.length; idx++) {
    const row = rowsToParse[idx] as any;
    const lineNum = idx + offset + 2; // header is line 1, plus offset of skipped rows

    let timestampVal = '';
    if (dateKey && timeKey) {
      timestampVal = `${row[dateKey]} ${row[timeKey]}`;
    } else if (timestampKey) {
      timestampVal = row[timestampKey];
    }

    const openVal = parseFloat(row[openKey!]);
    const highVal = parseFloat(row[highKey!]);
    const lowVal = parseFloat(row[lowKey!]);
    const closeVal = parseFloat(row[closeKey!]);
    const volumeVal = volumeKey ? parseFloat(row[volumeKey]) : 0;

    let timestamp: number;
    if (!isNaN(Number(timestampVal))) {
      const num = Number(timestampVal);
      // Seconds to milliseconds check
      timestamp = num < 9999999999 ? num * 1000 : num;
    } else {
      timestamp = parseDateStringToTimestamp(timestampVal);
    }

    if (isNaN(timestamp)) {
      skippedCount++;
      if (skippedCount <= 5) {
        errors.push(`Row ${lineNum}: Invalid Date/Timestamp value "${timestampVal}".`);
      }
      continue;
    }

    if (isNaN(openVal) || isNaN(highVal) || isNaN(lowVal) || isNaN(closeVal)) {
      skippedCount++;
      if (skippedCount <= 5) {
        errors.push(`Row ${lineNum}: Invalid numeric OHLC values (Open: ${row[openKey!]}, High: ${row[highKey!]}, Low: ${row[lowKey!]}, Close: ${row[closeKey!]}).`);
      }
      continue;
    }

    data.push({
      timestamp,
      open: openVal,
      high: highVal,
      low: lowVal,
      close: closeVal,
      volume: isNaN(volumeVal) ? 0 : volumeVal
    });
  }

  if (skippedCount > 0) {
    errors.push(`Skipped ${skippedCount} rows with invalid format out of ${rowCount} total rows.`);
  }

  // Sort by timestamp
  data.sort((a, b) => a.timestamp - b.timestamp);

  return {
    data,
    errors,
    headers,
    rowCount,
    parsedCount: data.length,
    skippedCount
  };
}

// Helper to calculate the boundary timestamp of a bar based on the timeframe in minutes
export function getBoundaryTimestamp(timestamp: number, minutes: number): number {
  const date = new Date(timestamp);
  
  if (minutes === 10080) {
    // Weekly: Align to Monday 00:00:00
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday.getTime();
  }
  
  if (minutes === 43200) {
    // Monthly: Align to Day 1 of the month, 00:00:00
    date.setDate(1);
    date.setHours(0, 0, 0, 0);
    return date.getTime();
  }
  
  // Standard minute boundaries (Minutes / Hours / Days)
  const intervalMs = minutes * 60 * 1000;
  return Math.floor(timestamp / intervalMs) * intervalMs;
}

// Resamples 1m data to a higher timeframe specified in minutes using actual timezone boundaries
export function resample1mToTimeframe(data1m: KLineData[], minutes: number): KLineData[] {
  if (minutes === 1) return data1m;
  if (data1m.length === 0) return [];

  const resampled: KLineData[] = [];

  let currentCandle: KLineData | null = null;
  let currentBoundary = 0;

  for (let i = 0; i < data1m.length; i++) {
    const bar = data1m[i];
    const boundary = getBoundaryTimestamp(bar.timestamp, minutes);

    if (currentCandle === null || boundary !== currentBoundary) {
      if (currentCandle !== null) {
        resampled.push(currentCandle);
      }
      currentBoundary = boundary;
      currentCandle = {
        timestamp: boundary,
        open: bar.open,
        high: bar.high,
        low: bar.low,
        close: bar.close,
        volume: bar.volume
      };
    } else {
      if (bar.high > currentCandle.high) currentCandle.high = bar.high;
      if (bar.low < currentCandle.low) currentCandle.low = bar.low;
      currentCandle.close = bar.close;
      currentCandle.volume += bar.volume;
    }
  }

  if (currentCandle !== null) {
    resampled.push(currentCandle);
  }

  return resampled;
}

// ==========================================
// IndexedDB & Export Utilities
// ==========================================

const DB_NAME = 'FXReplayDB';
const STORE_NAME = 'chartState';

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveChartDataToIndexedDB(
  raw1mData: KLineData[],
  assetName: string,
  savedResetOffset: number | null,
  watchlistSymbols?: any[],
  activeTimeframe?: string
): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(raw1mData, 'raw1mData');
    store.put(assetName, 'assetName');
    store.put(savedResetOffset, 'savedResetOffset');
    if (watchlistSymbols !== undefined) {
      store.put(watchlistSymbols, 'watchlistSymbols');
    }
    if (activeTimeframe !== undefined) {
      store.put(activeTimeframe, 'activeTimeframe');
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to save to IndexedDB:', err);
  }
}

export async function loadChartDataFromIndexedDB(): Promise<{
  raw1mData: KLineData[] | null;
  assetName: string | null;
  savedResetOffset: number | null;
  watchlistSymbols: any[] | null;
  activeTimeframe: string | null;
}> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    
    const rawRequest = store.get('raw1mData');
    const nameRequest = store.get('assetName');
    const offsetRequest = store.get('savedResetOffset');
    const watchlistRequest = store.get('watchlistSymbols');
    const tfRequest = store.get('activeTimeframe');
    
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });

    return {
      raw1mData: rawRequest.result || null,
      assetName: nameRequest.result || null,
      savedResetOffset: offsetRequest.result !== undefined ? offsetRequest.result : null,
      watchlistSymbols: watchlistRequest.result || null,
      activeTimeframe: tfRequest.result || null
    };
  } catch (err) {
    console.error('Failed to load from IndexedDB:', err);
    return { raw1mData: null, assetName: null, savedResetOffset: null, watchlistSymbols: null, activeTimeframe: null };
  }
}

export async function clearChartDataInIndexedDB(): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to clear IndexedDB:', err);
  }
}

export async function exportToCSV(data: KLineData[], filename: string) {
  if (data.length === 0) return;
  
  const headers = ['Date', 'Open', 'High', 'Low', 'Close', 'Volume'];
  const rows = data.map(row => {
    const date = new Date(row.timestamp);
    const pad = (n: number) => String(n).padStart(2, '0');
    const dateStr = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
    return [dateStr, row.open, row.high, row.low, row.close, row.volume];
  });
  
  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  
  // Try to use File System Access API if supported (to ask where to save)
  if ('showSaveFilePicker' in window) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: `${filename}.csv`,
        types: [{
          description: 'CSV Files',
          accept: {
            'text/csv': ['.csv'],
          },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(csvContent);
      await writable.close();
      console.log('[DEBUG] Export complete via File System Access API');
      return;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.log('[DEBUG] File save picker aborted by user.');
        return;
      }
      console.warn('File System Access API failed, falling back...', err);
    }
  }

  // Fallback: standard browser download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ------------------------------------------------------------------------------------------------
// IndexedDB Directory Handle Persistence
// ------------------------------------------------------------------------------------------------

export async function saveDirectoryHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(handle, 'folderHandle');
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to save directory handle:', err);
  }
}

export async function loadDirectoryHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get('folderHandle');
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return request.result || null;
  } catch (err) {
    console.error('Failed to load directory handle:', err);
    return null;
  }
}

export async function saveDirectoryHandles(handles: FileSystemDirectoryHandle[]): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(handles, 'folderHandles');
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to save directory handles:', err);
  }
}

export async function loadDirectoryHandles(): Promise<FileSystemDirectoryHandle[]> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get('folderHandles');
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return request.result || [];
  } catch (err) {
    console.error('Failed to load directory handles:', err);
    return [];
  }
}

export async function clearDirectoryHandle(): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete('folderHandle');
    store.delete('folderHandles');
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Failed to clear directory handle:', err);
  }
}

export function detectPricePrecision(data: KLineData[]): number {
  if (!data || data.length === 0) return 4;
  
  let maxDecimals = 2; // minimum 2
  const sampleSize = Math.min(data.length, 1000);
  
  for (let i = 0; i < sampleSize; i++) {
    const price = data[i].close;
    if (price === undefined || isNaN(price)) continue;
    
    const str = price.toString();
    const dotIndex = str.indexOf('.');
    if (dotIndex !== -1) {
      const decimals = str.length - dotIndex - 1;
      if (decimals > maxDecimals) {
        maxDecimals = decimals;
      }
    }
  }
  
  return Math.min(maxDecimals, 8);
}
