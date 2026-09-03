import React from 'react';
import { Download, Copy, Sparkles, Sliders } from 'lucide-react';
import { useCaptureStore } from '../store/useCaptureStore';

export const ScreenshotSettingsView: React.FC = () => {
  const { screenshotConfig, updateScreenshotConfig } = useCaptureStore();

  const handleSelectOutput = (destination: 'device' | 'clipboard') => {
    updateScreenshotConfig({
      saveToDevice: destination === 'device',
      copyToClipboard: destination === 'clipboard',
    });
  };

  return (
    <div className="space-y-5 select-none text-left">
      {/* ─── OUTPUT DESTINATION ────────────────────────────────────────── */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-txt-muted mb-2">
          Output Destination
        </div>
        <div role="radiogroup" aria-label="Output Destination" className="grid grid-cols-2 gap-2">
          {/* Save to Device */}
          <button
            type="button"
            role="radio"
            aria-checked={screenshotConfig.saveToDevice}
            onClick={() => handleSelectOutput('device')}
            className={`flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all cursor-pointer ${
              screenshotConfig.saveToDevice
                ? 'bg-accent-muted border-accent/60 text-txt-primary ring-1 ring-accent/30 shadow-xs'
                : 'bg-surface hover:bg-surface-hover border-border-sub text-txt-muted hover:text-txt-primary'
            }`}
          >
            <Download className={`w-4 h-4 ${screenshotConfig.saveToDevice ? 'text-accent' : 'text-txt-muted'}`} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold leading-tight">Save to Device</div>
              <div className="text-[10px] text-txt-muted mt-0.5">Download file</div>
            </div>
          </button>

          {/* Copy to Clipboard */}
          <button
            type="button"
            role="radio"
            aria-checked={screenshotConfig.copyToClipboard}
            onClick={() => handleSelectOutput('clipboard')}
            className={`flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all cursor-pointer ${
              screenshotConfig.copyToClipboard
                ? 'bg-accent-muted border-accent/60 text-txt-primary ring-1 ring-accent/30 shadow-xs'
                : 'bg-surface hover:bg-surface-hover border-border-sub text-txt-muted hover:text-txt-primary'
            }`}
          >
            <Copy className={`w-4 h-4 ${screenshotConfig.copyToClipboard ? 'text-accent' : 'text-txt-muted'}`} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold leading-tight">Copy to Clipboard</div>
              <div className="text-[10px] text-txt-muted mt-0.5">Paste anywhere</div>
            </div>
          </button>
        </div>
      </div>

      {/* ─── FORMAT ────────────────────────────────────────────────────── */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-txt-muted mb-2">
          Image Format
        </div>
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-app-bg rounded-lg border border-border-sub">
          {(['png', 'jpeg', 'webp'] as const).map((fmt) => {
            const isActive = screenshotConfig.format === fmt;
            return (
              <button
                key={fmt}
                type="button"
                onClick={() => updateScreenshotConfig({ format: fmt })}
                className={`py-1.5 px-3 rounded-md text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                  isActive
                    ? 'bg-accent text-txt-inverse shadow-sm'
                    : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
                }`}
              >
                {fmt}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── QUALITY (Only for lossy formats: JPEG / WebP) ─────────────── */}
      {screenshotConfig.format !== 'png' && (
        <div className="animate-in fade-in duration-150">
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-txt-muted mb-2">
            <span className="flex items-center gap-1.5">
              <Sliders className="w-3 h-3" />
              Compression Quality
            </span>
            <span className="font-mono text-accent">
              {Math.round(screenshotConfig.quality * 100)}%
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="1.0"
            step="0.05"
            value={screenshotConfig.quality}
            onChange={(e) => updateScreenshotConfig({ quality: parseFloat(e.target.value) })}
            className="w-full accent-accent bg-surface-elevated h-1.5 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-txt-muted mt-1 font-mono">
            <span>50% (Compact)</span>
            <span>92% (Balanced)</span>
            <span>100% (Maximum)</span>
          </div>
        </div>
      )}

      {/* ─── RESOLUTION / SCALE ────────────────────────────────────────── */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-txt-muted mb-2">
          Resolution Scale
        </div>
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-app-bg rounded-lg border border-border-sub">
          {([
            { scale: 1, label: '1×', desc: 'Standard' },
            { scale: 2, label: '2×', desc: 'Retina / 2K' },
            { scale: 4, label: '4×', desc: 'Ultra HD / 4K' },
          ] as const).map(({ scale, label, desc }) => {
            const isActive = screenshotConfig.resolutionScale === scale;
            return (
              <button
                key={scale}
                type="button"
                onClick={() => updateScreenshotConfig({ resolutionScale: scale })}
                className={`py-1.5 px-2 rounded-md text-center transition-all cursor-pointer ${
                  isActive
                    ? 'bg-accent text-txt-inverse shadow-sm'
                    : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
                }`}
              >
                <div className="text-xs font-bold leading-tight">{label}</div>
                <div className={`text-[9px] ${isActive ? 'text-txt-inverse/80' : 'text-txt-muted'} mt-0.5`}>
                  {desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── WATERMARK ─────────────────────────────────────────────────── */}
      <div className="pt-1 border-t border-border-sub">
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <div>
              <div className="text-xs font-medium text-txt-primary">Watermark</div>
              <div className="text-[10px] text-txt-muted">Include FX Freeplay platform badge</div>
            </div>
          </div>
          <div
            role="switch"
            aria-checked={screenshotConfig.includeWatermark}
            onClick={() => updateScreenshotConfig({ includeWatermark: !screenshotConfig.includeWatermark })}
            className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors duration-200 ${
              screenshotConfig.includeWatermark ? 'bg-accent' : 'bg-surface-elevated border border-border-def'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full absolute top-[1px] left-[2px] transition-transform duration-200 ${
                screenshotConfig.includeWatermark ? 'bg-white translate-x-[16px]' : 'bg-txt-muted translate-x-0'
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
