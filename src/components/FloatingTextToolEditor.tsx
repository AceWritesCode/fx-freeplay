import React, { useState, useEffect, useRef } from 'react';
import { TEXT_FONT_FAMILY, PADDING_HORIZONTAL, TOP_PADDING } from '@/framework/tools/implementations/TextTool';
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
  isSelected
}) => {
  const elRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const customSettings = overlay?.extendData?.customSettings || {};
  const text = customSettings.text || '';
  const textColor = customSettings.textColor || '#2196F3';
  const fontSize = customSettings.fontSize || 14;
  const textAlign = customSettings.textAlign || 'left';
  const isBold = !!customSettings.bold;
  const isItalic = !!customSettings.italic;

  const [inputText, setInputText] = useState(text);
  const [isEditing, setIsEditing] = useState(true);

  const isAnchorHovered = overlay?.extendData?.hoveredAnchorIndex !== null && overlay?.extendData?.hoveredAnchorIndex !== undefined;
  const isDragging = overlay?.extendData?.draggedIndex !== null && overlay?.extendData?.draggedIndex !== undefined;

  // Sync external text prop changes
  useEffect(() => {
    setInputText(text);
  }, [text]);

  // Adjust textarea height dynamically to content
  const autoResizeTextarea = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  useEffect(() => {
    autoResizeTextarea();
  }, [inputText, fontSize]);

  // When selected, activate edit mode and auto-focus immediately
  useEffect(() => {
    if (isSelected && !isAnchorHovered && !isDragging) {
      setIsEditing(true);
      try {
        if (chart && overlay?.id) {
          chart.overrideOverlay({
            id: overlay.id,
            extendData: {
              ...(overlay.extendData || {}),
              isEditingText: true
            }
          });
          DrawingChartAdapter.invalidatePane(chart);
        }
      } catch (_) {}

      const timer = setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.selectionStart = textareaRef.current.value.length;
          textareaRef.current.selectionEnd = textareaRef.current.value.length;
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isSelected]);

  // When mouse hovers over anchor or starts dragging, deactivate typing and save text immediately
  useEffect(() => {
    if (isAnchorHovered || isDragging) {
      if (isEditing) {
        setIsEditing(false);
        onTextChange(inputText);
        try {
          if (chart && overlay?.id) {
            chart.overrideOverlay({
              id: overlay.id,
              extendData: {
                ...(overlay.extendData || {}),
                isEditingText: false
              }
            });
            DrawingChartAdapter.invalidatePane(chart);
          }
        } catch (_) {}
      }
    }
  }, [isAnchorHovered, isDragging, isEditing, inputText]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        if (chart && overlay?.id) {
          chart.overrideOverlay({
            id: overlay.id,
            extendData: {
              ...(overlay.extendData || {}),
              isEditingText: false
            }
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
        const customSettings = overlay?.extendData?.customSettings || {};
        let x = 0;
        let y = 0;
        const boxWidth = customSettings.boxWidth !== undefined ? customSettings.boxWidth : 180;

        if (customSettings.isAnchored && !isSelected && customSettings.pinnedPixelPosition) {
          x = customSettings.pinnedPixelPosition.x;
          y = customSettings.pinnedPixelPosition.y;
        } else {
          const pixelPt = chart.convertToPixel([pts[0]], { paneId: 'candle_pane' })?.[0];
          if (pixelPt && typeof pixelPt.x === 'number' && typeof pixelPt.y === 'number') {
            x = pixelPt.x;
            y = pixelPt.y;
          }
        }

        elRef.current.style.left = `${x + PADDING_HORIZONTAL}px`;
        elRef.current.style.top = `${y + TOP_PADDING}px`;
        elRef.current.style.width = `${Math.max(30, boxWidth - PADDING_HORIZONTAL * 2)}px`;
      }

      if (isSelected) {
        requestAnimationFrame(updatePosition);
      }
    };

    updatePosition();
    return () => {
      active = false;
    };
  }, [overlay, chart, isSelected]);

  if (!isSelected) {
    return null;
  }

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (chart) {
      chart._clickedOnOverlay = true;
    }
    setIsEditing(true);
    try {
      if (chart && overlay?.id) {
        chart.overrideOverlay({
          id: overlay.id,
          extendData: {
            ...(overlay.extendData || {}),
            isEditingText: true
          }
        });
        DrawingChartAdapter.invalidatePane(chart);
      }
    } catch (_) {}

    setTimeout(() => {
      textareaRef.current?.focus();
    }, 30);
  };

  const lineHeight = Math.max(16, Math.round(fontSize * 1.35));

  return (
    <div
      ref={elRef}
      className={`absolute z-30 ${isEditing ? 'pointer-events-auto' : 'pointer-events-none'}`}
      style={{
        boxSizing: 'border-box'
      }}
      onClick={handleStartEdit}
      onMouseDown={(e) => {
        if (!isEditing) {
          handleStartEdit(e);
        } else {
          e.stopPropagation();
          if (chart) {
            chart._clickedOnOverlay = true;
          }
        }
      }}
    >
      <textarea
        ref={textareaRef}
        value={inputText}
        placeholder="Add text..."
        rows={1}
        disabled={!isEditing}
        onChange={(e) => {
          const val = e.target.value;
          setInputText(val);
          onTextChange(val);
          autoResizeTextarea();
        }}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Escape') {
            textareaRef.current?.blur();
            setIsEditing(false);
            try {
              if (chart && overlay?.id) {
                chart.overrideOverlay({
                  id: overlay.id,
                  extendData: {
                    ...(overlay.extendData || {}),
                    isEditingText: false
                  }
                });
                DrawingChartAdapter.invalidatePane(chart);
              }
            } catch (_) {}
          }
        }}
        className={`w-full bg-transparent border-none outline-none resize-none overflow-hidden placeholder:text-txt-muted/60 placeholder:font-normal ${
          isEditing ? 'pointer-events-auto cursor-text' : 'pointer-events-none opacity-0 select-none'
        }`}
        style={{
          color: textColor,
          fontSize: `${fontSize}px`,
          fontFamily: TEXT_FONT_FAMILY,
          fontWeight: isBold ? 'bold' : 'normal',
          fontStyle: isItalic ? 'italic' : 'normal',
          textAlign: textAlign as any,
          lineHeight: `${lineHeight}px`,
          minHeight: `${lineHeight}px`,
          padding: 0,
          margin: 0,
          boxSizing: 'border-box',
          verticalAlign: 'top',
          display: 'block',
          caretColor: textColor
        }}
      />
    </div>
  );
};
