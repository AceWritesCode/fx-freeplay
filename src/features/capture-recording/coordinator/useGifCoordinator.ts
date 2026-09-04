/**
 * GIF Coordinator — Lifecycle & Export Orchestration
 *
 * Coordinates transition from video recording stop to the GIF Editor modal,
 * and manages headless GIF frame extraction, cropping, encoding, and download.
 */

import { useCaptureStore } from '../store/useCaptureStore';
import { encodeGifFromVideoBlob } from '../engine/gifEngine';
import { saveBlobToDevice } from '../engine/screenshotEngine';
import {
  startVideoRecordingSession,
  stopVideoRecordingSession,
} from './useVideoCoordinator';
import type { VideoEngineResult } from '../engine/videoEngine';
import type { CaptureTarget } from '../types';

let activeAbortController: AbortController | null = null;
let gifAutoStopTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Clears the 60-second GIF auto-stop timer if active.
 */
export function clearGifAutoStopTimer(): void {
  if (gifAutoStopTimer !== null) {
    clearTimeout(gifAutoStopTimer);
    gifAutoStopTimer = null;
  }
}

/**
 * Arms the hard 60-second maximum duration timeout for a GIF recording session.
 */
export function armGifAutoStopTimer(timeoutMs = 60000): void {
  clearGifAutoStopTimer();
  gifAutoStopTimer = setTimeout(() => {
    console.log('[GIF Coordinator] 60-second maximum duration reached, automatically stopping recording');
    clearGifAutoStopTimer();
    void stopVideoRecordingSession();
  }, timeoutMs);
}

/**
 * Directly initiates GIF recording:
 * Closes menu, selects All Canvases target ({ type: 'workspace' }),
 * arms the 60-second hard limit, and starts recording immediately.
 */
export async function startGifRecordingWorkflow(): Promise<void> {
  clearGifAutoStopTimer();

  const store = useCaptureStore.getState();
  store.closeCaptureMenu();

  const target: CaptureTarget = { type: 'workspace' };
  useCaptureStore.setState({
    activeCaptureType: 'gif',
    selectedTarget: target,
    flowStep: 'idle',
    recordingStatus: 'recording',
    recordingElapsedSeconds: 0,
    errorMessage: null,
  });

  armGifAutoStopTimer(60000);
  await startVideoRecordingSession(target);
}

/**
 * Formats a clean, deterministic filename for a generated GIF.
 * Pattern: FX-Freeplay_GIF_All_Canvases_YYYY-MM-DD_HH-mm-ss.gif
 */
export function formatGifFilename(target: CaptureTarget): string {
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

  return `FX-Freeplay_GIF_${identifier}_${dateStr}_${timeStr}.gif`;
}

/**
 * Handles completion of a GIF recording session.
 * Instead of downloading a video file, transitions immediately into the GIF Editor.
 */
export async function handleGifRecordingComplete(engineResult: VideoEngineResult): Promise<void> {
  clearGifAutoStopTimer();
  const url = URL.createObjectURL(engineResult.blob);

  let width = engineResult.width || 1920;
  let height = engineResult.height || 1080;
  let durationMs = engineResult.durationMs;

  try {
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = url;

    await new Promise<void>((resolve) => {
      let settled = false;
      const onDone = () => {
        if (!settled) {
          settled = true;
          tempVideo.removeEventListener('loadedmetadata', onDone);
          tempVideo.removeEventListener('error', onDone);
          resolve();
        }
      };

      tempVideo.addEventListener('loadedmetadata', onDone);
      tempVideo.addEventListener('error', onDone);
      setTimeout(onDone, 600); // 600ms fallback safety timeout
    });

    if (tempVideo.videoWidth > 0) width = tempVideo.videoWidth;
    if (tempVideo.videoHeight > 0) height = tempVideo.videoHeight;
    if (Number.isFinite(tempVideo.duration) && tempVideo.duration > 0) {
      durationMs = tempVideo.duration * 1000;
    }
  } catch (err) {
    console.warn('[GIF Coordinator] Error reading video metadata, using engine results:', err);
  }

  useCaptureStore.getState().openGifEditor(engineResult.blob, url, durationMs, width, height);
}

/**
 * Triggers frame extraction, cropping, quantizing, and export from the GIF Editor.
 */
export async function exportGifFromEditor(): Promise<boolean> {
  const { gifEditorSession, selectedTarget, setGifExporting, setGifExportError, closeGifEditor } =
    useCaptureStore.getState();

  if (!gifEditorSession.sourceBlob || gifEditorSession.isExporting) {
    return false;
  }

  if (activeAbortController) {
    activeAbortController.abort();
    activeAbortController = null;
  }

  activeAbortController = new AbortController();
  setGifExporting(true, 0);

  try {
    const target = selectedTarget || { type: 'workspace' };
    const result = await encodeGifFromVideoBlob(gifEditorSession.sourceBlob, {
      startTime: gifEditorSession.startTime,
      endTime: gifEditorSession.endTime,
      cropRect: gifEditorSession.cropRect,
      fps: gifEditorSession.fps,
      resolutionScale: gifEditorSession.resolutionScale ?? 1.0,
      loop: gifEditorSession.loop ?? true,
      totalDurationSeconds: gifEditorSession.durationMs / 1000,
      onProgress: (progress) => {
        setGifExporting(true, progress);
      },
      signal: activeAbortController.signal,
    });

    const filename = formatGifFilename(target);
    saveBlobToDevice(result.blob, filename);

    closeGifEditor();
    activeAbortController = null;
    return true;
  } catch (err: unknown) {
    const wasAborted =
      activeAbortController?.signal.aborted ||
      (err instanceof Error && (err.message.includes('aborted') || err.name === 'AbortError'));

    if (wasAborted) {
      console.log('[GIF Coordinator] GIF encoding aborted by user');
    } else {
      console.error('[GIF Coordinator] Failed to export GIF:', err);
      const msg = err instanceof Error ? err.message : 'Failed to export GIF';
      setGifExportError(msg);
    }
    setGifExporting(false, 0);
    return false;
  } finally {
    activeAbortController = null;
  }
}

/**
 * Aborts ONLY the active GIF encoding/export process,
 * keeping the recorded video source, crop, and editor session intact.
 */
export function abortGifExport(): void {
  if (activeAbortController) {
    activeAbortController.abort();
    activeAbortController = null;
  }
  useCaptureStore.getState().setGifExporting(false, 0);
}

/**
 * Cancels GIF editor and releases all held Blob/Object URL resources.
 */
export function cancelGifEditor(): void {
  clearGifAutoStopTimer();
  if (activeAbortController) {
    activeAbortController.abort();
    activeAbortController = null;
  }
  useCaptureStore.getState().closeGifEditor();
}

// Window unload listener to guarantee object URL revocation
if (typeof window !== 'undefined') {
  const handleTeardown = () => {
    if (activeAbortController) {
      activeAbortController.abort();
      activeAbortController = null;
    }
    const currentUrl = useCaptureStore.getState().gifEditorSession.sourceUrl;
    if (currentUrl) {
      try {
        URL.revokeObjectURL(currentUrl);
      } catch {
        // Ignore
      }
    }
  };
  window.addEventListener('pagehide', handleTeardown);
  window.addEventListener('beforeunload', handleTeardown);
}
