/**
 * Chart formatting and color utility functions.
 */

/**
 * Combines a color string (hex, rgb, rgba) with an opacity value (0 to 1 or 0 to 100).
 * If opacity is undefined, returns the original color or default fallback.
 */
export function applyColorWithOpacity(color: string, opacity?: number): string {
  if (!color) return 'transparent';
  if (opacity === undefined || opacity === null) return color;

  // Normalize opacity to 0-1 range
  let alpha = opacity;
  if (alpha > 1) {
    alpha = Math.min(100, Math.max(0, alpha)) / 100;
  }
  alpha = Math.min(1, Math.max(0, alpha));

  const trimmed = color.trim();

  // If already rgba
  const rgbaMatch = trimmed.match(/^rgba\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)$/i);
  if (rgbaMatch) {
    const [, r, g, b, existingAlpha] = rgbaMatch;
    // Scale existing alpha by opacity
    const finalAlpha = Math.min(1, Math.max(0, parseFloat(existingAlpha) * alpha));
    return `rgba(${r}, ${g}, ${b}, ${Number(finalAlpha.toFixed(3))})`;
  }

  // If rgb
  const rgbMatch = trimmed.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    return `rgba(${r}, ${g}, ${b}, ${Number(alpha.toFixed(3))})`;
  }

  // If hex
  let hex = trimmed.replace('#', '');
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  } else if (hex.length === 8) {
    const hexAlpha = parseInt(hex.substring(6, 8), 16) / 255;
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const finalAlpha = Math.min(1, Math.max(0, hexAlpha * alpha));
    return `rgba(${r}, ${g}, ${b}, ${Number(finalAlpha.toFixed(3))})`;
  }

  if (hex.length === 6) {
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${Number(alpha.toFixed(3))})`;
  }

  return color;
}

/**
 * Calculates the relative luminance of a color string (sRGB formula).
 * Returns a value between 0 (darkest black) and 1 (brightest white).
 */
export function getLuminance(colorStr: string): number {
  if (!colorStr || colorStr === 'transparent') return 0;
  const trimmed = colorStr.trim();
  let r = 0, g = 0, b = 0;

  const rgbMatch = trimmed.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbMatch) {
    r = parseInt(rgbMatch[1], 10);
    g = parseInt(rgbMatch[2], 10);
    b = parseInt(rgbMatch[3], 10);
  } else {
    let cleanHex = trimmed.replace('#', '');
    if (cleanHex.length === 3) {
      cleanHex = cleanHex[0] + cleanHex[0] + cleanHex[1] + cleanHex[1] + cleanHex[2] + cleanHex[2];
    }
    if (cleanHex.length >= 6) {
      r = parseInt(cleanHex.substring(0, 2), 16) || 0;
      g = parseInt(cleanHex.substring(2, 4), 16) || 0;
      b = parseInt(cleanHex.substring(4, 6), 16) || 0;
    }
  }

  const sRGB = [r, g, b].map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return sRGB[0] * 0.2126 + sRGB[1] * 0.7152 + sRGB[2] * 0.0722;
}

/**
 * Calculates the WCAG contrast ratio between two colors (1 to 21).
 */
export function getContrastRatio(color1: string, color2: string): number {
  const lum1 = getLuminance(color1);
  const lum2 = getLuminance(color2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

/**
 * Resolves an axis label text color that is guaranteed to be clearly visible against the background.
 * If the current textColor has poor contrast (< 2.8:1) against the background, it automatically picks
 * a readable high-contrast color (#b2b5be for dark backgrounds, #334155 for light backgrounds).
 */
export function resolveVisibleScaleTextColor(textColor: string, bgColor: string): string {
  const bgLum = getLuminance(bgColor);
  const isDarkBg = bgLum < 0.35;

  if (!textColor) {
    return isDarkBg ? '#b2b5be' : '#334155';
  }

  const contrast = getContrastRatio(textColor, bgColor);
  if (contrast >= 2.8) {
    return textColor;
  }

  // Insufficient contrast: automatically adapt
  return isDarkBg ? '#b2b5be' : '#334155';
}

/**
 * Resolves an axis line color that provides a subtle, visible boundary against the background.
 */
export function resolveVisibleScaleLineColor(lineColor: string, bgColor: string): string {
  const bgLum = getLuminance(bgColor);
  const isDarkBg = bgLum < 0.35;

  if (!lineColor) {
    return isDarkBg ? '#242832' : '#e2e8f0';
  }

  const contrast = getContrastRatio(lineColor, bgColor);
  if (contrast >= 1.15) {
    return lineColor;
  }

  return isDarkBg ? '#242832' : '#e2e8f0';
}

/**
 * Resolves a crosshair label text color that is guaranteed to be readable against the label background.
 * If the provided textColor has low contrast (< 3.0:1) against labelBgColor, it automatically picks
 * #ffffff for dark label backgrounds (lum < 0.45) or #131722 for light label backgrounds.
 */
export function resolveVisibleCrosshairTextColor(textColor: string, labelBgColor: string): string {
  const bgLum = getLuminance(labelBgColor);
  const isDarkBg = bgLum < 0.45;

  if (!textColor) {
    return isDarkBg ? '#ffffff' : '#131722';
  }

  const contrast = getContrastRatio(textColor, labelBgColor);
  if (contrast >= 3.0) {
    return textColor;
  }

  return isDarkBg ? '#ffffff' : '#131722';
}

/**
 * Resolves a crosshair label background color.
 * If not specified, falls back to crosshairLineColor or '#363c4e'.
 */
export function resolveVisibleCrosshairLabelBgColor(
  labelBgColor?: string,
  crosshairLineColor?: string,
  chartBgColor?: string
): string {
  if (labelBgColor) return labelBgColor;
  if (crosshairLineColor) return crosshairLineColor;
  if (chartBgColor) {
    const isDark = getLuminance(chartBgColor) < 0.35;
    return isDark ? '#363c4e' : '#e2e8f0';
  }
  return '#363c4e';
}

export interface ChartDateFormatOptions {
  dateFormat?: string;
  timeFormat?: '12h' | '24h';
  showDayOfWeek?: boolean;
}

/**
 * Formats a timestamp into a chart date string respecting date format, 12h/24h time, and day of week.
 */
export function formatChartDate(timestamp: number, options?: ChartDateFormatOptions): string {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) return '-';

  const dayOfWeekNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  const day = String(date.getDate()).padStart(2, '0');
  const monthIndex = date.getMonth();
  const monthNum = String(monthIndex + 1).padStart(2, '0');
  const monthStr = monthNames[monthIndex];
  const year = date.getFullYear();

  let datePart = `${day} ${monthStr} ${year}`;
  const fmt = options?.dateFormat || 'dd MMM yyyy';

  switch (fmt) {
    case 'yyyy-MM-dd':
      datePart = `${year}-${monthNum}-${day}`;
      break;
    case 'dd/MM/yyyy':
      datePart = `${day}/${monthNum}/${year}`;
      break;
    case 'MM/dd/yyyy':
      datePart = `${monthNum}/${day}/${year}`;
      break;
    case 'dd-MM-yyyy':
      datePart = `${day}-${monthNum}-${year}`;
      break;
    case 'yyyy/MM/dd':
      datePart = `${year}/${monthNum}/${day}`;
      break;
    case 'dd MMM yyyy':
    default:
      datePart = `${day} ${monthStr} ${year}`;
      break;
  }

  if (options?.showDayOfWeek) {
    const dow = dayOfWeekNames[date.getDay()];
    datePart = `${dow} ${datePart}`;
  }

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  let timePart = '';

  if (options?.timeFormat === '12h') {
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    timePart = `${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
  } else {
    timePart = `${String(hours).padStart(2, '0')}:${minutes}`;
  }

  return `${datePart} ${timePart}`;
}
