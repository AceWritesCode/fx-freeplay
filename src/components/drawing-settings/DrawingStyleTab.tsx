import React from 'react';
import { ChevronDown } from 'lucide-react';
import { ColorPicker } from '../ColorPicker';
import { Checkbox } from '../common';

export interface DrawingStyleTabProps {
  overlay: any;
  lineColor: string;
  lineWidth: number;
  lineStyle: string;
  startArrow: string;
  endArrow: string;
  extendType: string;
  fillColor: string;
  fillBackground: boolean;
  profitColor: string;
  lossColor: string;
  alwaysShowStats: boolean;
  showLines: boolean;
  showActivationLine: boolean;
  activationLineColor: string;
  activationLineWidth: number;
  activationLineStyle: string;
  showActivationHighlight: boolean;
  activationHighlightOpacity: number;
  showMarkers: boolean;
  setLineColor: (color: string) => void;
  setLineWidth: (width: number) => void;
  setLineStyle: (style: string) => void;
  setStartArrow: (arrow: string) => void;
  setEndArrow: (arrow: string) => void;
  setExtendType: (extend: string) => void;
  setFillColor: (color: string) => void;
  setFillBackground: (fill: boolean) => void;
  setProfitColor: (color: string) => void;
  setLossColor: (color: string) => void;
  setAlwaysShowStats: (show: boolean) => void;
  setShowLines: (show: boolean) => void;
  setShowActivationLine: (show: boolean) => void;
  setActivationLineColor: (color: string) => void;
  setActivationLineWidth: (width: number) => void;
  setActivationLineStyle: (style: string) => void;
  setShowActivationHighlight: (show: boolean) => void;
  setActivationHighlightOpacity: (opacity: number) => void;
  setShowMarkers: (show: boolean) => void;
  activeColorPicker: string | null;
  setActiveColorPicker: (picker: string | null) => void;
  activeSelect: string | null;
  setActiveSelect: (select: any) => void;
}

export const DrawingStyleTab: React.FC<DrawingStyleTabProps> = ({
  overlay,
  lineColor,
  lineWidth,
  lineStyle,
  startArrow,
  endArrow,
  extendType,
  fillColor,
  fillBackground,
  profitColor,
  lossColor,
  alwaysShowStats,
  showLines,
  showActivationLine,
  activationLineColor,
  activationLineWidth,
  activationLineStyle,
  showActivationHighlight,
  activationHighlightOpacity,
  showMarkers,
  setLineColor,
  setLineWidth,
  setLineStyle,
  setStartArrow,
  setEndArrow,
  setExtendType,
  setFillColor,
  setFillBackground,
  setProfitColor,
  setLossColor,
  setAlwaysShowStats,
  setShowLines,
  setShowActivationLine,
  setActivationLineColor,
  setActivationLineWidth,
  setActivationLineStyle,
  setShowActivationHighlight,
  setActivationHighlightOpacity,
  setShowMarkers,
  activeColorPicker,
  setActiveColorPicker,
  activeSelect,
  setActiveSelect
}) => {
  return (
    <div className="space-y-4">
      {/* Line Color/Width/Style Row */}
      <div className="flex items-center justify-between min-h-[36px]">
        <span className="text-txt-muted font-medium">Line</span>
        <div className="flex gap-2 items-center relative">
          {/* Color Swatch */}
          <div className="relative">
            <button
              onClick={() => {
                setActiveColorPicker(activeColorPicker === 'line' ? null : 'line');
                setActiveSelect(null);
              }}
              className="w-8 h-8 rounded-lg border border-border-def hover:border-border-focus transition-all flex items-center justify-center cursor-pointer shadow-inner active:scale-95"
              style={{ backgroundColor: lineColor }}
            />
            {activeColorPicker === 'line' && (
              <div className="absolute right-0 top-full mt-2 z-50">
                <div className="fixed inset-0" onClick={() => setActiveColorPicker(null)} />
                <div className="relative">
                  <ColorPicker color={lineColor} onChange={(c) => setLineColor(c)} />
                </div>
              </div>
            )}
          </div>

          {/* Thickness Dropdown */}
          <div className="relative">
            <button
              onClick={() => {
                setActiveSelect(activeSelect === 'lineWidth' ? null : 'lineWidth');
                setActiveColorPicker(null);
              }}
              className="flex items-center justify-center border border-border-def hover:border-border-focus bg-app-bg hover:bg-surface-hover rounded-lg px-2.5 py-1.5 text-[12px] font-mono font-bold w-14 h-8 justify-between cursor-pointer transition-all active:scale-95 text-txt-primary"
            >
              <span>{lineWidth}px</span>
            </button>
            {activeSelect === 'lineWidth' && (
              <>
                <div className="absolute right-0 top-full mt-1 bg-modal-bg border border-border-def rounded-xl shadow-2xl z-50 p-1 w-16 overflow-hidden max-h-60 overflow-y-auto">
                  <div className="flex flex-col gap-0.5">
                    {(overlay.name === 'highlighter' ? [8, 12, 20, 32, 48, 64, 80, 96] : [1, 2, 3, 4]).map((w) => (
                      <button
                        key={w}
                        onClick={() => {
                          setLineWidth(w);
                          setActiveSelect(null);
                        }}
                        className={`w-full text-center px-2.5 py-1.5 rounded-lg hover:bg-surface-hover transition-colors text-[12px] font-mono font-semibold cursor-pointer ${
                          lineWidth === w ? 'bg-accent text-txt-inverse shadow-xs' : 'text-txt-secondary hover:text-txt-primary'
                        }`}
                      >
                        {w}px
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Line Style Dropdown */}
          {overlay.name !== 'brush' && overlay.name !== 'highlighter' && (
            <div className="relative">
              <button
                onClick={() => {
                  setActiveSelect(activeSelect === 'lineStyle' ? null : 'lineStyle');
                  setActiveColorPicker(null);
                }}
                className="flex items-center justify-center border border-border-def hover:border-border-focus bg-app-bg hover:bg-surface-hover rounded-lg px-3 py-1.5 text-[12px] font-semibold w-24 h-8 justify-between capitalize cursor-pointer transition-all active:scale-95 text-txt-primary"
              >
                <span>{lineStyle}</span>
                <ChevronDown className="w-3.5 h-3.5 text-txt-muted" />
              </button>
              {activeSelect === 'lineStyle' && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
                  <div className="absolute right-0 top-full mt-1 bg-modal-bg border border-border-def rounded-xl shadow-2xl z-50 p-1 w-24 overflow-hidden">
                    <div className="flex flex-col gap-0.5">
                      {(overlay?.name === 'rectangle' ? ['solid', 'dashed', 'dotted', 'none'] : ['solid', 'dashed', 'dotted']).map(
                        (s) => (
                          <button
                            key={s}
                            onClick={() => {
                              setLineStyle(s);
                              setActiveSelect(null);
                            }}
                            className={`w-full text-left px-3 py-1.5 rounded-lg hover:bg-surface-hover transition-colors text-[12px] capitalize cursor-pointer ${
                              lineStyle === s ? 'bg-accent text-txt-inverse font-semibold shadow-xs' : 'text-txt-secondary hover:text-txt-primary'
                            }`}
                          >
                            {s}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Start Endpoint (Left) Arrow */}
          {['brush', 'trendLine', 'ray', 'arrow', 'horizontalRay', 'horizontalLine', 'verticalLine'].includes(overlay.name) && (
            <div className="relative">
              <button
                onClick={() => {
                  setActiveSelect(activeSelect === 'startArrow' ? null : 'startArrow');
                  setActiveColorPicker(null);
                }}
                className={`flex items-center justify-center border ${
                  startArrow === 'arrow'
                    ? 'border-accent bg-accent-muted text-accent'
                    : 'border-border-def bg-app-bg text-txt-primary hover:border-border-focus hover:bg-surface-hover'
                } rounded-lg w-10 h-8 cursor-pointer transition-all active:scale-95`}
                title="Left endpoint"
              >
                {startArrow === 'arrow' ? (
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="16" y1="10" x2="4" y2="10" />
                    <polyline points="9 5 4 10 9 15" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <circle cx="5" cy="10" r="2.5" fill="currentColor" />
                    <line x1="7.5" y1="10" x2="16" y2="10" strokeWidth="2" />
                  </svg>
                )}
              </button>
              {activeSelect === 'startArrow' && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
                  <div className="absolute left-0 top-full mt-1 bg-modal-bg border border-border-def rounded-xl shadow-2xl z-50 p-1 w-32 overflow-hidden">
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => {
                          setStartArrow('normal');
                          setActiveSelect(null);
                        }}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-surface-hover transition-colors text-[12px] font-medium cursor-pointer ${
                          startArrow === 'normal' ? 'bg-accent text-txt-inverse font-bold shadow-xs' : 'text-txt-secondary hover:text-txt-primary'
                        }`}
                      >
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <circle cx="5" cy="10" r="2.5" fill="currentColor" />
                          <line x1="7.5" y1="10" x2="16" y2="10" strokeWidth="2" />
                        </svg>
                        <span>Normal</span>
                      </button>
                      <button
                        onClick={() => {
                          setStartArrow('arrow');
                          setActiveSelect(null);
                        }}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-surface-hover transition-colors text-[12px] font-medium cursor-pointer ${
                          startArrow === 'arrow' ? 'bg-accent text-txt-inverse font-bold shadow-xs' : 'text-txt-secondary hover:text-txt-primary'
                        }`}
                      >
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="16" y1="10" x2="4" y2="10" />
                          <polyline points="9 5 4 10 9 15" />
                        </svg>
                        <span>Arrow</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* End Endpoint (Right) Arrow */}
          {['brush', 'trendLine', 'ray', 'arrow', 'horizontalRay', 'horizontalLine', 'verticalLine'].includes(overlay.name) && (
            <div className="relative">
              <button
                onClick={() => {
                  setActiveSelect(activeSelect === 'endArrow' ? null : 'endArrow');
                  setActiveColorPicker(null);
                }}
                className={`flex items-center justify-center border ${
                  endArrow === 'arrow'
                    ? 'border-accent bg-accent-muted text-accent'
                    : 'border-border-def bg-app-bg text-txt-primary hover:border-border-focus hover:bg-surface-hover'
                } rounded-lg w-10 h-8 cursor-pointer transition-all active:scale-95`}
                title="Right endpoint"
              >
                {endArrow === 'arrow' ? (
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="4" y1="10" x2="16" y2="10" />
                    <polyline points="11 5 16 10 11 15" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <line x1="4" y1="10" x2="12.5" y2="10" strokeWidth="2" />
                    <circle cx="15" cy="10" r="2.5" fill="currentColor" />
                  </svg>
                )}
              </button>
              {activeSelect === 'endArrow' && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
                  <div className="absolute left-0 top-full mt-1 bg-modal-bg border border-border-def rounded-xl shadow-2xl z-50 p-1 w-32 overflow-hidden">
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => {
                          setEndArrow('normal');
                          setActiveSelect(null);
                        }}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-surface-hover transition-colors text-[12px] font-medium cursor-pointer ${
                          endArrow === 'normal' ? 'bg-accent text-txt-inverse font-bold shadow-xs' : 'text-txt-secondary hover:text-txt-primary'
                        }`}
                      >
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <line x1="4" y1="10" x2="12.5" y2="10" strokeWidth="2" />
                          <circle cx="15" cy="10" r="2.5" fill="currentColor" />
                        </svg>
                        <span>Normal</span>
                      </button>
                      <button
                        onClick={() => {
                          setEndArrow('arrow');
                          setActiveSelect(null);
                        }}
                        className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg hover:bg-surface-hover transition-colors text-[12px] font-medium cursor-pointer ${
                          endArrow === 'arrow' ? 'bg-accent text-txt-inverse font-bold shadow-xs' : 'text-txt-secondary hover:text-txt-primary'
                        }`}
                      >
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="4" y1="10" x2="16" y2="10" />
                          <polyline points="11 5 16 10 11 15" />
                        </svg>
                        <span>Arrow</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Extend Row */}
      {overlay.name === 'trendLine' && (
        <div className="flex items-center justify-between min-h-[36px]">
          <span className="text-txt-muted font-medium">Extend</span>
          <div className="relative">
            <button
              onClick={() => {
                setActiveSelect(activeSelect === 'extend' ? null : 'extend');
                setActiveColorPicker(null);
              }}
              className="flex items-center justify-between border border-border-def hover:border-border-focus bg-app-bg hover:bg-surface-hover rounded-lg px-3 py-1.5 text-[12px] font-semibold w-48 h-8 cursor-pointer transition-all active:scale-95 text-txt-primary"
            >
              <span className="capitalize">{extendType === 'none' ? "Don't extend" : `Extend ${extendType}`}</span>
              <ChevronDown className="w-4 h-4 text-txt-muted" />
            </button>
            {activeSelect === 'extend' && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
                <div className="absolute right-0 top-full mt-1 bg-modal-bg border border-border-def rounded-xl shadow-2xl z-50 p-1 w-48 overflow-hidden">
                  <div className="flex flex-col gap-0.5">
                    {[
                      { val: 'none', label: "Don't extend" },
                      { val: 'left', label: 'Extend left' },
                      { val: 'right', label: 'Extend right' },
                      { val: 'both', label: 'Extend both' }
                    ].map((item) => (
                      <button
                        key={item.val}
                        onClick={() => {
                          setExtendType(item.val);
                          setActiveSelect(null);
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-lg hover:bg-surface-hover transition-colors text-[12px] cursor-pointer ${
                          extendType === item.val ? 'bg-accent text-txt-inverse font-semibold shadow-xs' : 'text-txt-secondary hover:text-txt-primary'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Background Fill (Rectangle/Circle) */}
      {(overlay.name === 'rectangle' || overlay.name === 'circle') && (
        <div className="flex items-center justify-between min-h-[36px]">
          <Checkbox
            id="fillBackground"
            checked={fillBackground}
            onChange={(e) => setFillBackground(e.target.checked)}
            label="Background"
            labelClassName="text-txt-muted font-medium"
          />
          {fillBackground && (
            <div className="relative">
              <button
                onClick={() => {
                  setActiveColorPicker(activeColorPicker === 'fill' ? null : 'fill');
                  setActiveSelect(null);
                }}
                className="w-8 h-8 rounded-lg border border-border-def hover:border-border-focus transition-all flex items-center justify-center cursor-pointer shadow-inner active:scale-95"
                style={{ backgroundColor: fillColor }}
              />
              {activeColorPicker === 'fill' && (
                <div className="absolute right-0 top-full mt-2 z-50">
                  <div className="fixed inset-0" onClick={() => setActiveColorPicker(null)} />
                  <div className="relative">
                    <ColorPicker color={fillColor} onChange={(c) => setFillColor(c)} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Profit/Loss Colors (Long/Short Positions) */}
      {(overlay.name === 'longPosition' || overlay.name === 'shortPosition') && (
        <>
          <div className="flex items-center justify-between min-h-[36px]">
            <span className="text-txt-muted font-medium">Profit Zone</span>
            <div className="relative">
              <button
                onClick={() => {
                  setActiveColorPicker(activeColorPicker === 'profit' ? null : 'profit');
                  setActiveSelect(null);
                }}
                className="w-8 h-8 rounded-lg border border-border-def hover:border-border-focus transition-all flex items-center justify-center cursor-pointer shadow-inner active:scale-95"
                style={{ backgroundColor: profitColor }}
              />
              {activeColorPicker === 'profit' && (
                <div className="absolute right-0 top-full mt-2 z-50">
                  <div className="fixed inset-0" onClick={() => setActiveColorPicker(null)} />
                  <div className="relative">
                    <ColorPicker color={profitColor} onChange={(c) => setProfitColor(c)} />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between min-h-[36px]">
            <span className="text-txt-muted font-medium">Loss Zone</span>
            <div className="relative">
              <button
                onClick={() => {
                  setActiveColorPicker(activeColorPicker === 'loss' ? null : 'loss');
                  setActiveSelect(null);
                }}
                className="w-8 h-8 rounded-lg border border-border-def hover:border-border-focus transition-all flex items-center justify-center cursor-pointer shadow-inner active:scale-95"
                style={{ backgroundColor: lossColor }}
              />
              {activeColorPicker === 'loss' && (
                <div className="absolute right-0 top-full mt-2 z-50">
                  <div className="fixed inset-0" onClick={() => setActiveColorPicker(null)} />
                  <div className="relative">
                    <ColorPicker color={lossColor} onChange={(c) => setLossColor(c)} />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center min-h-[36px]">
            <Checkbox
              id="alwaysShowStats"
              checked={alwaysShowStats}
              onChange={(e) => setAlwaysShowStats(e.target.checked)}
              label="Always Show Stats"
              labelClassName="text-txt-muted font-medium"
            />
          </div>
          <div className="flex items-center min-h-[36px]">
            <Checkbox
              id="showLines"
              checked={showLines}
              onChange={(e) => setShowLines(e.target.checked)}
              label="Show Lines"
              labelClassName="text-txt-muted font-medium"
            />
          </div>

          {/* Activation Visualization Controls */}
          <div className="pt-3 border-t border-border-sub space-y-3">
            <div className="text-[11.5px] font-semibold text-txt-secondary uppercase tracking-wider">
              Activation Visualization
            </div>

            {/* Show Activation Line Checkbox */}
            <div className="flex items-center min-h-[32px]">
              <Checkbox
                id="showActivationLine"
                checked={showActivationLine}
                onChange={(e) => setShowActivationLine(e.target.checked)}
                label="Show Activation Line"
                labelClassName="text-txt-muted font-medium"
              />
            </div>

            {/* Activation Line Color / Width / Style Row */}
            {showActivationLine && (
              <div className="flex items-center justify-between min-h-[36px] pl-5">
                <span className="text-txt-muted font-medium">Activation Line</span>
                <div className="flex gap-2 items-center relative">
                  {/* Activation Line Color Swatch */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setActiveColorPicker(activeColorPicker === 'actLine' ? null : 'actLine');
                        setActiveSelect(null);
                      }}
                      className="w-8 h-8 rounded-lg border border-border-def hover:border-border-focus transition-all flex items-center justify-center cursor-pointer shadow-inner active:scale-95"
                      style={{ backgroundColor: activationLineColor }}
                    />
                    {activeColorPicker === 'actLine' && (
                      <div className="absolute right-0 top-full mt-2 z-50">
                        <div className="fixed inset-0" onClick={() => setActiveColorPicker(null)} />
                        <div className="relative">
                          <ColorPicker color={activationLineColor} onChange={(c) => setActivationLineColor(c)} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Activation Line Width */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setActiveSelect(activeSelect === 'actLineWidth' ? null : 'actLineWidth');
                        setActiveColorPicker(null);
                      }}
                      className="flex items-center justify-center border border-border-def hover:border-border-focus bg-app-bg hover:bg-surface-hover rounded-lg px-2.5 py-1.5 text-[12px] font-mono font-bold w-14 h-8 justify-between cursor-pointer transition-all active:scale-95 text-txt-primary"
                    >
                      <span>{activationLineWidth}px</span>
                    </button>
                    {activeSelect === 'actLineWidth' && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
                        <div className="absolute right-0 top-full mt-1 bg-modal-bg border border-border-def rounded-xl shadow-2xl z-50 p-1 w-16 overflow-hidden">
                          <div className="flex flex-col gap-0.5">
                            {[1, 2, 3, 4].map((w) => (
                              <button
                                key={w}
                                onClick={() => {
                                  setActivationLineWidth(w);
                                  setActiveSelect(null);
                                }}
                                className={`w-full text-center px-2.5 py-1.5 rounded-lg hover:bg-surface-hover transition-colors text-[12px] font-mono font-semibold cursor-pointer ${
                                  activationLineWidth === w ? 'bg-accent text-txt-inverse shadow-xs' : 'text-txt-secondary hover:text-txt-primary'
                                }`}
                              >
                                {w}px
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Activation Line Style */}
                  <div className="relative">
                    <button
                      onClick={() => {
                        setActiveSelect(activeSelect === 'actLineStyle' ? null : 'actLineStyle');
                        setActiveColorPicker(null);
                      }}
                      className="flex items-center justify-between border border-border-def hover:border-border-focus bg-app-bg hover:bg-surface-hover rounded-lg px-2.5 py-1.5 text-[12px] font-semibold w-24 h-8 cursor-pointer transition-all active:scale-95 text-txt-primary"
                    >
                      <span className="capitalize">{activationLineStyle}</span>
                      <ChevronDown className="w-4 h-4 text-txt-muted" />
                    </button>
                    {activeSelect === 'actLineStyle' && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
                        <div className="absolute right-0 top-full mt-1 bg-modal-bg border border-border-def rounded-xl shadow-2xl z-50 p-1 w-24 overflow-hidden">
                          <div className="flex flex-col gap-0.5">
                            {['solid', 'dashed', 'dotted'].map((s) => (
                              <button
                                key={s}
                                onClick={() => {
                                  setActivationLineStyle(s);
                                  setActiveSelect(null);
                                }}
                                className={`w-full text-left px-3 py-1.5 rounded-lg hover:bg-surface-hover transition-colors text-[12px] capitalize cursor-pointer ${
                                  activationLineStyle === s ? 'bg-accent text-txt-inverse font-semibold shadow-xs' : 'text-txt-secondary hover:text-txt-primary'
                                }`}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Show Activation Highlight Checkbox */}
            <div className="flex items-center min-h-[32px]">
              <Checkbox
                id="showActivationHighlight"
                checked={showActivationHighlight}
                onChange={(e) => setShowActivationHighlight(e.target.checked)}
                label="Show Activation Highlight"
                labelClassName="text-txt-muted font-medium"
              />
            </div>

            {/* Activation Highlight Opacity */}
            {showActivationHighlight && (
              <div className="flex items-center justify-between min-h-[36px] pl-5">
                <span className="text-gray-400 font-medium">Highlight Opacity</span>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0.10"
                    max="0.60"
                    step="0.02"
                    value={activationHighlightOpacity}
                    onChange={(e) => setActivationHighlightOpacity(parseFloat(e.target.value))}
                    className="w-28 accent-accent cursor-pointer"
                  />
                  <span className="text-gray-300 font-mono text-[11px] w-10 text-right">
                    {Math.round(activationHighlightOpacity * 100)}%
                  </span>
                </div>
              </div>
            )}

            {/* Show Markers Checkbox */}
            <div className="flex items-center min-h-[32px]">
              <Checkbox
                id="showMarkers"
                checked={showMarkers}
                onChange={(e) => setShowMarkers(e.target.checked)}
                label="Show Markers"
                labelClassName="text-txt-muted font-medium"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
};
