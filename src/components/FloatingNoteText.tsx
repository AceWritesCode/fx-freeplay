import React, { useState, useEffect, useRef } from 'react';
import { DrawingChartAdapter } from '@/engine/charting';
import { checkOverlayVisible } from '@/framework/tools/toolUtils';
import {
  computeCompositeNoteLayout,
  NOTE_FONT_FAMILY,
  getNoteLineHeight,
} from '@/framework/tools/implementations/NoteTool';

interface FloatingNoteTextProps {
  chart: any;
  overlay: any;
  onTextChange: (newText: string) => void;
  onDelete?: (overlayId: string) => void;
  isSelected: boolean;
  isHovered?: boolean;
  syncAllDrawings: () => void;
}

export const FloatingNoteText: React.FC<FloatingNoteTextProps> = ({
  chart,
  overlay,
  onTextChange,
  onDelete,
  isSelected,
  isHovered = false,
  syncAllDrawings,
}) => {
  const isLineDrawn = overlay?.points && overlay.points.length >= 2;
  if (!isLineDrawn) {
    return null;
  }

  return (
    <FloatingNoteTextInner
      chart={chart}
      overlay={overlay}
      onTextChange={onTextChange}
      onDelete={onDelete}
      isSelected={isSelected}
      isHovered={isHovered}
      syncAllDrawings={syncAllDrawings}
    />
  );
};

const FloatingNoteTextInner: React.FC<FloatingNoteTextProps> = ({
  chart,
  overlay,
  onTextChange,
  onDelete,
  isSelected,
  syncAllDrawings,
}) => {
  const elRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backupTextRef = useRef('');
  const wasEditingRef = useRef(false);

  const customSettings = overlay?.extendData?.customSettings || {};
  const text = typeof customSettings.text === 'string' ? customSettings.text : '';
  const textColor = customSettings.textColor || '#ffffff';
  const fontSize = customSettings.fontSize || 14;
  const isBold = !!customSettings.bold;
  const isItalic = !!customSettings.italic;
  const textAlign = customSettings.textAlign || 'center';
  const textValign = customSettings.textValign || 'middle';

  const [isEditing, setIsEditing] = useState(false);
  const [inputText, setInputText] = useState(text);

  const isLineVisible = checkOverlayVisible(overlay, chart);
  const hasActualText = text.trim() !== '' && text.trim() !== 'Add text' && text.trim() !== '+ Add text';

  // Show whenever line is visible and (has actual text OR is selected OR is editing)
  const shouldShow = isLineVisible && (hasActualText || isEditing || isSelected);

  // Sync external text prop changes
  useEffect(() => {
    setInputText(text);
  }, [text]);

  const handleExit = (finalText: string) => {
    if (!wasEditingRef.current && !isEditing) return;
    wasEditingRef.current = false;
    setIsEditing(false);

    const trimmed = (finalText || '').trim();
    const isUntouchedOrEmpty =
      trimmed === '' ||
      trimmed === 'Add text' ||
      trimmed === '+ Add text';

    if (isUntouchedOrEmpty) {
      if (onDelete && overlay?.id) {
        onDelete(overlay.id);
      }
    } else {
      onTextChange(finalText);
      try {
        if (chart && overlay?.id) {
          chart.overrideOverlay({
            id: overlay.id,
            extendData: {
              ...(overlay.extendData || {}),
              isEditingText: false,
              customSettings: {
                ...(overlay.extendData?.customSettings || {}),
                text: finalText,
              },
            },
          });
          DrawingChartAdapter.invalidatePane(chart);
        }
      } catch (_) {}
    }
  };

  // When selected, enter edit mode if text is empty/placeholder
  useEffect(() => {
    if (isSelected) {
      if (!hasActualText) {
        setIsEditing(true);
        wasEditingRef.current = true;
        setInputText(text);
        backupTextRef.current = text;
        try {
          if (chart && overlay?.id) {
            chart.overrideOverlay({
              id: overlay.id,
              extendData: {
                ...(overlay.extendData || {}),
                isEditingText: true,
              },
            });
            DrawingChartAdapter.invalidatePane(chart);
          }
        } catch (_) {}

        setTimeout(() => {
          textareaRef.current?.focus();
          textareaRef.current?.select();
        }, 30);
      }
    } else if (wasEditingRef.current) {
      // User clicked away while actively editing
      handleExit(inputText);
    }
  }, [isSelected]);

  // Position DOM element exactly over the note box using the composite layout
  useEffect(() => {
    let active = true;
    const updatePosition = () => {
      if (!active) return;

      const pts = overlay.points;
      if (pts && pts.length === 2 && chart && elRef.current) {
        const pixelPts = chart.convertToPixel(pts, { paneId: 'candle_pane' });
        if (pixelPts && pixelPts[0] && pixelPts[1]) {
          const currentText = isEditing ? inputText : text;
          const layout = computeCompositeNoteLayout(
            pixelPts[0],
            pixelPts[1],
            currentText || 'Add text',
            fontSize,
            isBold,
            isItalic,
            textAlign,
            textValign
          );

          elRef.current.style.transform = `translate(${layout.box.x + layout.paddingX}px, ${layout.box.y + layout.paddingY}px)`;
          elRef.current.style.width = `${layout.box.width - layout.paddingX * 2}px`;
          elRef.current.style.height = `${layout.box.height - layout.paddingY * 2}px`;
        }
      }
      requestAnimationFrame(updatePosition);
    };

    updatePosition();
    return () => {
      active = false;
    };
  }, [overlay, chart, text, inputText, fontSize, isBold, isItalic, textAlign, textValign, isEditing, isSelected]);

  // Real-time measurement synchronization
  useEffect(() => {
    if (elRef.current) {
      const width = elRef.current.scrollWidth;
      const height = elRef.current.scrollHeight;
      if (width && (width !== overlay.extendData?.textWidth || height !== overlay.extendData?.textHeight)) {
        chart.overrideOverlay({
          id: overlay.id,
          extendData: {
            ...(overlay.extendData || {}),
            textWidth: width,
            textHeight: height,
          },
        });
        setTimeout(() => syncAllDrawings(), 50);
      }
    }
  }, [text, inputText, isEditing, fontSize, isBold, isItalic]);

  // Guaranteed cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        if (chart && overlay?.id) {
          chart.overrideOverlay({
            id: overlay.id,
            extendData: {
              ...(overlay.extendData || {}),
              isHovered: false,
              isEditingText: false,
            },
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
    wasEditingRef.current = true;
    setInputText(text);

    try {
      chart.overrideOverlay({
        id: overlay.id,
        extendData: {
          ...(overlay.extendData || {}),
          isEditingText: true,
        },
      });
      DrawingChartAdapter.invalidatePane(chart);
    } catch (_) {}

    setTimeout(() => {
      textareaRef.current?.focus();
      textareaRef.current?.select();
    }, 50);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setInputText(val);
    onTextChange(val);

    try {
      if (chart && overlay?.id) {
        DrawingChartAdapter.invalidatePane(chart);
      }
    } catch (_) {}
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter or Cmd+Enter finishes editing
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleExit(inputText);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      const prevTrimmed = (backupTextRef.current || '').trim();
      if (prevTrimmed === '' || prevTrimmed === 'Add text' || prevTrimmed === '+ Add text') {
        if (onDelete && overlay?.id) {
          onDelete(overlay.id);
        }
      } else {
        setInputText(backupTextRef.current);
        handleExit(backupTextRef.current);
      }
    }
  };

  if (!shouldShow) return null;

  const lineHeight = getNoteLineHeight(fontSize);

  const justifyClass =
    textAlign === 'left' ? 'justify-start' : textAlign === 'right' ? 'justify-end' : 'justify-center';
  const itemsClass =
    textValign === 'top' ? 'items-start' : textValign === 'bottom' ? 'items-end' : 'items-center';

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
      onMouseEnter={() => {
        try {
          if (chart && overlay?.id) {
            chart.overrideOverlay({
              id: overlay.id,
              extendData: {
                ...(overlay.extendData || {}),
                isHovered: true,
              },
            });
            DrawingChartAdapter.invalidatePane(chart);
          }
        } catch (_) {}
      }}
      onMouseLeave={() => {
        try {
          if (chart && overlay?.id) {
            chart.overrideOverlay({
              id: overlay.id,
              extendData: {
                ...(overlay.extendData || {}),
                isHovered: false,
              },
            });
            DrawingChartAdapter.invalidatePane(chart);
          }
        } catch (_) {}
      }}
      className={`absolute top-0 left-0 z-30 select-none pointer-events-auto origin-top-left bg-transparent p-0 m-0 border-none outline-none flex ${justifyClass} ${itemsClass}`}
      style={{
        fontFamily: NOTE_FONT_FAMILY,
        fontSize: `${fontSize}px`,
        color: textColor,
        fontWeight: isBold ? 'bold' : 'normal',
        fontStyle: isItalic ? 'italic' : 'normal',
        lineHeight: `${lineHeight}px`,
        textAlign: textAlign as any,
      }}
    >
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={handleInputChange}
          onBlur={(e) => {
            const relatedTarget = e.relatedTarget as HTMLElement | null;
            if (
              relatedTarget &&
              (relatedTarget.closest('.drawing-floating-toolbar') ||
                relatedTarget.closest('[data-floating-ui="true"]'))
            ) {
              return;
            }
            handleExit(inputText);
          }}
          onKeyDown={handleKeyDown}
          placeholder="Add text"
          rows={Math.max(1, inputText.split('\n').length)}
          className={`w-full h-full bg-transparent border-0 border-none outline-none focus:outline-none focus:ring-0 p-0 m-0 cursor-text select-text resize-none overflow-hidden ${
            textAlign === 'left' ? 'text-left' : textAlign === 'right' ? 'text-right' : 'text-center'
          }`}
          style={{
            fontFamily: NOTE_FONT_FAMILY,
            fontSize: `${fontSize}px`,
            color: textColor,
            fontWeight: isBold ? 'bold' : 'normal',
            fontStyle: isItalic ? 'italic' : 'normal',
            lineHeight: `${lineHeight}px`,
            textAlign: textAlign as any,
            margin: 0,
            padding: 0,
            boxSizing: 'border-box',
          }}
        />
      ) : (
        <div
          onClick={handleStartEdit}
          className={`w-full h-full bg-transparent border-0 border-none outline-none p-0 m-0 cursor-text select-none flex flex-col ${justifyClass} ${itemsClass}`}
          style={{
            fontFamily: NOTE_FONT_FAMILY,
            fontSize: `${fontSize}px`,
            color: textColor,
            fontWeight: isBold ? 'bold' : 'normal',
            fontStyle: isItalic ? 'italic' : 'normal',
            lineHeight: `${lineHeight}px`,
            textAlign: textAlign as any,
            margin: 0,
            padding: 0,
            boxSizing: 'border-box',
          }}
        >
          {text === '' ? (
            <span style={{ display: 'block', minHeight: `${lineHeight}px`, width: '100%' }}>Add text</span>
          ) : (
            text.split('\n').map((line: string, idx: number) => (
              <span key={idx} style={{ display: 'block', minHeight: `${lineHeight}px`, width: '100%' }}>
                {line || '\u00A0'}
              </span>
            ))
          )}
        </div>
      )}
    </div>
  );
};
