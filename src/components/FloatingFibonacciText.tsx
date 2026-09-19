import React, { useState, useEffect, useRef } from 'react';
import { DrawingChartAdapter } from '@/engine/charting';
import { checkOverlayVisible } from '@/framework/tools/toolUtils';
import {
  calculateFibLevelPrice,
  DEFAULT_FIB_LEVELS,
  getFibLevelLabelText,
  computeFibLevelLayout,
} from '@/framework/tools/implementations/FibonacciRetracement';

interface FloatingFibLevelItemProps {
  chart: any;
  overlay: any;
  level: { level: number; color: string; enabled: boolean; text?: string };
  userText: string;
  onTextChange: (newText: string) => void;
  isSelected: boolean;
  isLevelHovered: boolean;
  syncAllDrawings: () => void;
}

const FloatingFibLevelItem: React.FC<FloatingFibLevelItemProps> = ({
  chart,
  overlay,
  level,
  userText,
  onTextChange,
  isSelected,
  isLevelHovered,
  syncAllDrawings,
}) => {
  const labelElRef = useRef<HTMLDivElement>(null);
  const customElRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const backupTextRef = useRef('');

  const [isEditing, setIsEditing] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isDomHovered, setIsDomHovered] = useState(false);

  const customSettings = overlay?.extendData?.customSettings || {};
  const isLineDrawn = overlay?.points && overlay.points.length >= 2;
  const isVisible = checkOverlayVisible(overlay, chart);
  const isHoveredActive = isLevelHovered || isDomHovered;
  const hasActualText = typeof userText === 'string' && userText.trim() !== '';

  const labelColor = customSettings.useOneColor
    ? (customSettings.oneTextColor || customSettings.oneColor || '#808080')
    : (level.color || '#808080');

  const textColor = customSettings.useOneColor
    ? (customSettings.oneTextColor || customSettings.oneColor || '#808080')
    : (level.color || '#2196F3');

  const fontSize = customSettings.fontSize || 12;
  const isBold = !!customSettings.bold;
  const isItalic = !!customSettings.italic;

  const showCustomText = customSettings.showCustomText !== false;

  // Calculate target price and label string
  const p0Val = overlay?.points?.[0]?.value ?? 0;
  const p1Val = overlay?.points?.[1]?.value ?? 0;
  const targetPrice = calculateFibLevelPrice(p0Val, p1Val, level.level, customSettings.reverse);
  const labelStr = getFibLevelLabelText(level.level, targetPrice, customSettings);

  const shouldShowLabel = isLineDrawn && isVisible && Boolean(labelStr && labelStr.trim() !== '');
  const shouldShowCustom = isLineDrawn && isVisible && showCustomText && (
    hasActualText || (isSelected && (isHoveredActive || isEditing))
  );

  useEffect(() => {
    let active = true;
    const updatePosition = () => {
      if (!active) return;

      const pts = overlay?.points;
      if (pts && pts.length >= 2 && chart) {
        const p0 = pts[0];
        const p1 = pts[1];
        const p0Pixel = chart.convertToPixel([p0], { paneId: 'candle_pane' });
        const p1Pixel = chart.convertToPixel([p1], { paneId: 'candle_pane' });

        if (p0Pixel && p0Pixel[0] && p1Pixel && p1Pixel[0]) {
          const currentTargetPrice = calculateFibLevelPrice(p0.value, p1.value, level.level, customSettings.reverse);
          const levelPixel = chart.convertToPixel([{ value: currentTargetPrice }], { paneId: 'candle_pane' });

          if (levelPixel && levelPixel[0] && typeof levelPixel[0].y === 'number' && Number.isFinite(levelPixel[0].y)) {
            const chartWidth = chart.getWidth ? chart.getWidth() : (chart._chartWidth || 1000);
            const xMin = Math.min(p0Pixel[0].x, p1Pixel[0].x);
            const xMax = Math.max(p0Pixel[0].x, p1Pixel[0].x);

            let startX = xMin;
            let endX = xMax;
            const extend = customSettings.extend || 'none';
            if (extend === 'left') {
              startX = 0;
              endX = xMax;
            } else if (extend === 'right') {
              startX = xMin;
              endX = chartWidth;
            } else if (extend === 'both') {
              startX = 0;
              endX = chartWidth;
            }

            const currentLabelStr = getFibLevelLabelText(level.level, currentTargetPrice, customSettings);
            let currentCustomText = '';
            if (showCustomText) {
              if (hasActualText) {
                currentCustomText = isEditing ? inputText : userText;
              } else if (isLineDrawn && isSelected && (isHoveredActive || isEditing)) {
                currentCustomText = isEditing ? inputText : '+ Add text';
              }
            }

            const layout = computeFibLevelLayout({
              startX,
              endX,
              y: levelPixel[0].y,
              labelStr: currentLabelStr,
              labelsPosition: customSettings.labelsPosition,
              labelWidth: labelElRef.current?.offsetWidth || overlay.extendData?.labelWidthMap?.[String(level.level)],
              customText: currentCustomText,
              textPosition: customSettings.textPosition,
              customTextWidth: customElRef.current?.offsetWidth || overlay.extendData?.textWidthMap?.[String(level.level)],
              fontSize,
            });

            if (labelElRef.current) {
              labelElRef.current.style.transform = `translate(${layout.label.x}px, ${layout.label.y}px) translate(${layout.label.translateX}, ${layout.label.translateY}) translate(0px, ${layout.label.spacing}px)`;
            }

            if (customElRef.current) {
              customElRef.current.style.transform = `translate(${layout.customText.x}px, ${layout.customText.y}px) translate(${layout.customText.translateX}, ${layout.customText.translateY}) translate(0px, ${layout.customText.spacing}px)`;
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
  }, [
    overlay,
    chart,
    level.level,
    customSettings.reverse,
    customSettings.extend,
    customSettings.labelsPosition,
    customSettings.textPosition,
    customSettings.prices,
    customSettings.levelsVisible,
    customSettings.levelsStyle,
    fontSize,
    userText,
    inputText,
    isEditing,
    isHoveredActive,
    isSelected,
  ]);

  // Measure DOM width for both Generated Label and Custom Text and update overlay extendData
  useEffect(() => {
    let changed = false;
    const currentTextMap = overlay.extendData?.textWidthMap || {};
    const currentLabelMap = overlay.extendData?.labelWidthMap || {};

    let newTextMap = currentTextMap;
    let newLabelMap = currentLabelMap;

    if (customElRef.current) {
      const width = customElRef.current.offsetWidth;
      if (width && width !== currentTextMap[String(level.level)]) {
        newTextMap = { ...newTextMap, [String(level.level)]: width };
        changed = true;
      }
    }

    if (labelElRef.current) {
      const width = labelElRef.current.offsetWidth;
      if (width && width !== currentLabelMap[String(level.level)]) {
        newLabelMap = { ...newLabelMap, [String(level.level)]: width };
        changed = true;
      }
    }

    if (changed) {
      chart.overrideOverlay({
        id: overlay.id,
        extendData: {
          ...(overlay.extendData || {}),
          textWidthMap: newTextMap,
          labelWidthMap: newLabelMap,
        },
      });
      setTimeout(() => syncAllDrawings(), 50);
    }
  }, [userText, inputText, isEditing, fontSize, isBold, isItalic, labelStr]);

  const handleStartEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (chart) {
      chart._clickedOnOverlay = true;
    }
    backupTextRef.current = userText;
    setIsEditing(true);
    setInputText(userText);

    try {
      chart.overrideOverlay({
        id: overlay.id,
        extendData: {
          ...(overlay.extendData || {}),
          isEditingText: true,
          activeLevel: level.level,
        },
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
          isEditingText: false,
          activeLevel: null,
        },
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
            isEditingText: false,
            activeLevel: null,
          },
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
            isEditingText: false,
            activeLevel: null,
          },
        });
        DrawingChartAdapter.invalidatePane(chart);
      } catch (_) {}
    }
  };

  if (!shouldShowLabel && !shouldShowCustom) return null;

  return (
    <>
      {/* 1. Generated Fib Level Label (Non-interactive, visual match with custom text) */}
      {shouldShowLabel && (
        <div
          ref={labelElRef}
          data-no-deselect="true"
          data-floating-ui="true"
          className="absolute top-0 left-0 z-20 select-none pointer-events-none origin-center whitespace-nowrap bg-transparent p-0 m-0 border-none outline-none font-sans"
          style={{
            fontSize: `${fontSize}px`,
            color: labelColor,
            fontWeight: isBold ? 'bold' : 'normal',
            fontStyle: isItalic ? 'italic' : 'normal',
            lineHeight: '1.2',
            textAlign: customSettings.labelsPosition?.horizontal || 'left',
          }}
        >
          {labelStr}
        </div>
      )}

      {/* 2. User-Added Custom Text (Interactive text editor / + Add text) */}
      {shouldShowCustom && (
        <div
          ref={customElRef}
          data-no-deselect="true"
          data-floating-ui="true"
          onMouseDown={(e) => {
            e.stopPropagation();
            if (chart) {
              chart._clickedOnOverlay = true;
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
                    hoveredLevel: level.level,
                  },
                });
                DrawingChartAdapter.invalidatePane(chart);
              }
            } catch (_) {}
          }}
          onMouseLeave={() => {
            setIsDomHovered(false);
          }}
          className="absolute top-0 left-0 z-30 select-none pointer-events-auto origin-center whitespace-nowrap bg-transparent p-0 m-0 border-none outline-none font-sans"
          style={{
            fontSize: `${fontSize}px`,
            color: textColor,
            fontWeight: isBold ? 'bold' : 'normal',
            fontStyle: isItalic ? 'italic' : 'normal',
            lineHeight: '1.2',
            textAlign: customSettings.textPosition?.horizontal || 'right',
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
                if (
                  relatedTarget &&
                  (relatedTarget.closest('.drawing-floating-toolbar') ||
                    relatedTarget.closest('[data-floating-ui="true"]'))
                ) {
                  return;
                }
                handleSave();
              }}
              onKeyDown={handleKeyDown}
              placeholder="+ Add text"
              className="bg-transparent border-0 border-none outline-none focus:outline-none focus:ring-0 p-0 m-0 cursor-text font-inherit select-text whitespace-nowrap"
              style={{
                fontSize: `${fontSize}px`,
                color: textColor,
                fontWeight: isBold ? 'bold' : 'normal',
                fontStyle: isItalic ? 'italic' : 'normal',
                lineHeight: '1.2',
                textAlign: customSettings.textPosition?.horizontal || 'right',
                margin: 0,
                padding: 0,
                boxSizing: 'border-box',
                width: `${Math.max(30, (inputText || '+ Add text').length * (fontSize * 0.5) + 12)}px`,
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
                textAlign: customSettings.textPosition?.horizontal || 'right',
                margin: 0,
                padding: 0,
                boxSizing: 'border-box',
              }}
            >
              {userText === '' ? '+ Add text' : userText}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export interface FloatingFibonacciTextProps {
  chart: any;
  overlay: any;
  isSelected: boolean;
  isHovered?: boolean;
  onLevelTextChange: (level: number, newText: string) => void;
  syncAllDrawings: () => void;
}

export const FloatingFibonacciText: React.FC<FloatingFibonacciTextProps> = ({
  chart,
  overlay,
  isSelected,
  onLevelTextChange,
  syncAllDrawings,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredLevel, setHoveredLevel] = useState<number | null>(null);
  const hoveredLevelRef = useRef<number | null>(null);

  const customSettings = overlay?.extendData?.customSettings || {};
  const levelsList = customSettings.levels || DEFAULT_FIB_LEVELS;
  const enabledLevels = levelsList.filter((l: any) => l.enabled);
  const levelTexts = customSettings.levelTexts || {};

  // Track pointer movement to detect which individual Fib level line is hovered
  useEffect(() => {
    if (!isSelected) {
      if (hoveredLevelRef.current !== null) {
        hoveredLevelRef.current = null;
        setHoveredLevel(null);
        try {
          if (chart && overlay?.id) {
            chart.overrideOverlay({
              id: overlay.id,
              extendData: {
                ...(overlay.extendData || {}),
                hoveredLevel: null,
              },
            });
            DrawingChartAdapter.invalidatePane(chart);
          }
        } catch (_) {}
      }
      return;
    }

    const handleMouseMove = (e: MouseEvent) => {
      const pts = overlay?.points;
      if (!pts || pts.length < 2 || !chart) {
        if (hoveredLevelRef.current !== null) {
          hoveredLevelRef.current = null;
          setHoveredLevel(null);
          try {
            chart.overrideOverlay({
              id: overlay.id,
              extendData: {
                ...(overlay.extendData || {}),
                hoveredLevel: null,
              },
            });
            DrawingChartAdapter.invalidatePane(chart);
          } catch (_) {}
        }
        return;
      }

      const slotContainer = containerRef.current?.closest('[data-chart-slot-index], [data-chart-slot-inner="true"]') as HTMLElement | null;
      const rect = slotContainer?.getBoundingClientRect();
      if (!rect) return;

      const xVal = e.clientX - rect.left;
      const yVal = e.clientY - rect.top;

      if (xVal < 0 || xVal > rect.width || yVal < 0 || yVal > rect.height) {
        if (hoveredLevelRef.current !== null) {
          hoveredLevelRef.current = null;
          setHoveredLevel(null);
          try {
            chart.overrideOverlay({
              id: overlay.id,
              extendData: {
                ...(overlay.extendData || {}),
                hoveredLevel: null,
              },
            });
            DrawingChartAdapter.invalidatePane(chart);
          } catch (_) {}
        }
        return;
      }

      const p0 = pts[0];
      const p1 = pts[1];
      const p0Pixel = chart.convertToPixel([p0], { paneId: 'candle_pane' });
      const p1Pixel = chart.convertToPixel([p1], { paneId: 'candle_pane' });

      if (!p0Pixel?.[0] || !p1Pixel?.[0]) return;

      const chartWidth = chart.getWidth ? chart.getWidth() : (rect.width || 1000);
      const xMin = Math.min(p0Pixel[0].x, p1Pixel[0].x);
      const xMax = Math.max(p0Pixel[0].x, p1Pixel[0].x);

      let startX = xMin;
      let endX = xMax;
      const extend = customSettings.extend || 'none';
      if (extend === 'left') {
        startX = 0;
        endX = xMax;
      } else if (extend === 'right') {
        startX = xMin;
        endX = chartWidth;
      } else if (extend === 'both') {
        startX = 0;
        endX = chartWidth;
      }

      let closestLevel: number | null = null;
      let minDistance = Infinity;

      for (const lvl of enabledLevels) {
        const targetPrice = calculateFibLevelPrice(p0.value, p1.value, lvl.level, customSettings.reverse);
        const levelPixel = chart.convertToPixel([{ value: targetPrice }], { paneId: 'candle_pane' });

        if (levelPixel && levelPixel[0] && typeof levelPixel[0].y === 'number' && Number.isFinite(levelPixel[0].y)) {
          const lvlY = levelPixel[0].y;
          const xPad = 15;
          const yThreshold = 8; // +/- 8px vertically from level line

          if (xVal >= startX - xPad && xVal <= endX + xPad) {
            const distY = Math.abs(yVal - lvlY);
            if (distY <= yThreshold && distY < minDistance) {
              minDistance = distY;
              closestLevel = lvl.level;
            }
          }
        }
      }

      if (closestLevel !== hoveredLevelRef.current) {
        hoveredLevelRef.current = closestLevel;
        setHoveredLevel(closestLevel);
        try {
          chart.overrideOverlay({
            id: overlay.id,
            extendData: {
              ...(overlay.extendData || {}),
              hoveredLevel: closestLevel,
            },
          });
          DrawingChartAdapter.invalidatePane(chart);
        } catch (_) {}
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isSelected, overlay, chart, customSettings.reverse, customSettings.extend, enabledLevels]);

  // Guaranteed cleanup on unmount
  useEffect(() => {
    return () => {
      try {
        if (chart && overlay?.id) {
          chart.overrideOverlay({
            id: overlay.id,
            extendData: {
              ...(overlay.extendData || {}),
              hoveredLevel: null,
              isEditingText: false,
              activeLevel: null,
            },
          });
          DrawingChartAdapter.invalidatePane(chart);
        }
      } catch (_) {}
    };
  }, [chart, overlay?.id]);

  return (
    <div ref={containerRef} style={{ display: 'contents' }}>
      {enabledLevels.map((lvl: any) => {
        const userText = levelTexts[String(lvl.level)] ?? lvl.text ?? '';
        const isLevelHovered = hoveredLevel === lvl.level;
        return (
          <FloatingFibLevelItem
            key={`${overlay.id}_level_${lvl.level}`}
            chart={chart}
            overlay={overlay}
            level={lvl}
            userText={userText}
            onTextChange={(newText) => onLevelTextChange(lvl.level, newText)}
            isSelected={isSelected}
            isLevelHovered={isLevelHovered}
            syncAllDrawings={syncAllDrawings}
          />
        );
      })}
    </div>
  );
};


