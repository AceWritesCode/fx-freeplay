/**
 * Feature: Screenshot & Video Recording
 *
 * Standalone module providing screenshot, video recording, and GIF creation
 * workflows for individual chart canvases or the full workspace.
 */

export * from './types';
export * from './store/useCaptureStore';
export * from './components/CaptureButton';
export * from './components/CaptureModal';
export * from './components/ScreenshotSettingsView';
export * from './components/VideoSettingsView';
export * from './components/GifSettingsView';
export * from './components/CanvasSelectionOverlay';
export * from './components/CustomRegionOverlay';
export * from './components/CountdownOverlay';
export * from './components/RecordingFloatingBar';
export * from './components/CaptureSettingsTab';
export * from './components/ScreenshotPreviewModal';
export * from './components/ScreenshotSilentToast';
export * from './engine/screenshotEngine';
export * from './engine/videoEngine';
export * from './engine/compositorUtils';
export * from './engine/dynamicCaptureCompositor';
export * from './engine/mp4Converter';
export * from './coordinator/useScreenshotCoordinator';
export * from './coordinator/useVideoCoordinator';
export * from './utils/targetResolver';
export * from './utils/capturePersistence';
