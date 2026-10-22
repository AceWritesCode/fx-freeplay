import { getSymbolProfileCache } from '../../coordinator/workspaceCache.ts';

/**
 * Calculates a standard "nice" round step interval following TradingView's
 * 1, 2, 5 subdivision sequence (... 0.0001, 0.0002, 0.0005, 0.001, 0.002, 0.005, 0.01 ...).
 */
export function calculateNiceInterval(rawInterval: number): number {
  if (rawInterval <= 0 || !isFinite(rawInterval)) return 0.0001;

  const exponent = Math.floor(Math.log10(rawInterval));
  const exp10 = Math.pow(10, exponent);
  const fraction = rawInterval / exp10;

  let niceFraction = 1;
  if (fraction < 1.5) {
    niceFraction = 1;
  } else if (fraction < 3.5) {
    niceFraction = 2;
  } else if (fraction < 7.5) {
    niceFraction = 5;
  } else {
    niceFraction = 10;
  }

  const result = niceFraction * exp10;
  return Number(result.toFixed(Math.max(0, -exponent + 2)));
}

export interface DynamicYAxisTickParams {
  range: {
    from: number;
    to: number;
    range: number;
    realFrom: number;
    realTo: number;
    realRange: number;
    displayFrom: number;
    displayTo: number;
    displayRange: number;
  };
  bounding: {
    width: number;
    height: number;
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
  defaultTicks?: Array<{ text: string; coord: number; value: any }>;
  chart?: any;
  symbol?: string;
  fallbackPrecision?: number;
}

export interface DynamicYAxisTick {
  text: string;
  coord: number;
  value: string;
}

/**
 * Dynamically generates Y-axis ticks based on viewport pixel height rather than
 * a static fixed tick count. As the vertical axis is stretched or expanded,
 * new intermediate values seamlessly pop in to fill empty space (TradingView behavior).
 */
export function createDynamicYAxisTicks(params: DynamicYAxisTickParams): DynamicYAxisTick[] {
  const { range, bounding, chart, symbol, fallbackPrecision = 4 } = params;
  if (!range || !bounding) {
    return params.defaultTicks as DynamicYAxisTick[] || [];
  }

  const { displayFrom, displayTo, displayRange } = range;
  const height = bounding.height;

  if (displayRange <= 0 || height <= 0 || !isFinite(displayFrom) || !isFinite(displayTo)) {
    return params.defaultTicks as DynamicYAxisTick[] || [];
  }

  // Determine active symbol precision
  let precision = fallbackPrecision;
  const currentSymbol = symbol || chart?.getSymbol?.()?.ticker;
  if (currentSymbol) {
    const profile = getSymbolProfileCache(currentSymbol);
    if (profile?.pricePrecision !== undefined && profile.pricePrecision !== null) {
      precision = profile.pricePrecision;
    }
  }
  const chartSymbol = chart?.getSymbol?.();
  if (chartSymbol?.pricePrecision !== undefined && chartSymbol.pricePrecision !== null) {
    precision = chartSymbol.pricePrecision;
  }

  // Target spacing: 38 - 44 pixels per tick label (similar to TradingView)
  const targetSpacing = 42;
  const targetTickCount = Math.max(3, Math.min(100, Math.floor(height / targetSpacing)));

  // Minimum step allowed by the precision (e.g. 5 decimals -> 0.00001)
  const minInterval = Math.pow(10, -precision);

  const rawInterval = displayRange / targetTickCount;
  let interval = calculateNiceInterval(rawInterval);

  // Ensure interval does not drop below instrument's true precision to avoid duplicate values
  if (interval < minInterval) {
    interval = minInterval;
  }

  const first = Math.ceil(displayFrom / interval) * interval;
  const last = Math.floor(displayTo / interval) * interval;

  const ticks: DynamicYAxisTick[] = [];
  const textHeight = 12;
  const maxTicks = 200;

  let current = first;
  let count = 0;

  while (current <= last + interval * 0.1 && count < maxTicks) {
    const val = Number(current.toFixed(Math.max(precision, 8)));
    
    // Convert price value to pixel coordinate on canvas
    const rate = (val - displayFrom) / displayRange;
    const y = Math.round((1 - rate) * height);

    // Filter ticks that overlap the top or bottom padding margins
    if (y > textHeight && y < height - textHeight) {
      const formattedText = val.toFixed(precision);
      ticks.push({
        text: formattedText,
        coord: y,
        value: formattedText,
      });
    }

    current += interval;
    count++;
  }

  // Fallback to defaultTicks if calculation yielded no ticks
  if (ticks.length === 0 && params.defaultTicks && params.defaultTicks.length > 0) {
    return params.defaultTicks as DynamicYAxisTick[];
  }

  return ticks;
}
