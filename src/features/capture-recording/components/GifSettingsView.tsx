import React from 'react';
import { Repeat } from 'lucide-react';
import { useCaptureStore } from '../store/useCaptureStore';

export const GifSettingsView: React.FC = () => {
  const { gifConfig, updateGifConfig } = useCaptureStore();

  return (
    <div className="space-y-5 select-none text-left">
      {/* ─── FRAME RATE & QUALITY ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Frame Rate */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-txt-muted mb-2">
            Frame Rate
          </div>
          <div className="grid grid-cols-3 gap-1 p-1 bg-app-bg rounded-lg border border-border-sub">
            {([10, 15, 24] as const).map((fps) => {
              const isActive = gifConfig.fps === fps;
              return (
                <button
                  key={fps}
                  type="button"
                  onClick={() => updateGifConfig({ fps })}
                  className={`py-1.5 px-2 rounded-md text-xs font-semibold transition-all text-center cursor-pointer ${
                    isActive
                      ? 'bg-accent text-txt-inverse shadow-sm'
                      : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
                  }`}
                >
                  {fps} FPS
                </button>
              );
            })}
          </div>
        </div>

        {/* Quality Preset */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-txt-muted mb-2">
            Quality Preset
          </div>
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-app-bg rounded-lg border border-border-sub">
            {(['standard', 'high'] as const).map((q) => {
              const isActive = gifConfig.quality === q;
              return (
                <button
                  key={q}
                  type="button"
                  onClick={() => updateGifConfig({ quality: q })}
                  className={`py-1.5 px-3 rounded-md text-xs font-semibold capitalize transition-all text-center cursor-pointer ${
                    isActive
                      ? 'bg-accent text-txt-inverse shadow-sm'
                      : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
                  }`}
                >
                  {q}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── MAX DURATION ──────────────────────────────────────────────── */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-txt-muted mb-2">
          Maximum Duration
        </div>
        <div className="grid grid-cols-4 gap-1.5 p-1 bg-app-bg rounded-lg border border-border-sub">
          {([
            { val: 5, label: '5 Sec' },
            { val: 10, label: '10 Sec' },
            { val: 15, label: '15 Sec' },
            { val: 30, label: '30 Sec' },
          ] as const).map(({ val, label }) => {
            const isActive = gifConfig.maxDurationSeconds === val;
            return (
              <button
                key={val}
                type="button"
                onClick={() => updateGifConfig({ maxDurationSeconds: val })}
                className={`py-1.5 px-2 rounded-md text-xs font-semibold transition-all text-center cursor-pointer ${
                  isActive
                    ? 'bg-accent text-txt-inverse shadow-sm'
                    : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── RESOLUTION SCALE ──────────────────────────────────────────── */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-txt-muted mb-2">
          Resolution Scale
        </div>
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-app-bg rounded-lg border border-border-sub">
          {([
            { scale: 0.5, label: '0.5×', desc: 'Compact / Lightweight' },
            { scale: 0.75, label: '0.75×', desc: 'Medium / Balanced' },
            { scale: 1, label: '1×', desc: 'Full Resolution' },
          ] as const).map(({ scale, label, desc }) => {
            const isActive = gifConfig.resolutionScale === scale;
            return (
              <button
                key={scale}
                type="button"
                onClick={() => updateGifConfig({ resolutionScale: scale })}
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

      {/* ─── INFINITE LOOP TOGGLE ──────────────────────────────────────── */}
      <div className="pt-2 border-t border-border-sub">
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2">
            <Repeat className="w-4 h-4 text-purple-400" />
            <div>
              <div className="text-xs font-medium text-txt-primary">Continuous Loop</div>
              <div className="text-[10px] text-txt-muted">Play animated GIF indefinitely in loop</div>
            </div>
          </div>
          <div
            role="switch"
            aria-checked={gifConfig.loop}
            onClick={() => updateGifConfig({ loop: !gifConfig.loop })}
            className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors duration-200 ${
              gifConfig.loop ? 'bg-accent' : 'bg-surface-elevated border border-border-def'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full absolute top-[1px] left-[2px] transition-transform duration-200 ${
                gifConfig.loop ? 'bg-white translate-x-[16px]' : 'bg-txt-muted translate-x-0'
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
