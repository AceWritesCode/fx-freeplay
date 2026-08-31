import React, { useState, useEffect, useRef } from 'react';
import { DrawingChartAdapter } from '@/engine/charting';

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

interface FloatingRectangleTextProps {
  chart: any;
  overlay: any;
  onTextChange: (newText: string) => void;
  isSelected: boolean;
  isHovered?: boolean;
  syncAllDrawings: () => void;
}

export const FloatingRectangleText: React.FC<FloatingRectangleTextProps> = ({
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
  const textHalign = customSettings.textPosition?.horizontal || 'center';
  const textValign = customSettings.textPosition?.vertical || 'middle';
  const textPlacement = customSettings.textPlacement || 'inside';

  // Check if shape points are fully registered
  const isShapeDrawn = overlay?.points && overlay.points.length >= 2;
  const isLineVisible = checkOverlayVisible(overlay, chart);
  const isHoveredActive = isHovered || isDomHovered;
  const hasActualText = typeof text === 'string' && text.trim() !== '';

  // 1) When actual text exists: show whenever the rectangle is drawn and visible on this timeframe
  // 2) When no text exists (placeholder "+ add text"): ONLY show when rectangle is drawn + selected + (hovered or actively editing)
  const shouldShow = isShapeDrawn && isLineVisible && (
    hasActualText || 
    (isSelected && (isHoveredActive || isEditing))
  );

  useEffect(() => {
    let active = true;
    const updatePosition = () => {
      if (!active) return;

      const pts = overlay?.points;
      if (pts && pts.length >= 2 && chart && elRef.current) {
        const pixelPts = chart.convertToPixel(pts, { paneId: 'candle_pane' });
        if (pixelPts && Array.isArray(pixelPts)) {
          // Filter and collect all valid numeric pixel points
          const validPixelPts = pixelPts.filter(
            (p: any) => p && typeof p.x === 'number' && Number.isFinite(p.x) && typeof p.y === 'number' && Number.isFinite(p.y)
          );

          if (validPixelPts.length >= 2) {
            const xCoords = validPixelPts.map((p: any) => p.x);
            const yCoords = validPixelPts.map((p: any) => p.y);
            const minX = Math.min(...xCoords);
            const maxX = Math.max(...xCoords);
            const minY = Math.min(...yCoords);
            const maxY = Math.max(...yCoords);

            const x = minX;
            const y = minY;
            const w = maxX - minX;
            const h = maxY - minY;

            if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(w) && Number.isFinite(h) && w >= 0 && h >= 0) {
              let tx = x + w / 2;
              let ty = y + h / 2;

              let translateX = '-50%';
              let translateY = '-50%';

              if (textPlacement === 'outside') {
                if (textValign === 'top') {
                  ty = y - 6;
                  translateY = '-100%';
                } else if (textValign === 'bottom') {
                  ty = y + h + 6;
                  translateY = '0%';
                } else {
                  if (textHalign === 'left') {
                    tx = x - 6;
                    translateX = '-100%';
                    ty = y + h / 2;
                    translateY = '-50%';
                  } else if (textHalign === 'right') {
                    tx = x + w + 6;
                    translateX = '0%';
                    ty = y + h / 2;
                    translateY = '-50%';
                  } else {
                    ty = y - 6;
                    translateY = '-100%';
                    tx = x + w / 2;
                    translateX = '-50%';
                  }
                }

                if (textValign !== 'middle') {
                  if (textHalign === 'left') {
                    tx = x;
                    translateX = '0%';
                  } else if (textHalign === 'right') {
                    tx = x + w;
                    translateX = '-100%';
                  } else {
                    tx = x + w / 2;
                    translateX = '-50%';
                  }
                }
              } else {
                // Inside placement
                if (textHalign === 'left') {
                  tx = x + 8;
                  translateX = '0%';
                } else if (textHalign === 'right') {
                  tx = x + w - 8;
                  translateX = '-100%';
                } else {
                  tx = x + w / 2;
                  translateX = '-50%';
                }

                if (textValign === 'top') {
                  ty = y + 8;
                  translateY = '0%';
                } else if (textValign === 'bottom') {
                  ty = y + h - 8;
                  translateY = '-100%';
                } else {
                  ty = y + h / 2;
                  translateY = '-50%';
                }
              }

              if (Number.isFinite(tx) && Number.isFinite(ty)) {
                elRef.current.style.transform = `translate(${tx}px, ${ty}px) translate(${translateX}, ${translateY})`;
              }
            }
          }
        }
      }

      requestAnimationFrame(updatePosition);
    };

    updatePosition();
    return () => {
      active = false;
    };
  }, [overlay, chart, textHalign, textValign, textPlacement]);

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
        e.stopPropagation();
        if (chart) {
          chart._clickedOnOverlay = true;
        }
      }}
      onMouseEnter={() => setIsDomHovered(true)}
      onMouseLeave={() => setIsDomHovered(false)}
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
          onBlur={(e) => {
            const relatedTarget = e.relatedTarget as HTMLElement | null;
            if (relatedTarget && (relatedTarget.closest('.drawing-floating-toolbar') || relatedTarget.closest('[data-floating-ui="true"]'))) {
              return;
            }
            handleSave();
          }}
          onKeyDown={handleKeyDown}
          placeholder="+ add text"
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
            width: `${Math.max(30, (inputText || '+ add text').length * (fontSize * 0.55) + 12)}px`
          }}
        />
      ) : (
        <div
          onClick={handleStartEdit}
          className="bg-transparent border-0 border-none outline-none p-0 m-0 cursor-text select-none whitespace-nowrap"
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
          {text === '' ? '+ add text' : text}
        </div>
      )}
    </div>
  );
};
