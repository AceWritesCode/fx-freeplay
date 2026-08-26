export interface ChartSettings {
  // Symbol Settings
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
  priceLineStyle: 'dashed' | 'solid';
  priceLineSize: number;
  priceLineColor: string;
  priceLineUseCandleColor: boolean;
  showPriceLineLabel: boolean;

  // Canvas Settings
  background: string;
  backgroundType: 'Solid' | 'None';
  gridType: 'Vert and Horiz' | 'Horizontal Only' | 'Vertical Only' | 'None';
  gridColor: string;
  gridStyle: 'dashed' | 'solid';
  showWatermark: boolean;
  showSessionBreaks: boolean;
  sessionBreaksColor: string;
  sessionBreaksStyle: 'dashed' | 'solid';
  sessionBreaksSize: number;

  // Scales Settings
  scalesTextSize: number;
  scalesTextColor: string;
  showScalesLines: boolean;
  scalesLinesColor: string;

  // Timezone Settings
  timezoneAdjustmentEnabled: boolean;
  brokerTimezoneOffset: number;
  brokerTimezoneLabel: string;
  userTimezoneOffset: number;
  userTimezoneLabel: string;

  // Magnet Sensitivity Settings (pixel proximity thresholds per mode)
  magnetWeakSensitivity: number;   // 0-20
  magnetNormalSensitivity: number; // 20-60
  magnetStrongSensitivity: number; // 60-100 (100 = always snap)

  // Replay Speed Range Settings (seconds per bar)
  replayMaxDuration: number; // Slowest speed (default: 3.0)
  replayMinDuration: number; // Fastest speed (default: 0.1)
}

export const PRESET_SETTINGS: { [key: string]: ChartSettings } = {
  classic: {
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
    background: '#131722',
    backgroundType: 'Solid',
    gridType: 'Vert and Horiz',
    gridColor: '#242832',
    gridStyle: 'dashed',
    showWatermark: true,
    showSessionBreaks: false,
    sessionBreaksColor: 'rgba(139, 147, 166, 0.4)',
    sessionBreaksStyle: 'dashed',
    sessionBreaksSize: 1,
    scalesTextSize: 11,
    scalesTextColor: '#b2b5be',
    showScalesLines: true,
    scalesLinesColor: '#242832',
    timezoneAdjustmentEnabled: false,
    brokerTimezoneOffset: 180,
    brokerTimezoneLabel: '(UTC+3) Moscow',
    userTimezoneOffset: 330,
    userTimezoneLabel: '(UTC+5:30) Kolkata',
    magnetWeakSensitivity: 10,
    magnetNormalSensitivity: 30,
    magnetStrongSensitivity: 85,
    replayMaxDuration: 3.0,
    replayMinDuration: 0.1,
  },
  obsidian: {
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
    background: '#000000',
    backgroundType: 'Solid',
    gridType: 'Vert and Horiz',
    gridColor: '#1a1a1a',
    gridStyle: 'dashed',
    showWatermark: true,
    showSessionBreaks: false,
    sessionBreaksColor: 'rgba(136, 136, 136, 0.4)',
    sessionBreaksStyle: 'dashed',
    sessionBreaksSize: 1,
    scalesTextSize: 11,
    scalesTextColor: '#888888',
    showScalesLines: true,
    scalesLinesColor: '#1a1a1a',
    timezoneAdjustmentEnabled: false,
    brokerTimezoneOffset: 180,
    brokerTimezoneLabel: '(UTC+3) Moscow',
    userTimezoneOffset: 330,
    userTimezoneLabel: '(UTC+5:30) Kolkata',
    magnetWeakSensitivity: 10,
    magnetNormalSensitivity: 30,
    magnetStrongSensitivity: 85,
    replayMaxDuration: 3.0,
    replayMinDuration: 0.1,
  },
  matrix: {
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
    background: '#0D1B2A',
    backgroundType: 'Solid',
    gridType: 'Vert and Horiz',
    gridColor: '#1b263b',
    gridStyle: 'solid',
    showWatermark: true,
    showSessionBreaks: false,
    sessionBreaksColor: 'rgba(0, 255, 102, 0.25)',
    sessionBreaksStyle: 'dashed',
    sessionBreaksSize: 1,
    scalesTextSize: 12,
    scalesTextColor: '#00FF66',
    showScalesLines: true,
    scalesLinesColor: '#1b263b',
    timezoneAdjustmentEnabled: false,
    brokerTimezoneOffset: 180,
    brokerTimezoneLabel: '(UTC+3) Moscow',
    userTimezoneOffset: 330,
    userTimezoneLabel: '(UTC+5:30) Kolkata',
    magnetWeakSensitivity: 10,
    magnetNormalSensitivity: 30,
    magnetStrongSensitivity: 85,
    replayMaxDuration: 3.0,
    replayMinDuration: 0.1,
  },
};
