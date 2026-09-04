import { create } from 'zustand';
import type {
  CaptureType,
  CaptureTarget,
  ScreenshotConfig,
  VideoConfig,
  GifConfig,
  CaptureFlowStep,
  RecordingStatus,
  RememberSettingsMap,
  CustomRect,
  PersistedCaptureDefaults,
  ScreenshotResult,
  VideoResult,
} from '../types';
import { isSingleChartMode, getSingleChartTarget } from '../utils/targetResolver';
import {
  loadPersistedCaptureDefaults,
  savePersistedCaptureDefaults,
  resetPersistedCaptureDefaults,
} from '../utils/capturePersistence';
import {
  captureScreenshot,
  saveBlobToDevice,
  copyBlobToClipboard,
} from '../engine/screenshotEngine';
import { startVideoRecordingSession } from '../coordinator/useVideoCoordinator';

// ─── Default Configurations ──────────────────────────────────────────────────

export const DEFAULT_CUSTOM_RECT: CustomRect = {
  x: 200,
  y: 120,
  width: 800,
  height: 500,
};

export const DEFAULT_SCREENSHOT_CONFIG: ScreenshotConfig = {
  format: 'png',
  quality: 0.92,
  resolutionScale: 1,
  copyToClipboard: false,
  saveToDevice: true,
  includeWatermark: false,
  feedbackMode: 'preview',
};

export const DEFAULT_VIDEO_CONFIG: VideoConfig = {
  areaMode: 'canvas',
  format: 'webm',
  resolution: '1080p',
  fps: 60,
  quality: 'high',
  includeMicrophone: false,
  countdownSeconds: 3,
};

export const DEFAULT_GIF_CONFIG: GifConfig = {
  fps: 15,
  quality: 'standard',
  maxDurationSeconds: 10,
  loop: true,
  resolutionScale: 1,
};

// ─── Store State & Actions Contract ──────────────────────────────────────────

export interface CaptureState {
  // Menu & Workflow Flow State
  isCaptureMenuOpen: boolean;
  flowStep: CaptureFlowStep;
  activeCaptureType: CaptureType;
  rememberSettings: RememberSettingsMap;
  generalRememberSettings: boolean;

  // Persisted Defaults
  persistedDefaults: PersistedCaptureDefaults;

  // Active Configurations (Temporary for Current Capture unless Remembered)
  screenshotConfig: ScreenshotConfig;
  videoConfig: VideoConfig;
  gifConfig: GifConfig;

  // Canvas Selection Target State
  hoveredTarget: CaptureTarget | null;
  selectedTarget: CaptureTarget | null;

  // Custom Region & Countdown State
  customRect: CustomRect;
  countdownValue: number;

  // Recording Frontend UI State
  recordingStatus: RecordingStatus;
  recordingElapsedSeconds: number;
  errorMessage: string | null;

  // Menu Actions
  openCaptureMenu: () => void;
  closeCaptureMenu: () => void;
  toggleCaptureMenu: () => void;

  // Flow State Transitions
  selectCaptureType: (type: CaptureType, skipConfig?: boolean) => void;
  openConfigModal: (type: CaptureType) => void;
  selectScreenshotWithDestination: (destination: 'device' | 'clipboard') => void;
  proceedToSelection: () => void;
  cancelFlow: () => void;
  setRememberSettings: (type: CaptureType, enabled: boolean) => void;
  setGeneralRememberSettings: (enabled: boolean) => void;
  setCountdownValue: (n: number) => void;
  setCustomRect: (r: CustomRect) => void;

  // Temporary Capture Configuration Updaters
  updateScreenshotConfig: (updates: Partial<ScreenshotConfig>) => void;
  updateVideoConfig: (updates: Partial<VideoConfig>) => void;
  updateGifConfig: (updates: Partial<GifConfig>) => void;
  resetDefaultConfigs: () => void;

  // Persisted Defaults Updaters (Used by Settings UI)
  updatePersistedScreenshotDefaults: (updates: Partial<ScreenshotConfig>) => void;
  updatePersistedVideoDefaults: (updates: Partial<VideoConfig>) => void;
  updatePersistedGifDefaults: (updates: Partial<GifConfig>) => void;
  resetToPersistedDefaults: () => void;

  // Canvas Selection Actions
  setHoveredTarget: (target: CaptureTarget | null) => void;
  confirmTargetSelection: (target: CaptureTarget) => void;

  // Recording State Machine Actions (Frontend UI Only)
  pauseRecording: () => void;
  resumeRecording: () => void;
  stopRecording: () => void;
  cancelRecording: () => void;
  tickRecordingTimer: () => void;
  resetRecording: () => void;
  setRecordingError: (error: string) => void;

  // Screenshot Engine & Feedback UI State
  isCapturingScreenshot: boolean;
  latestScreenshotResult: ScreenshotResult | null;
  isScreenshotPreviewOpen: boolean;
  isSilentToastVisible: boolean;

  // Video Engine & Result State
  latestVideoResult: VideoResult | null;
  isVideoPreviewOpen: boolean;

  // Screenshot Engine Actions
  executeScreenshot: (target: CaptureTarget) => Promise<void>;
  openScreenshotPreview: () => void;
  closeScreenshotPreview: () => void;
  showSilentToast: () => void;
  dismissSilentToast: () => void;
  saveLatestScreenshot: () => void;
  copyLatestScreenshot: () => Promise<boolean>;
}

// ─── Zustand Store Implementation ────────────────────────────────────────────

const initialPersisted = loadPersistedCaptureDefaults();

export const useCaptureStore = create<CaptureState>((set, get) => ({
  isCaptureMenuOpen: false,
  flowStep: 'idle',
  activeCaptureType: 'screenshot',
  rememberSettings: { ...initialPersisted.rememberSettingsPerType },
  generalRememberSettings: initialPersisted.rememberSettings,
  persistedDefaults: initialPersisted,

  screenshotConfig: { ...initialPersisted.screenshot },
  videoConfig: { ...initialPersisted.video },
  gifConfig: { ...initialPersisted.gif },

  hoveredTarget: null,
  selectedTarget: null,
  customRect: { ...DEFAULT_CUSTOM_RECT },
  countdownValue: initialPersisted.video.countdownSeconds,

  recordingStatus: 'idle',
  recordingElapsedSeconds: 0,
  errorMessage: null,

  isCapturingScreenshot: false,
  latestScreenshotResult: null,
  isScreenshotPreviewOpen: false,
  isSilentToastVisible: false,

  latestVideoResult: null,
  isVideoPreviewOpen: false,

  // Menu Actions
  openCaptureMenu: () => {
    const { rememberSettings, persistedDefaults } = get();
    set((s) => ({
      isCaptureMenuOpen: true,
      screenshotConfig: rememberSettings.screenshot
        ? s.screenshotConfig
        : { ...persistedDefaults.screenshot },
      videoConfig: rememberSettings.video
        ? s.videoConfig
        : { ...persistedDefaults.video },
      gifConfig: rememberSettings.gif
        ? s.gifConfig
        : { ...persistedDefaults.gif },
    }));
  },
  closeCaptureMenu: () => set({ isCaptureMenuOpen: false }),
  toggleCaptureMenu: () => {
    const nextOpen = !get().isCaptureMenuOpen;
    if (nextOpen) {
      get().openCaptureMenu();
    } else {
      set({ isCaptureMenuOpen: false });
    }
  },

  // Flow State Transitions
  selectCaptureType: (type: CaptureType, skipConfig?: boolean) => {
    const { rememberSettings, persistedDefaults } = get();
    const isRemembered = rememberSettings[type];
    const shouldSkip = skipConfig ?? isRemembered;

    const configReset: Partial<CaptureState> = {};
    if (!isRemembered) {
      if (type === 'screenshot') configReset.screenshotConfig = { ...persistedDefaults.screenshot };
      if (type === 'video') configReset.videoConfig = { ...persistedDefaults.video };
      if (type === 'gif') configReset.gifConfig = { ...persistedDefaults.gif };
    }

    if (!shouldSkip) {
      set({
        ...configReset,
        activeCaptureType: type,
        isCaptureMenuOpen: false,
        flowStep: 'configuring',
        hoveredTarget: null,
        selectedTarget: null,
      });
      return;
    }

    set({ ...configReset, activeCaptureType: type, isCaptureMenuOpen: false });
    get().proceedToSelection();
  },

  openConfigModal: (type: CaptureType) => {
    const { rememberSettings, persistedDefaults } = get();
    const isRemembered = rememberSettings[type];
    const configReset: Partial<CaptureState> = {};
    if (!isRemembered) {
      if (type === 'screenshot') configReset.screenshotConfig = { ...persistedDefaults.screenshot };
      if (type === 'video') configReset.videoConfig = { ...persistedDefaults.video };
      if (type === 'gif') configReset.gifConfig = { ...persistedDefaults.gif };
    }

    set({
      ...configReset,
      activeCaptureType: type,
      isCaptureMenuOpen: false,
      flowStep: 'configuring',
      hoveredTarget: null,
      selectedTarget: null,
    });
  },

  selectScreenshotWithDestination: (destination: 'device' | 'clipboard') => {
    console.log('[Capture] Screenshot destination selected from dropdown:', destination);
    set((s) => ({
      activeCaptureType: 'screenshot',
      isCaptureMenuOpen: false,
      screenshotConfig: {
        ...s.screenshotConfig,
        saveToDevice: destination === 'device',
        copyToClipboard: destination === 'clipboard',
      },
    }));

    // In single chart mode, skip canvas selection overlay completely!
    if (isSingleChartMode()) {
      const target: CaptureTarget = { type: 'canvas', canvas: getSingleChartTarget() };
      get().confirmTargetSelection(target);
    } else {
      set({
        flowStep: 'selecting_canvas',
        hoveredTarget: null,
        selectedTarget: null,
      });
    }
  },

  proceedToSelection: () => {
    const { activeCaptureType, videoConfig } = get();

    // 1. Video with Custom Area: show resizable rectangle overlay
    if (activeCaptureType === 'video' && videoConfig.areaMode === 'custom') {
      set({
        flowStep: 'selecting_custom_region',
        hoveredTarget: null,
      });
      return;
    }

    // 2. Canvas Mode (Screenshot, GIF, or Video Canvas): Check if Single Chart Mode!
    if (isSingleChartMode()) {
      const target: CaptureTarget = { type: 'canvas', canvas: getSingleChartTarget() };
      if (activeCaptureType === 'video' && videoConfig.countdownSeconds > 0) {
        set({
          flowStep: 'countdown',
          selectedTarget: target,
          countdownValue: videoConfig.countdownSeconds,
          hoveredTarget: null,
        });
      } else {
        get().confirmTargetSelection(target);
      }
      return;
    }

    // 3. Multi-chart mode: interactive canvas selection overlay
    set({
      flowStep: 'selecting_canvas',
      hoveredTarget: null,
      selectedTarget: null,
    });
  },

  cancelFlow: () => {
    set({
      flowStep: 'idle',
      isCaptureMenuOpen: false,
      hoveredTarget: null,
      selectedTarget: null,
    });
  },

  setRememberSettings: (type: CaptureType, enabled: boolean) => {
    set((s) => {
      const nextMap = {
        ...s.rememberSettings,
        [type]: enabled,
      };
      const nextDefaults: PersistedCaptureDefaults = {
        ...s.persistedDefaults,
        rememberSettingsPerType: nextMap,
      };
      savePersistedCaptureDefaults(nextDefaults);
      return {
        rememberSettings: nextMap,
        persistedDefaults: nextDefaults,
      };
    });
  },

  setGeneralRememberSettings: (enabled: boolean) => {
    set((s) => {
      const nextMap = {
        screenshot: enabled,
        video: enabled,
        gif: enabled,
      };
      const nextDefaults: PersistedCaptureDefaults = {
        ...s.persistedDefaults,
        rememberSettings: enabled,
        rememberSettingsPerType: nextMap,
      };
      savePersistedCaptureDefaults(nextDefaults);
      return {
        generalRememberSettings: enabled,
        rememberSettings: nextMap,
        persistedDefaults: nextDefaults,
      };
    });
  },

  setCountdownValue: (n: number) => {
    set({ countdownValue: n });
  },

  setCustomRect: (r: CustomRect) => {
    set({ customRect: r });
  },

  // Temporary Capture Configuration Updaters
  updateScreenshotConfig: (updates: Partial<ScreenshotConfig>) => {
    set((s) => {
      const next = { ...s.screenshotConfig, ...updates };
      const shouldRemember = s.rememberSettings.screenshot;
      if (shouldRemember) {
        const nextDefaults: PersistedCaptureDefaults = {
          ...s.persistedDefaults,
          screenshot: next,
        };
        savePersistedCaptureDefaults(nextDefaults);
        return { screenshotConfig: next, persistedDefaults: nextDefaults };
      }
      return { screenshotConfig: next };
    });
  },

  updateVideoConfig: (updates: Partial<VideoConfig>) => {
    set((s) => {
      const next = { ...s.videoConfig, ...updates };
      const shouldRemember = s.rememberSettings.video;
      if (shouldRemember) {
        const nextDefaults: PersistedCaptureDefaults = {
          ...s.persistedDefaults,
          video: next,
        };
        savePersistedCaptureDefaults(nextDefaults);
        return { videoConfig: next, persistedDefaults: nextDefaults };
      }
      return { videoConfig: next };
    });
  },

  updateGifConfig: (updates: Partial<GifConfig>) => {
    set((s) => {
      const next = { ...s.gifConfig, ...updates };
      const shouldRemember = s.rememberSettings.gif;
      if (shouldRemember) {
        const nextDefaults: PersistedCaptureDefaults = {
          ...s.persistedDefaults,
          gif: next,
        };
        savePersistedCaptureDefaults(nextDefaults);
        return { gifConfig: next, persistedDefaults: nextDefaults };
      }
      return { gifConfig: next };
    });
  },

  // Persisted Defaults Updaters (Used by Settings UI)
  updatePersistedScreenshotDefaults: (updates: Partial<ScreenshotConfig>) => {
    set((s) => {
      const nextScreenshot = { ...s.persistedDefaults.screenshot, ...updates };
      const nextDefaults: PersistedCaptureDefaults = {
        ...s.persistedDefaults,
        screenshot: nextScreenshot,
      };
      savePersistedCaptureDefaults(nextDefaults);
      return {
        persistedDefaults: nextDefaults,
        screenshotConfig: { ...s.screenshotConfig, ...updates },
      };
    });
  },

  updatePersistedVideoDefaults: (updates: Partial<VideoConfig>) => {
    set((s) => {
      const nextVideo = { ...s.persistedDefaults.video, ...updates };
      const nextDefaults: PersistedCaptureDefaults = {
        ...s.persistedDefaults,
        video: nextVideo,
      };
      savePersistedCaptureDefaults(nextDefaults);
      return {
        persistedDefaults: nextDefaults,
        videoConfig: { ...s.videoConfig, ...updates },
      };
    });
  },

  updatePersistedGifDefaults: (updates: Partial<GifConfig>) => {
    set((s) => {
      const nextGif = { ...s.persistedDefaults.gif, ...updates };
      const nextDefaults: PersistedCaptureDefaults = {
        ...s.persistedDefaults,
        gif: nextGif,
      };
      savePersistedCaptureDefaults(nextDefaults);
      return {
        persistedDefaults: nextDefaults,
        gifConfig: { ...s.gifConfig, ...updates },
      };
    });
  },

  resetDefaultConfigs: () => {
    const { persistedDefaults } = get();
    set({
      screenshotConfig: { ...persistedDefaults.screenshot },
      videoConfig: { ...persistedDefaults.video },
      gifConfig: { ...persistedDefaults.gif },
      customRect: { ...DEFAULT_CUSTOM_RECT },
      countdownValue: persistedDefaults.video.countdownSeconds,
    });
  },

  resetToPersistedDefaults: () => {
    const fresh = resetPersistedCaptureDefaults();
    set({
      persistedDefaults: fresh,
      generalRememberSettings: false,
      rememberSettings: {
        screenshot: false,
        video: false,
        gif: false,
      },
      screenshotConfig: { ...fresh.screenshot },
      videoConfig: { ...fresh.video },
      gifConfig: { ...fresh.gif },
      customRect: { ...DEFAULT_CUSTOM_RECT },
      countdownValue: fresh.video.countdownSeconds,
    });
  },

  // Canvas Selection Actions
  setHoveredTarget: (target: CaptureTarget | null) => {
    set({ hoveredTarget: target });
  },

  confirmTargetSelection: (target: CaptureTarget) => {
    const { activeCaptureType } = get();

    set({
      selectedTarget: target,
      flowStep: 'idle',
      hoveredTarget: null,
    });

    let targetPayload: Record<string, unknown>;
    if (target.type === 'canvas') {
      targetPayload = {
        target: 'canvas',
        slot: target.canvas.slotIndex,
        symbol: target.canvas.symbol || undefined,
        timeframe: target.canvas.timeframe?.toUpperCase() || undefined,
      };
    } else if (target.type === 'custom') {
      targetPayload = {
        target: 'custom',
        rect: target.rect,
      };
    } else {
      targetPayload = {
        target: 'workspace',
      };
    }

    if (activeCaptureType === 'screenshot') {
      console.log('[Capture] Screenshot capture started', targetPayload);
      get().executeScreenshot(target);
    } else if (activeCaptureType === 'video') {
      console.log('[Capture] Video recording started', targetPayload);
      // Transition to recording frontend UI state
      set({
        recordingStatus: 'recording',
        recordingElapsedSeconds: 0,
        errorMessage: null,
      });
      // Trigger headless recording session via coordinator
      void startVideoRecordingSession(target);
    } else if (activeCaptureType === 'gif') {
      console.log('[Capture] GIF capture started', targetPayload);
    }
  },

  // Recording State Machine Actions (Frontend UI Only)
  pauseRecording: () => {
    console.log('[Capture] Recording paused');
    set({ recordingStatus: 'paused' });
  },

  resumeRecording: () => {
    console.log('[Capture] Recording resumed');
    set({ recordingStatus: 'recording' });
  },

  stopRecording: () => {
    console.log('[Capture] Video recording stopped');
    console.log('[Capture] Processing recording');
    set({ recordingStatus: 'processing' });
    setTimeout(() => {
      console.log('[Capture] Recording completed');
      set({ recordingStatus: 'completed' });
    }, 1200);
  },

  cancelRecording: () => {
    console.log('[Capture] Recording cancelled');
    set({
      recordingStatus: 'idle',
      recordingElapsedSeconds: 0,
      errorMessage: null,
      selectedTarget: null,
    });
  },

  tickRecordingTimer: () => {
    set((s) => ({ recordingElapsedSeconds: s.recordingElapsedSeconds + 1 }));
  },

  resetRecording: () => {
    set({
      recordingStatus: 'idle',
      recordingElapsedSeconds: 0,
      errorMessage: null,
    });
  },

  setRecordingError: (error: string) => {
    console.error('[Capture] Recording error:', error);
    set({
      recordingStatus: 'error',
      errorMessage: error,
    });
  },

  // Screenshot Engine Actions
  executeScreenshot: async (target: CaptureTarget) => {
    const config = get().screenshotConfig;
    set({ isCapturingScreenshot: true });

    try {
      const result = await captureScreenshot({
        target,
        format: config.format,
        quality: config.quality,
        resolutionScale: config.resolutionScale,
        includeWatermark: config.includeWatermark,
        saveToDevice: config.saveToDevice,
        copyToClipboard: config.copyToClipboard,
      });

      set({
        latestScreenshotResult: result,
        isScreenshotPreviewOpen: result.success && config.feedbackMode === 'preview',
        isSilentToastVisible: result.success && config.feedbackMode === 'silent',
      });
    } catch (err: unknown) {
      console.error('[Capture Store] Unexpected screenshot error:', err);
      set({
        latestScreenshotResult: {
          success: false,
          format: config.format,
          dimensions: { width: 0, height: 0 },
          target,
          saved: false,
          copied: false,
          error: err instanceof Error ? err.message : 'Unknown screenshot error',
        },
      });
    } finally {
      set({ isCapturingScreenshot: false });
    }
  },

  openScreenshotPreview: () => set({ isScreenshotPreviewOpen: true, isSilentToastVisible: false }),
  closeScreenshotPreview: () => {
    const { latestScreenshotResult } = get();
    if (latestScreenshotResult?.objectUrl) {
      URL.revokeObjectURL(latestScreenshotResult.objectUrl);
    }
    set({ isScreenshotPreviewOpen: false });
  },
  showSilentToast: () => set({ isSilentToastVisible: true }),
  dismissSilentToast: () => set({ isSilentToastVisible: false }),

  saveLatestScreenshot: () => {
    const result = get().latestScreenshotResult;
    if (!result?.blob || !result?.filename) return;
    saveBlobToDevice(result.blob, result.filename);
    set((s) => ({
      latestScreenshotResult: s.latestScreenshotResult
        ? { ...s.latestScreenshotResult, saved: true }
        : null,
    }));
  },

  copyLatestScreenshot: async () => {
    const result = get().latestScreenshotResult;
    if (!result?.blob) return false;
    const res = await copyBlobToClipboard(result.blob);
    if (res.copied) {
      set((s) => ({
        latestScreenshotResult: s.latestScreenshotResult
          ? { ...s.latestScreenshotResult, copied: true }
          : null,
      }));
      return true;
    }
    return false;
  },
}));
