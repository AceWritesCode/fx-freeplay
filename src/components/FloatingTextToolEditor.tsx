import React, { useState, useEffect, useRef } from 'react';
import { TEXT_FONT_FAMILY, PADDING_HORIZONTAL, TOP_PADDING } from '@/framework/tools/implementations/TextTool';

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

  // When selected, auto-focus immediately!
  useEffect(() => {
    if (isSelected) {
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

  const lineHeight = Math.max(16, Math.round(fontSize * 1.35));

  return (
    <div
      ref={elRef}
      className="absolute pointer-events-auto z-30"
      style={{
        boxSizing: 'border-box'
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => {
        e.stopPropagation();
        if (chart) {
          chart._clickedOnOverlay = true;
        }
      }}
    >
      <textarea
        ref={textareaRef}
        value={inputText}
        placeholder="Add text..."
        rows={1}
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
          }
        }}
        className="w-full bg-transparent border-none outline-none resize-none overflow-hidden placeholder:text-txt-muted/60 placeholder:font-normal"
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
