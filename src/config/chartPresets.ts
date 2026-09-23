export interface ChartSettings {
  // Symbol Settings
  chartType?: 'candlestick' | 'line' | 'heikin_ashi'; // 'candlestick' | 'line' | 'heikin_ashi' (default: 'candlestick')
  lineColor?: string; // Line chart color (default: '#2962FF')
  showBody: boolean;
  bullColor: string;
  bearColor: string;
  showBorders: boolean;
  bullBorderColor: string;
  bearBorderColor: string;
  showWicks: boolean;
  bullWickColor: string;
  bearWickColor: string;
  pricePrecision: number;
  showPriceLine: boolean;
  priceLineStyle: 'dashed' | 'solid' | 'dotted' | 'none';
  priceLineSize: number;
  priceLineColor: string;
  priceLineUseCandleColor: boolean;
  showPriceLineLabel: boolean;

  // Canvas Settings — Crosshair
  crosshairColor?: string;
  crosshairOpacity?: number; // 0 to 1 or 0 to 100
  crosshairSize?: number; // 1, 2, 3
  crosshairStyle?: 'solid' | 'dashed' | 'dotted';
  crosshairLabelBgColor?: string;
  crosshairLabelBgOpacity?: number;
  crosshairTextColor?: string;

  // Canvas Settings — Grid Lines
  vertGridColor?: string;
  vertGridOpacity?: number;
  vertGridStyle?: 'solid' | 'dashed' | 'dotted' | 'none';
  horizGridColor?: string;
  horizGridOpacity?: number;
  horizGridStyle?: 'solid' | 'dashed' | 'dotted' | 'none';

  // Legacy Grid Settings (kept for preset/storage backward compatibility)
  gridType: 'Vert and Horiz' | 'Horizontal Only' | 'Vertical Only' | 'None';
  gridColor: string;
  gridStyle: 'dashed' | 'solid' | 'dotted' | 'none';

  // Canvas Settings — Watermark
  showWatermark: boolean;
  watermarkColor?: string;
  watermarkOpacity?: number;

  // Canvas Settings — Background
  background: string;
  backgroundGradientStop: string;
  backgroundType: 'Solid' | 'Gradient' | 'None';

  // Canvas Settings — Session Breaks
  showSessionBreaks: boolean;
  sessionBreaksColor: string;
  sessionBreaksStyle: 'dashed' | 'solid' | 'dotted' | 'none';
  sessionBreaksSize: number;

  // Scales Settings — General Appearance
  scalesTextSize: number;
  scalesTextColor: string;
  showScalesLines: boolean;
  scalesLinesColor: string;
  scaleTextColor?: string;
  scaleTextSize?: number;
  scaleAxisLinesVisible?: boolean;
  scaleAxisLineColor?: string;

  // Scales Settings — Price Scale
  priceScalePosition?: 'left' | 'right';
  showPriceScalePriceLabels?: boolean;
  showPriceScaleLastPriceLabel?: boolean;
  showPriceScaleCrosshairLabel?: boolean;

  // Scales Settings — Time Scale
  showTimeScaleLabels?: boolean;
  showTimeScaleCrosshairLabel?: boolean;
  showTimeScaleDayOfWeek?: boolean;
  dateFormat?: string;

  // Timezone Settings
  timezoneAdjustmentEnabled: boolean;
  brokerTimezoneOffset: number;
  brokerTimezoneLabel: string;
  userTimezoneOffset: number;
  userTimezoneLabel: string;
  timeFormat?: '12h' | '24h'; // 12-hour (06:00 PM) or 24-hour (18:00) format (default: '24h')

  // Magnet Sensitivity Settings (pixel proximity thresholds per mode)
  magnetWeakSensitivity: number;   // 0-40
  magnetNormalSensitivity: number; // Legacy, kept for schema backward compatibility
  magnetStrongSensitivity: number; // 40-80

  // Replay Speed Range Settings (seconds per bar)
  replayMaxDuration: number; // Slowest speed (default: 3.0)
  replayMinDuration: number; // Fastest speed (default: 0.1)

  // Theme Sync Settings
  syncChartBackgroundWithTheme?: boolean; // When true, chart background changes with app theme (default: false)

  // Reset View Settings
  resetViewOffsetRatio?: number; // Preferred distance of last candle from right edge as a ratio of chart width (0.05-0.95, default: 0.5)
}

export const PRESET_SETTINGS: { [key: string]: ChartSettings } = {
  classic: {
    chartType: 'candlestick',
    lineColor: '#2962FF',
    syncChartBackgroundWithTheme: false,
    resetViewOffsetRatio: 0.5,
    showBody: true,
    bullColor: '#089981',
    bearColor: '#F23645',
    showBorders: true,
    bullBorderColor: '#089981',
    bearBorderColor: '#F23645',
    showWicks: true,
    bullWickColor: '#474f66',
    bearWickColor: '#474f66',
    pricePrecision: 0,
    showPriceLine: true,
    priceLineStyle: 'dashed',
    priceLineSize: 1,
    priceLineColor: '#2962FF',
    priceLineUseCandleColor: true,
    showPriceLineLabel: true,
    crosshairColor: '#888888',
    crosshairOpacity: 1,
    crosshairSize: 1,
    crosshairStyle: 'dashed',
    crosshairLabelBgColor: '#363c4e',
    crosshairLabelBgOpacity: 1,
    crosshairTextColor: '#ffffff',
    vertGridColor: '#242832',
    vertGridOpacity: 1,
    vertGridStyle: 'none',
    horizGridColor: '#242832',
    horizGridOpacity: 1,
    horizGridStyle: 'none',
    background: '#131722',
    backgroundGradientStop: '#1e222d',
    backgroundType: 'Solid',
    gridType: 'None',
    gridColor: '#242832',
    gridStyle: 'dashed',
    showWatermark: true,
    watermarkColor: 'rgba(255, 255, 255, 0.05)',
    watermarkOpacity: 0.05,
    showSessionBreaks: false,
    sessionBreaksColor: 'rgba(139, 147, 166, 0.4)',
    sessionBreaksStyle: 'dashed',
    sessionBreaksSize: 1,
    scalesTextSize: 11,
    scalesTextColor: '#b2b5be',
    showScalesLines: true,
    scalesLinesColor: '#242832',
    priceScalePosition: 'right',
    showPriceScalePriceLabels: true,
    showPriceScaleLastPriceLabel: true,
    showPriceScaleCrosshairLabel: true,
    showTimeScaleLabels: true,
    showTimeScaleCrosshairLabel: true,
    showTimeScaleDayOfWeek: false,
    dateFormat: 'dd MMM yyyy',
    timezoneAdjustmentEnabled: false,
    brokerTimezoneOffset: 180,
    brokerTimezoneLabel: '(UTC+3) Moscow',
    userTimezoneOffset: 330,
    userTimezoneLabel: '(UTC+5:30) Kolkata',
    timeFormat: '24h',
    magnetWeakSensitivity: 10,
    magnetNormalSensitivity: 30,
    magnetStrongSensitivity: 60,
    replayMaxDuration: 3.0,
    replayMinDuration: 0.01,
  },
  obsidian: {
    chartType: 'candlestick',
    lineColor: '#2962FF',
    syncChartBackgroundWithTheme: false,
    resetViewOffsetRatio: 0.5,
    showBody: true,
    bullColor: '#00E676',
    bearColor: '#FF3D00',
    showBorders: true,
    bullBorderColor: '#00E676',
    bearBorderColor: '#FF3D00',
    showWicks: true,
    bullWickColor: '#333333',
    bearWickColor: '#333333',
    pricePrecision: 0,
    showPriceLine: true,
    priceLineStyle: 'dashed',
    priceLineSize: 1,
    priceLineColor: '#00E676',
    priceLineUseCandleColor: true,
    showPriceLineLabel: true,
    crosshairColor: '#666666',
    crosshairOpacity: 1,
    crosshairSize: 1,
    crosshairStyle: 'dashed',
    crosshairLabelBgColor: '#2a2e39',
    crosshairLabelBgOpacity: 1,
    crosshairTextColor: '#ffffff',
    vertGridColor: '#1a1a1a',
    vertGridOpacity: 1,
    vertGridStyle: 'none',
    horizGridColor: '#1a1a1a',
    horizGridOpacity: 1,
    horizGridStyle: 'none',
    background: '#000000',
    backgroundGradientStop: '#171717',
    backgroundType: 'Solid',
    gridType: 'None',
    gridColor: '#1a1a1a',
    gridStyle: 'dashed',
    showWatermark: true,
    watermarkColor: 'rgba(255, 255, 255, 0.05)',
    watermarkOpacity: 0.05,
    showSessionBreaks: false,
    sessionBreaksColor: 'rgba(136, 136, 136, 0.4)',
    sessionBreaksStyle: 'dashed',
    sessionBreaksSize: 1,
    scalesTextSize: 11,
    scalesTextColor: '#888888',
    showScalesLines: true,
    scalesLinesColor: '#1a1a1a',
    priceScalePosition: 'right',
    showPriceScalePriceLabels: true,
    showPriceScaleLastPriceLabel: true,
    showPriceScaleCrosshairLabel: true,
    showTimeScaleLabels: true,
    showTimeScaleCrosshairLabel: true,
    showTimeScaleDayOfWeek: false,
    dateFormat: 'dd MMM yyyy',
    timezoneAdjustmentEnabled: false,
    brokerTimezoneOffset: 180,
    brokerTimezoneLabel: '(UTC+3) Moscow',
    userTimezoneOffset: 330,
    userTimezoneLabel: '(UTC+5:30) Kolkata',
    timeFormat: '24h',
    magnetWeakSensitivity: 10,
    magnetNormalSensitivity: 30,
    magnetStrongSensitivity: 60,
    replayMaxDuration: 3.0,
    replayMinDuration: 0.01,
  },
  matrix: {
    chartType: 'candlestick',
    lineColor: '#00FF66',
    syncChartBackgroundWithTheme: false,
    resetViewOffsetRatio: 0.5,
    showBody: true,
    bullColor: '#00FF66',
    bearColor: '#FF0055',
    showBorders: true,
    bullBorderColor: '#00FF66',
    bearBorderColor: '#FF0055',
    showWicks: true,
    bullWickColor: '#415a77',
    bearWickColor: '#415a77',
    pricePrecision: 0,
    showPriceLine: true,
    priceLineStyle: 'solid',
    priceLineSize: 2,
    priceLineColor: '#00FF66',
    priceLineUseCandleColor: false,
    showPriceLineLabel: true,
    crosshairColor: '#00FF66',
    crosshairOpacity: 0.8,
    crosshairSize: 1,
    crosshairStyle: 'solid',
    crosshairLabelBgColor: '#00FF66',
    crosshairLabelBgOpacity: 1,
    crosshairTextColor: '#0D1B2A',
    vertGridColor: '#1b263b',
    vertGridOpacity: 1,
    vertGridStyle: 'solid',
    horizGridColor: '#1b263b',
    horizGridOpacity: 1,
    horizGridStyle: 'solid',
    background: '#0D1B2A',
    backgroundGradientStop: '#1b263b',
    backgroundType: 'Solid',
    gridType: 'Vert and Horiz',
    gridColor: '#1b263b',
    gridStyle: 'solid',
    showWatermark: true,
    watermarkColor: 'rgba(0, 255, 102, 0.06)',
    watermarkOpacity: 0.06,
    showSessionBreaks: false,
    sessionBreaksColor: 'rgba(0, 255, 102, 0.25)',
    sessionBreaksStyle: 'dashed',
    sessionBreaksSize: 1,
    scalesTextSize: 12,
    scalesTextColor: '#00FF66',
    showScalesLines: true,
    scalesLinesColor: '#1b263b',
    priceScalePosition: 'right',
    showPriceScalePriceLabels: true,
    showPriceScaleLastPriceLabel: true,
    showPriceScaleCrosshairLabel: true,
    showTimeScaleLabels: true,
    showTimeScaleCrosshairLabel: true,
    showTimeScaleDayOfWeek: false,
    dateFormat: 'dd MMM yyyy',
    timezoneAdjustmentEnabled: false,
    brokerTimezoneOffset: 180,
    brokerTimezoneLabel: '(UTC+3) Moscow',
    userTimezoneOffset: 330,
    userTimezoneLabel: '(UTC+5:30) Kolkata',
    timeFormat: '24h',
    magnetWeakSensitivity: 10,
    magnetNormalSensitivity: 30,
    magnetStrongSensitivity: 60,
    replayMaxDuration: 3.0,
    replayMinDuration: 0.01,
  },
};
