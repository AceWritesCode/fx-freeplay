import React, { useState, useEffect, useRef } from 'react';

interface FloatingTrendLineTextProps {
  chart: any;
  overlay: any;
  onTextChange: (newText: string) => void;
}

export const FloatingTrendLineText: React.FC<FloatingTrendLineTextProps> = ({
  chart,
  overlay,
  onTextChange,
}) => {
  const elRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isDomHovered, setIsDomHovered] = useState(false);

  const customSettings = overlay?.extendData?.customSettings || {};
  const text = customSettings.text || '';
  const textColor = customSettings.textColor || '#2196F3';
  const fontSize = customSettings.fontSize || 14;
  const isBold = !!customSettings.bold;
  const isItalic = !!customSettings.italic;
  const textHalign = customSettings.textPosition?.horizontal || 'right';
  const textValign = customSettings.textPosition?.vertical || 'middle';

  // Check if overlay is hovered inside klinecharts
  const isOverlayHovered = !!overlay?.extendData?.isHovered;

  // We show the label if it's not empty, or if we are editing, or if hovered
  const shouldShow = text !== '' || isEditing || isOverlayHovered || isDomHovered;

  useEffect(() => {
    let active = true;
    const updatePosition = () => {
      if (!active) return;

      const pts = overlay.points;
      if (pts && pts.length === 2 && chart && elRef.current) {
        const pixelPts = chart.convertToPixel(pts, { paneId: 'candle_pane' });
        if (pixelPts && pixelPts[0] && pixelPts[1]) {
          let tx = (pixelPts[0].x + pixelPts[1].x) / 2;
          let ty = (pixelPts[0].y + pixelPts[1].y) / 2;

          if (textHalign === 'left') tx = Math.min(pixelPts[0].x, pixelPts[1].x) - 10;
          else if (textHalign === 'right') tx = Math.max(pixelPts[0].x, pixelPts[1].x) + 10;

          if (textValign === 'top') ty = Math.min(pixelPts[0].y, pixelPts[1].y) - 15;
          else if (textValign === 'bottom') ty = Math.max(pixelPts[0].y, pixelPts[1].y) + 15;

          let translateX = '-50%';
          if (textHalign === 'left') translateX = '0%';
          else if (textHalign === 'right') translateX = '-100%';

          let translateY = '-50%';
          if (textValign === 'top') translateY = '-100%';
          else if (textValign === 'bottom') translateY = '0%';

          elRef.current.style.transform = `translate(${tx}px, ${ty}px) translate(${translateX}, ${translateY})`;
        }
      }
      requestAnimationFrame(updatePosition);
    };

    updatePosition();
    return () => {
      active = false;
    };
  }, [overlay, chart, textHalign, textValign]);

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setInputText(text);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
  };

  const handleSave = () => {
    setIsEditing(false);
    onTextChange(inputText);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setInputText(text);
    }
  };

  if (!shouldShow) return null;

  return (
    <div
      ref={elRef}
      onMouseEnter={() => setIsDomHovered(true)}
      onMouseLeave={() => setIsDomHovered(false)}
      className="absolute top-0 left-0 z-30 select-none pointer-events-auto"
      style={{
        fontSize: `${fontSize}px`,
        color: textColor,
        fontWeight: isBold ? 'bold' : 'normal',
        fontStyle: isItalic ? 'italic' : 'normal',
      }}
    >
      {isEditing ? (
        <input
          ref={inputRef}
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder="Add text..."
          className="bg-[#121420]/90 border border-indigo-500 rounded px-1.5 py-0.5 outline-none text-white focus:ring-1 focus:ring-indigo-500/50 shadow-lg cursor-text"
          style={{
            fontSize: `${fontSize}px`,
            color: textColor,
            width: `${Math.max(80, inputText.length * (fontSize * 0.6) + 20)}px`
          }}
        />
      ) : (
        <div
          onClick={handleStartEdit}
          className={`px-1.5 py-0.5 rounded cursor-text transition-colors duration-150 flex items-center gap-1 select-none font-semibold ${
            text === '' 
              ? 'text-[#2196F3] hover:text-indigo-400 bg-indigo-500/5 hover:bg-indigo-500/10 border border-dashed border-[#2196F3]/30 hover:border-indigo-400/50'
              : 'hover:bg-gray-800/20'
          }`}
        >
          {text === '' ? (
            <>
              <span>+</span>
              <span>Add text</span>
            </>
          ) : text}
        </div>
      )}
    </div>
  );
};
