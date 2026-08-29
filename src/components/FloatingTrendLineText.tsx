import React, { useState, useEffect, useRef } from 'react';
import { DrawingChartAdapter } from '@/engine/charting';

// Mirrors the same logic used in TrendLine.tsx canvas
const parseTimeframe = (tf: string) => {
  const match = tf.match(/^(\d+)([a-zA-Z]+)$/);
  if (!match) return { value: 1, unit: 'minutes' };
  const val = parseInt(match[1]);
  const unitChar = match[2];
  let unit = 'minutes';
  if (unitChar === 's') unit = 'seconds';
  else if (unitChar === 'm') unit = 'minutes';
  else if (unitChar === 'h' || unitChar === 'H') unit = 'hours';
  else if (unitChar === 'd' || unitChar === 'D') unit = 'days';
  else if (unitChar === 'w' || unitChar === 'W') unit = 'weeks';
  else if (unitChar === 'M') unit = 'months';
  return { value: val, unit };
};

const checkOverlayVisible = (overlay: any, chart: any): boolean => {
  const customSettings = overlay?.extendData?.customSettings || {};
  const visibility = customSettings.visibility;
  if (!visibility) return true;
  const tf = chart?._loadedTimeframe || '1m';
  const { value, unit } = parseTimeframe(tf);
  const rule = visibility[unit];
  if (!rule) return true;
  if (!rule.show) return false;
  if (rule.min !== undefined && value < rule.min) return false;
  if (rule.max !== undefined && value > rule.max) return false;
  return true;
};

interface FloatingTrendLineTextProps {
  chart: any;
  overlay: any;
  onTextChange: (newText: string) => void;
  isSelected: boolean;
  isHovered?: boolean;
  syncAllDrawings: () => void;
}

export const FloatingTrendLineText: React.FC<FloatingTrendLineTextProps> = ({
  chart,
  overlay,
  onTextChange,
  isSelected,
  isHovered = false,
  syncAllDrawings
}) => {
  const elRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const backupTextRef = useRef('');
  
  const [isEditing, setIsEditing] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isDomHovered, setIsDomHovered] = useState(false);

  const customSettings = overlay?.extendData?.customSettings || {};
  const text = customSettings.text || '';
  const lineColor = customSettings.lineColor || '#2196F3';
  const textColor = customSettings.textColor || lineColor;
  const fontSize = customSettings.fontSize || 14;
  const isBold = !!customSettings.bold;
  const isItalic = !!customSettings.italic;
  const textHalign = customSettings.textPosition?.horizontal || 'right';
  const textValign = customSettings.textPosition?.vertical || 'middle';

  // Check if line points are fully registered (line completed drawing)
  const isLineDrawn = overlay?.points && overlay.points.length >= 2;

  // Respect the timeframe visibility setting — hide text when line is hidden
  const isLineVisible = checkOverlayVisible(overlay, chart);

  const isHoveredActive = isHovered || isDomHovered;
  const hasActualText = typeof text === 'string' && text.trim() !== '';

  // 1) When actual text exists: show whenever the line is drawn and visible on this timeframe
  // 2) When no text exists (placeholder "+ Add text"): ONLY show when line is drawn + selected + (hovered or actively editing)
  const shouldShow = isLineDrawn && isLineVisible && (
    hasActualText || 
    (isSelected && (isHoveredActive || isEditing))
  );

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
          let transformOrigin = '50% 50%';
          if (textHalign === 'left') {
            translateX = '0%';
            transformOrigin = '0% 50%';
          } else if (textHalign === 'right') {
            translateX = '-100%';
            transformOrigin = '100% 50%';
          }

          let translateY = '-50%';
          if (textValign === 'top') translateY = '-100%';
          else if (textValign === 'bottom') translateY = '0%';

          let spacing = 0;
          if (textValign === 'top') spacing = -3;
          else if (textValign === 'bottom') spacing = 3;

          elRef.current.style.transformOrigin = transformOrigin;
          elRef.current.style.transform = `translate(${tx}px, ${ty}px) translate(${translateX}, ${translateY}) rotate(${angle}rad) translate(0px, ${spacing}px)`;
        }
      }
      requestAnimationFrame(updatePosition);
    };

    updatePosition();
    return () => {
      active = false;
    };
  }, [overlay, chart, textHalign, textValign]);

  // Measure DOM width and update overlay extendData in real-time
  useEffect(() => {
    if (elRef.current) {
      const width = elRef.current.offsetWidth;
      if (width && width !== overlay.extendData?.textWidth) {
        chart.overrideOverlay({
          id: overlay.id,
          extendData: {
            ...(overlay.extendData || {}),
            textWidth: width
          }
        });
        setTimeout(() => syncAllDrawings(), 50);
      }
    }
  }, [text, inputText, isEditing, fontSize, isBold, isItalic]);

  // Guaranteed transient cleanup on unmount or removal
  useEffect(() => {
    return () => {
      try {
        if (chart && overlay?.id) {
          chart.overrideOverlay({
            id: overlay.id,
            extendData: {
              ...(overlay.extendData || {}),
              isHovered: false,
              isEditingText: false
            }
          });
          DrawingChartAdapter.invalidatePane(chart);
        }
      } catch (_) {}
    };
  }, [chart, overlay?.id]);

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (chart) {
      chart._clickedOnOverlay = true;
    }
    backupTextRef.current = text;
    setIsEditing(true);
    setInputText(text);

    // Tell overlays we are editing so the split gap persists
    try {
      chart.overrideOverlay({
        id: overlay.id,
        extendData: {
          ...(overlay.extendData || {}),
          isEditingText: true
        }
      });
      DrawingChartAdapter.invalidatePane(chart);
    } catch (_) {}

    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
  };

  const handleSave = () => {
    setIsEditing(false);
    try {
      chart.overrideOverlay({
        id: overlay.id,
        extendData: {
          ...(overlay.extendData || {}),
          isEditingText: false
        }
      });
      DrawingChartAdapter.invalidatePane(chart);
    } catch (_) {}
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
      try {
        chart.overrideOverlay({
          id: overlay.id,
          extendData: {
            ...(overlay.extendData || {}),
            isEditingText: false
          }
        });
        DrawingChartAdapter.invalidatePane(chart);
      } catch (_) {}
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setInputText(backupTextRef.current);
      onTextChange(backupTextRef.current);
      try {
        chart.overrideOverlay({
          id: overlay.id,
          extendData: {
            ...(overlay.extendData || {}),
            isEditingText: false
          }
        });
        DrawingChartAdapter.invalidatePane(chart);
      } catch (_) {}
    }
  };

  if (!shouldShow) return null;

  return (
    <div
      ref={elRef}
      data-no-deselect="true"
      data-floating-ui="true"
      onMouseDown={(e) => {
        if (chart) {
          chart._clickedOnOverlay = true;
        }
        if (isEditing) {
          e.stopPropagation();
        }
      }}
      onMouseEnter={() => {
        setIsDomHovered(true);
        try {
          if (chart && overlay?.id) {
            chart.overrideOverlay({
              id: overlay.id,
              extendData: {
                ...(overlay.extendData || {}),
                isHovered: true
              }
            });
            DrawingChartAdapter.invalidatePane(chart);
          }
        } catch (_) {}
      }}
      onMouseLeave={() => {
        setIsDomHovered(false);
        try {
          if (chart && overlay?.id) {
            chart.overrideOverlay({
              id: overlay.id,
              extendData: {
                ...(overlay.extendData || {}),
                isHovered: false
              }
            });
            DrawingChartAdapter.invalidatePane(chart);
          }
        } catch (_) {}
      }}
      className="absolute top-0 left-0 z-30 select-none pointer-events-auto origin-center whitespace-nowrap bg-transparent p-0 m-0 border-none outline-none"
      style={{
        fontSize: `${fontSize}px`,
        color: textColor,
        fontWeight: isBold ? 'bold' : 'normal',
        fontStyle: isItalic ? 'italic' : 'normal',
        lineHeight: '1.2',
        textAlign: textHalign,
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
          placeholder="+ Add text"
          className="bg-transparent border-0 border-none outline-none focus:outline-none focus:ring-0 p-0 m-0 cursor-text font-inherit select-text whitespace-nowrap"
          style={{
            fontSize: `${fontSize}px`,
            color: textColor,
            fontWeight: isBold ? 'bold' : 'normal',
            fontStyle: isItalic ? 'italic' : 'normal',
            lineHeight: '1.2',
            textAlign: textHalign,
            margin: 0,
            padding: 0,
            boxSizing: 'border-box',
            width: `${Math.max(30, (inputText || '+ Add text').length * (fontSize * 0.5) + 12)}px`
          }}
        />
      ) : (
        <div
          onClick={handleStartEdit}
          className="bg-transparent border-0 border-none outline-none p-0 m-0 cursor-text select-none whitespace-nowrap transition-opacity hover:opacity-80"
          style={{
            fontSize: `${fontSize}px`,
            color: textColor,
            fontWeight: isBold ? 'bold' : 'normal',
            fontStyle: isItalic ? 'italic' : 'normal',
            lineHeight: '1.2',
            textAlign: textHalign,
            margin: 0,
            padding: 0,
            boxSizing: 'border-box',
          }}
        >
          {text === '' ? '+ Add text' : text}
        </div>
      )}
    </div>
  );
};
