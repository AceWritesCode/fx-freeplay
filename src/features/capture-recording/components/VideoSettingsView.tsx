import React from 'react';
import { Mic, Clock, LayoutGrid, Monitor, Crop } from 'lucide-react';
import { useCaptureStore } from '../store/useCaptureStore';

export const VideoSettingsView: React.FC = () => {
  const { videoConfig, updateVideoConfig } = useCaptureStore();

  return (
    <div className="space-y-5 select-none text-left">
      {/* ─── RECORDING AREA ────────────────────────────────────────────── */}
      <div>
        <div className="text-[10px] font-bold uppercase tracking-wider text-txt-muted mb-2">
          Recording Area
        </div>
        <div className="grid grid-cols-3 gap-2">
          {/* Option 1: Canvas */}
          <button
            type="button"
            onClick={() => updateVideoConfig({ areaMode: 'canvas' })}
            className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
              videoConfig.areaMode === 'canvas'
                ? 'bg-accent-muted border-accent/60 text-txt-primary ring-1 ring-accent/30 shadow-xs'
                : 'bg-surface hover:bg-surface-hover border-border-sub text-txt-muted hover:text-txt-primary'
            }`}
          >
            <LayoutGrid className={`w-4 h-4 mb-1.5 ${videoConfig.areaMode === 'canvas' ? 'text-accent' : 'text-txt-muted'}`} />
            <div className="text-xs font-semibold leading-tight">Chart Canvas</div>
            <div className="text-[10px] text-txt-muted mt-0.5">Chart or workspace</div>
          </button>

          {/* Option 2: Full Screen */}
          <button
            type="button"
            onClick={() => updateVideoConfig({ areaMode: 'fullscreen' })}
            className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
              videoConfig.areaMode === 'fullscreen'
                ? 'bg-accent-muted border-accent/60 text-txt-primary ring-1 ring-accent/30 shadow-xs'
                : 'bg-surface hover:bg-surface-hover border-border-sub text-txt-muted hover:text-txt-primary'
            }`}
          >
            <Monitor className={`w-4 h-4 mb-1.5 ${videoConfig.areaMode === 'fullscreen' ? 'text-accent' : 'text-txt-muted'}`} />
            <div className="text-xs font-semibold leading-tight">Full Screen</div>
            <div className="text-[10px] text-txt-muted mt-0.5">Entire app viewport</div>
          </button>

          {/* Option 3: Custom Region */}
          <button
            type="button"
            onClick={() => updateVideoConfig({ areaMode: 'custom' })}
            className={`flex flex-col items-start p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
              videoConfig.areaMode === 'custom'
                ? 'bg-accent-muted border-accent/60 text-txt-primary ring-1 ring-accent/30 shadow-xs'
                : 'bg-surface hover:bg-surface-hover border-border-sub text-txt-muted hover:text-txt-primary'
            }`}
          >
            <Crop className={`w-4 h-4 mb-1.5 ${videoConfig.areaMode === 'custom' ? 'text-accent' : 'text-txt-muted'}`} />
            <div className="text-xs font-semibold leading-tight">Custom Region</div>
            <div className="text-[10px] text-txt-muted mt-0.5">Resizable section</div>
          </button>
        </div>
      </div>
      {/* ─── FORMAT & RESOLUTION ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Format */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-txt-muted mb-2">
            Container Format
          </div>
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-app-bg rounded-lg border border-border-sub">
            {(['webm', 'mp4'] as const).map((fmt) => {
              const isActive = videoConfig.format === fmt;
              return (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => updateVideoConfig({ format: fmt })}
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

        {/* Resolution */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-txt-muted mb-2">
            Resolution
          </div>
          <div className="grid grid-cols-3 gap-1 p-1 bg-app-bg rounded-lg border border-border-sub">
            {(['720p', '1080p', '4k'] as const).map((res) => {
              const isActive = videoConfig.resolution === res;
              return (
                <button
                  key={res}
                  type="button"
                  onClick={() => updateVideoConfig({ resolution: res })}
                  className={`py-1.5 px-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-all text-center cursor-pointer ${
                    isActive
                      ? 'bg-accent text-txt-inverse shadow-sm'
                      : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
                  }`}
                >
                  {res}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── FRAME RATE & QUALITY ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Frame Rate */}
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-txt-muted mb-2">
            Frame Rate
          </div>
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-app-bg rounded-lg border border-border-sub">
            {([30, 60] as const).map((fps) => {
              const isActive = videoConfig.fps === fps;
              return (
                <button
                  key={fps}
                  type="button"
                  onClick={() => updateVideoConfig({ fps })}
                  className={`py-1.5 px-3 rounded-md text-xs font-semibold transition-all cursor-pointer ${
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
          <div className="grid grid-cols-3 gap-1 p-1 bg-app-bg rounded-lg border border-border-sub">
            {(['standard', 'high', 'ultra'] as const).map((q) => {
              const isActive = videoConfig.quality === q;
              return (
                <button
                  key={q}
                  type="button"
                  onClick={() => updateVideoConfig({ quality: q })}
                  className={`py-1.5 px-1.5 rounded-md text-xs font-semibold capitalize transition-all text-center cursor-pointer ${
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

      {/* ─── COUNTDOWN TIMER ───────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-txt-muted mb-2">
          <Clock className="w-3 h-3" />
          <span>Start Countdown</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-app-bg rounded-lg border border-border-sub">
          {([
            { val: 0, label: 'Instant (0s)' },
            { val: 3, label: '3 Seconds' },
            { val: 5, label: '5 Seconds' },
          ] as const).map(({ val, label }) => {
            const isActive = videoConfig.countdownSeconds === val;
            return (
              <button
                key={val}
                type="button"
                onClick={() => updateVideoConfig({ countdownSeconds: val })}
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

      {/* ─── AUDIO TOGGLE ──────────────────────────────────────────────── */}
      <div className="pt-2 border-t border-border-sub">
        <div className="flex items-center justify-between py-1">
          <div className="flex items-center gap-2">
            <Mic className={`w-4 h-4 ${videoConfig.includeMicrophone ? 'text-status-success' : 'text-txt-muted'}`} />
            <div>
              <div className="text-xs font-medium text-txt-primary">Microphone Audio</div>
              <div className="text-[10px] text-txt-muted">Record voice commentary during capture</div>
            </div>
          </div>
          <div
            role="switch"
            aria-checked={videoConfig.includeMicrophone}
            onClick={() => updateVideoConfig({ includeMicrophone: !videoConfig.includeMicrophone })}
            className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors duration-200 ${
              videoConfig.includeMicrophone ? 'bg-accent' : 'bg-surface-elevated border border-border-def'
            }`}
          >
            <div
              className={`w-4 h-4 rounded-full absolute top-[1px] left-[2px] transition-transform duration-200 ${
                videoConfig.includeMicrophone ? 'bg-white translate-x-[16px]' : 'bg-txt-muted translate-x-0'
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
