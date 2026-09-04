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
import { normalizeCaptureRect } from '../engine/compositorUtils';
import { saveBlobToDevice } from '../engine/screenshotEngine';
import type { CaptureTarget, VideoResult } from '../types';

let activeVideoEngine: VideoEngine | null = null;
let activeCompositor: DynamicCaptureCompositor | null = null;
let coordinatorSessionStatus: 'idle' | 'starting' | 'recording' | 'stopping' = 'idle';

/**
 * Disposes active compositor and video engine cleanly without dispatching store cancellation.
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
 * Resolves live from store.customRect, clamped to current viewport boundaries.
 */
export function createCustomRegionResolver(): CaptureRectResolver {
  return () => {
    const { customRect } = useCaptureStore.getState();
    const maxW = typeof window !== 'undefined' ? window.innerWidth : 1920;
    const maxH = typeof window !== 'undefined' ? window.innerHeight : 1080;
    return normalizeCaptureRect(customRect, maxW, maxH);
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
    identifier = 'Workspace';
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

  // 1. Dispose any lingering engine or compositor instances silently (do NOT cancel store state)
  cleanupEngineInstances();

  try {
    // 2. Select Resolver based on Target (Step 3: Custom Region only)
    let resolver: CaptureRectResolver;
    if (target.type === 'custom') {
      resolver = createCustomRegionResolver();
    } else {
      // Fallback for custom rect
      resolver = createCustomRegionResolver();
    }

    // 3. Instantiate Compositor and Stream
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
    console.log('[Video Coordinator] Recording session started successfully');
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
    cleanupEngineInstances();
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
    });

    console.log('[Video Coordinator] Recording session stopped successfully and downloaded', videoResult);
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
  coordinatorSessionStatus = 'idle';
  cleanupEngineInstances();
  useCaptureStore.getState().cancelRecording();
}
