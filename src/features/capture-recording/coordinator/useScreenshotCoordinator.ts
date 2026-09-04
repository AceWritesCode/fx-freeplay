import { useCaptureStore } from '../store/useCaptureStore';
import type { CaptureTarget } from '../types';

/**
 * Orchestrates screenshot capture execution via store and engine.
 */
export async function executeScreenshotCapture(target: CaptureTarget): Promise<void> {
  return useCaptureStore.getState().executeScreenshot(target);
}

/**
 * Manual Save trigger from Screenshot Preview UI.
 */
export function manualSaveScreenshot(): void {
  useCaptureStore.getState().saveLatestScreenshot();
}

/**
 * Manual Copy trigger from Screenshot Preview UI.
 */
export async function manualCopyScreenshot(): Promise<boolean> {
  return useCaptureStore.getState().copyLatestScreenshot();
}
