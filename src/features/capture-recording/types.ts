/**
 * Screenshot & Video Recording Feature — Type Definitions
 *
 * Defines the core models, configuration contracts, and flow state machine
 * for Screenshot, Video, and GIF capture workflows.
 */

// ─── Capture Types & Targets ─────────────────────────────────────────────────

export type CaptureType = 'screenshot' | 'video' | 'gif';

export type CaptureTargetType = 'canvas' | 'workspace';

export interface CanvasTargetInfo {
  slotIndex: number;
  symbol?: string | null;
  timeframe?: string;
}

export type VideoCaptureArea = 'canvas' | 'fullscreen' | 'custom';

export interface CustomRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type CaptureTarget =
  | { type: 'workspace'; areaMode?: 'workspace' | 'fullscreen' }
  | { type: 'canvas'; canvas: CanvasTargetInfo }
  | { type: 'custom'; rect: CustomRect };

// ─── Configuration Models ───────────────────────────────────────────────────

export interface ScreenshotConfig {
  format: 'png' | 'jpeg' | 'webp';
  quality: number; // 0.1 to 1.0 (default: 0.92)
  resolutionScale: 1 | 2 | 4; // 1x = Standard, 2x = Retina, 4x = Ultra HD
  copyToClipboard: boolean;
  saveToDevice: boolean;
  includeWatermark: boolean;
}

export interface VideoConfig {
  areaMode: VideoCaptureArea; // 'canvas' (default) | 'fullscreen' | 'custom'
  format: 'webm' | 'mp4';
  resolution: '720p' | '1080p' | '4k';
  fps: 30 | 60;
  quality: 'standard' | 'high' | 'ultra';
  includeMicrophone: boolean;
  countdownSeconds: 0 | 3 | 5;
  customRect?: CustomRect;
}

export interface GifConfig {
  fps: 10 | 15 | 24;
  quality: 'standard' | 'high';
  maxDurationSeconds: 5 | 10 | 15 | 30;
  loop: boolean;
  resolutionScale: 0.5 | 0.75 | 1;
}

// ─── Flow & Recording States ────────────────────────────────────────────────

export type CaptureFlowStep =
  | 'idle'
  | 'configuring'
  | 'selecting_canvas'
  | 'selecting_custom_region'
  | 'countdown';

export type RecordingStatus =
  | 'idle'
  | 'ready'
  | 'recording'
  | 'paused'
  | 'processing'
  | 'completed'
  | 'error'
  | 'cancelled';

export type RememberSettingsMap = Record<CaptureType, boolean>;

export interface PersistedCaptureDefaults {
  rememberSettings: boolean;
  rememberSettingsPerType: RememberSettingsMap;
  screenshot: ScreenshotConfig;
  video: VideoConfig;
  gif: GifConfig;
}

// ─── Conceptual Request Payload ─────────────────────────────────────────────

export interface CaptureRequest {
  type: CaptureType;
  target: CaptureTarget;
  screenshotConfig?: ScreenshotConfig;
  videoConfig?: VideoConfig;
  gifConfig?: GifConfig;
  timestamp: number;
}
