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

interface FloatingTextComponentProps {
  chart: any;
  overlay: any;
  isSelected: boolean;
  isHovered?: boolean;
  onTextChange: (newText: string) => void;
  onDelete?: () => void;
  onUpdateSettings?: (update: any) => void;
  syncAllDrawings: () => void;
}

export const FloatingTextComponent: React.FC<FloatingTextComponentProps> = ({
  chart,
  overlay,
  isSelected,
  isHovered: _isHovered = false,
  onTextChange,
  onDelete,
  onUpdateSettings,
  syncAllDrawings
}) => {
  const elRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isResizingRef = useRef(false);
  const resizeStartRef = useRef<{ startX: number; startWidth: number }>({ startX: 0, startWidth: 200 });

  const customSettings = overlay?.extendData?.customSettings || {};
  const text = customSettings.text || '';
  const textColor = customSettings.textColor || '#2196F3';
  const fontSize = customSettings.fontSize || 14;
  const isBold = !!customSettings.bold;
  const isItalic = !!customSettings.italic;
  const fillBackground = !!customSettings.fillBackground;
  const fillColor = customSettings.fillColor || 'rgba(33, 150, 243, 0.1)';
  const showBorder = customSettings.showBorder !== false;
  const lineColor = customSettings.lineColor || '#2196F3';
  const boxWidth = customSettings.boxWidth || 200;

  const [isEditing, setIsEditing] = useState(false);
  const [inputText, setInputText] = useState(text);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  const isDrawn = overlay?.points && overlay.points.length > 0 && (!!overlay?.extendData?.isDrawn || ((chart as any)?._activeDrawingId !== overlay?.id && overlay?.extendData?.isDrawn !== false));
  const isVisible = checkOverlayVisible(overlay, chart);

  // Auto-enter edit mode for newly created text boxes
  useEffect(() => {
    if (overlay?.extendData?.isNewText) {
      setIsEditing(true);
      setInputText('');
      // Clear isNewText marker
      if (chart) {
        chart.overrideOverlay({
          id: overlay.id,
          extendData: {
            ...overlay.extendData,
            isNewText: false
          }
        });
      }
    }
  }, [overlay?.extendData?.isNewText]);

  // Keep local input text synchronized with overlay customSettings text when not actively editing
  useEffect(() => {
    if (!isEditing) {
      setInputText(text);
    }
  }, [text, isEditing]);

  // Position update loop (converts point 0 to canvas pixel space)
  useEffect(() => {
    let active = true;
    const updatePos = () => {
      if (!active) return;
      const pts = overlay?.points;
      if (pts && pts.length > 0 && chart && elRef.current) {
        const pixelPts = chart.convertToPixel(pts, { paneId: 'candle_pane' });
        if (pixelPts && pixelPts[0] && typeof pixelPts[0].x === 'number' && Number.isFinite(pixelPts[0].x)) {
          setPosition({ x: pixelPts[0].x, y: pixelPts[0].y });
        }
      }
    };

    updatePos();
    const animationFrameId = requestAnimationFrame(updatePos);
    return () => {
      active = false;
      cancelAnimationFrame(animationFrameId);
    };
  }, [overlay, chart]);

  // Focus textarea when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isEditing]);

  if (!isDrawn || !isVisible || !position) return null;

  const handleFinishEditing = (saveValue?: string) => {
    const finalVal = (saveValue !== undefined ? saveValue : inputText).trim();
    setIsEditing(false);
    if (finalVal === '') {
      if (onDelete) onDelete();
    } else {
      onTextChange(finalVal);
    }
  };

  // Handle right-edge handle drag resizing
  const handleResizePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    isResizingRef.current = true;
    resizeStartRef.current = { startX: e.clientX, startWidth: boxWidth };

    const handlePointerMove = (moveEv: PointerEvent) => {
      if (!isResizingRef.current) return;
      const dx = moveEv.clientX - resizeStartRef.current.startX;
      const newW = Math.max(60, resizeStartRef.current.startWidth + dx);
      if (onUpdateSettings) {
        onUpdateSettings({ boxWidth: newW });
      }
    };

    const handlePointerUp = () => {
      isResizingRef.current = false;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      syncAllDrawings();
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  return (
    <div
      ref={elRef}
      onMouseDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => {
        e.stopPropagation();
        setIsEditing(true);
      }}
      style={{
        position: 'absolute',
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${boxWidth}px`,
        zIndex: isEditing ? 50 : 20,
        backgroundColor: fillBackground ? fillColor : 'transparent',
        border: showBorder ? `1px solid ${lineColor}` : '1px stroke-dashed transparent',
        borderRadius: '4px',
        padding: '4px 6px',
        color: textColor,
        fontSize: `${fontSize}px`,
        fontWeight: isBold ? 'bold' : 'normal',
        fontStyle: isItalic ? 'italic' : 'normal',
        wordBreak: 'break-word',
        whiteSpace: 'pre-wrap',
        cursor: 'default',
        boxSizing: 'border-box',
      }}
      className={`floating-text-container select-text ${isSelected ? 'ring-1 ring-accent' : ''}`}
    >
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onBlur={() => handleFinishEditing()}
          onKeyDown={(e) => {
            e.stopPropagation(); // Stop global chart hotkeys while typing
            if (e.key === 'Escape') {
              handleFinishEditing();
            }
          }}
          onKeyUp={(e) => e.stopPropagation()}
          onKeyPress={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            minHeight: '28px',
            backgroundColor: 'transparent',
            color: 'inherit',
            fontSize: 'inherit',
            fontWeight: 'inherit',
            fontStyle: 'inherit',
            fontFamily: 'inherit',
            outline: 'none',
            border: 'none',
            resize: 'none',
            padding: 0,
            margin: 0,
            wordBreak: 'break-word',
            whiteSpace: 'pre-wrap',
          }}
          placeholder="Type text…"
        />
      ) : (
        <div className="min-h-[20px] pointer-events-auto">
          {text || <span className="opacity-40 italic text-xs">+ add text</span>}
        </div>
      )}

      {/* Resize handle at right border when selected */}
      {isSelected && !overlay.lock && (
        <div
          onPointerDown={handleResizePointerDown}
          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-accent/40 rounded-r flex items-center justify-center"
          title="Drag to resize text width"
        >
          <div className="w-1 h-3 bg-accent rounded-full" />
        </div>
      )}
    </div>
  );
};
