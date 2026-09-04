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
import {
  VideoEngine,
  getSupportedVideoMimeType,
  revokeVideoObjectUrl,
} from '../engine/videoEngine';
export { revokeVideoObjectUrl };
import { DynamicCaptureCompositor } from '../engine/dynamicCaptureCompositor';
import type { CaptureRectResolver } from '../engine/compositorUtils';
import {
  normalizeCaptureRect,
  createChartCanvasResolver,
  createAllChartsResolver,
  getChartWorkspaceBounds,
} from '../engine/compositorUtils';
import { saveBlobToDevice } from '../engine/screenshotEngine';
import {
  handleGifRecordingComplete,
  clearGifAutoStopTimer,
  armGifAutoStopTimer,
} from './useGifCoordinator';
import type { CaptureTarget, VideoResult } from '../types';

let activeVideoEngine: VideoEngine | null = null;
let activeCompositor: DynamicCaptureCompositor | null = null;
let coordinatorSessionStatus: 'idle' | 'starting' | 'recording' | 'stopping' = 'idle';

/**
 * Disposes active compositor and video engine cleanly.
 * Completely idempotent: calling multiple times is safe and will not throw.
 */
export function cleanupEngineInstances(): void {
  clearGifAutoStopTimer();
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
  if (coordinatorSessionStatus !== 'idle') {
    return;
  }

  coordinatorSessionStatus = 'starting';
  const { videoConfig, setRecordingError, latestVideoResult } = useCaptureStore.getState();

  // Revoke previous video result object URL before starting a new recording session
  if (latestVideoResult?.objectUrl) {
    revokeVideoObjectUrl(latestVideoResult.objectUrl);
    useCaptureStore.setState({ latestVideoResult: null });
  }

  // Validate format capability before starting capture pipeline
  const requestedFormat = videoConfig.format || 'webm';
  const supportedMime = getSupportedVideoMimeType(requestedFormat);

  if (requestedFormat === 'mp4' && !supportedMime) {
    coordinatorSessionStatus = 'idle';
    console.error('[Video Coordinator] Native MP4 recording is not supported by this browser environment.');
    setRecordingError('Native MP4 recording is not supported by your browser. Please select WebM format in settings.');
    return;
  }

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
      format: requestedFormat,
      onError: (err) => {
        console.error('[Video Coordinator] Runtime MediaRecorder error:', err);
        coordinatorSessionStatus = 'idle';
        cleanupEngineInstances();
        useCaptureStore.getState().setRecordingError(err.message || 'MediaRecorder runtime error');
      },
    });

    if (coordinatorSessionStatus !== 'starting') {
      cleanupEngineInstances();
      return;
    }

    coordinatorSessionStatus = 'recording';
    useCaptureStore.setState({
      recordingStatus: 'recording',
      recordingElapsedSeconds: 0,
      errorMessage: null,
    });
    if (useCaptureStore.getState().activeCaptureType === 'gif') {
      armGifAutoStopTimer(60000);
    }
    console.log(`[Video Coordinator] Recording session started successfully via canvas compositor (${requestedFormat.toUpperCase()})`);
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
    activeCompositor?.pause();
    useCaptureStore.getState().pauseRecording();
  }
}

/**
 * Resumes the active recording session.
 */
export function resumeVideoRecordingSession(): void {
  if (activeVideoEngine && activeVideoEngine.getState() === 'paused') {
    activeVideoEngine.resume();
    activeCompositor?.resume();
    useCaptureStore.getState().resumeRecording();
  }
}

/**
 * Stops the active recording session, disposes of media tracks,
 * compiles the video Blob (MP4 or WebM directly), and stores the resulting VideoResult.
 */
export async function stopVideoRecordingSession(): Promise<VideoResult | null> {
  clearGifAutoStopTimer();
  const { selectedTarget, videoConfig, latestVideoResult } = useCaptureStore.getState();
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
    // 1. Stop engine and retrieve native Blob
    const engineResult = await activeVideoEngine.stop();

    // 2. Immediately stop/cleanup compositor and all recording stream resources
    cleanupEngineInstances();
    coordinatorSessionStatus = 'idle';

    // 2b. If active capture type is GIF, transition directly to GIF Editor without downloading video
    const { activeCaptureType } = useCaptureStore.getState();
    if (activeCaptureType === 'gif') {
      await handleGifRecordingComplete(engineResult);
      return null;
    }

    // 3. Revoke any previous video result object URL before creating a new one
    if (latestVideoResult?.objectUrl) {
      revokeVideoObjectUrl(latestVideoResult.objectUrl);
    }

    // 4. Create new VideoResult and trigger device download
    const format = videoConfig.format || 'webm';
    const filename = formatVideoFilename(target, format);
    const objectUrl = URL.createObjectURL(engineResult.blob);

    const videoResult: VideoResult = {
      success: true,
      blob: engineResult.blob,
      objectUrl,
      filename,
      format,
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
    });

    console.log(`[Video Coordinator] ${format.toUpperCase()} recording saved successfully (0s delay):`, videoResult);
    return videoResult;
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
  clearGifAutoStopTimer();
  coordinatorSessionStatus = 'idle';
  cleanupEngineInstances();
  useCaptureStore.getState().cancelRecording();
}

// Ensure clean teardown when window/page unloads
if (typeof window !== 'undefined') {
  const handlePageTeardown = () => {
    cleanupEngineInstances();
    const prev = useCaptureStore.getState().latestVideoResult;
    if (prev?.objectUrl) {
      revokeVideoObjectUrl(prev.objectUrl);
    }
  };
  window.addEventListener('pagehide', handlePageTeardown);
  window.addEventListener('beforeunload', handlePageTeardown);
}
