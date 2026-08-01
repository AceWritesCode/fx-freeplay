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
 * Represents a single coordinate point of a drawing anchor on the chart canvas.
 */
export interface DrawingPoint {
  timestamp?: number;
  dataIndex?: number;
  value?: number;
}

/**
 * Represents a user-drawn overlay shape instance metadata.
 */
export interface DrawingInstance {
  id: string;             // Unique ID for the specific drawing
  toolId: string;         // References the ToolDefinition in the registry
  name: string;           // Custom user-defined name
  groupId?: string;       // Folder group reference ID
  isVisible: boolean;     // Toggle visibility state
  isLocked: boolean;      // Position modification lock flag
  templateId?: string;    // Reference to a custom style template
  settings: Record<string, any>; // Color, style, and extension configuration overrides
  points: DrawingPoint[]; // Coordinate points of anchors
  chartId: string;        // ID of the target chart slot
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
