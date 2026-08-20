export interface KLineData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface WatchlistSymbol {
  name: string;
  filesCount?: number;
  timeframes?: string[];
}

/**
 * Canonical symbol metadata object produced by the MT5 exporter.
 * This becomes the single source of truth for all symbol metadata in future phases.
 * Only import, persist, retrieve, and display logic may consume this in Phase 6.
 */
export interface SymbolProfile {
  /** Required symbol identifier (e.g. "EURUSD") */
  symbol: string;
  assetType?: string;
  broker?: string;
  digits?: number;
  point?: number;
  tickSize?: number;
  pipSize?: number;
  contractSize?: number;
  baseCurrency?: string;
  quoteCurrency?: string;
  timezone?: string;
  /** Forward-compatible: accepts any additional fields from future MT5 exporter versions */
  [key: string]: any;
}

