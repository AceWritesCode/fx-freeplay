import React, { useState, useEffect, useRef } from 'react';

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
  syncAllDrawings: () => void;
}

export const FloatingRectangleText: React.FC<FloatingRectangleTextProps> = ({
  chart,
  overlay,
  onTextChange,
  isSelected,
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

  // Hover & visibility checks
  const isOverlayHovered = !!overlay?.extendData?.isHovered;
  const isOverlaySelected = isSelected || !!overlay?.extendData?.isSelected;
  const isLineVisible = checkOverlayVisible(overlay, chart);

  // Show rules:
  // Visible if rectangle is visible AND (text is not empty OR currently editing OR hovered OR selected)
  const shouldShow = isLineVisible && (text !== '' || isEditing || isOverlaySelected || isOverlayHovered || isDomHovered);

  useEffect(() => {
    let active = true;
    const updatePosition = () => {
      if (!active || !chart || !elRef.current) return;

      const pts = overlay.points;
      if (!pts || pts.length < 2) {
        requestAnimationFrame(updatePosition);
        return;
      }
      const pixelPts = chart.convertToPixel(pts, { paneId: 'candle_pane' });
      if (!pixelPts || pixelPts.length < 2) {
        requestAnimationFrame(updatePosition);
        return;
      }
      const p1 = pixelPts[0];
      const p2 = pixelPts.length >= 8 ? pixelPts[2] : pixelPts[1];
      if (!p1 || !p2 || (p1.x === 0 && p1.y === 0 && p2.x === 0 && p2.y === 0)) {
        requestAnimationFrame(updatePosition);
        return;
      }
      const x = Math.min(p1.x, p2.x);
      const y = Math.min(p1.y, p2.y);
      const w = Math.abs(p1.x - p2.x);
      const h = Math.abs(p1.y - p2.y);

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

      let drawingAreaWidth = 10000;
      try {
        const paneStore = (chart as any)?._chartStore?.getPaneStore?.();
        const pane = (chart as any)?.getDrawPaneById?.('candle_pane') || paneStore?.getPaneById?.('candle_pane');
        if (pane) {
          const mainWidget = pane.getWidget?.() || pane.getMainWidget?.();
          const mw = mainWidget?.getBounding?.()?.width;
          if (typeof mw === 'number' && mw > 0) {
            drawingAreaWidth = mw;
          } else {
            const totalW = pane.getBounding?.()?.width;
            const axisW = pane.getAxisWidget?.()?.getBounding?.()?.width || pane.getYAxisWidget?.()?.getBounding?.()?.width || 70;
            if (typeof totalW === 'number' && totalW > 0) {
              drawingAreaWidth = totalW - axisW;
            }
          }
        }
        if (drawingAreaWidth === 10000) {
          const chartDom = chart?.getDom?.();
          if (chartDom && chartDom.offsetWidth > 100) {
            drawingAreaWidth = chartDom.offsetWidth - 70;
          }
        }
      } catch (e) {}

      const domW = elRef.current.offsetWidth || 0;
      const domH = elRef.current.offsetHeight || 0;

      let textRight = tx;
      let textLeft = tx;
      if (translateX === '0%') {
        textRight = tx + domW;
        textLeft = tx;
      } else if (translateX === '-50%') {
        textRight = tx + domW / 2;
        textLeft = tx - domW / 2;
      } else if (translateX === '-100%') {
        textRight = tx;
        textLeft = tx - domW;
      }

      const isTooSmall = domW > 0 && domH > 0 && (
        text !== '' 
          ? (w < domW || h < domH)
          : (w < 20 || h < 12)
      );
      const isPastAxis = textRight > (drawingAreaWidth - 2);
      const isBeforeLeftEdge = textLeft < 2;

      elRef.current.style.transform = `translate(${tx}px, ${ty}px) translate(${translateX}, ${translateY})`;
      elRef.current.style.visibility = (isTooSmall || isPastAxis || isBeforeLeftEdge) ? 'hidden' : 'visible';

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

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    backupTextRef.current = text;
    setIsEditing(true);
    setInputText(text);

    chart.overrideOverlay({
      id: overlay.id,
      extendData: {
        ...(overlay.extendData || {}),
        isEditingText: true
      }
    });

    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 50);
  };

  const handleSave = () => {
    setIsEditing(false);
    chart.overrideOverlay({
      id: overlay.id,
      extendData: {
        ...(overlay.extendData || {}),
        isEditingText: false
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
      chart.overrideOverlay({
        id: overlay.id,
        extendData: {
          ...(overlay.extendData || {}),
          isEditingText: false
        }
      });
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setInputText(backupTextRef.current);
      onTextChange(backupTextRef.current);
      chart.overrideOverlay({
        id: overlay.id,
        extendData: {
          ...(overlay.extendData || {}),
          isEditingText: false
        }
      });
    }
  };

  if (!shouldShow) return null;

  return (
    <div
      ref={elRef}
      onMouseEnter={() => setIsDomHovered(true)}
      onMouseLeave={() => setIsDomHovered(false)}
      className="absolute top-0 left-0 z-30 select-none pointer-events-auto origin-center whitespace-nowrap bg-transparent p-0 m-0 border-none outline-none"
      style={{
        fontSize: `${fontSize}px`,
        color: text === '' ? '#2196F3' : textColor,
        fontWeight: isBold ? 'bold' : 'normal',
        fontStyle: isItalic ? 'italic' : 'normal',
        lineHeight: '1.2',
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
          placeholder="+ add text"
          className="bg-transparent border-0 border-none outline-none focus:outline-none focus:ring-0 p-0 m-0 cursor-text font-inherit select-text whitespace-nowrap"
          style={{
            fontSize: `${fontSize}px`,
            color: text === '' ? '#2196F3' : textColor,
            fontWeight: isBold ? 'bold' : 'normal',
            fontStyle: isItalic ? 'italic' : 'normal',
            lineHeight: '1.2',
            margin: 0,
            padding: 0,
            boxSizing: 'border-box',
            width: `${Math.max(60, (inputText || '+ add text').length * (fontSize * 0.6))}px`
          }}
        />
      ) : (
        <div
          onClick={handleStartEdit}
          className="bg-transparent border-0 border-none outline-none p-0 m-0 cursor-text select-none whitespace-nowrap"
          style={{
            fontSize: `${fontSize}px`,
            color: text === '' ? '#2196F3' : textColor,
            fontWeight: isBold ? 'bold' : 'normal',
            fontStyle: isItalic ? 'italic' : 'normal',
            lineHeight: '1.2',
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
