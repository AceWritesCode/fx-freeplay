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
 * Converts a WebM video Blob to an H.264 MP4 Blob.
 *
 * Uses:
 * - `-c:v libx264`: standard H.264 video codec
 * - `-preset ultrafast`: fast encoding in WebAssembly
 * - `-crf 22`: balanced visual quality
 * - `-pix_fmt yuv420p`: universal player compatibility (QuickTime, Windows Media, browsers)
 * - `-movflags +faststart`: moves moov atom to beginning of MP4
 * - `-an`: disables audio processing for canvas video
 *
 * @param webmBlob The input WebM Blob from VideoEngine
 * @param options Optional progress callback
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

  const progressHandler = ({ progress }: { progress: number }) => {
    if (options?.onProgress && progress >= 0 && progress <= 1) {
      options.onProgress(progress);
    }
  };

  ffmpeg.on('progress', progressHandler);

  try {
    // 1. Write WebM into virtual filesystem
    const inputData = await fetchFile(webmBlob);
    await ffmpeg.writeFile(inputName, inputData);

    // 2. Execute conversion command
    const exitCode = await ffmpeg.exec([
      '-i',
      inputName,
      '-c:v',
      'libx264',
      '-preset',
      'ultrafast',
      '-crf',
      '22',
      '-pix_fmt',
      'yuv420p',
      '-movflags',
      '+faststart',
      '-an',
      outputName,
    ]);

    if (exitCode !== 0) {
      throw new Error(`FFmpeg conversion failed with exit code ${exitCode}`);
    }

    // 3. Read output MP4 from virtual filesystem
    const rawOutput = await ffmpeg.readFile(outputName);
    const outputBytes =
      rawOutput instanceof Uint8Array
        ? rawOutput
        : new Uint8Array(typeof rawOutput === 'string' ? new TextEncoder().encode(rawOutput) : (rawOutput as ArrayBuffer));

    if (outputBytes.byteLength === 0) {
      throw new Error('FFmpeg produced an empty MP4 output');
    }

    // 4. Create and return genuine MP4 Blob
    return new Blob([outputBytes as unknown as BlobPart], { type: 'video/mp4' });
  } finally {
    // Clean up event listener and temporary virtual files
    ffmpeg.off('progress', progressHandler);
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
