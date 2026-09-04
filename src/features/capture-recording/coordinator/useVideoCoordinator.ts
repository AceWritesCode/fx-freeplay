/**
 * Video Recording Coordinator — FX Freeplay
 *
 * Orchestrates the video capture workflow between UI / Store and the
 * headless DynamicCaptureCompositor & VideoEngine.
 *
 * Implements the single dynamic rectangular capture model:
 *   CaptureRectResolver -> DynamicCaptureCompositor -> captureStream() -> VideoEngine
 */

import { useCaptureStore } from '../store/useCaptureStore';
import { VideoEngine } from '../engine/videoEngine';
import { DynamicCaptureCompositor } from '../engine/dynamicCaptureCompositor';
import type { CaptureRectResolver } from '../engine/compositorUtils';
import {
  normalizeCaptureRect,
  createChartCanvasResolver,
  createAllChartsResolver,
  getChartWorkspaceBounds,
} from '../engine/compositorUtils';
import { saveBlobToDevice } from '../engine/screenshotEngine';
import { convertWebmToMp4, preloadMp4Converter } from '../engine/mp4Converter';
import type { CaptureTarget, VideoResult } from '../types';

let activeVideoEngine: VideoEngine | null = null;
let activeCompositor: DynamicCaptureCompositor | null = null;
let coordinatorSessionStatus: 'idle' | 'starting' | 'recording' | 'stopping' | 'converting' = 'idle';

/**
 * Disposes active compositor and video engine cleanly.
 */
function cleanupEngineInstances(): void {
  if (activeVideoEngine) {
    try {
      activeVideoEngine.cancel();
    } catch {
      // Ignore during cleanup
    }
    activeVideoEngine = null;
  }

  if (activeCompositor) {
    try {
      activeCompositor.destroy();
    } catch {
      // Ignore during cleanup
    }
    activeCompositor = null;
  }
}

/**
 * Creates a dynamic rectangle resolver for the Custom Region target.
 * Resolves live from store.customRect, strictly clamped to chart canvas workspace boundaries.
 */
export function createCustomRegionResolver(): CaptureRectResolver {
  return () => {
    const { customRect } = useCaptureStore.getState();
    const bounds = getChartWorkspaceBounds();
    const minX = bounds.x;
    const minY = bounds.y;
    const maxX = bounds.x + bounds.width;
    const maxY = bounds.y + bounds.height;

    const x = Math.max(minX, Math.min(maxX, customRect.x));
    const y = Math.max(minY, Math.min(maxY, customRect.y));
    const width = Math.max(2, Math.min(maxX - x, customRect.width));
    const height = Math.max(2, Math.min(maxY - y, customRect.height));

    return normalizeCaptureRect({ x, y, width, height });
  };
}

/**
 * Formats a clean, deterministic filename for a video recording.
 * Pattern: FX-Freeplay_Recording_Custom_YYYY-MM-DD_HH-mm-ss.webm
 */
export function formatVideoFilename(target: CaptureTarget, format: 'webm' | 'mp4' = 'webm'): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const timeStr = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;

  let identifier: string;
  if (target.type === 'custom') {
    identifier = 'Custom_Region';
  } else if (target.type === 'canvas') {
    const sym = target.canvas.symbol?.replace(/[^a-zA-Z0-9_-]/g, '') || 'Chart';
    const tf = target.canvas.timeframe?.toUpperCase() || '';
    identifier = tf ? `Chart_${sym}_${tf}` : `Chart_${sym}`;
  } else {
    identifier = 'All_Canvases';
  }

  return `FX-Freeplay_${identifier}_${dateStr}_${timeStr}.${format}`;
}

/**
 * Starts real video recording session for a target.
 */
export async function startVideoRecordingSession(target: CaptureTarget): Promise<void> {
  // Guard against re-entrant starts or starting while already running/stopping
  if (coordinatorSessionStatus === 'starting' || coordinatorSessionStatus === 'recording') {
    return;
  }

  coordinatorSessionStatus = 'starting';
  const { videoConfig, setRecordingError } = useCaptureStore.getState();

  // 1. Dispose any lingering engine or compositor instances silently
  cleanupEngineInstances();

  try {
    // 2. Select Resolver based on Target (One Canvas, All Canvases, or Custom Region)
    let resolver: CaptureRectResolver;
    if (target.type === 'custom') {
      resolver = createCustomRegionResolver();
    } else if (target.type === 'canvas') {
      resolver = createChartCanvasResolver(target.canvas.slotIndex);
    } else {
      resolver = createAllChartsResolver();
    }

    // 3. Instantiate Canvas Compositor and generate MediaStream via canvas.captureStream()
    const compositor = new DynamicCaptureCompositor(resolver, {
      fps: videoConfig.fps || 60,
    });
    activeCompositor = compositor;

    const stream = compositor.start();

    // 4. Instantiate and start VideoEngine
    const engine = new VideoEngine();
    activeVideoEngine = engine;

    engine.start(stream, {
      fps: videoConfig.fps || 60,
      quality: videoConfig.quality || 'high',
    });

    coordinatorSessionStatus = 'recording';
    console.log('[Video Coordinator] Recording session started successfully via canvas compositor');

    // Preload FFmpeg core in background if MP4 format is selected so it is warm upon completion
    if (videoConfig.format === 'mp4') {
      void preloadMp4Converter();
    }
  } catch (err: unknown) {
    coordinatorSessionStatus = 'idle';
    console.error('[Video Coordinator] Failed to start recording session:', err);
    const msg = err instanceof Error ? err.message : 'Failed to start video recording';
    cleanupEngineInstances();
    setRecordingError(msg);
  }
}

/**
 * Pauses the active recording session.
 */
export function pauseVideoRecordingSession(): void {
  if (activeVideoEngine && activeVideoEngine.getState() === 'recording') {
    activeVideoEngine.pause();
    useCaptureStore.getState().pauseRecording();
  }
}

/**
 * Resumes the active recording session.
 */
export function resumeVideoRecordingSession(): void {
  if (activeVideoEngine && activeVideoEngine.getState() === 'paused') {
    activeVideoEngine.resume();
    useCaptureStore.getState().resumeRecording();
  }
}

/**
 * Stops the active recording session, disposes of media tracks,
 * compiles the WebM Blob, and stores the resulting VideoResult.
 */
export async function stopVideoRecordingSession(): Promise<VideoResult | null> {
  const { selectedTarget } = useCaptureStore.getState();
  const target = selectedTarget || { type: 'custom', rect: useCaptureStore.getState().customRect };

  if (!activeVideoEngine || coordinatorSessionStatus !== 'recording') {
    coordinatorSessionStatus = 'idle';
    cleanupEngineInstances();
    useCaptureStore.getState().cancelRecording();
    return null;
  }

  coordinatorSessionStatus = 'stopping';
  useCaptureStore.setState({ recordingStatus: 'processing' });

  try {
    // Stop engine and retrieve Blob
    const engineResult = await activeVideoEngine.stop();

    // Cleanup compositor and streams
    const { videoConfig } = useCaptureStore.getState();

    // 1. If WebM format requested: download directly (instant, zero conversion overhead)
    if (videoConfig.format === 'webm') {
      coordinatorSessionStatus = 'idle';
      const filename = formatVideoFilename(target, 'webm');
      const objectUrl = URL.createObjectURL(engineResult.blob);

      const videoResult: VideoResult = {
        success: true,
        blob: engineResult.blob,
        objectUrl,
        filename,
        format: 'webm',
        dimensions: {
          width: engineResult.width,
          height: engineResult.height,
        },
        durationMs: engineResult.durationMs,
        target,
      };

      saveBlobToDevice(engineResult.blob, filename);

      useCaptureStore.setState({
        latestVideoResult: videoResult,
        recordingStatus: 'completed',
        conversionProgress: null,
        fallbackWebmBlob: null,
      });

      console.log('[Video Coordinator] WebM recording saved successfully:', videoResult);
      return videoResult;
    }

    // 2. If MP4 format requested: Convert WebM Blob to universal H.264 MP4 via ffmpeg.wasm
    coordinatorSessionStatus = 'converting';
    useCaptureStore.setState({
      recordingStatus: 'converting',
      conversionProgress: 0,
      fallbackWebmBlob: engineResult.blob,
    });

    try {
      console.log(`[Video Coordinator] Starting WebM -> MP4 conversion (duration: ${engineResult.durationMs}ms)...`);
      const mp4Blob = await convertWebmToMp4(engineResult.blob, {
        durationMs: engineResult.durationMs,
        onProgress: (progress) => {
          useCaptureStore.setState({ conversionProgress: progress });
        },
      });

      coordinatorSessionStatus = 'idle';
      const filename = formatVideoFilename(target, 'mp4');
      const objectUrl = URL.createObjectURL(mp4Blob);

      const videoResult: VideoResult = {
        success: true,
        blob: mp4Blob,
        objectUrl,
        filename,
        format: 'mp4',
        dimensions: {
          width: engineResult.width,
          height: engineResult.height,
        },
        durationMs: engineResult.durationMs,
        target,
      };

      saveBlobToDevice(mp4Blob, filename);

      useCaptureStore.setState({
        latestVideoResult: videoResult,
        recordingStatus: 'completed',
        conversionProgress: null,
        fallbackWebmBlob: null,
      });

      console.log('[Video Coordinator] MP4 converted and downloaded successfully:', videoResult);
      return videoResult;
    } catch (convErr: unknown) {
      coordinatorSessionStatus = 'idle';
      console.error('[Video Coordinator] MP4 conversion error:', convErr);
      const msg = convErr instanceof Error ? convErr.message : 'Failed to convert video to MP4';
      useCaptureStore.setState({
        recordingStatus: 'error',
        errorMessage: `${msg}. You can download the original WebM recording below.`,
        conversionProgress: null,
        fallbackWebmBlob: engineResult.blob,
      });
      return null;
    }
  } catch (err: unknown) {
    coordinatorSessionStatus = 'idle';
    console.error('[Video Coordinator] Error stopping recording session:', err);
    const msg = err instanceof Error ? err.message : 'Error stopping video recording';
    cleanupEngineInstances();
    useCaptureStore.getState().setRecordingError(msg);
    return null;
  }
}

/**
 * Cancels the active recording session, discarding all accumulated data.
 */
export async function cancelVideoRecordingSession(): Promise<void> {
  coordinatorSessionStatus = 'idle';
  cleanupEngineInstances();
  useCaptureStore.getState().cancelRecording();
}
