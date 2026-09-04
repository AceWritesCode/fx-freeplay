/**
 * MP4 Converter Engine — FX Freeplay
 *
 * Transcodes in-memory WebM video Blobs to universal H.264 MP4 format using ffmpeg.wasm.
 * Runs single-threaded WebAssembly, requiring zero COOP/COEP headers.
 * Completely independent from React and Zustand.
 */

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export interface Mp4ConversionOptions {
  durationMs?: number;
  onProgress?: (progress: number) => void; // 0.0 to 1.0
}

let ffmpegInstance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

const CORE_VERSION = '0.12.10';
const CDN_PRIMARY = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/esm`;
const CDN_FALLBACK = `https://cdn.jsdelivr.net/npm/@ffmpeg/core@${CORE_VERSION}/dist/esm`;

/**
 * Lazily loads and caches the singleton FFmpeg instance.
 * Automatically tries primary CDN and falls back if network fails.
 */
async function getOrInitFFmpeg(): Promise<FFmpeg> {
  if (ffmpegInstance && ffmpegInstance.loaded) {
    return ffmpegInstance;
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = (async () => {
    const ffmpeg = new FFmpeg();

    // Try primary CDN first (unpkg)
    try {
      console.log('[mp4Converter] Loading FFmpeg core from primary CDN:', CDN_PRIMARY);
      const coreURL = await toBlobURL(`${CDN_PRIMARY}/ffmpeg-core.js`, 'text/javascript');
      const wasmURL = await toBlobURL(`${CDN_PRIMARY}/ffmpeg-core.wasm`, 'application/wasm');

      await ffmpeg.load({
        coreURL,
        wasmURL,
      });

      ffmpegInstance = ffmpeg;
      console.log('[mp4Converter] FFmpeg loaded successfully from primary CDN');
      return ffmpeg;
    } catch (primaryErr) {
      console.warn('[mp4Converter] Primary CDN failed, attempting fallback CDN:', CDN_FALLBACK, primaryErr);

      // Try fallback CDN (jsdelivr)
      try {
        const coreURL = await toBlobURL(`${CDN_FALLBACK}/ffmpeg-core.js`, 'text/javascript');
        const wasmURL = await toBlobURL(`${CDN_FALLBACK}/ffmpeg-core.wasm`, 'application/wasm');

        await ffmpeg.load({
          coreURL,
          wasmURL,
        });

        ffmpegInstance = ffmpeg;
        console.log('[mp4Converter] FFmpeg loaded successfully from fallback CDN');
        return ffmpeg;
      } catch (fallbackErr) {
        loadPromise = null;
        throw new Error(
          'Failed to load video conversion engine (ffmpeg.wasm). Check your internet connection.',
          { cause: fallbackErr }
        );
      }
    }
  })();

  return loadPromise;
}

/**
 * Warm up FFmpeg WASM core in the background so conversion begins immediately on stop.
 */
export async function preloadMp4Converter(): Promise<void> {
  try {
    await getOrInitFFmpeg();
  } catch (err) {
    console.warn('[mp4Converter] Background preload error (will retry upon conversion):', err);
  }
}

/**
 * Converts a WebM video Blob to an H.264 MP4 Blob.
 *
 * Uses:
 * - `-c:v libx264`: standard H.264 video codec
 * - `-preset ultrafast`: fastest x264 encoding preset
 * - `-tune zerolatency`: removes lookahead buffering and B-frame delays for maximum WebAssembly encoding speed
 * - `-crf 22`: visually lossless/sharp chart graphic rendering
 * - `-pix_fmt yuv420p`: universal player compatibility (QuickTime, Windows Media, browsers)
 * - `-threads 1`: avoids multi-threading contention in single-threaded WASM runtime
 * - `-movflags +faststart`: places moov atom at beginning of MP4 for streaming and instant playback
 * - `-an`: disables audio processing for canvas video
 *
 * @param webmBlob The input WebM Blob from VideoEngine
 * @param options Optional durationMs and progress callback
 * @returns A Promise resolving to the transcoded video/mp4 Blob
 */
export async function convertWebmToMp4(
  webmBlob: Blob,
  options?: Mp4ConversionOptions
): Promise<Blob> {
  if (!webmBlob || webmBlob.size === 0) {
    throw new Error('Invalid input video: WebM blob is empty');
  }

  const ffmpeg = await getOrInitFFmpeg();

  // Generate isolated file names in virtual filesystem
  const uniqueId = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const inputName = `input_${uniqueId}.webm`;
  const outputName = `output_${uniqueId}.mp4`;

  let lastReportedProgress = 0;
  const updateProgress = (ratio: number) => {
    if (ratio > lastReportedProgress && ratio <= 0.99) {
      lastReportedProgress = ratio;
      options?.onProgress?.(ratio);
    }
  };

  // Dual-source progress tracking:
  // Source A: FFmpeg progress event (passes time in microseconds)
  const progressHandler = ({ progress, time }: { progress: number; time: number }) => {
    if (progress > 0 && progress <= 1) {
      updateProgress(progress);
    } else if (time > 0 && options?.durationMs && options.durationMs > 0) {
      const durationSec = options.durationMs / 1000;
      const currentSec = time / 1_000_000;
      updateProgress(currentSec / durationSec);
    }
  };

  // Source B: FFmpeg log event parser (extracts time=HH:MM:SS.XX from ffmpeg stderr)
  const logHandler = ({ message }: { message: string }) => {
    const match = message.match(/time=(\d{2}):(\d{2}):(\d{2}(?:\.\d+)?)/);
    if (match && options?.durationMs && options.durationMs > 0) {
      const hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const seconds = parseFloat(match[3]);
      const currentSec = hours * 3600 + minutes * 60 + seconds;
      const durationSec = options.durationMs / 1000;
      updateProgress(currentSec / durationSec);
    }
  };

  ffmpeg.on('progress', progressHandler);
  ffmpeg.on('log', logHandler);

  try {
    // 1. Write WebM into virtual filesystem
    const inputData = await fetchFile(webmBlob);
    await ffmpeg.writeFile(inputName, inputData);

    // Initial signal that conversion is starting
    options?.onProgress?.(0.01);

    const conversionStartTime = performance.now();

    // 2. Execute conversion command with ultrafast + zerolatency optimization
    const exitCode = await ffmpeg.exec([
      '-i',
      inputName,
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-tune',
      'zerolatency',
      '-crf',
      '22',
      '-pix_fmt',
      'yuv420p',
      '-threads',
      '1',
      '-movflags',
      '+faststart',
      '-an',
      outputName,
    ]);

    const conversionDurationMs = Math.round(performance.now() - conversionStartTime);

    if (exitCode !== 0) {
      throw new Error(`FFmpeg conversion failed with exit code ${exitCode}`);
    }

    // Report 100% completion before reading output
    options?.onProgress?.(1.0);

    // 3. Read output MP4 from virtual filesystem
    const rawOutput = await ffmpeg.readFile(outputName);
    const outputBytes =
      rawOutput instanceof Uint8Array
        ? rawOutput
        : new Uint8Array(typeof rawOutput === 'string' ? new TextEncoder().encode(rawOutput) : (rawOutput as ArrayBuffer));

    if (outputBytes.byteLength === 0) {
      throw new Error('FFmpeg produced an empty MP4 output');
    }

    console.log(
      `[mp4Converter] Conversion successful in ${conversionDurationMs}ms. WebM size: ${webmBlob.size} bytes -> MP4 size: ${outputBytes.byteLength} bytes`
    );

    // 4. Create and return genuine MP4 Blob
    return new Blob([outputBytes as unknown as BlobPart], { type: 'video/mp4' });
  } finally {
    // Clean up event listeners and temporary virtual files
    ffmpeg.off('progress', progressHandler);
    ffmpeg.off('log', logHandler);
    try {
      await ffmpeg.deleteFile(inputName);
    } catch {
      // Ignore virtual FS cleanup errors
    }
    try {
      await ffmpeg.deleteFile(outputName);
    } catch {
      // Ignore virtual FS cleanup errors
    }
  }
}
