/**
 * Headless Video Engine — FX Freeplay
 *
 * Core engine responsible for MediaRecorder lifecycle, WebM encoding,
 * capability-based codec selection, chunk collection, Blob creation,
 * pause/resume/stop/cancel states, and leak-free resource disposal.
 *
 * Pure TypeScript — strictly zero dependencies on React or Zustand.
 */

export interface VideoEngineOptions {
  fps?: 30 | 60;
  quality?: 'standard' | 'high' | 'ultra';
  mimeType?: string;
  timesliceMs?: number;
}

export interface VideoEngineResult {
  blob: Blob;
  mimeType: string;
  durationMs: number;
  width: number;
  height: number;
}

export type VideoEngineState = 'inactive' | 'recording' | 'paused';

/**
 * Ordered list of browser-supported WebM codecs for capability negotiation.
 */
const PREFERRED_MIME_TYPES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
];

/**
 * Maps quality presets to sensible target bitrates (bits per second).
 */
export function getBitrateForQuality(quality: 'standard' | 'high' | 'ultra' = 'high'): number {
  switch (quality) {
    case 'standard':
      return 3_000_000; // 3 Mbps
    case 'ultra':
      return 10_000_000; // 10 Mbps
    case 'high':
    default:
      return 6_000_000; // 6 Mbps
  }
}

/**
 * Detects the most capable supported WebM MIME type in the current environment.
 */
export function getSupportedVideoMimeType(): string {
  if (typeof MediaRecorder === 'undefined') {
    return 'video/webm';
  }

  for (const mime of PREFERRED_MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }

  return 'video/webm';
}

export class VideoEngine {
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private chunks: Blob[] = [];
  private state: VideoEngineState = 'inactive';
  private startTime: number = 0;
  private pausedDuration: number = 0;
  private pauseStartTime: number = 0;
  private currentMimeType: string = 'video/webm';
  private stopPromiseResolve: ((result: VideoEngineResult) => void) | null = null;
  private stopPromiseReject: ((reason?: unknown) => void) | null = null;
  private isCancelling: boolean = false;

  /**
   * Returns current recording state: 'inactive' | 'recording' | 'paused'
   */
  public getState(): VideoEngineState {
    return this.state;
  }

  /**
   * Starts recording from an incoming MediaStream.
   */
  public start(stream: MediaStream, options: VideoEngineOptions = {}): void {
    if (this.state !== 'inactive') {
      throw new Error(`Cannot start VideoEngine while in state '${this.state}'`);
    }

    if (!stream || stream.getVideoTracks().length === 0) {
      throw new Error('VideoEngine.start requires a valid MediaStream with at least one active video track');
    }

    this.stream = stream;
    this.chunks = [];
    this.isCancelling = false;
    this.startTime = performance.now();
    this.pausedDuration = 0;
    this.pauseStartTime = 0;

    // Negotiate supported MIME type
    const candidateMime = options.mimeType || getSupportedVideoMimeType();
    this.currentMimeType = (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(candidateMime))
      ? candidateMime
      : getSupportedVideoMimeType();

    const videoBitsPerSecond = getBitrateForQuality(options.quality);

    try {
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: this.currentMimeType,
        videoBitsPerSecond,
      });
    } catch {
      // Fallback to default browser options if customized options fail
      this.mediaRecorder = new MediaRecorder(stream);
      this.currentMimeType = this.mediaRecorder.mimeType || 'video/webm';
    }

    this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
      if (event.data && event.data.size > 0 && !this.isCancelling) {
        this.chunks.push(event.data);
      }
    };

    this.mediaRecorder.onerror = (event: Event) => {
      const errorMsg = (event as ErrorEvent).message || 'MediaRecorder runtime error';
      if (this.stopPromiseReject) {
        this.stopPromiseReject(new Error(errorMsg));
        this.stopPromiseReject = null;
        this.stopPromiseResolve = null;
      }
      this.cleanup();
    };

    this.mediaRecorder.onstop = () => {
      const durationMs = Math.max(0, performance.now() - this.startTime - this.pausedDuration);

      if (this.isCancelling) {
        this.cleanup();
        return;
      }

      const blob = new Blob(this.chunks, { type: this.currentMimeType });
      const videoTrack = this.stream?.getVideoTracks()[0];
      const settings = videoTrack?.getSettings();
      const width = settings?.width || 0;
      const height = settings?.height || 0;

      const result: VideoEngineResult = {
        blob,
        mimeType: this.currentMimeType,
        durationMs,
        width,
        height,
      };

      if (this.stopPromiseResolve) {
        this.stopPromiseResolve(result);
        this.stopPromiseResolve = null;
        this.stopPromiseReject = null;
      }

      this.cleanup();
    };

    // Listen to video track termination (e.g., source destroyed or stopped)
    const track = stream.getVideoTracks()[0];
    if (track) {
      track.onended = () => {
        if (this.state === 'recording' || this.state === 'paused') {
          void this.stop();
        }
      };
    }

    // Start recording with 1000ms timeslice chunks
    const timeslice = options.timesliceMs ?? 1000;
    this.mediaRecorder.start(timeslice);
    this.state = 'recording';
  }

  /**
   * Pauses the active recording session.
   */
  public pause(): void {
    if (this.state !== 'recording' || !this.mediaRecorder) {
      return;
    }

    if (this.mediaRecorder.state === 'recording') {
      this.mediaRecorder.pause();
      this.pauseStartTime = performance.now();
      this.state = 'paused';
    }
  }

  /**
   * Resumes a paused recording session.
   */
  public resume(): void {
    if (this.state !== 'paused' || !this.mediaRecorder) {
      return;
    }

    if (this.mediaRecorder.state === 'paused') {
      if (this.pauseStartTime > 0) {
        this.pausedDuration += performance.now() - this.pauseStartTime;
        this.pauseStartTime = 0;
      }
      this.mediaRecorder.resume();
      this.state = 'recording';
    }
  }

  /**
   * Stops recording and returns the final compiled VideoEngineResult.
   */
  public stop(): Promise<VideoEngineResult> {
    if (this.state === 'inactive' || !this.mediaRecorder) {
      return Promise.reject(new Error('Cannot stop VideoEngine: no recording session is active'));
    }

    return new Promise<VideoEngineResult>((resolve, reject) => {
      this.stopPromiseResolve = resolve;
      this.stopPromiseReject = reject;

      try {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
          this.mediaRecorder.stop();
        } else {
          resolve({
            blob: new Blob(this.chunks, { type: this.currentMimeType }),
            mimeType: this.currentMimeType,
            durationMs: 0,
            width: 0,
            height: 0,
          });
          this.cleanup();
        }
      } catch (err) {
        this.cleanup();
        reject(err);
      }
    });
  }

  /**
   * Cancels the active recording session immediately, discarding all accumulated data.
   */
  public cancel(): void {
    if (this.state === 'inactive') {
      return;
    }

    this.isCancelling = true;
    if (this.stopPromiseReject) {
      this.stopPromiseReject(new Error('Recording cancelled'));
      this.stopPromiseReject = null;
      this.stopPromiseResolve = null;
    }

    try {
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
    } catch {
      // Ignored during cancellation
    }

    this.cleanup();
  }

  /**
   * Disposes of all active media tracks, clears chunks and resets state.
   */
  public cleanup(): void {
    this.state = 'inactive';
    this.chunks = [];
    this.isCancelling = false;
    this.startTime = 0;
    this.pausedDuration = 0;
    this.pauseStartTime = 0;

    if (this.mediaRecorder) {
      this.mediaRecorder.ondataavailable = null;
      this.mediaRecorder.onerror = null;
      this.mediaRecorder.onstop = null;
      this.mediaRecorder = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach((track) => {
        track.onended = null;
        track.stop();
      });
      this.stream = null;
    }
  }
}
