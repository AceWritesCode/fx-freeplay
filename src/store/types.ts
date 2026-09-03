import type { ChartSettings, TimeframeOption } from '@/config';

// Re-export core config types for convenience
export type { ChartSettings, TimeframeOption };

/**
 * Represents the configuration of a single multi-chart layout grid slot.
 */
export interface SlotConfig {
  symbol: string | null;
  timeframe: string;
}

/**
 * Layout panel size percentages mapped by layout mode keys (e.g. '2v', '3h').
 */
export type LayoutSizes = Record<string, number[]>;

/**
 * Watchlist symbol metadata details.
 * Payload candle data buffers are excluded from global state.
 */
export interface WatchlistSymbol {
  name: string;
  settings?: any;
}


/**
 * Represents a folder node for organizing visual chart drawing shapes.
 */
export interface FolderItem {
  id: string;
  name: string;
  isCollapsed: boolean;
  isLocked: boolean;
  isVisible: boolean;
  order?: number;
}
