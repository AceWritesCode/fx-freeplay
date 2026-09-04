/**
 * GIF Engine — Headless Video-to-GIF Extraction & Encoding
 *
 * Extracts discrete frames sequentially from a source video Blob (WebM or MP4),
 * applies spatial cropping and resolution scaling, generates a global 256-color palette,
 * and encodes the animation using gifenc (GIF89a).
 *
 * Performance-optimized:
 * - Single global palette generated once (eliminating per-frame clustering)
 * - Persistent RGB565 palette index cache across all frames
 * - Zero intermediate re-allocations or redundant canvas operations
 * - Completely headless: zero React or Zustand dependencies
 */

import { GIFEncoder, quantize } from 'gifenc';
export { GIFEncoder, quantize, applyPalette } from 'gifenc';
import type { CustomRect } from '../types';

export interface GifEncodingOptions {
  startTime: number; // In seconds
  endTime: number; // In seconds
  cropRect?: CustomRect; // In source video pixel space
  fps: 10 | 15 | 24;
  resolutionScale?: number; // 0.5, 0.75, 1.0 (default: 1.0)
  loop?: boolean; // Default: true (repeat 0)
  totalDurationSeconds?: number;
  onProgress?: (progress: number) => void; // 0.0 to 1.0
  signal?: AbortSignal;
}

export interface GifEncodingResult {
  blob: Blob;
  width: number;
  height: number;
  durationMs: number;
  frameCount: number;
}

/**
 * Seeks an HTMLVideoElement to the specified timestamp and awaits the "seeked" event
 * with a fallback timeout to prevent deadlock.
 */
function seekVideo(video: HTMLVideoElement, timeSeconds: number, timeoutMs = 800): Promise<void> {
  return new Promise((resolve) => {
    // If the video is already virtually at the target time, resolve immediately
    if (Math.abs(video.currentTime - timeSeconds) < 0.005) {
      resolve();
      return;
    }

    let settled = false;
    let timerId: ReturnType<typeof setTimeout> | null = null;

    const cleanup = () => {
      settled = true;
      if (timerId !== null) {
        clearTimeout(timerId);
        timerId = null;
      }
      video.removeEventListener('seeked', handleSeeked);
      video.removeEventListener('error', handleError);
    };

    const handleSeeked = () => {
      if (!settled) {
        cleanup();
        resolve();
      }
    };

    const handleError = () => {
      if (!settled) {
        cleanup();
        resolve(); // Continue gracefully on seek errors rather than hanging
      }
    };

    video.addEventListener('seeked', handleSeeked, { once: true });
    video.addEventListener('error', handleError, { once: true });

    timerId = setTimeout(() => {
      if (!settled) {
        cleanup();
        resolve();
      }
    }, timeoutMs);

    try {
      video.currentTime = timeSeconds;
    } catch {
      cleanup();
      resolve();
    }
  });
}

/**
 * Finds the index of the nearest color in an RGB palette using Euclidean distance squared.
 */
function findNearestColorIndex(r: number, g: number, b: number, palette: number[][]): number {
  let bestIdx = 0;
  let minDistance = Infinity;

  for (let i = 0; i < palette.length; i++) {
    const p = palette[i];
    const dr = p[0] - r;
    const dg = p[1] - g;
    const db = p[2] - b;
    const dist = dr * dr + dg * dg + db * db;

    if (dist < minDistance) {
      minDistance = dist;
      bestIdx = i;
      if (dist === 0) break; // Exact match found
    }
  }

  return bestIdx;
}

/**
 * Fast palette mapping using a persistent 16-bit (RGB565) lookup cache.
 * Avoids recomputing Euclidean distance for colors that have already been mapped.
 */
function fastApplyPalette(
  rgba: Uint8ClampedArray | Uint8Array,
  palette: number[][],
  cache: Int16Array
): Uint8Array {
  const data = new Uint32Array(rgba.buffer, rgba.byteOffset, rgba.byteLength / 4);
  const length = data.length;
  const index = new Uint8Array(length);

  for (let i = 0; i < length; i++) {
    const color = data[i];
    const b = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const r = color & 0xff;

    // Convert to 16-bit 5-6-5 key (0..65535)
    const key = ((r >> 3) << 11) | ((g >> 2) << 5) | (b >> 3);
    let idx = cache[key];

    if (idx < 0) {
      idx = findNearestColorIndex(r, g, b, palette);
      cache[key] = idx;
    }

    index[i] = idx;
  }

  return index;
}

/**
 * Samples pixel data to generate a high-quality global palette without
 * processing redundant millions of pixels through the PnnQuant clustering algorithm.
 */
function samplePixelsForQuantize(rgba: Uint8ClampedArray | Uint8Array, maxPixels = 100000): Uint8Array {
  const totalPixels = rgba.length / 4;
  if (totalPixels <= maxPixels) {
    return rgba instanceof Uint8Array ? rgba : new Uint8Array(rgba.buffer, rgba.byteOffset, rgba.byteLength);
  }

  const stride = Math.ceil(totalPixels / maxPixels);
  const sampledCount = Math.floor(totalPixels / stride);
  const output = new Uint8Array(sampledCount * 4);

  const src32 = new Uint32Array(rgba.buffer, rgba.byteOffset, totalPixels);
  const dst32 = new Uint32Array(output.buffer, 0, sampledCount);

  for (let i = 0, j = 0; i < sampledCount; i++, j += stride) {
    dst32[i] = src32[j];
  }

  return output;
}

/**
 * Extracts frames from a video Blob and encodes them into an animated GIF Blob.
 */
export async function encodeGifFromVideoBlob(
  sourceBlob: Blob,
  options: GifEncodingOptions
): Promise<GifEncodingResult> {
  const {
    startTime,
    endTime,
    cropRect,
    fps = 15,
    resolutionScale = 1.0,
    loop = true,
    totalDurationSeconds,
    onProgress,
    signal,
  } = options;

  if (signal?.aborted) {
    throw new Error('GIF encoding aborted before start');
  }

  // 1. Create an offscreen video element to read frames
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.preload = 'auto';
  const objectUrl = URL.createObjectURL(sourceBlob);
  video.src = objectUrl;
  let canvas: HTMLCanvasElement | null = null;

  try {
    // 2. Wait for metadata to obtain intrinsic dimensions & duration
    await new Promise<void>((resolve, reject) => {
      if (video.readyState >= 1) {
        resolve();
        return;
      }

      const onLoaded = () => {
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeEventListener('error', onError);
        resolve();
      };

      const onError = () => {
        video.removeEventListener('loadedmetadata', onLoaded);
        video.removeEventListener('error', onError);
        reject(new Error('Failed to load source video metadata for GIF encoding'));
      };

      video.addEventListener('loadedmetadata', onLoaded);
      video.addEventListener('error', onError);
    });

    const intrinsicWidth = video.videoWidth || 1920;
    const intrinsicHeight = video.videoHeight || 1080;

    // Resolve source duration: some WebM blobs report Infinity; fall back to provided totalDuration
    let sourceDuration = video.duration;
    if (!Number.isFinite(sourceDuration) || sourceDuration <= 0) {
      sourceDuration = totalDurationSeconds ?? (endTime > 0 ? endTime : 10);
    }

    // 3. Precompute constrained start and end times
    const clampedStart = Math.max(0, Math.min(startTime, sourceDuration));
    let clampedEnd = Math.min(sourceDuration, Math.max(clampedStart + 0.1, endTime));
    if (clampedEnd <= clampedStart) {
      clampedEnd = clampedStart + 0.1;
    }

    // 4. Precompute crop coordinates and output dimensions
    const sourceCropX = cropRect ? Math.max(0, Math.min(cropRect.x, intrinsicWidth - 1)) : 0;
    const sourceCropY = cropRect ? Math.max(0, Math.min(cropRect.y, intrinsicHeight - 1)) : 0;
    const sourceCropW = cropRect
      ? Math.max(1, Math.min(cropRect.width, intrinsicWidth - sourceCropX))
      : intrinsicWidth;
    const sourceCropH = cropRect
      ? Math.max(1, Math.min(cropRect.height, intrinsicHeight - sourceCropY))
      : intrinsicHeight;

    let outWidth = Math.max(2, Math.round(sourceCropW * resolutionScale));
    let outHeight = Math.max(2, Math.round(sourceCropH * resolutionScale));
    if (outWidth % 2 !== 0) outWidth += 1;
    if (outHeight % 2 !== 0) outHeight += 1;

    // 5. Precompute timestamps
    const frameInterval = 1 / Math.max(1, fps);
    const timestamps: number[] = [];
    for (let t = clampedStart; t <= clampedEnd; t += frameInterval) {
      timestamps.push(t);
    }
    if (timestamps.length === 0) {
      timestamps.push(clampedStart);
    }

    // 6. Setup offscreen canvas (reused across all frames)
    canvas = document.createElement('canvas');
    canvas.width = outWidth;
    canvas.height = outHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('Failed to acquire 2D canvas context for GIF frame rendering');
    }

    // 7. Initialize GIFEncoder and precomputed frame constants
    const encoder = GIFEncoder();
    const frameDelayMs = Math.round(1000 / fps);
    const repeatCount = loop ? 0 : -1;

    // Persistent RGB565 lookup cache (65536 entries, initialized to -1)
    const paletteCache = new Int16Array(65536).fill(-1);
    let globalPalette: number[][] | null = null;

    // 8. Sequential frame seek and encode loop
    for (let i = 0; i < timestamps.length; i++) {
      if (signal?.aborted) {
        throw new Error('GIF encoding aborted by user');
      }

      const timestamp = timestamps[i];
      await seekVideo(video, timestamp);

      if (signal?.aborted) {
        throw new Error('GIF encoding aborted by user');
      }

      // Draw cropped source slice directly onto output canvas (no clearRect needed for opaque video)
      ctx.drawImage(
        video,
        sourceCropX,
        sourceCropY,
        sourceCropW,
        sourceCropH,
        0,
        0,
        outWidth,
        outHeight
      );

      // Extract raw RGBA pixel buffer
      const imageData = ctx.getImageData(0, 0, outWidth, outHeight);
      const rgba = imageData.data;

      // Generate global palette once on the first frame
      if (!globalPalette) {
        const sampledData = samplePixelsForQuantize(rgba, 100000);
        globalPalette = quantize(sampledData, 256, { format: 'rgb565' });

        // First frame: encode Logical Screen Descriptor + Global Color Table (GCT)
        const indexedBitmap = fastApplyPalette(rgba, globalPalette, paletteCache);
        encoder.writeFrame(indexedBitmap, outWidth, outHeight, {
          palette: globalPalette,
          delay: frameDelayMs,
          repeat: repeatCount,
        });
      } else {
        // Subsequent frames: map pixels using persistent warm cache, omit palette to reference GCT
        const indexedBitmap = fastApplyPalette(rgba, globalPalette, paletteCache);
        encoder.writeFrame(indexedBitmap, outWidth, outHeight, {
          delay: frameDelayMs,
        });
      }

      // Report progress
      if (onProgress) {
        onProgress((i + 1) / timestamps.length);
      }
    }

    // 9. Finish GIF stream
    encoder.finish();
    const gifBytes = encoder.bytes();
    const gifBlob = new Blob([gifBytes as unknown as BlobPart], { type: 'image/gif' });

    return {
      blob: gifBlob,
      width: outWidth,
      height: outHeight,
      durationMs: (clampedEnd - clampedStart) * 1000,
      frameCount: timestamps.length,
    };
  } finally {
    // 10. Guaranteed cleanup
    URL.revokeObjectURL(objectUrl);
    video.removeAttribute('src');
    video.load();
    if (canvas) {
      canvas.width = 1;
      canvas.height = 1;
    }
  }
}
