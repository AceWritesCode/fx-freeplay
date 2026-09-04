import React, { useState } from 'react';
import { Camera, Video, Film, RotateCcw, Check, Bookmark, HelpCircle } from 'lucide-react';
import { useCaptureStore } from '../store/useCaptureStore';
import type {
  CaptureType,
  VideoCaptureArea,
} from '../types';

// ─── Custom UI Helper Components ─────────────────────────────────────────────

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  title?: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, disabled, title }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    disabled={disabled}
    title={title}
    onClick={() => onChange(!checked)}
    className={`w-9 h-5 rounded-full transition-colors duration-200 relative flex-shrink-0 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
      checked ? 'bg-accent' : 'bg-surface-elevated border border-border-def'
    }`}
  >
    <span
      className={`block w-3.5 h-3.5 rounded-full bg-txt-inverse transition-transform duration-200 shadow-sm ${
        checked ? 'translate-x-[18px]' : 'translate-x-[3px]'
      }`}
    />
  </button>
);

interface SegmentedChoiceProps<T extends string | number> {
  value: T;
  onChange: (val: T) => void;
  options: { label: string; value: T; desc?: string }[];
  disabled?: boolean;
}

function SegmentedChoice<T extends string | number>({
  value,
  onChange,
  options,
  disabled,
}: SegmentedChoiceProps<T>) {
  return (
    <div className="flex items-center p-0.5 rounded-lg bg-surface border border-border-def gap-0.5">
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <button
            key={String(opt.value)}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            title={opt.desc}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap ${
              isSelected
                ? 'bg-accent text-txt-inverse shadow-xs'
                : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export const CaptureSettingsTab: React.FC = () => {
  const {
    persistedDefaults,
    rememberSettings,
    setRememberSettings,
    updatePersistedScreenshotDefaults,
    updatePersistedVideoDefaults,
    updatePersistedGifDefaults,
    resetToPersistedDefaults,
  } = useCaptureStore();

  const [activeSubTab, setActiveSubTab] = useState<CaptureType>('screenshot');
  const [resetFeedback, setResetFeedback] = useState(false);

  const handleReset = () => {
    resetToPersistedDefaults();
    setResetFeedback(true);
    setTimeout(() => setResetFeedback(false), 2500);
  };

  const { screenshot, video, gif } = persistedDefaults;

  return (
    <div className="flex flex-col gap-5 select-none text-xs text-txt-secondary pb-4">
      {/* ─── TAB HEADER ─────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-border-sub pb-3">
        <div>
          <h3 className="text-sm font-semibold text-txt-primary">Capture & Recording</h3>
          <p className="text-[11px] text-txt-muted mt-0.5">
            Configure persisted defaults and independent remember rules for each capture mode.
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="px-3 py-1.5 text-xs font-semibold text-txt-muted hover:text-txt-primary hover:bg-surface-hover border border-border-def rounded-lg flex items-center gap-1.5 cursor-pointer transition-all active:scale-95 flex-shrink-0"
          title="Reset all capture settings and remember preferences to factory defaults"
        >
          {resetFeedback ? (
            <>
              <Check className="w-3.5 h-3.5 text-status-success" />
              <span className="text-status-success font-bold">Defaults Restored</span>
            </>
          ) : (
            <>
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset All Defaults</span>
            </>
          )}
        </button>
      </div>

      {/* ─── SUB-TAB SEGMENTED SWITCHER ─────────────────────────────── */}
      <div className="flex items-center p-1 bg-surface border border-border-sub rounded-xl gap-1">
        <button
          type="button"
          onClick={() => setActiveSubTab('screenshot')}
          className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeSubTab === 'screenshot'
              ? 'bg-modal-bg text-txt-primary shadow-xs border border-border-def font-bold'
              : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover/50'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Screenshot</span>
          {rememberSettings.screenshot && (
            <span className="w-1.5 h-1.5 rounded-full bg-accent" title="Remember settings active" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('video')}
          className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeSubTab === 'video'
              ? 'bg-modal-bg text-txt-primary shadow-xs border border-border-def font-bold'
              : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover/50'
          }`}
        >
          <Video className="w-3.5 h-3.5" />
          <span>Video Recording</span>
          {rememberSettings.video && (
            <span className="w-1.5 h-1.5 rounded-full bg-accent" title="Remember settings active" />
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('gif')}
          className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
            activeSubTab === 'gif'
              ? 'bg-modal-bg text-txt-primary shadow-xs border border-border-def font-bold'
              : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover/50'
          }`}
        >
          <Film className="w-3.5 h-3.5" />
          <span>GIF Animation</span>
          {rememberSettings.gif && (
            <span className="w-1.5 h-1.5 rounded-full bg-accent" title="Remember settings active" />
          )}
        </button>
      </div>

      {/* ─── 1. SCREENSHOT TAB CONTENT ──────────────────────────────── */}
      {activeSubTab === 'screenshot' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-150">
          {/* Dedicated Individual Remember Setting Card */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-surface/70 border border-border-sub hover:border-border-def transition-colors">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg border transition-colors ${
                  rememberSettings.screenshot
                    ? 'bg-accent-muted text-accent border-accent/30'
                    : 'bg-surface-elevated text-txt-muted border-border-sub'
                }`}
              >
                <Bookmark className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-txt-primary">Remember Screenshot Settings</div>
                <p className="text-[11px] text-txt-muted mt-0.5">
                  When enabled, any tweaks made during screenshot capture automatically become the defaults.
                </p>
              </div>
            </div>
            <ToggleSwitch
              checked={rememberSettings.screenshot}
              onChange={(val) => setRememberSettings('screenshot', val)}
              title="Toggle remember screenshot settings"
            />
          </div>

          {/* Screenshot Settings Group Card */}
          <div className="p-4 bg-surface/40 border border-border-sub rounded-xl flex flex-col gap-4">
            {/* Format */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-txt-primary font-medium">Image Format</span>
                <p className="text-[11px] text-txt-muted">Encoding compression standard</p>
              </div>
              <SegmentedChoice
                value={screenshot.format}
                onChange={(val) => updatePersistedScreenshotDefaults({ format: val })}
                options={[
                  {
                    label: 'PNG (Lossless)',
                    value: 'png',
                    desc: 'PNG — Lossless: Best for charts, text, drawings, and maximum image quality with zero artifacts. Larger file size.',
                  },
                  {
                    label: 'JPEG',
                    value: 'jpeg',
                    desc: 'JPEG — Smaller File: Best for sharing or quick export when storage/bandwidth matters. Minor lossy compression.',
                  },
                  {
                    label: 'WebP',
                    value: 'webp',
                    desc: 'WebP — Modern & Compact: High-efficiency modern web standard offering crisp visuals with superior compression.',
                  },
                ]}
              />
            </div>

            {/* Quality (JPEG / WebP only) */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span
                  className={`font-medium ${
                    screenshot.format === 'png' ? 'text-txt-muted' : 'text-txt-primary'
                  }`}
                >
                  Quality
                </span>
                {screenshot.format === 'png' && (
                  <span title="PNG is lossless. Quality compression only applies to JPEG and WebP.">
                    <HelpCircle className="w-3.5 h-3.5 text-txt-muted cursor-help" />
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.01"
                  disabled={screenshot.format === 'png'}
                  value={screenshot.quality}
                  onChange={(e) =>
                    updatePersistedScreenshotDefaults({ quality: parseFloat(e.target.value) })
                  }
                  className="w-32 h-1.5 bg-surface-elevated rounded-lg appearance-none cursor-pointer accent-accent disabled:opacity-30 disabled:cursor-not-allowed"
                />
                <span
                  className={`w-12 text-right font-mono text-xs ${
                    screenshot.format === 'png' ? 'text-txt-muted' : 'text-accent font-bold'
                  }`}
                >
                  {screenshot.format === 'png' ? 'Lossless' : `${Math.round(screenshot.quality * 100)}%`}
                </span>
              </div>
            </div>

            {/* Resolution Scale */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-txt-primary font-medium">Resolution Scale</span>
                <p className="text-[11px] text-txt-muted">Pixel density multiplier for high-DPI crispness</p>
              </div>
              <SegmentedChoice
                value={screenshot.resolutionScale}
                onChange={(val) => updatePersistedScreenshotDefaults({ resolutionScale: val })}
                options={[
                  { label: '1x Standard', value: 1 },
                  { label: '2x Retina', value: 2 },
                  { label: '4x Ultra HD', value: 4 },
                ]}
              />
            </div>

            {/* Screenshot Feedback Mode */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-txt-primary font-medium">Screenshot Feedback</span>
                <p className="text-[11px] text-txt-muted">Preview modal vs silent footer confirmation</p>
              </div>
              <SegmentedChoice
                value={screenshot.feedbackMode || 'preview'}
                onChange={(val) => updatePersistedScreenshotDefaults({ feedbackMode: val })}
                options={[
                  { label: 'Preview', value: 'preview', desc: 'Show captured screenshot immediately' },
                  { label: 'Silent', value: 'silent', desc: 'Show small confirmation in footer' },
                ]}
              />
            </div>

            <div className="h-px bg-border-sub" />

            {/* Default Destination: Save to Device */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-txt-primary font-medium">Save to Device</span>
                <p className="text-[11px] text-txt-muted">Prompt file download on capture</p>
              </div>
              <ToggleSwitch
                checked={screenshot.saveToDevice}
                onChange={(val) => updatePersistedScreenshotDefaults({ saveToDevice: val })}
              />
            </div>

            {/* Default Destination: Copy to Clipboard */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-txt-primary font-medium">Copy to Clipboard</span>
                <p className="text-[11px] text-txt-muted">Copy captured image directly to system clipboard</p>
              </div>
              <ToggleSwitch
                checked={screenshot.copyToClipboard}
                onChange={(val) => updatePersistedScreenshotDefaults({ copyToClipboard: val })}
              />
            </div>

            {/* Watermark */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-txt-primary font-medium">Include Watermark</span>
                <p className="text-[11px] text-txt-muted">Render symbol, timeframe, and platform stamp</p>
              </div>
              <ToggleSwitch
                checked={screenshot.includeWatermark}
                onChange={(val) => updatePersistedScreenshotDefaults({ includeWatermark: val })}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── 2. VIDEO TAB CONTENT ───────────────────────────────────── */}
      {activeSubTab === 'video' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-150">
          {/* Dedicated Individual Remember Setting Card */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-surface/70 border border-border-sub hover:border-border-def transition-colors">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg border transition-colors ${
                  rememberSettings.video
                    ? 'bg-accent-muted text-accent border-accent/30'
                    : 'bg-surface-elevated text-txt-muted border-border-sub'
                }`}
              >
                <Bookmark className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-txt-primary">Remember Video Settings</div>
                <p className="text-[11px] text-txt-muted mt-0.5">
                  When enabled, recording area, FPS, and format choices automatically persist for future recordings.
                </p>
              </div>
            </div>
            <ToggleSwitch
              checked={rememberSettings.video}
              onChange={(val) => setRememberSettings('video', val)}
              title="Toggle remember video settings"
            />
          </div>

          {/* Video Settings Group Card */}
          <div className="p-4 bg-surface/40 border border-border-sub rounded-xl flex flex-col gap-4">
            {/* Recording Area */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-txt-primary font-medium">Recording Area</span>
                <p className="text-[11px] text-txt-muted">Default target region for video capture</p>
              </div>
              <SegmentedChoice<VideoCaptureArea>
                value={video.areaMode}
                onChange={(val) => updatePersistedVideoDefaults({ areaMode: val })}
                options={[
                  { label: 'Chart Canvas', value: 'canvas' },
                  { label: 'Custom Region', value: 'custom' },
                ]}
              />
            </div>

            {/* Video Format */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-txt-primary font-medium">Video Container Format</span>
                <p className="text-[11px] text-txt-muted">Output container format</p>
              </div>
              <SegmentedChoice
                value={video.format}
                onChange={(val) => updatePersistedVideoDefaults({ format: val })}
                options={[
                  { label: 'WebM (Native)', value: 'webm' },
                  { label: 'MP4 (Compatible)', value: 'mp4' },
                ]}
              />
            </div>

            {/* Resolution */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-txt-primary font-medium">Video Resolution</span>
                <p className="text-[11px] text-txt-muted">Target capture dimensions</p>
              </div>
              <SegmentedChoice
                value={video.resolution}
                onChange={(val) => updatePersistedVideoDefaults({ resolution: val })}
                options={[
                  { label: '720p', value: '720p' },
                  { label: '1080p Full HD', value: '1080p' },
                  { label: '4K Ultra HD', value: '4k' },
                ]}
              />
            </div>

            {/* Frame Rate (FPS) */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-txt-primary font-medium">Frame Rate</span>
                <p className="text-[11px] text-txt-muted">Frames captured per second</p>
              </div>
              <SegmentedChoice
                value={video.fps}
                onChange={(val) => updatePersistedVideoDefaults({ fps: val })}
                options={[
                  { label: '30 FPS', value: 30 },
                  { label: '60 FPS (Smooth)', value: 60 },
                ]}
              />
            </div>

            {/* Quality */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-txt-primary font-medium">Quality Profile</span>
                <p className="text-[11px] text-txt-muted">Bitrate encoding preset</p>
              </div>
              <SegmentedChoice
                value={video.quality}
                onChange={(val) => updatePersistedVideoDefaults({ quality: val })}
                options={[
                  { label: 'Standard', value: 'standard' },
                  { label: 'High', value: 'high' },
                  { label: 'Ultra', value: 'ultra' },
                ]}
              />
            </div>

            {/* Countdown Delay */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-txt-primary font-medium">Countdown Delay</span>
                <p className="text-[11px] text-txt-muted">Lead-in timer before recording starts</p>
              </div>
              <SegmentedChoice
                value={video.countdownSeconds}
                onChange={(val) => updatePersistedVideoDefaults({ countdownSeconds: val })}
                options={[
                  { label: '0s (Immediate)', value: 0 },
                  { label: '3 Seconds', value: 3 },
                  { label: '5 Seconds', value: 5 },
                ]}
              />
            </div>

            <div className="h-px bg-border-sub" />

            {/* Microphone */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-txt-primary font-medium">Microphone Audio</span>
                <p className="text-[11px] text-txt-muted">Include voice audio commentary with recording</p>
              </div>
              <ToggleSwitch
                checked={video.includeMicrophone}
                onChange={(val) => updatePersistedVideoDefaults({ includeMicrophone: val })}
              />
            </div>
          </div>
        </div>
      )}

      {/* ─── 3. GIF TAB CONTENT ─────────────────────────────────────── */}
      {activeSubTab === 'gif' && (
        <div className="flex flex-col gap-4 animate-in fade-in duration-150">
          {/* Dedicated Individual Remember Setting Card */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-surface/70 border border-border-sub hover:border-border-def transition-colors">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg border transition-colors ${
                  rememberSettings.gif
                    ? 'bg-accent-muted text-accent border-accent/30'
                    : 'bg-surface-elevated text-txt-muted border-border-sub'
                }`}
              >
                <Bookmark className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-bold text-txt-primary">Remember GIF Settings</div>
                <p className="text-[11px] text-txt-muted mt-0.5">
                  When enabled, FPS, duration, and resolution choices automatically persist for future GIF creations.
                </p>
              </div>
            </div>
            <ToggleSwitch
              checked={rememberSettings.gif}
              onChange={(val) => setRememberSettings('gif', val)}
              title="Toggle remember GIF settings"
            />
          </div>

          {/* GIF Settings Group Card */}
          <div className="p-4 bg-surface/40 border border-border-sub rounded-xl flex flex-col gap-4">
            {/* Frame Rate (FPS) */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-txt-primary font-medium">Frame Rate</span>
                <p className="text-[11px] text-txt-muted">Balance between smoothness and file size</p>
              </div>
              <SegmentedChoice
                value={gif.fps}
                onChange={(val) => updatePersistedGifDefaults({ fps: val })}
                options={[
                  { label: '10 FPS', value: 10 },
                  { label: '15 FPS', value: 15 },
                  { label: '24 FPS', value: 24 },
                ]}
              />
            </div>

            {/* Quality */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-txt-primary font-medium">Color Palette Quality</span>
                <p className="text-[11px] text-txt-muted">Palette quantization and dithering quality</p>
              </div>
              <SegmentedChoice
                value={gif.quality}
                onChange={(val) => updatePersistedGifDefaults({ quality: val })}
                options={[
                  { label: 'Standard (Compact)', value: 'standard' },
                  { label: 'High (Vibrant)', value: 'high' },
                ]}
              />
            </div>

            {/* Maximum Duration */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-txt-primary font-medium">Maximum Duration</span>
                <p className="text-[11px] text-txt-muted">Maximum clip length before auto-completion</p>
              </div>
              <SegmentedChoice
                value={gif.maxDurationSeconds}
                onChange={(val) => updatePersistedGifDefaults({ maxDurationSeconds: val })}
                options={[
                  { label: '5s', value: 5 },
                  { label: '10s', value: 10 },
                  { label: '15s', value: 15 },
                  { label: '30s', value: 30 },
                ]}
              />
            </div>

            {/* Resolution Scale */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-txt-primary font-medium">Resolution Scale</span>
                <p className="text-[11px] text-txt-muted">Downscale factor to control GIF byte size</p>
              </div>
              <SegmentedChoice
                value={gif.resolutionScale}
                onChange={(val) => updatePersistedGifDefaults({ resolutionScale: val })}
                options={[
                  { label: '0.5x (Compact)', value: 0.5 },
                  { label: '0.75x (Balanced)', value: 0.75 },
                  { label: '1x (Full 1:1)', value: 1 },
                ]}
              />
            </div>

            <div className="h-px bg-border-sub" />

            {/* Looping */}
            <div className="flex items-center justify-between">
              <div>
                <span className="text-txt-primary font-medium">Looping</span>
                <p className="text-[11px] text-txt-muted">Repeat animation indefinitely in browsers and viewers</p>
              </div>
              <ToggleSwitch
                checked={gif.loop}
                onChange={(val) => updatePersistedGifDefaults({ loop: val })}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
