import type { CaptureTarget, ScreenshotResult } from '../types';
import { getChartVisibleDateRange, type VisibleDateRange } from '@/engine/charting';

export interface ScreenshotEngineRequest {
  target: CaptureTarget;
  format: 'png' | 'jpeg' | 'webp';
  quality: number; // 0.1 to 1.0
  resolutionScale: 1 | 2 | 4;
  includeWatermark: boolean;
  saveToDevice: boolean;
  copyToClipboard: boolean;
}

/**
 * Formats a timestamp into "d MMM yyyy h:mm a" strictly
 * Example: 1 Jan 2026 10:15 AM
 */
export function formatCardTimestamp(dateInput: number | Date): string {
  const date = typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';

  const day = date.getDate(); // No leading zero
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 12-hour format without leading zero

  return `${day} ${month} ${year} ${hours}:${minutes} ${ampm}`;
}

/**
 * Generates a clean, deterministic filename for the screenshot download.
 * Pattern: FX-Freeplay_Screenshot_SYMBOL_TIMEFRAME_YYYY-MM-DD_HH-mm-ss.ext
 */
export function formatScreenshotFilename(target: CaptureTarget, format: 'png' | 'jpeg' | 'webp'): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const timeStr = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;

  let targetIdentifier = 'Workspace';
  if (target.type === 'canvas') {
    const sym = target.canvas.symbol?.replace(/[^a-zA-Z0-9_-]/g, '') || 'Chart';
    const tf = target.canvas.timeframe?.toUpperCase() || '';
    targetIdentifier = tf ? `${sym}_${tf}` : sym;
  }

  const ext = format === 'jpeg' ? 'jpg' : format;
  return `FX-Freeplay_Screenshot_${targetIdentifier}_${dateStr}_${timeStr}.${ext}`;
}

/**
 * Triggers a browser file download for a given Blob.
 */
export function saveBlobToDevice(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}

/**
 * Copies an image Blob to the system clipboard.
 * Modern browsers strictly support 'image/png' in ClipboardItem.
 */
export async function copyBlobToClipboard(
  blob: Blob,
  fallbackCanvas?: HTMLCanvasElement
): Promise<{ copied: boolean; error?: string }> {
  if (typeof navigator === 'undefined' || !navigator.clipboard || !navigator.clipboard.write) {
    return { copied: false, error: 'Clipboard API is not supported by your browser' };
  }

  try {
    let pngBlob = blob;
    // If original is JPEG or WebP, convert to PNG for clipboard compatibility
    if (blob.type !== 'image/png' && fallbackCanvas) {
      const converted = await new Promise<Blob | null>((resolve) => {
        fallbackCanvas.toBlob((b) => resolve(b), 'image/png');
      });
      if (converted) {
        pngBlob = converted;
      }
    }

    const clipboardItem = new ClipboardItem({ 'image/png': pngBlob });
    await navigator.clipboard.write([clipboardItem]);
    return { copied: true };
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Clipboard write permission denied';
    console.warn('[Capture Engine] Clipboard copy failed:', errorMsg);
    return { copied: false, error: errorMsg };
  }
}

/**
 * Draws the slot identification badge (#1 EURUSD • 1M) onto the composite canvas.
 */
function drawSlotBadge(
  ctx: CanvasRenderingContext2D,
  slotEl: HTMLElement,
  slotRect: DOMRect,
  baseRect: DOMRect,
  offsetX: number,
  offsetY: number,
  scale: number
): void {
  const slotIndexAttr = slotEl.getAttribute('data-chart-slot-index');
  const slotIndex = slotIndexAttr ? parseInt(slotIndexAttr, 10) : 0;
  const symbol = slotEl.getAttribute('data-chart-symbol') || '';
  const timeframe = slotEl.getAttribute('data-chart-timeframe') || '';

  if (!symbol && !timeframe) return;

  const badgeX = offsetX + (slotRect.left - baseRect.left + 12) * scale;
  const badgeY = offsetY + (slotRect.top - baseRect.top + 12) * scale;

  const textSegments = [`#${slotIndex + 1}`];
  if (symbol) textSegments.push(symbol);
  if (timeframe) textSegments.push(timeframe.toUpperCase());
  const fullText = textSegments.join('  ');

  ctx.save();
  const fontSize = Math.max(10, Math.round(11 * scale));
  ctx.font = `bold ${fontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
  const textMetrics = ctx.measureText(fullText);
  const paddingX = 8 * scale;
  const paddingY = 4 * scale;
  const badgeWidth = textMetrics.width + paddingX * 2;
  const badgeHeight = fontSize + paddingY * 2;
  const radius = 5 * scale;

  // Background pill
  ctx.fillStyle = 'rgba(24, 26, 32, 0.85)';
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
  ctx.lineWidth = 1 * scale;
  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, badgeWidth, badgeHeight, radius);
  ctx.fill();
  ctx.stroke();

  // Text
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f3f4f6';
  ctx.fillText(fullText, badgeX + paddingX, badgeY + badgeHeight / 2);
  ctx.restore();
}

/**
 * Extracts the user-configured chart background style (solid color or gradient)
 * and paints it onto the destination rectangle of the composite canvas.
 */
function fillSlotBackground(
  ctx: CanvasRenderingContext2D,
  slotEl: HTMLElement,
  destX: number,
  destY: number,
  destW: number,
  destH: number
): void {
  // 1. First priority: Check explicit data attributes set from ChartSettings
  const bgType = slotEl.getAttribute('data-chart-bg-type');
  const bg = slotEl.getAttribute('data-chart-bg');
  const bgStop = slotEl.getAttribute('data-chart-bg-stop');

  if (bgType === 'None' || bg === 'transparent') {
    // Transparent or none
    return;
  }

  if (bgType === 'Gradient' && bg) {
    const grad = ctx.createLinearGradient(destX, destY, destX, destY + destH);
    grad.addColorStop(0, bg);
    grad.addColorStop(1, bgStop || '#1e222d');
    ctx.fillStyle = grad;
    ctx.fillRect(destX, destY, destW, destH);
    return;
  }

  if (bg && bg !== 'transparent') {
    ctx.fillStyle = bg;
    ctx.fillRect(destX, destY, destW, destH);
    return;
  }

  // 2. Second priority: Query the inner container element with inline style
  const innerEl = slotEl.querySelector<HTMLElement>('[data-chart-slot-inner]');
  if (innerEl && innerEl.style.background) {
    const styleBg = innerEl.style.background;
    if (styleBg.startsWith('linear-gradient')) {
      const match = styleBg.match(/linear-gradient\([^,]+,\s*(#[0-9a-fA-F]+|[a-zA-Z0-9(),\s]+)\s+0%,\s*(#[0-9a-fA-F]+|[a-zA-Z0-9(),\s]+)\s+100%\)/);
      if (match) {
        const grad = ctx.createLinearGradient(destX, destY, destX, destY + destH);
        grad.addColorStop(0, match[1].trim());
        grad.addColorStop(1, match[2].trim());
        ctx.fillStyle = grad;
        ctx.fillRect(destX, destY, destW, destH);
        return;
      }
    } else if (styleBg !== 'transparent') {
      ctx.fillStyle = styleBg;
      ctx.fillRect(destX, destY, destW, destH);
      return;
    }
  }

  // 3. Fallback: inspect computed style
  const computed = window.getComputedStyle(innerEl || slotEl);
  const bgColor = computed.backgroundColor;
  if (bgColor && bgColor !== 'rgba(0, 0, 0, 0)' && bgColor !== 'transparent') {
    ctx.fillStyle = bgColor;
    ctx.fillRect(destX, destY, destW, destH);
  } else {
    // Default dark fallback
    ctx.fillStyle = '#131722';
    ctx.fillRect(destX, destY, destW, destH);
  }
}

/**
 * Pure Screenshot Engine execution.
 * When includeWatermark is true:
 * - Renders an elegant Polaroid/photo-card frame styled dynamically according to the active theme tokens.
 * - Top-left: Visible chart date/time from
 * - Top-right: Visible chart date/time to
 * - Bottom-left: FX FREEPLAY subtle branding
 * - Bottom-right: Capture timestamp (d MMM yyyy h:mm a)
 *
 * When includeWatermark is false:
 * - Image consists purely of the captured chart canvas / workspace without any borders, frames, or text.
 */
export async function captureScreenshot(request: ScreenshotEngineRequest): Promise<ScreenshotResult> {
  const { target, format, quality, resolutionScale, includeWatermark, saveToDevice, copyToClipboard } = request;

  // 1. Resolve Target Elements and Bounding Box
  let slotElements: HTMLElement[] = [];
  if (target.type === 'canvas') {
    const slotEl = document.querySelector<HTMLElement>(`[data-chart-slot-index="${target.canvas.slotIndex}"]`);
    if (slotEl) {
      slotElements = [slotEl];
    } else {
      const anySlot = document.querySelector<HTMLElement>('[data-chart-slot-index]');
      if (anySlot) slotElements = [anySlot];
    }
  } else {
    // Workspace mode: collect all visible slots in the chart grid
    slotElements = Array.from(document.querySelectorAll<HTMLElement>('[data-chart-slot-index]'));
  }

  if (slotElements.length === 0) {
    return {
      success: false,
      format,
      dimensions: { width: 0, height: 0 },
      target,
      saved: false,
      copied: false,
      error: 'No active chart slots found to capture',
    };
  }

  // Calculate composite bounding box enclosing all target slots
  const slotRects = slotElements.map((el) => el.getBoundingClientRect());
  const left = Math.min(...slotRects.map((r) => r.left));
  const top = Math.min(...slotRects.map((r) => r.top));
  const right = Math.max(...slotRects.map((r) => r.right));
  const bottom = Math.max(...slotRects.map((r) => r.bottom));

  const baseWidth = Math.max(1, right - left);
  const baseHeight = Math.max(1, bottom - top);
  const baseRect = new DOMRect(left, top, baseWidth, baseHeight);

  // 2. Read Theme Tokens from Document Root for dynamic theme matching
  const docStyle = window.getComputedStyle(document.documentElement);
  const themeBgApp = docStyle.getPropertyValue('--bg-app').trim() || '#0f1117';
  const themeBorderDef = docStyle.getPropertyValue('--border-def').trim() || 'rgba(255, 255, 255, 0.12)';
  const themeBorderSub = docStyle.getPropertyValue('--border-sub').trim() || 'rgba(255, 255, 255, 0.08)';
  const themeTextMuted = docStyle.getPropertyValue('--text-muted').trim() || '#9ca3af';
  const themeAccent = docStyle.getPropertyValue('--accent-primary').trim() || '#2962ff';

  // 3. Compute Frame Margins based on includeWatermark
  const sideBorder = includeWatermark ? Math.round(10 * resolutionScale) : 0;
  const topBarHeight = includeWatermark ? Math.round(30 * resolutionScale) : 0;
  const bottomBarHeight = includeWatermark ? Math.round(38 * resolutionScale) : 0;

  const innerWidth = Math.round(baseWidth * resolutionScale);
  const innerHeight = Math.round(baseHeight * resolutionScale);

  const totalWidth = innerWidth + sideBorder * 2;
  const totalHeight = innerHeight + topBarHeight + bottomBarHeight;

  // 4. Compute Visible Date Range for Top Frame (only if includeWatermark is enabled)
  let visibleDateRange: VisibleDateRange | null = null;
  if (includeWatermark) {
    if (target.type === 'canvas') {
      const slotIndex = target.canvas.slotIndex;
      const tf = target.canvas.timeframe || '1m';
      visibleDateRange = getChartVisibleDateRange(slotIndex, tf);
    } else {
      // Workspace (multi-chart) mode
      const ranges: { range: VisibleDateRange; slotIndex: number }[] = [];
      slotElements.forEach((el) => {
        const idxAttr = el.getAttribute('data-chart-slot-index');
        const tfAttr = el.getAttribute('data-chart-timeframe') || '1m';
        if (idxAttr) {
          const idx = parseInt(idxAttr, 10);
          const r = getChartVisibleDateRange(idx, tfAttr);
          if (r) {
            ranges.push({ range: r, slotIndex: idx });
          }
        }
      });

      if (ranges.length === 1) {
        visibleDateRange = ranges[0].range;
      } else if (ranges.length > 1) {
        const first = ranges[0].range;
        const allIdentical = ranges.every(
          (entry) =>
            Math.abs(entry.range.fromTimestamp - first.fromTimestamp) < 60000 &&
            Math.abs(entry.range.toTimestamp - first.toTimestamp) < 60000
        );

        if (allIdentical) {
          visibleDateRange = first;
        } else {
          const activeSlotEl = document.querySelector<HTMLElement>('[data-chart-slot-index].ring-2') || slotElements[0];
          const activeIdxAttr = activeSlotEl?.getAttribute('data-chart-slot-index');
          const activeTf = activeSlotEl?.getAttribute('data-chart-timeframe') || '1m';
          const activeIdx = activeIdxAttr ? parseInt(activeIdxAttr, 10) : 0;
          visibleDateRange = getChartVisibleDateRange(activeIdx, activeTf);
        }
      }
    }
  }

  // 5. Instantiate Offscreen Composite Canvas
  const compositeCanvas = document.createElement('canvas');
  compositeCanvas.width = totalWidth;
  compositeCanvas.height = totalHeight;

  const ctx = compositeCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    return {
      success: false,
      format,
      dimensions: { width: totalWidth, height: totalHeight },
      target,
      saved: false,
      copied: false,
      error: 'Failed to initialize 2D canvas context',
    };
  }

  // High quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // If watermark is enabled, fill the entire card frame with the active theme background
  if (includeWatermark) {
    ctx.fillStyle = themeBgApp;
    ctx.fillRect(0, 0, totalWidth, totalHeight);

    // Outer border stroke using theme border color
    ctx.strokeStyle = themeBorderSub;
    ctx.lineWidth = 1 * resolutionScale;
    ctx.strokeRect(0, 0, totalWidth, totalHeight);

    // Top Header Bar: Visible Date Range
    if (visibleDateRange && visibleDateRange.fromTimestamp && visibleDateRange.toTimestamp) {
      const fromStr = formatCardTimestamp(visibleDateRange.fromTimestamp);
      const toStr = formatCardTimestamp(visibleDateRange.toTimestamp);

      ctx.save();
      const topFontSize = Math.max(9, Math.round(10 * resolutionScale));
      ctx.font = `600 ${topFontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillStyle = themeTextMuted;
      ctx.textBaseline = 'middle';

      const textY = topBarHeight / 2;
      ctx.textAlign = 'left';
      ctx.fillText(fromStr, sideBorder + 4 * resolutionScale, textY);

      ctx.textAlign = 'right';
      ctx.fillText(toStr, totalWidth - sideBorder - 4 * resolutionScale, textY);
      ctx.restore();
    }

    // Inner Chart Area Border using theme border color
    ctx.strokeStyle = themeBorderDef;
    ctx.lineWidth = 1 * resolutionScale;
    ctx.strokeRect(sideBorder - 1, topBarHeight - 1, innerWidth + 2, innerHeight + 2);
  }

  // 6. Composite Each Slot
  for (let i = 0; i < slotElements.length; i++) {
    const slotEl = slotElements[i];
    const slotRect = slotRects[i];

    const slotDestX = sideBorder + Math.round((slotRect.left - baseRect.left) * resolutionScale);
    const slotDestY = topBarHeight + Math.round((slotRect.top - baseRect.top) * resolutionScale);
    const slotDestW = Math.round(slotRect.width * resolutionScale);
    const slotDestH = Math.round(slotRect.height * resolutionScale);

    // Paint slot background using chart background settings
    fillSlotBackground(ctx, slotEl, slotDestX, slotDestY, slotDestW, slotDestH);

    // Draw internal KLineChart <canvas> elements in DOM order
    const internalCanvases = Array.from(slotEl.querySelectorAll<HTMLCanvasElement>('canvas'));
    for (const internalCanvas of internalCanvases) {
      if (internalCanvas.width === 0 || internalCanvas.height === 0) continue;

      const cRect = internalCanvas.getBoundingClientRect();
      const dx = sideBorder + Math.round((cRect.left - baseRect.left) * resolutionScale);
      const dy = topBarHeight + Math.round((cRect.top - baseRect.top) * resolutionScale);
      const dw = Math.round(cRect.width * resolutionScale);
      const dh = Math.round(cRect.height * resolutionScale);

      try {
        ctx.drawImage(internalCanvas, 0, 0, internalCanvas.width, internalCanvas.height, dx, dy, dw, dh);
      } catch (drawErr) {
        console.warn('[Capture Engine] Skipped drawing internal canvas:', drawErr);
      }
    }

    // Paint slot badge
    drawSlotBadge(ctx, slotEl, slotRect, baseRect, sideBorder, topBarHeight, resolutionScale);
  }

  // 7. Draw Bottom Polaroid Frame (only if includeWatermark is enabled)
  if (includeWatermark) {
    ctx.save();
    const bottomCenterY = topBarHeight + innerHeight + bottomBarHeight / 2;

    // Bottom Left: FX FREEPLAY branding
    const brandFontSize = Math.max(10, Math.round(11 * resolutionScale));
    ctx.font = `800 ${brandFontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = themeAccent;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText('FX FREEPLAY', sideBorder + 6 * resolutionScale, bottomCenterY);

    // Bottom Right: Capture Timestamp
    const captureTimestampStr = formatCardTimestamp(new Date());
    const dateFontSize = Math.max(9, Math.round(10 * resolutionScale));
    ctx.font = `500 ${dateFontSize}px system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillStyle = themeTextMuted;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(captureTimestampStr, totalWidth - sideBorder - 6 * resolutionScale, bottomCenterY);
    ctx.restore();
  }

  // 8. Generate Target Blob and Object URL
  const mimeType = format === 'jpeg' ? 'image/jpeg' : format === 'webp' ? 'image/webp' : 'image/png';
  const effectiveQuality = format === 'png' ? undefined : quality;

  const blob = await new Promise<Blob | null>((resolve) => {
    compositeCanvas.toBlob((b) => resolve(b), mimeType, effectiveQuality);
  });

  if (!blob) {
    return {
      success: false,
      format,
      dimensions: { width: totalWidth, height: totalHeight },
      target,
      saved: false,
      copied: false,
      error: 'Failed to encode composite canvas to Blob',
    };
  }

  const objectUrl = URL.createObjectURL(blob);
  const filename = formatScreenshotFilename(target, format);

  // 9. Automatic Actions Execution
  let saved = false;
  if (saveToDevice) {
    try {
      saveBlobToDevice(blob, filename);
      saved = true;
    } catch (saveErr) {
      console.warn('[Capture Engine] Auto-save to device failed:', saveErr);
    }
  }

  let copied = false;
  let clipboardError: string | undefined;
  if (copyToClipboard) {
    const copyRes = await copyBlobToClipboard(blob, compositeCanvas);
    copied = copyRes.copied;
    clipboardError = copyRes.error;
  }

  return {
    success: true,
    blob,
    objectUrl,
    filename,
    format,
    dimensions: { width: totalWidth, height: totalHeight },
    target,
    saved,
    copied,
    clipboardError,
  };
}
