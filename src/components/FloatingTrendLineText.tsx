import React, { useState, useEffect, useRef } from 'react';

interface FloatingTrendLineTextProps {
  chart: any;
  overlay: any;
  onTextChange: (newText: string) => void;
  isSelected: boolean;
}

export const FloatingTrendLineText: React.FC<FloatingTrendLineTextProps> = ({
  chart,
  overlay,
  onTextChange,
  isSelected
}) => {
  const elRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const backupTextRef = useRef('');
  
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

  // We show the label if it's not empty, or if we are editing, or if hovered while selected
  const shouldShow = text !== '' || isEditing || (isSelected && (isOverlayHovered || isDomHovered));

  useEffect(() => {
    let active = true;
    const updatePosition = () => {
      if (!active) return;

      const pts = overlay.points;
      if (pts && pts.length === 2 && chart && elRef.current) {
        const pixelPts = chart.convertToPixel(pts, { paneId: 'candle_pane' });
        if (pixelPts && pixelPts[0] && pixelPts[1]) {
          const pLeft = pixelPts[0].x < pixelPts[1].x ? pixelPts[0] : pixelPts[1];
          const pRight = pixelPts[0].x < pixelPts[1].x ? pixelPts[1] : pixelPts[0];

          const dx = pRight.x - pLeft.x;
          const dy = pRight.y - pLeft.y;
          const len = Math.sqrt(dx * dx + dy * dy);

          let tx = (pixelPts[0].x + pixelPts[1].x) / 2;
          let ty = (pixelPts[0].y + pixelPts[1].y) / 2;

          if (len > 0.0001) {
            const ux = dx / len;
            const uy = dy / len;

            if (textHalign === 'left') {
              tx = pLeft.x + 3 * ux;
              ty = pLeft.y + 3 * uy;
            } else if (textHalign === 'right') {
              tx = pRight.x - 3 * ux;
              ty = pRight.y - 3 * uy;
            }
          }

          // Compute rotation angle (along the line slope)
          let angle = Math.atan2(dy, dx);

          // Keep text upright so it's not upside down (between -90 and 90 deg)
          if (angle > Math.PI / 2) {
            angle -= Math.PI;
          } else if (angle < -Math.PI / 2) {
            angle += Math.PI;
          }

          let translateX = '-50%';
          if (textHalign === 'left') translateX = '0%';
          else if (textHalign === 'right') translateX = '-100%';

          let translateY = '-50%';
          if (textValign === 'top') translateY = 'calc(-100% - 3px)';
          else if (textValign === 'bottom') translateY = '3px';

          // Rotate local coordinate system first, then translate along rotated coordinates!
          elRef.current.style.transform = `translate(${tx}px, ${ty}px) rotate(${angle}rad) translate(${translateX}, ${translateY})`;
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
    e.preventDefault();
    backupTextRef.current = text;
    setIsEditing(true);
    setInputText(text);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
  };

  const handleSave = () => {
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setInputText(backupTextRef.current);
      onTextChange(backupTextRef.current);
    }
  };

  if (!shouldShow) return null;

  return (
    <div
      ref={elRef}
      onMouseEnter={() => setIsDomHovered(true)}
      onMouseLeave={() => setIsDomHovered(false)}
      className="absolute top-0 left-0 z-30 select-none pointer-events-auto origin-center whitespace-nowrap"
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
          onChange={(e) => {
            setInputText(e.target.value);
            onTextChange(e.target.value);
          }}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder="Add text..."
          className="bg-transparent border-0 border-none outline-none focus:outline-none focus:ring-0 p-0 text-white cursor-text font-inherit select-text whitespace-nowrap"
          style={{
            fontSize: `${fontSize}px`,
            color: textColor,
            width: `${Math.max(80, inputText.length * (fontSize * 0.6) + 10)}px`
          }}
        />
      ) : (
        <div
          onClick={handleStartEdit}
          className={`px-1.5 py-0.5 rounded cursor-text transition-colors duration-150 flex items-center gap-1 select-none font-semibold whitespace-nowrap ${
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
