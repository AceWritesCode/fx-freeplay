import React, { useState, useEffect, useRef } from 'react';
import { DrawingChartAdapter } from '@/engine/charting';
import { checkOverlayVisible } from '@/framework/tools/toolUtils';
import {
  computeCompositeCalloutLayout,
  CALLOUT_FONT_FAMILY,
  getCalloutLineHeight,
} from '@/framework/tools/implementations/CalloutTool';

interface FloatingCalloutTextProps {
  chart: any;
  overlay: any;
  onTextChange: (newText: string) => void;
  onDelete?: (overlayId: string) => void;
  isSelected: boolean;
  isHovered?: boolean;
  syncAllDrawings?: () => void;
}

export const FloatingCalloutText: React.FC<FloatingCalloutTextProps> = ({
  chart,
  overlay,
  onTextChange,
  onDelete,
  isSelected,
  isHovered = false,
}) => {
  const isLineDrawn = overlay?.points && overlay.points.length >= 2;
  if (!isLineDrawn) {
    return null;
  }

  return (
    <FloatingCalloutTextInner
      chart={chart}
      overlay={overlay}
      onTextChange={onTextChange}
      onDelete={onDelete}
      isSelected={isSelected}
      isHovered={isHovered}
    />
  );
};

const FloatingCalloutTextInner: React.FC<FloatingCalloutTextProps> = ({
  chart,
  overlay,
  onTextChange,
  onDelete,
  isSelected,
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

  // Show whenever callout is visible and (has actual text OR is selected OR is editing)
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

  const handleStartEdit = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (chart) {
      chart._clickedOnOverlay = true;
    }
    backupTextRef.current = text;
    wasEditingRef.current = true;
    setIsEditing(true);

    const initialInput = (text === 'Add text' || text === '+ Add text') ? '' : text;
    setInputText(initialInput);

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
        textareaRef.current.select();
      }
    }, 50);
  };

  // When selected or when isEditingText is set externally, enter edit mode
  useEffect(() => {
    const isEditingFromOverlay = !!overlay?.extendData?.isEditingText;
    if (isSelected || isEditingFromOverlay) {
      if (!hasActualText || isEditingFromOverlay) {
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
    } else if (wasEditingRef.current || isEditing) {
      // User clicked away while actively editing
      handleExit(inputText);
    }
  }, [isSelected, isEditing, inputText, overlay?.extendData?.isEditingText]);

  // Handle position tracking via requestAnimationFrame
  useEffect(() => {
    let active = true;
    const updatePosition = () => {
      if (!active) return;

      const pts = overlay.points;
      if (pts && pts.length === 2 && chart && elRef.current) {
        const rawAnchor = pts[0];
        const rawBoxCenter = pts[1];

        const cleanAnchor = {
          ...(rawAnchor.timestamp !== undefined ? { timestamp: rawAnchor.timestamp } : {}),
          ...(rawAnchor.dataIndex !== undefined ? { dataIndex: rawAnchor.dataIndex } : {}),
          value: rawAnchor.value,
        };
        const cleanBoxCenter = {
          ...(rawBoxCenter.timestamp !== undefined ? { timestamp: rawBoxCenter.timestamp } : {}),
          ...(rawBoxCenter.dataIndex !== undefined ? { dataIndex: rawBoxCenter.dataIndex } : {}),
          value: rawBoxCenter.value,
        };

        let pixelPts = chart.convertToPixel([cleanAnchor, cleanBoxCenter], { paneId: 'candle_pane' });
        if (!pixelPts || !Array.isArray(pixelPts) || pixelPts.some((p: any) => !p || typeof p.x !== 'number')) {
          pixelPts = chart.convertToPixel([rawAnchor, rawBoxCenter], { paneId: 'candle_pane' });
        }

        if (pixelPts && pixelPts[0] && pixelPts[1]) {
          const currentText = isEditing ? inputText : text;
          const displayText = (currentText && currentText.trim().length > 0) ? currentText : 'Add text';

          const layout = computeCompositeCalloutLayout(
            pixelPts[0],
            pixelPts[1],
            displayText,
            fontSize,
            isBold,
            isItalic,
            textAlign,
            textValign
          );

          elRef.current.style.transform = `translate(${layout.box.x}px, ${layout.box.y}px)`;
          elRef.current.style.width = `${layout.box.width}px`;
          elRef.current.style.height = `${layout.box.height}px`;
        }
      }
      requestAnimationFrame(updatePosition);
    };

    updatePosition();
    return () => {
      active = false;
    };
  }, [overlay, chart, text, inputText, fontSize, isBold, isItalic, textAlign, textValign, isEditing, isSelected]);

  // Clean up transient flags on unmount
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

  if (!shouldShow) return null;

  const currentDisplay = (text && text.trim().length > 0) ? text : 'Add text';

  return (
    <div
      ref={elRef}
      data-no-deselect="true"
      data-floating-ui="true"
      onMouseDown={(e) => {
        if (isEditing) {
          e.stopPropagation();
        }
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
      className={`absolute top-0 left-0 z-30 select-none ${isEditing ? 'pointer-events-auto' : 'pointer-events-none'} bg-transparent p-0 m-0 border-none outline-none flex`}
      style={{
        boxSizing: 'border-box',
        padding: '6px 10px',
        alignItems: textValign === 'top' ? 'flex-start' : (textValign === 'bottom' ? 'flex-end' : 'center'),
        justifyContent: textAlign === 'left' ? 'flex-start' : (textAlign === 'right' ? 'flex-end' : 'center'),
      }}
    >
      {isEditing ? (
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={(e) => {
            setInputText(e.target.value);
            onTextChange(e.target.value);
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
            if (e.key === 'Escape') {
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
            } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleExit(inputText);
            }
          }}
          placeholder="Add text"
          className="w-full h-full bg-transparent border-0 border-none outline-none focus:outline-none focus:ring-0 p-0 m-0 cursor-text select-text resize-none overflow-hidden"
          style={{
            fontFamily: CALLOUT_FONT_FAMILY,
            fontSize: `${fontSize}px`,
            color: textColor,
            fontWeight: isBold ? 'bold' : 'normal',
            fontStyle: isItalic ? 'italic' : 'normal',
            lineHeight: `${getCalloutLineHeight(fontSize)}px`,
            textAlign: textAlign,
            margin: 0,
            padding: 0,
            boxSizing: 'border-box',
          }}
        />
      ) : (
        <div
          onClick={handleStartEdit}
          className="w-full h-full bg-transparent border-0 border-none outline-none p-0 m-0 select-none whitespace-pre-wrap break-words transition-opacity hover:opacity-80 flex"
          style={{
            fontFamily: CALLOUT_FONT_FAMILY,
            fontSize: `${fontSize}px`,
            color: textColor,
            fontWeight: isBold ? 'bold' : 'normal',
            fontStyle: isItalic ? 'italic' : 'normal',
            lineHeight: `${getCalloutLineHeight(fontSize)}px`,
            textAlign: textAlign,
            alignItems: textValign === 'top' ? 'flex-start' : (textValign === 'bottom' ? 'flex-end' : 'center'),
            justifyContent: textAlign === 'left' ? 'flex-start' : (textAlign === 'right' ? 'flex-end' : 'center'),
            margin: 0,
            padding: 0,
            boxSizing: 'border-box',
          }}
        >
          {currentDisplay}
        </div>
      )}
    </div>
  );
};
