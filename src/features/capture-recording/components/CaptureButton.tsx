import React, { useEffect, useRef, useState } from 'react';
import { Camera, Video, Film, Download, Copy, Settings, ArrowLeft } from 'lucide-react';
import { useCaptureStore } from '../store/useCaptureStore';
import { CaptureModal } from './CaptureModal';
import { CanvasSelectionOverlay } from './CanvasSelectionOverlay';
import { CustomRegionOverlay } from './CustomRegionOverlay';
import { CountdownOverlay } from './CountdownOverlay';
import { ScreenshotPreviewModal } from './ScreenshotPreviewModal';
import { ScreenshotSilentToast } from './ScreenshotSilentToast';
import type { CaptureType } from '../types';

export const CaptureButton: React.FC = () => {
  const {
    isCaptureMenuOpen,
    toggleCaptureMenu,
    closeCaptureMenu,
    selectCaptureType,
    openConfigModal,
    selectScreenshotWithDestination,
    rememberSettings,
  } = useCaptureStore();

  const [menuView, setMenuView] = useState<'main' | 'screenshot_destination'>('main');
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle Escape key: if in sub-menu, go back to main; otherwise close menu
  useEffect(() => {
    if (!isCaptureMenuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        if (menuView === 'screenshot_destination') {
          setMenuView('main');
        } else {
          setMenuView('main');
          closeCaptureMenu();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isCaptureMenuOpen, menuView, closeCaptureMenu]);

  const handleToggleMenu = () => {
    setMenuView('main');
    toggleCaptureMenu();
  };

  const handleClose = () => {
    setMenuView('main');
    closeCaptureMenu();
  };

  const handleScreenshotClick = () => {
    if (rememberSettings.screenshot) {
      // Transition to screenshot destination options in the same menu container
      setMenuView('screenshot_destination');
    } else {
      console.log('[Capture] Type selected: screenshot');
      setMenuView('main');
      selectCaptureType('screenshot');
    }
  };

  const handleSelect = (type: CaptureType) => {
    console.log('[Capture] Type selected:', type);
    setMenuView('main');
    selectCaptureType(type);
  };

  const handleDestinationSelect = (destination: 'device' | 'clipboard') => {
    setMenuView('main');
    selectScreenshotWithDestination(destination);
  };

  return (
    <>
      <div ref={containerRef} className="relative">
        {/* Main Capture Entry Button */}
        <button
          onClick={handleToggleMenu}
          aria-label="Capture & Recording"
          aria-expanded={isCaptureMenuOpen}
          aria-haspopup="true"
          title="Capture & Recording (Screenshot, Video, GIF)"
          className={`p-2 rounded-lg transition-all cursor-pointer border ${
            isCaptureMenuOpen
              ? 'bg-surface-hover text-accent border-accent/40 shadow-sm'
              : 'bg-surface hover:bg-surface-hover text-txt-muted hover:text-txt-primary border-border-sub'
          }`}
        >
          <Camera className="w-4 h-4" />
        </button>

        {/* Popover Menu */}
        {isCaptureMenuOpen && (
          <>
            {/* Dismiss backdrop - clicking anywhere outside closes and cancels */}
            <div
              className="fixed inset-0 z-30 cursor-default"
              onClick={handleClose}
            />

            {/* Menu Dropdown Container */}
            <div
              role="menu"
              aria-label="Capture options"
              className="absolute top-full right-0 mt-1.5 z-40 w-72 bg-surface border border-border-def rounded-xl shadow-2xl p-2 flex flex-col gap-1 text-left select-none animate-in fade-in zoom-in-95 duration-100"
            >
              {menuView === 'main' ? (
                /* ─── MAIN MENU: Screenshot, Video, GIF ───────────────── */
                <>
                  {/* Header label */}
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-txt-muted flex items-center justify-between">
                    <span>Capture & Recording</span>
                  </div>
                  <div className="h-px bg-border-sub mb-0.5" />

                  {/* Option 1: Screenshot */}
                  <div className="flex items-center group rounded-lg hover:bg-surface-hover transition-colors">
                    <button
                      role="menuitem"
                      onClick={handleScreenshotClick}
                      className="flex-1 flex items-start gap-3 p-2 text-left cursor-pointer min-w-0"
                    >
                      <div className="p-1.5 rounded-md bg-surface-elevated group-hover:bg-accent-muted border border-border-sub text-txt-secondary group-hover:text-accent flex-shrink-0 transition-colors">
                        <Camera className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-txt-primary group-hover:text-accent transition-colors">
                          Screenshot
                        </div>
                        <div className="text-[11px] text-txt-muted leading-snug mt-0.5">
                          {rememberSettings.screenshot
                            ? 'Select output destination...'
                            : 'Capture the selected chart or workspace'}
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      title="Configure Screenshot Settings"
                      onClick={(e) => {
                        e.stopPropagation();
                        openConfigModal('screenshot');
                      }}
                      className="p-1.5 mr-1.5 rounded-md text-txt-muted hover:text-txt-primary hover:bg-surface-elevated transition-colors cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Option 2: Video Recording */}
                  <div className="flex items-center group rounded-lg hover:bg-surface-hover transition-colors">
                    <button
                      role="menuitem"
                      onClick={() => handleSelect('video')}
                      className="flex-1 flex items-start gap-3 p-2 text-left cursor-pointer min-w-0"
                    >
                      <div className="p-1.5 rounded-md bg-surface-elevated group-hover:bg-accent-muted border border-border-sub text-txt-secondary group-hover:text-accent flex-shrink-0 transition-colors">
                        <Video className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-txt-primary group-hover:text-accent transition-colors">
                          Video
                        </div>
                        <div className="text-[11px] text-txt-muted leading-snug mt-0.5">
                          {rememberSettings.video
                            ? 'Record with saved preferences'
                            : 'Record the selected chart or workspace'}
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      title="Configure Video Settings"
                      onClick={(e) => {
                        e.stopPropagation();
                        openConfigModal('video');
                      }}
                      className="p-1.5 mr-1.5 rounded-md text-txt-muted hover:text-txt-primary hover:bg-surface-elevated transition-colors cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Option 3: GIF Creation */}
                  <div className="flex items-center group rounded-lg hover:bg-surface-hover transition-colors">
                    <button
                      role="menuitem"
                      onClick={() => handleSelect('gif')}
                      className="flex-1 flex items-start gap-3 p-2 text-left cursor-pointer min-w-0"
                    >
                      <div className="p-1.5 rounded-md bg-surface-elevated group-hover:bg-accent-muted border border-border-sub text-txt-secondary group-hover:text-accent flex-shrink-0 transition-colors">
                        <Film className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-txt-primary group-hover:text-accent transition-colors">
                          GIF
                        </div>
                        <div className="text-[11px] text-txt-muted leading-snug mt-0.5">
                          {rememberSettings.gif
                            ? 'Create GIF with saved preferences'
                            : 'Create an animated GIF'}
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      title="Configure GIF Settings"
                      onClick={(e) => {
                        e.stopPropagation();
                        openConfigModal('gif');
                      }}
                      className="p-1.5 mr-1.5 rounded-md text-txt-muted hover:text-txt-primary hover:bg-surface-elevated transition-colors cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              ) : (
                /* ─── SCREENSHOT DESTINATION MENU: Save to Device, Copy to Clipboard ─── */
                <>
                  {/* Header with back navigation button */}
                  <div className="px-1 py-1 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setMenuView('main')}
                      className="flex items-center gap-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-txt-muted hover:text-txt-primary hover:bg-surface-elevated transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-3 h-3" />
                      <span>Screenshot Destination</span>
                    </button>
                    <button
                      type="button"
                      title="Configure Screenshot Settings"
                      onClick={() => openConfigModal('screenshot')}
                      className="p-1 rounded text-txt-muted hover:text-txt-primary hover:bg-surface-elevated transition-colors cursor-pointer"
                    >
                      <Settings className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="h-px bg-border-sub mb-0.5" />

                  {/* Destination 1: Save to Device */}
                  <button
                    role="menuitem"
                    onClick={() => handleDestinationSelect('device')}
                    className="w-full flex items-start gap-3 p-2 rounded-lg hover:bg-surface-hover transition-colors text-left group cursor-pointer"
                  >
                    <div className="p-1.5 rounded-md bg-surface-elevated group-hover:bg-accent-muted border border-border-sub text-txt-secondary group-hover:text-accent flex-shrink-0 transition-colors">
                      <Download className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-txt-primary group-hover:text-accent transition-colors">
                        Save to Device
                      </div>
                      <div className="text-[11px] text-txt-muted leading-snug mt-0.5">
                        Download image file directly to disk
                      </div>
                    </div>
                  </button>

                  {/* Destination 2: Copy to Clipboard */}
                  <button
                    role="menuitem"
                    onClick={() => handleDestinationSelect('clipboard')}
                    className="w-full flex items-start gap-3 p-2 rounded-lg hover:bg-surface-hover transition-colors text-left group cursor-pointer"
                  >
                    <div className="p-1.5 rounded-md bg-surface-elevated group-hover:bg-accent-muted border border-border-sub text-txt-secondary group-hover:text-accent flex-shrink-0 transition-colors">
                      <Copy className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-txt-primary group-hover:text-accent transition-colors">
                        Copy to Clipboard
                      </div>
                      <div className="text-[11px] text-txt-muted leading-snug mt-0.5">
                        Copy image directly to clipboard
                      </div>
                    </div>
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>

      {/* Type-Specific Configuration Modal */}
      <CaptureModal />

      {/* Interactive Canvas Selection Overlay */}
      <CanvasSelectionOverlay />

      {/* Custom Resizable Region Selection Overlay */}
      <CustomRegionOverlay />

      {/* Countdown Overlay */}
      <CountdownOverlay />

      {/* Screenshot Result Feedback Overlays */}
      <ScreenshotPreviewModal />
      <ScreenshotSilentToast />
    </>
  );
};
