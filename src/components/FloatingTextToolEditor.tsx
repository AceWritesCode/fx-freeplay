import React, { useState, useEffect, useRef } from 'react';
import {
  TEXT_FONT_FAMILY,
  PADDING_HORIZONTAL,
  TOP_PADDING,
  computeCompositeTextLayout,
  getSharedTextLineHeight,
  measureSharedText,
  checkOverlayVisible,
} from '@/framework/tools';
import { DrawingChartAdapter } from '@/engine/charting';

interface FloatingTextToolEditorProps {
  chart: any;
  overlay: any;
  onTextChange: (newText: string) => void;
  isSelected: boolean;
  isHovered?: boolean;
  syncAllDrawings: () => void;
}

export const FloatingTextToolEditor: React.FC<FloatingTextToolEditorProps> = ({
  chart,
  overlay,
  onTextChange,
  isSelected,
}) => {
  const elRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const customSettings = overlay?.extendData?.customSettings || {};
  const text = typeof customSettings.text === 'string' ? customSettings.text : '';
  const textColor = customSettings.textColor || '#2196F3';
  const fontSize = customSettings.fontSize || 14;
  const textAlign = customSettings.textAlign || 'left';
  const isBold = !!customSettings.bold;
  const isItalic = !!customSettings.italic;

  const [inputText, setInputText] = useState(text);
  const [isEditing, setIsEditing] = useState(false);
  const wasEditingRef = useRef(false);
  const backupTextRef = useRef('');

  const isLineVisible = checkOverlayVisible(overlay, chart);
  const hasActualText = text.trim() !== '' && text.trim() !== 'Add text' && text.trim() !== '+ Add text';
  const shouldShow = isLineVisible && (hasActualText || isEditing || isSelected);

  // Sync external text prop changes
  useEffect(() => {
    setInputText(text);
  }, [text]);

  const handleExit = (finalText: string) => {
    if (!wasEditingRef.current && !isEditing) return;
    wasEditingRef.current = false;
    setIsEditing(false);
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
  };

  // When selected, activate edit mode if empty or when clicked
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

        const timer = setTimeout(() => {
          if (textareaRef.current) {
            textareaRef.current.focus();
            textareaRef.current.select();
          }
        }, 50);
        return () => clearTimeout(timer);
      }
    } else if (wasEditingRef.current) {
      // User clicked away / deselected while actively editing
      handleExit(inputText);
    }
  }, [isSelected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        if (chart && overlay?.id) {
          chart.overrideOverlay({
            id: overlay.id,
            extendData: {
              ...(overlay.extendData || {}),
              isEditingText: false,
            },
          });
          DrawingChartAdapter.invalidatePane(chart);
        }
      } catch (_) {}
    };
  }, [chart, overlay?.id]);

  // Continuously update position using requestAnimationFrame to track chart pan/zoom seamlessly
  useEffect(() => {
    let active = true;

    const updatePosition = () => {
      if (!active) return;

      const pts = overlay?.points;
      if (pts && pts.length >= 1 && chart && elRef.current) {
        const settings = overlay?.extendData?.customSettings || {};
        let x = 0;
        let y = 0;
        const placeholderMetrics = measureSharedText('Add text', fontSize, isBold, isItalic);
        const initialBoxWidth = Math.ceil(placeholderMetrics.width + PADDING_HORIZONTAL * 2);
        const boxWidth = settings.boxWidth !== undefined ? settings.boxWidth : initialBoxWidth;

        if (settings.isAnchored && !isSelected && settings.pinnedPixelPosition) {
          x = settings.pinnedPixelPosition.x;
          y = settings.pinnedPixelPosition.y;
        } else {
          const pixelPt = chart.convertToPixel([pts[0]], { paneId: 'candle_pane' })?.[0];
          if (pixelPt && typeof pixelPt.x === 'number' && typeof pixelPt.y === 'number') {
            x = pixelPt.x;
            y = pixelPt.y;
          }
        }

        const currentText = isEditing ? inputText : text;
        const layout = computeCompositeTextLayout({
          origin: { x, y },
          text: currentText || 'Add text',
          fontSize,
          isBold,
          isItalic,
          textAlign,
          boxWidth,
          paddingX: PADDING_HORIZONTAL,
          paddingY: TOP_PADDING,
        });

        elRef.current.style.left = `${layout.box.x + layout.paddingX}px`;
        elRef.current.style.top = `${layout.box.y + layout.paddingY}px`;
        elRef.current.style.width = `${layout.box.width - layout.paddingX * 2}px`;
        elRef.current.style.height = `${layout.box.height - layout.paddingY * 2}px`;
      }

      requestAnimationFrame(updatePosition);
    };

    updatePosition();
    return () => {
      active = false;
    };
  }, [overlay, chart, text, inputText, fontSize, isBold, isItalic, textAlign, isEditing, isSelected]);

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (chart) {
      chart._clickedOnOverlay = true;
    }
    setIsEditing(true);
    wasEditingRef.current = true;
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
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }, 30);
  };


  if (!shouldShow) {
    return null;
  }

  const lineHeight = getSharedTextLineHeight(fontSize);
  const justifyClass =
    textAlign === 'left' ? 'text-left' : textAlign === 'right' ? 'text-right' : 'text-center';

  return (
    <div
      ref={elRef}
      data-no-deselect="true"
      data-floating-ui="true"
      className="absolute z-30 pointer-events-auto cursor-text overflow-hidden"
      style={{
        boxSizing: 'border-box',
        fontFamily: TEXT_FONT_FAMILY,
        fontSize: `${fontSize}px`,
        color: textColor,
        fontWeight: isBold ? 'bold' : 'normal',
        fontStyle: isItalic ? 'italic' : 'normal',
        lineHeight: `${lineHeight}px`,
        textAlign: textAlign as any,
      }}
      onClick={handleStartEdit}
      onMouseDown={(e) => {
        e.stopPropagation();
        if (chart) {
          chart._clickedOnOverlay = true;
        }
        if (!isEditing) {
          handleStartEdit(e);
        }
      }}
    >
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={inputText}
          placeholder="Add text"
          rows={Math.max(1, inputText.split('\n').length)}
          onChange={(e) => {
            const val = e.target.value;
            setInputText(val);
            onTextChange(val);
            try {
              if (chart && overlay?.id) {
                DrawingChartAdapter.invalidatePane(chart);
              }
            } catch (_) {}
          }}
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
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === 'Escape') {
              textareaRef.current?.blur();
              handleExit(inputText);
            }
          }}
          className={`w-full h-full bg-transparent border-none outline-none resize-none overflow-hidden placeholder:text-current placeholder:font-normal select-text ${justifyClass}`}
          style={{
            fontFamily: TEXT_FONT_FAMILY,
            fontSize: `${fontSize}px`,
            color: textColor,
            fontWeight: isBold ? 'bold' : 'normal',
            fontStyle: isItalic ? 'italic' : 'normal',
            lineHeight: `${lineHeight}px`,
            textAlign: textAlign as any,
            padding: 0,
            margin: 0,
            width: '100%',
            height: '100%',
            wordBreak: 'break-all',
            overflowWrap: 'anywhere',
            whiteSpace: 'pre-wrap',
            boxSizing: 'border-box',
            verticalAlign: 'top',
            display: 'block',
            caretColor: textColor,
          }}
        />
      ) : (
        <div
          className={`w-full h-full bg-transparent border-none outline-none p-0 m-0 cursor-text select-none ${justifyClass}`}
          style={{
            fontFamily: TEXT_FONT_FAMILY,
            fontSize: `${fontSize}px`,
            color: textColor,
            fontWeight: isBold ? 'bold' : 'normal',
            fontStyle: isItalic ? 'italic' : 'normal',
            lineHeight: `${lineHeight}px`,
            textAlign: textAlign as any,
            wordBreak: 'break-all',
            overflowWrap: 'anywhere',
            whiteSpace: 'pre-wrap',
            boxSizing: 'border-box',
            margin: 0,
            padding: 0,
          }}
        >
          {text === '' ? 'Add text' : text}
        </div>
      )}
    </div>
  );
};
