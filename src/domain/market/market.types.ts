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
