import React from 'react';
import { ChevronDown, AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { ColorPicker } from '../ColorPicker';
import { Checkbox } from '../common';

export interface DrawingTextTabProps {
  isTextOverlay: boolean;
  text: string;
  textColor: string;
  fontSize: number;
  isBold: boolean;
  isItalic: boolean;
  textAlign: 'left' | 'center' | 'right';
  showBorder: boolean;
  textValign: string;
  textHalign: string;
  textPlacement: 'inside' | 'outside';
  setText: (val: string) => void;
  setTextColor: (val: string) => void;
  setFontSize: (val: number) => void;
  setIsBold: (val: boolean) => void;
  setIsItalic: (val: boolean) => void;
  setTextAlign: (val: 'left' | 'center' | 'right') => void;
  setShowBorder: (val: boolean) => void;
  setTextValign: (val: string) => void;
  setTextHalign: (val: string) => void;
  setTextPlacement: (val: 'inside' | 'outside') => void;
  activeColorPicker: string | null;
  setActiveColorPicker: (picker: string | null) => void;
  activeSelect: string | null;
  setActiveSelect: (select: any) => void;
}

export const DrawingTextTab: React.FC<DrawingTextTabProps> = ({
  isTextOverlay,
  text,
  textColor,
  fontSize,
  isBold,
  isItalic,
  textAlign,
  showBorder,
  textValign,
  textHalign,
  textPlacement,
  setText,
  setTextColor,
  setFontSize,
  setIsBold,
  setIsItalic,
  setTextAlign,
  setShowBorder,
  setTextValign,
  setTextHalign,
  setTextPlacement,
  activeColorPicker,
  setActiveColorPicker,
  activeSelect,
  setActiveSelect
}) => {
  return (
    <div className="space-y-4">
      {/* Toolbar controls for text */}
      <div className="flex gap-2 items-center min-h-[36px]">
        {/* Text Color Swatch */}
        <div className="relative">
          <button 
            onClick={() => { setActiveColorPicker(activeColorPicker === 'text' ? null : 'text'); setActiveSelect(null); }}
            className="w-8 h-8 rounded-lg border border-border-def hover:border-border-focus transition-all flex items-center justify-center cursor-pointer shadow-inner active:scale-95"
            style={{ backgroundColor: textColor }}
          />
          {activeColorPicker === 'text' && (
            <div className="absolute left-0 top-full mt-2 z-50">
              <div className="fixed inset-0" onClick={() => setActiveColorPicker(null)} />
              <div className="relative">
                <ColorPicker color={textColor} onChange={(c) => setTextColor(c)} />
              </div>
            </div>
          )}
        </div>

        {/* Font Size Selector */}
        <div className="relative">
          <button
            onClick={() => { setActiveSelect(activeSelect === 'fontSize' ? null : 'fontSize'); setActiveColorPicker(null); }}
            className="flex items-center justify-center border border-border-def hover:border-border-focus bg-app-bg hover:bg-surface-hover rounded-lg px-2.5 py-1.5 text-[12px] font-mono font-bold w-14 h-8 justify-between cursor-pointer transition-all active:scale-95 text-txt-primary"
          >
            <span>{fontSize}</span>
          </button>
          {activeSelect === 'fontSize' && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
              <div className="absolute left-0 top-full mt-1 bg-modal-bg border border-border-def rounded-xl shadow-2xl z-50 p-1 w-16 overflow-hidden">
                <div className="flex flex-col gap-0.5">
                  {[10, 11, 12, 14, 16, 20, 24].map(sz => (
                    <button
                      key={sz}
                      onClick={() => { setFontSize(sz); setActiveSelect(null); }}
                      className={`w-full text-center px-2.5 py-1.5 rounded-lg hover:bg-surface-hover transition-colors text-[12px] font-mono font-semibold cursor-pointer ${fontSize === sz ? 'bg-accent text-txt-inverse shadow-xs' : 'text-txt-secondary hover:text-txt-primary'}`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Bold Toggle */}
        <button
          onClick={() => setIsBold(!isBold)}
          className={`w-8 h-8 flex items-center justify-center rounded-lg border border-border-def font-bold hover:bg-surface-hover transition-colors cursor-pointer select-none ${isBold ? 'text-accent bg-accent-muted border-accent/40' : 'text-txt-secondary'}`}
        >
          B
        </button>

        {/* Italic Toggle */}
        <button
          onClick={() => setIsItalic(!isItalic)}
          className={`w-8 h-8 flex items-center justify-center rounded-lg border border-border-def italic hover:bg-surface-hover transition-colors cursor-pointer select-none ${isItalic ? 'text-accent bg-accent-muted border-accent/40' : 'text-txt-secondary'}`}
        >
          I
        </button>

        {/* Text Alignment Selector */}
        <div className="flex items-center bg-app-bg border border-border-def rounded-lg p-0.5 ml-2 gap-0.5">
          <button
            type="button"
            onClick={() => setTextAlign('left')}
            className={`p-1.5 rounded transition-colors ${textAlign === 'left' ? 'text-accent bg-accent-muted' : 'text-txt-muted hover:text-txt-primary'}`}
            title="Align Left"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setTextAlign('center')}
            className={`p-1.5 rounded transition-colors ${textAlign === 'center' ? 'text-accent bg-accent-muted' : 'text-txt-muted hover:text-txt-primary'}`}
            title="Align Center"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setTextAlign('right')}
            className={`p-1.5 rounded transition-colors ${textAlign === 'right' ? 'text-accent bg-accent-muted' : 'text-txt-muted hover:text-txt-primary'}`}
            title="Align Right"
          >
            <AlignRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Text Input area */}
      <div className="flex flex-col gap-1.5">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add text"
          className="bg-app-bg border border-border-def hover:border-border-focus rounded-lg p-3 h-24 outline-none text-txt-primary focus:border-border-focus resize-none font-sans text-[12.5px] w-full transition-colors"
        />
      </div>

      {/* Text Tool specific: Show Border option */}
      {isTextOverlay ? (
        <div className="flex items-center justify-between min-h-[36px] pt-1">
          <Checkbox
            checked={showBorder}
            onChange={(e) => setShowBorder(e.target.checked)}
            label="Show border"
            labelClassName="text-txt-primary font-medium"
          />
        </div>
      ) : (
        <>
          {/* Text Alignment Row */}
          <div className="flex items-center justify-between min-h-[36px]">
            <span className="text-txt-muted font-medium">Text alignment</span>
            <div className="flex gap-2">
              {/* Vertical Alignment */}
              <div className="relative">
                <button
                  onClick={() => { setActiveSelect(activeSelect === 'valign' ? null : 'valign'); setActiveColorPicker(null); }}
                  className="flex items-center justify-between border border-border-def hover:border-border-focus bg-app-bg hover:bg-surface-hover rounded-lg px-3 py-1.5 text-[12px] font-semibold w-24 h-8 capitalize cursor-pointer transition-all active:scale-95 text-txt-primary"
                >
                  <span>{textValign}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-txt-muted" />
                </button>
                {activeSelect === 'valign' && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
                    <div className="absolute right-0 top-full mt-1 bg-modal-bg border border-border-def rounded-xl shadow-2xl z-50 p-1 w-24 overflow-hidden">
                      <div className="flex flex-col gap-0.5">
                        {['top', 'middle', 'bottom'].map(v => (
                          <button
                            key={v}
                            onClick={() => { setTextValign(v); setActiveSelect(null); }}
                            className={`w-full text-left px-3 py-1.5 rounded-lg hover:bg-surface-hover transition-colors text-[12px] capitalize cursor-pointer ${textValign === v ? 'bg-accent text-txt-inverse font-semibold shadow-xs' : 'text-txt-secondary hover:text-txt-primary'}`}
                          >
                            {v}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Horizontal Alignment */}
              <div className="relative">
                <button
                  onClick={() => { setActiveSelect(activeSelect === 'halign' ? null : 'halign'); setActiveColorPicker(null); }}
                  className="flex items-center justify-between border border-border-def hover:border-border-focus bg-app-bg hover:bg-surface-hover rounded-lg px-3 py-1.5 text-[12px] font-semibold w-24 h-8 capitalize cursor-pointer transition-all active:scale-95 text-txt-primary"
                >
                  <span>{textHalign}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-txt-muted" />
                </button>
                {activeSelect === 'halign' && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
                    <div className="absolute right-0 top-full mt-1 bg-modal-bg border border-border-def rounded-xl shadow-2xl z-50 p-1 w-24 overflow-hidden">
                      <div className="flex flex-col gap-0.5">
                        {['left', 'center', 'right'].map(h => (
                          <button
                            key={h}
                            onClick={() => { setTextHalign(h); setActiveSelect(null); }}
                            className={`w-full text-left px-3 py-1.5 rounded-lg hover:bg-surface-hover transition-colors text-[12px] capitalize cursor-pointer ${textHalign === h ? 'bg-accent text-txt-inverse font-semibold shadow-xs' : 'text-txt-secondary hover:text-txt-primary'}`}
                          >
                            {h}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Text Placement Row */}
          <div className="flex items-center justify-between min-h-[36px]">
            <span className="text-txt-muted font-medium">Text placement</span>
            <div className="relative">
              <button
                onClick={() => { setActiveSelect(activeSelect === 'textPlacement' ? null : 'textPlacement'); setActiveColorPicker(null); }}
                className="flex items-center justify-between border border-border-def hover:border-border-focus bg-app-bg hover:bg-surface-hover rounded-lg px-3 py-1.5 text-[12px] font-semibold w-28 h-8 capitalize cursor-pointer transition-all active:scale-95 text-txt-primary"
              >
                <span>{textPlacement}</span>
                <ChevronDown className="w-3.5 h-3.5 text-txt-muted" />
              </button>
              {activeSelect === 'textPlacement' && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setActiveSelect(null)} />
                  <div className="absolute right-0 top-full mt-1 bg-modal-bg border border-border-def rounded-xl shadow-2xl z-50 p-1 w-28 overflow-hidden">
                    <div className="flex flex-col gap-0.5">
                      {['inside', 'outside'].map(p => (
                        <button
                          key={p}
                          onClick={() => { setTextPlacement(p as 'inside' | 'outside'); setActiveSelect(null); }}
                          className={`w-full text-left px-3 py-1.5 rounded-lg hover:bg-surface-hover transition-colors text-[12px] capitalize cursor-pointer ${textPlacement === p ? 'bg-accent text-txt-inverse font-semibold shadow-xs' : 'text-txt-secondary hover:text-txt-primary'}`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
