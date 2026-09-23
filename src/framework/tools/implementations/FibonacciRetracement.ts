import React from 'react';
import type { ToolDefinition } from '../ToolRegistry.ts';
import { drawGrabHandles, isOverlayVisible, computeLineSegmentsWithGaps } from '../toolUtils.ts';

// ─── Types & Interfaces ────────────────────────────────────────────────────────

export interface FibLevel {
  level: number;
  color: string;
  enabled: boolean;
  text?: string;
}

export interface FibCustomSettings {
  trendLine: {
    enabled: boolean;
    color: string;
    width: number;
    style: 'solid' | 'dashed' | 'dotted';
  };
  levelsLine: {
    width: number;
    style: 'solid' | 'dashed' | 'dotted';
  };
  extend: 'none' | 'left' | 'right' | 'both';
  levels: FibLevel[];
  levelTexts?: Record<string, string>;
  useOneColor: boolean;
  oneColor?: string;
  oneTextColor?: string;
  background: {
    enabled: boolean;
    opacity: number; // 0 to 100
  };
  reverse: boolean;
  prices: boolean;
  levelsVisible: boolean;
  levelsStyle: 'values' | 'percents';
  labelsPosition?: {
    horizontal?: 'left' | 'center' | 'right';
    vertical?: 'top' | 'middle' | 'bottom';
  };
  showCustomText?: boolean;
  text?: string;
  textColor?: string;
  lineColor?: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  textAlign?: 'left' | 'center' | 'right';
  textPosition?: {
    vertical?: 'top' | 'middle' | 'bottom';
    horizontal?: 'left' | 'center' | 'right';
  };
  textPlacement?: 'inside' | 'outside';
}

// ─── Default Levels (TradingView Standard 24 Levels) ───────────────────────────

export const DEFAULT_FIB_LEVELS: FibLevel[] = [
  { level: 0, color: '#808080', enabled: true },
  { level: 0.236, color: '#F23645', enabled: true },
  { level: 0.382, color: '#FF9800', enabled: true },
  { level: 0.5, color: '#4CAF50', enabled: true },
  { level: 0.618, color: '#089981', enabled: true },
  { level: 0.786, color: '#00BCD4', enabled: true },
  { level: 1, color: '#808080', enabled: true },
  { level: 1.618, color: '#2962FF', enabled: false },
  { level: 2.618, color: '#F23645', enabled: false },
  { level: 3.618, color: '#9C27B0', enabled: false },
  { level: 4.236, color: '#E91E63', enabled: false },
  { level: 1.272, color: '#FF9800', enabled: false },
  { level: 1.414, color: '#F23645', enabled: false },
  { level: 2.272, color: '#FF9800', enabled: false },
  { level: 2.414, color: '#4CAF50', enabled: false },
  { level: 2, color: '#089981', enabled: false },
  { level: 3, color: '#00BCD4', enabled: false },
  { level: 3.272, color: '#808080', enabled: false },
  { level: 3.414, color: '#2962FF', enabled: false },
  { level: 4, color: '#F23645', enabled: false },
  { level: 4.272, color: '#9C27B0', enabled: false },
  { level: 4.414, color: '#E91E63', enabled: false },
  { level: 4.618, color: '#FF9800', enabled: false },
  { level: 4.764, color: '#089981', enabled: false },
];

export const DEFAULT_FIB_SETTINGS: FibCustomSettings = {
  trendLine: {
    enabled: true,
    color: '#808080',
    width: 2,
    style: 'dashed',
  },
  levelsLine: {
    width: 2,
    style: 'solid',
  },
  extend: 'none',
  levels: DEFAULT_FIB_LEVELS,
  useOneColor: false,
  oneColor: '#808080',
  background: {
    enabled: true,
    opacity: 20,
  },
  reverse: false,
  prices: true,
  levelsVisible: true,
  levelsStyle: 'values',
  labelsPosition: {
    horizontal: 'left',
    vertical: 'top',
  },
  showCustomText: true,
  textPosition: {
    horizontal: 'right',
    vertical: 'middle',
  },
  fontSize: 12,
};

// ─── Mathematical Helpers ──────────────────────────────────────────────────────

export function calculateFibLevelPrice(
  price0: number,
  price1: number,
  level: number,
  reverse: boolean = false
): number {
  if (reverse) {
    return price1 + level * (price0 - price1);
  }
  return price0 + level * (price1 - price0);
}

export function colorWithAlpha(color: string, opacity: number): string {
  const a = Math.max(0, Math.min(1, opacity));
  if (color.startsWith('#')) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
  } else if (color.startsWith('rgb(')) {
    return color.replace('rgb(', 'rgba(').replace(')', `, ${a})`);
  } else if (color.startsWith('rgba(')) {
    return color.replace(/,[\s\d\.]+\)$/, `, ${a})`);
  }
  return color;
}

export function formatFibPrice(price: number, precision: number = 5): string {
  if (!Number.isFinite(price)) return '';
  if (Math.abs(price) >= 1000) {
    return Number(price.toFixed(2)).toString();
  }
  return Number(price.toFixed(precision)).toString();
}

export const formatPrice = formatFibPrice;

export function getFibLevelLabelText(
  level: number,
  price: number,
  customSettings: FibCustomSettings
): string {
  const showLevels = customSettings.levelsVisible !== false;
  const showPrices = customSettings.prices !== false;
  if (!showLevels && !showPrices) return '';

  const ratioStr = showLevels
    ? customSettings.levelsStyle === 'percents'
      ? `${Number((level * 100).toFixed(2))}%`
      : `${level}`
    : '';
  const priceStr = showPrices ? formatFibPrice(price) : '';

  if (showLevels && showPrices) {
    return `${ratioStr} (${priceStr})`;
  } else if (showLevels) {
    return ratioStr;
  } else if (showPrices) {
    return priceStr;
  }
  return '';
}

export interface FibLevelLayoutInput {
  startX: number;
  endX: number;
  y: number;
  labelStr: string;
  labelsPosition?: {
    horizontal?: 'left' | 'center' | 'right';
    vertical?: 'top' | 'middle' | 'bottom';
  };
  labelWidth?: number;
  customText: string;
  textPosition?: {
    horizontal?: 'left' | 'center' | 'right';
    vertical?: 'top' | 'middle' | 'bottom';
  };
  customTextWidth?: number;
  fontSize?: number;
}

export interface FibTextPlacement {
  visible: boolean;
  text: string;
  x: number;
  y: number;
  translateX: string;
  translateY: string;
  spacing: number;
  width: number;
  hasGap: boolean;
  gapInterval?: { start: number; end: number };
}

export interface FibLevelLayoutResult {
  label: FibTextPlacement;
  customText: FibTextPlacement;
  lineSegments: { x1: number; y1: number; x2: number; y2: number }[];
}

export function computeFibLevelLayout(input: FibLevelLayoutInput): FibLevelLayoutResult {
  const {
    y,
    labelStr = '',
    labelsPosition = {},
    labelWidth,
    customText = '',
    textPosition = {},
    customTextWidth,
    fontSize = 12,
  } = input;

  const startX = Math.min(input.startX, input.endX);
  const endX = Math.max(input.startX, input.endX);
  const lineLen = endX - startX;
  const midX = (startX + endX) / 2;

  const hasLabel = Boolean(labelStr && labelStr.trim() !== '');
  const hasCustomText = Boolean(customText && customText.trim() !== '');

  const labelsHalign = labelsPosition.horizontal || 'left';
  const labelsValign = labelsPosition.vertical || 'top';
  const textHalign = textPosition.horizontal || 'right';
  const textValign = textPosition.vertical || 'middle';

  const defaultWidth = (text: string) => Math.max(10, text.length * (fontSize * 0.55) + 6);
  const lWidth = hasLabel ? (labelWidth || defaultWidth(labelStr)) : 0;
  const tWidth = hasCustomText ? (customTextWidth || defaultWidth(customText)) : 0;

  const getVerticalProps = (valign: 'top' | 'middle' | 'bottom') => {
    if (valign === 'top') {
      return { translateY: '-100%', spacing: -3, hasGap: false };
    }
    if (valign === 'bottom') {
      return { translateY: '0%', spacing: 3, hasGap: false };
    }
    return { translateY: '-50%', spacing: 0, hasGap: true };
  };

  const labelVProps = getVerticalProps(labelsValign);
  const textVProps = getVerticalProps(textValign);

  let labelPlacement: FibTextPlacement = {
    visible: hasLabel,
    text: labelStr,
    x: startX + 2,
    y,
    translateX: '0%',
    translateY: labelVProps.translateY,
    spacing: labelVProps.spacing,
    width: lWidth,
    hasGap: hasLabel && labelVProps.hasGap,
  };

  let customPlacement: FibTextPlacement = {
    visible: hasCustomText,
    text: customText,
    x: endX - 2,
    y,
    translateX: '-100%',
    translateY: textVProps.translateY,
    spacing: textVProps.spacing,
    width: tWidth,
    hasGap: hasCustomText && textVProps.hasGap,
  };

  // Initial horizontal positioning
  if (labelsHalign === 'left') {
    labelPlacement.x = startX + 2;
    labelPlacement.translateX = '0%';
  } else if (labelsHalign === 'right') {
    labelPlacement.x = endX - 2;
    labelPlacement.translateX = '-100%';
  } else {
    labelPlacement.x = midX;
    labelPlacement.translateX = '-50%';
  }

  if (textHalign === 'left') {
    customPlacement.x = startX + 2;
    customPlacement.translateX = '0%';
  } else if (textHalign === 'right') {
    customPlacement.x = endX - 2;
    customPlacement.translateX = '-100%';
  } else {
    customPlacement.x = midX;
    customPlacement.translateX = '-50%';
  }

  // Check collision when both are visible and on the same vertical alignment
  const gaps: { start: number; end: number }[] = [];

  if (hasLabel && hasCustomText && labelsValign === textValign) {
    const margin = 8;

    const getBounds = (halign: 'left' | 'center' | 'right', width: number) => {
      if (halign === 'left') return { left: 2, right: 2 + width };
      if (halign === 'right') return { left: lineLen - 2 - width, right: lineLen - 2 };
      return { left: lineLen / 2 - width / 2, right: lineLen / 2 + width / 2 };
    };

    const lBounds = getBounds(labelsHalign, lWidth);
    const tBounds = getBounds(textHalign, tWidth);

    const isColliding = lBounds.left < tBounds.right + margin && tBounds.left < lBounds.right + margin;

    if (isColliding) {
      if (labelsHalign === 'left' && textHalign === 'left') {
        labelPlacement.x = startX + 2;
        labelPlacement.translateX = '0%';

        customPlacement.x = startX + 2 + lWidth + margin;
        customPlacement.translateX = '0%';

        if (labelPlacement.hasGap || customPlacement.hasGap) {
          gaps.push({ start: 0, end: lWidth + margin + tWidth + 4 });
        }
      } else if (labelsHalign === 'right' && textHalign === 'right') {
        customPlacement.x = endX - 2;
        customPlacement.translateX = '-100%';

        labelPlacement.x = endX - 2 - tWidth - margin;
        labelPlacement.translateX = '-100%';

        if (labelPlacement.hasGap || customPlacement.hasGap) {
          gaps.push({ start: lineLen - tWidth - margin - lWidth - 4, end: lineLen });
        }
      } else if (labelsHalign === 'center' && textHalign === 'center') {
        const totalW = lWidth + margin + tWidth;
        const blockStart = midX - totalW / 2;

        labelPlacement.x = blockStart;
        labelPlacement.translateX = '0%';

        customPlacement.x = blockStart + lWidth + margin;
        customPlacement.translateX = '0%';

        const blockStartRel = lineLen / 2 - totalW / 2;
        if (labelPlacement.hasGap || customPlacement.hasGap) {
          gaps.push({ start: blockStartRel - 2, end: blockStartRel + totalW + 2 });
        }
      } else if (labelsHalign === 'left') {
        labelPlacement.x = startX + 2;
        labelPlacement.translateX = '0%';
        const minTextX = startX + 2 + lWidth + margin;

        if (textHalign === 'center') {
          customPlacement.x = Math.max(midX, minTextX + tWidth / 2);
          customPlacement.translateX = '-50%';
        } else {
          customPlacement.x = endX - 2;
          customPlacement.translateX = '-100%';
        }

        if (labelPlacement.hasGap) gaps.push({ start: 0, end: lWidth + 4 });
        if (customPlacement.hasGap) {
          const textStartRel = customPlacement.x - startX + (customPlacement.translateX === '-50%' ? -tWidth / 2 : (customPlacement.translateX === '-100%' ? -tWidth : 0));
          gaps.push({ start: textStartRel - 2, end: textStartRel + tWidth + 4 });
        }
      } else if (textHalign === 'right') {
        customPlacement.x = endX - 2;
        customPlacement.translateX = '-100%';
        const maxLabelX = endX - 2 - tWidth - margin;

        if (labelsHalign === 'center') {
          labelPlacement.x = Math.min(midX, maxLabelX - lWidth / 2);
          labelPlacement.translateX = '-50%';
        } else {
          labelPlacement.x = startX + 2;
          labelPlacement.translateX = '0%';
        }

        if (customPlacement.hasGap) gaps.push({ start: lineLen - tWidth - 4, end: lineLen });
        if (labelPlacement.hasGap) {
          const labelStartRel = labelPlacement.x - startX + (labelPlacement.translateX === '-50%' ? -lWidth / 2 : (labelPlacement.translateX === '-100%' ? -lWidth : 0));
          gaps.push({ start: labelStartRel - 2, end: labelStartRel + lWidth + 4 });
        }
      } else {
        labelPlacement.x = startX + 2;
        labelPlacement.translateX = '0%';
        customPlacement.x = endX - 2;
        customPlacement.translateX = '-100%';
        if (labelPlacement.hasGap) gaps.push({ start: 0, end: lWidth + 4 });
        if (customPlacement.hasGap) gaps.push({ start: lineLen - tWidth - 4, end: lineLen });
      }
    } else {
      // No horizontal collision
      if (labelPlacement.hasGap) {
        if (labelsHalign === 'left') gaps.push({ start: 0, end: lWidth + 4 });
        else if (labelsHalign === 'right') gaps.push({ start: lineLen - lWidth - 4, end: lineLen });
        else gaps.push({ start: lineLen / 2 - lWidth / 2 - 2, end: lineLen / 2 + lWidth / 2 + 2 });
      }
      if (customPlacement.hasGap) {
        if (textHalign === 'left') gaps.push({ start: 0, end: tWidth + 4 });
        else if (textHalign === 'right') gaps.push({ start: lineLen - tWidth - 4, end: lineLen });
        else gaps.push({ start: lineLen / 2 - tWidth / 2 - 2, end: lineLen / 2 + tWidth / 2 + 2 });
      }
    }
  } else {
    // Independent vertical alignments
    if (hasLabel && labelPlacement.hasGap) {
      if (labelsHalign === 'left') gaps.push({ start: 0, end: lWidth + 4 });
      else if (labelsHalign === 'right') gaps.push({ start: lineLen - lWidth - 4, end: lineLen });
      else gaps.push({ start: lineLen / 2 - lWidth / 2 - 2, end: lineLen / 2 + lWidth / 2 + 2 });
    }
    if (hasCustomText && customPlacement.hasGap) {
      if (textHalign === 'left') gaps.push({ start: 0, end: tWidth + 4 });
      else if (textHalign === 'right') gaps.push({ start: lineLen - tWidth - 4, end: lineLen });
      else gaps.push({ start: lineLen / 2 - tWidth / 2 - 2, end: lineLen / 2 + tWidth / 2 + 2 });
    }
  }

  const lineSegments = computeLineSegmentsWithGaps({ x: startX, y }, { x: endX, y }, gaps);

  return {
    label: labelPlacement,
    customText: customPlacement,
    lineSegments,
  };
}

// ─── Toolbar Icon ──────────────────────────────────────────────────────────────

export const FibonacciRetracementIcon = ({
  className = 'w-5 h-5',
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) =>
  React.createElement(
    'svg',
    { xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 28 28', className, style },
    React.createElement(
      'g',
      { fill: 'currentColor', fillRule: 'nonzero' },
      React.createElement('path', { d: 'M3 5h22v-1h-22z' }),
      React.createElement('path', { d: 'M3 17h22v-1h-22z' }),
      React.createElement('path', { d: 'M3 11h19.5v-1h-19.5z' }),
      React.createElement('path', { d: 'M5.5 23h19.5v-1h-19.5z' }),
      React.createElement('path', {
        d: 'M3.5 24c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5zM24.5 12c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5z',
      })
    )
  );

// ─── Tool Definition ───────────────────────────────────────────────────────────

export const FibonacciRetracementTool: ToolDefinition = {
  id: 'fibonacciRetracement',
  name: 'Fib Retracement',
  icon: FibonacciRetracementIcon,
  group: 'lines',
  hotkey: 'Alt + F',

  settingsSchema: [
    {
      id: 'reverse',
      label: 'Reverse',
      type: 'boolean',
      defaultValue: false,
    },
  ],

  defaultTemplates: [
    {
      id: 'default',
      name: 'Default',
      commonSettings: {
        customSettings: DEFAULT_FIB_SETTINGS,
      },
    },
  ],

  createOverlayDef: () => ({
    name: 'fibonacciRetracement',
    totalStep: 3,
    needDefaultPointFigure: false,
    needDefaultXAxisFigure: true,
    needDefaultYAxisFigure: true,

    createPointFigures: ({ overlay, coordinates, chart, bounding }) => {
      if (chart && !isOverlayVisible(overlay, chart)) {
        return [];
      }

      const figures: any[] = [];
      if (!coordinates || coordinates.length === 0) return figures;

      const isLocked = (overlay?.extendData as any)?.isLocked || false;
      const isSelected = (overlay?.extendData as any)?.isSelected || false;
      const isHovered = (overlay?.extendData as any)?.isHovered || false;
      const isDrawing = !!(chart && (chart as any)._activeDrawingId === overlay?.id);

      // Single point preview during creation
      if (coordinates.length === 1) {
        drawGrabHandles(figures, [coordinates[0]], isLocked, isSelected || isDrawing);
        return figures;
      }

      const customSettings: FibCustomSettings = {
        ...DEFAULT_FIB_SETTINGS,
        ...((overlay?.extendData as any)?.customSettings || {}),
      };

      const c0 = coordinates[0];
      const c1 = coordinates[1];

      // Get chart width bounds
      const chartWidth = bounding?.width ?? 2000;

      // Determine price coordinates
      const p0 = overlay.points?.[0]?.value ?? (chart?.convertFromPixel?.([c0], { paneId: 'candle_pane' }) as any)?.[0]?.value ?? 0;
      const p1 = overlay.points?.[1]?.value ?? (chart?.convertFromPixel?.([c1], { paneId: 'candle_pane' }) as any)?.[0]?.value ?? 0;

      // Determine horizontal extension endpoints
      const xMin = Math.min(c0.x, c1.x);
      const xMax = Math.max(c0.x, c1.x);

      let startX = xMin;
      let endX = xMax;

      const extend = customSettings.extend || 'none';
      if (extend === 'left') {
        startX = 0;
        endX = xMax;
      } else if (extend === 'right') {
        startX = xMin;
        endX = chartWidth;
      } else if (extend === 'both') {
        startX = 0;
        endX = chartWidth;
      }

      // Filter and sort active levels
      const levelsList = customSettings.levels || DEFAULT_FIB_LEVELS;
      const enabledLevels = levelsList.filter((l) => l.enabled);
      const sortedLevels = [...enabledLevels].sort((a, b) => a.level - b.level);

      // Function to calculate pixel Y for a level
      const getYForLevel = (levelVal: number): { y: number; price: number } => {
        const targetPrice = calculateFibLevelPrice(p0, p1, levelVal, customSettings.reverse);
        if (chart && typeof chart.convertToPixel === 'function') {
          const pixelResult: any = chart.convertToPixel([{ value: targetPrice }], { paneId: 'candle_pane' });
          if (pixelResult && pixelResult[0] && typeof pixelResult[0].y === 'number' && Number.isFinite(pixelResult[0].y)) {
            return { y: pixelResult[0].y, price: targetPrice };
          }
        }
        // Fallback linear interpolation between c0 and c1
        const ratio = customSettings.reverse ? 1 - levelVal : levelVal;
        const fallbackY = c0.y + ratio * (c1.y - c0.y);
        return { y: fallbackY, price: targetPrice };
      };

      // Compute Y positions for all sorted enabled levels
      const levelYMap = sortedLevels.map((lvl) => {
        const { y, price } = getYForLevel(lvl.level);
        return { lvl, y, price };
      });

      // 1. Render Background Shading between adjacent levels
      if (customSettings.background?.enabled !== false && (customSettings.background?.opacity ?? 20) > 0) {
        const opacity = (customSettings.background.opacity ?? 20) / 100;
        for (let i = 0; i < levelYMap.length - 1; i++) {
          const topLvl = levelYMap[i];
          const bottomLvl = levelYMap[i + 1];
          const rawColor = customSettings.useOneColor && customSettings.oneColor
            ? customSettings.oneColor
            : topLvl.lvl.color;
          const fillColor = colorWithAlpha(rawColor, opacity);

          figures.push({
            type: 'polygon',
            attrs: {
              coordinates: [
                { x: startX, y: topLvl.y },
                { x: endX, y: topLvl.y },
                { x: endX, y: bottomLvl.y },
                { x: startX, y: bottomLvl.y },
              ],
            },
            styles: {
              style: 'fill',
              color: fillColor,
            },
            ignoreEvent: true,
          });
        }
      }

      // 2. Render Trend Line
      if (customSettings.trendLine?.enabled !== false) {
        let trendStyle = 'solid';
        let trendDashedValue: number[] = [4, 4];
        if (customSettings.trendLine?.style === 'dashed') {
          trendStyle = 'dashed';
          trendDashedValue = [4, 4];
        } else if (customSettings.trendLine?.style === 'dotted') {
          trendStyle = 'dashed';
          trendDashedValue = [2, 2];
        }

        figures.push({
          type: 'line',
          attrs: {
            coordinates: [
              { x: c0.x, y: c0.y },
              { x: c1.x, y: c1.y },
            ],
          },
          styles: {
            style: trendStyle as any,
            dashedValue: trendDashedValue,
            color: customSettings.trendLine?.color || '#808080',
            size: customSettings.trendLine?.width || 2,
          },
          ignoreEvent: false,
        });
      }

      // 3. Render Level Lines
      let levelsStyleType = 'solid';
      let levelsDashedValue: number[] = [4, 4];
      if (customSettings.levelsLine?.style === 'dashed') {
        levelsStyleType = 'dashed';
        levelsDashedValue = [4, 4];
      } else if (customSettings.levelsLine?.style === 'dotted') {
        levelsStyleType = 'dashed';
        levelsDashedValue = [2, 2];
      }

      levelYMap.forEach(({ lvl, y, price }) => {
        const lineColor = customSettings.useOneColor && customSettings.oneColor
          ? customSettings.oneColor
          : lvl.color;

        // Transparent hit target for reliable interaction across text gaps
        figures.push({
          type: 'line',
          attrs: {
            coordinates: [
              { x: startX, y },
              { x: endX, y },
            ],
          },
          styles: {
            style: 'solid',
            color: 'transparent',
            size: Math.max(customSettings.levelsLine?.width || 2, 8),
          },
          ignoreEvent: false,
        });

        const labelStr = getFibLevelLabelText(lvl.level, price, customSettings);
        const measuredLabelWidth = (overlay?.extendData as any)?.labelWidthMap?.[String(lvl.level)] || 0;

        const customLevelTexts = customSettings.levelTexts || {};
        const lvlText = customLevelTexts[String(lvl.level)] || lvl.text || '';
        const hasActualText = typeof lvlText === 'string' && lvlText.trim() !== '';
        const isLineDrawn = coordinates.length >= 2;
        const isSelected = (overlay?.extendData as any)?.isSelected || false;
        const isHovered = (overlay?.extendData as any)?.isHovered || false;
        const isAnchorHovered = (overlay?.extendData as any)?.isAnchorHovered || false;
        const isBodyHovered = (overlay?.extendData as any)?.isBodyHovered ?? (isHovered && !isAnchorHovered);
        const isEditingText = (overlay?.extendData as any)?.isEditingText || false;
        const activeLevel = (overlay?.extendData as any)?.activeLevel;
        const hoveredLevel = (overlay?.extendData as any)?.hoveredLevel;

        const isThisLevelHovered = hoveredLevel === lvl.level && isBodyHovered;
        const isThisLevelEditing = isEditingText && activeLevel === lvl.level;

        const showCustomText = customSettings.showCustomText !== false;
        let textToShow = '';
        if (showCustomText) {
          if (hasActualText) {
            textToShow = lvlText;
          } else if (isLineDrawn && isSelected && (isThisLevelHovered || isThisLevelEditing)) {
            textToShow = '+ Add text';
          }
        }

        const fontSize = customSettings.fontSize || 12;
        const measuredTextWidth = (overlay?.extendData as any)?.textWidthMap?.[String(lvl.level)] || 0;

        const layout = computeFibLevelLayout({
          startX,
          endX,
          y,
          labelStr,
          labelsPosition: customSettings.labelsPosition,
          labelWidth: measuredLabelWidth,
          customText: textToShow,
          textPosition: customSettings.textPosition,
          customTextWidth: measuredTextWidth,
          fontSize,
        });

        // Visible level line segments
        layout.lineSegments.forEach((seg) => {
          figures.push({
            type: 'line',
            attrs: {
              coordinates: [
                { x: seg.x1, y: seg.y1 },
                { x: seg.x2, y: seg.y2 },
              ],
            },
            styles: {
              style: levelsStyleType as any,
              dashedValue: levelsDashedValue,
              color: lineColor,
              size: customSettings.levelsLine?.width || 2,
            },
            ignoreEvent: false,
          });
        });
      });

      // 5. Render Grab Handles on Anchor 1 and Anchor 2
      if (isSelected || isHovered || isDrawing) {
        drawGrabHandles(figures, [c0, c1], isLocked, isSelected || isDrawing);
      }

      return figures;
    },
  }),
};
