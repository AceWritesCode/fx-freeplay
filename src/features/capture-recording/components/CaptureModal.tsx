import React, { useEffect } from 'react';
import { Camera, Video, Film, X, ArrowRight, Bookmark } from 'lucide-react';
import { useCaptureStore } from '../store/useCaptureStore';
import { ScreenshotSettingsView } from './ScreenshotSettingsView';
import { VideoSettingsView } from './VideoSettingsView';
import { GifSettingsView } from './GifSettingsView';

export const CaptureModal: React.FC = () => {
  const {
    flowStep,
    activeCaptureType,
    rememberSettings,
    setRememberSettings,
    cancelFlow,
    proceedToSelection,
  } = useCaptureStore();

  const isOpen = flowStep === 'configuring';

  // Handle Escape key to cancel configuration flow
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        cancelFlow();
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, cancelFlow]);

  if (!isOpen) return null;

  const headerDetails = {
    screenshot: {
      icon: <Camera className="w-5 h-5 text-accent" />,
      title: 'Screenshot Configuration',
      subtitle: 'Customize image format, resolution, and output destinations',
    },
    video: {
      icon: <Video className="w-5 h-5 text-status-success" />,
      title: 'Video Recording Configuration',
      subtitle: 'Configure container format, frame rate, and audio commentary',
    },
    gif: {
      icon: <Film className="w-5 h-5 text-purple-400" />,
      title: 'GIF Creation Configuration',
      subtitle: 'Set animation duration, frame rate, and continuous loop behavior',
    },
  }[activeCaptureType];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay-bg backdrop-blur-xs font-sans p-4 overflow-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          cancelFlow();
        }
      }}
    >
      <div className="bg-modal-bg border border-border-def rounded-xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col text-txt-secondary animate-in zoom-in-95 duration-150">
        {/* ─── MODAL HEADER ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-sub bg-surface">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-surface-elevated rounded-lg border border-border-sub flex-shrink-0">
              {headerDetails.icon}
            </div>
            <div>
              <h2 className="text-sm font-bold text-txt-primary tracking-tight leading-tight">
                {headerDetails.title}
              </h2>
              <p className="text-[11px] text-txt-muted mt-0.5">
                {headerDetails.subtitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={cancelFlow}
            aria-label="Close dialog"
            className="text-txt-muted hover:text-txt-primary hover:bg-surface-hover p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ─── MODAL BODY (Type-Specific View) ─────────────────────────── */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {activeCaptureType === 'screenshot' && <ScreenshotSettingsView />}
          {activeCaptureType === 'video' && <VideoSettingsView />}
          {activeCaptureType === 'gif' && <GifSettingsView />}
        </div>

        {/* ─── MODAL FOOTER ─────────────────────────────────────────────── */}
        <div className="px-6 py-3.5 border-t border-border-sub bg-surface flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Remember Settings Toggle (Per-Type) */}
          <div
            onClick={() => setRememberSettings(activeCaptureType, !rememberSettings[activeCaptureType])}
            className="flex items-center gap-2 cursor-pointer select-none group"
            title={`Remember settings for ${activeCaptureType}`}
          >
            <Bookmark className={`w-3.5 h-3.5 transition-colors ${rememberSettings[activeCaptureType] ? 'text-accent' : 'text-txt-muted group-hover:text-txt-primary'}`} />
            <span className="text-xs font-medium text-txt-muted group-hover:text-txt-primary transition-colors">
              Remember {activeCaptureType} settings
            </span>
            <div
              role="switch"
              aria-checked={rememberSettings[activeCaptureType]}
              className={`w-7 h-4 rounded-full relative ml-1 transition-colors duration-200 ${
                rememberSettings[activeCaptureType] ? 'bg-accent' : 'bg-surface-elevated border border-border-def'
              }`}
            >
              <div
                className={`w-3 h-3 rounded-full absolute top-[1px] left-[1px] transition-transform duration-200 ${
                  rememberSettings[activeCaptureType] ? 'bg-white translate-x-[13px]' : 'bg-txt-muted translate-x-0'
                }`}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={cancelFlow}
              className="px-4 py-2 text-xs font-semibold text-txt-secondary hover:text-txt-primary hover:bg-surface-hover rounded-lg transition-colors cursor-pointer border border-transparent hover:border-border-sub"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={proceedToSelection}
              className="flex items-center gap-1.5 px-4 py-2 bg-accent hover:bg-accent-hover text-txt-inverse rounded-lg text-xs font-bold shadow-md transition-all cursor-pointer"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
