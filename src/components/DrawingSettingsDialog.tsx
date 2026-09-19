import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { useDrawingTemplates } from '@/framework/tools/useDrawingTemplates';
import { SearchableDropdown } from './common/SearchableDropdown';
import { DrawingCoordinatesTab } from './drawing-settings/DrawingCoordinatesTab';
import { DrawingVisibilityTab } from './drawing-settings/DrawingVisibilityTab';
import { DrawingInputsTab } from './drawing-settings/DrawingInputsTab';
import { DrawingTextTab } from './drawing-settings/DrawingTextTab';
import { DrawingStyleTab } from './drawing-settings/DrawingStyleTab';
import { DrawingFibonacciStyleTab } from './drawing-settings/DrawingFibonacciStyleTab';
import type { FibCustomSettings } from '@/framework/tools/implementations/FibonacciRetracement';
import { DEFAULT_FIB_SETTINGS } from '@/framework/tools/implementations/FibonacciRetracement';
export { SearchableDropdown };

interface DrawingSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  overlay: any;
  onSave: (settings: any, points?: any[]) => void;
  timeframe?: string;
  allCandles?: any[]; // To map bar index <-> timestamp
  pricePrecision?: number; // Active symbol precision
  onDeselectOverlay?: () => void;
}

type TabType = 'style' | 'inputs' | 'text' | 'coordinates' | 'visibility';

// Persistent position across open/close actions
let savedDialogPosition: { x: number; y: number } | null = null;

export const DrawingSettingsDialog: React.FC<DrawingSettingsDialogProps> = ({
  isOpen,
  onClose,
  overlay,
  onSave,
  timeframe = '1m',
  allCandles = [],
  pricePrecision,
  onDeselectOverlay
}) => {
  const isTextOverlay = overlay?.name === 'fxText' || overlay?.name === 'text';
  const [activeTab, setActiveTab] = useState<TabType>(() => (isTextOverlay ? 'text' : 'style'));
  const [isTemplateDropdownOpen, setIsTemplateDropdownOpen] = useState(false);

  // Template management hook
  const {
    activeTemplateMode,
    setActiveTemplateMode,
    selectedGroup,
    setSelectedGroup,
    deleteTemplate,
    deleteNameOption: deleteNameOptionBase,
    deleteGroupOption: deleteGroupOptionBase,
    saveTemplate,
    uniqueGroups,
    visibleTemplates,
    allUniqueNames,
    allUniqueGroups
  } = useDrawingTemplates(overlay?.name);

  // Advanced template feature modal states
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveGroup, setSaveGroup] = useState('Default');
  const [saveMode, setSaveMode] = useState<'light' | 'dark'>('light');
  const [isNameDropdownOpen, setIsNameDropdownOpen] = useState(false);
  const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
  const [isSelectGroupDropdownOpen, setIsSelectGroupDropdownOpen] = useState(false);
  
  // Draggable window state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; initialX: number; initialY: number; lastX?: number; lastY?: number }>({ x: 0, y: 0, initialX: 0, initialY: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  // Style Tab States
  const [lineColor, setLineColor] = useState('#2196F3');
  const [lineWidth, setLineWidth] = useState(1);
  const [lineStyle, setLineStyle] = useState('solid');
  const [startArrow, setStartArrow] = useState('normal');
  const [endArrow, setEndArrow] = useState('normal');
  const [extendType, setExtendType] = useState('none');
  const [fillColor, setFillColor] = useState('rgba(33, 150, 243, 0.1)');
  const [fillBackground, setFillBackground] = useState(true);
  const [borderColor, setBorderColor] = useState('#2196F3');
  const [profitColor, setProfitColor] = useState('rgba(76, 175, 80, 0.12)');
  const [lossColor, setLossColor] = useState('rgba(244, 67, 54, 0.12)');
  const [alwaysShowStats, setAlwaysShowStats] = useState(false);
  const [showLines, setShowLines] = useState(false);
  const [showActivationLine, setShowActivationLine] = useState(true);
  const [activationLineColor, setActivationLineColor] = useState('#808285');
  const [activationLineWidth, setActivationLineWidth] = useState(1);
  const [activationLineStyle, setActivationLineStyle] = useState('dashed');
  const [showActivationHighlight, setShowActivationHighlight] = useState(true);
  const [activationHighlightOpacity, setActivationHighlightOpacity] = useState(0.28);
  const [showMarkers, setShowMarkers] = useState(true);
  const [initialSizePercent, setInitialSizePercent] = useState(18);

  // Fib Retracement Settings State
  const [fibSettings, setFibSettings] = useState<FibCustomSettings>(DEFAULT_FIB_SETTINGS);

  // Text Tab States
  const [text, setText] = useState('');
  const [textColor, setTextColor] = useState('#2196F3');
  const [fontSize, setFontSize] = useState(14);
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('left');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [showBorder, setShowBorder] = useState(true);
  const [isAnchored, setIsAnchored] = useState(false);
  const [textValign, setTextValign] = useState('middle');
  const [textHalign, setTextHalign] = useState('right');
  const [textPlacement, setTextPlacement] = useState<'inside' | 'outside'>('inside');

  // Coordinates Tab States
  const [points, setPoints] = useState<any[]>([]);

  // Visibility Tab States
  const [visibility, setVisibility] = useState<Record<string, any>>({
    ticks: { show: true },
    seconds: { show: true, min: 1, max: 59 },
    minutes: { show: true, min: 1, max: 59 },
    hours: { show: true, min: 1, max: 24 },
    days: { show: true, min: 1, max: 365 },
    weeks: { show: true, min: 1, max: 52 },
    months: { show: true, min: 1, max: 12 },
    ranges: { show: true }
  });

  // Color Pickers active dropdowns
  const [activeColorPicker, setActiveColorPicker] = useState<string | null>(null);
  
  // Custom dropdowns for style selectors
  const [activeSelect, setActiveSelect] = useState<'lineWidth' | 'lineStyle' | 'extend' | 'fontSize' | 'valign' | 'halign' | 'actLineWidth' | 'actLineStyle' | 'textPlacement' | 'startArrow' | 'endArrow' | null>(null);

  const prec = pricePrecision !== undefined ? pricePrecision : 4;

  // Real-time Backup References
  const backupSettingsRef = useRef<any>(null);
  const backupPointsRef = useRef<any[]>(null);
  const isFirstLoadRef = useRef(true);

  // Initial Position + Load Settings
  useEffect(() => {
    if (!isOpen || !overlay) return;

    isFirstLoadRef.current = true;

    const dialogWidth = containerRef.current?.offsetWidth || 420;
    const dialogHeight = containerRef.current?.offsetHeight || (overlay.name === 'fibonacciRetracement' ? 700 : 400);
    const maxX = Math.max(0, window.innerWidth - dialogWidth);
    const maxY = Math.max(0, window.innerHeight - dialogHeight);

    if (savedDialogPosition) {
      setPosition({
        x: Math.max(0, Math.min(maxX, savedDialogPosition.x)),
        y: Math.max(0, Math.min(maxY, savedDialogPosition.y)),
      });
    } else {
      const x = Math.max(0, Math.min(maxX, (window.innerWidth - dialogWidth) / 2));
      const y = Math.max(0, Math.min(maxY, (window.innerHeight - dialogHeight) / 2));
      setPosition({ x, y });
    }

    if (overlay.name === 'fxText' || overlay.name === 'text') {
      setActiveTab('text');
    } else {
      setActiveTab('style');
    }

    const customSettings = overlay.extendData?.customSettings || {};
    
    // Save backups for Cancel restoration
    backupSettingsRef.current = JSON.parse(JSON.stringify(customSettings));
    if (overlay.points) {
      backupPointsRef.current = JSON.parse(JSON.stringify(overlay.points));
    }

    // Style settings
    setLineColor(customSettings.lineColor || '#2196F3');
    setLineWidth(customSettings.lineWidth || 1);
    setLineStyle(customSettings.lineStyle || 'solid');
    setStartArrow(customSettings.startArrow || 'normal');
    setEndArrow(customSettings.endArrow || (overlay.name === 'arrow' ? 'arrow' : 'normal'));
    setExtendType(customSettings.extendType || 'none');
    setFillColor(customSettings.backgroundColor || customSettings.fillColor || (overlay.name === 'note' ? (customSettings.lineColor || '#2196F3') : 'rgba(33, 150, 243, 0.1)'));
    setFillBackground(customSettings.fillBackground !== false);
    setBorderColor(customSettings.borderColor || customSettings.lineColor || '#2196F3');
    setProfitColor(customSettings.profitColor || 'rgba(76, 175, 80, 0.12)');
    setLossColor(customSettings.lossColor || 'rgba(244, 67, 54, 0.12)');
    setAlwaysShowStats(customSettings.alwaysShowStats === true);
    setShowLines(customSettings.showLines === true);
    setShowActivationLine(customSettings.showActivationLine !== false);
    setActivationLineColor(customSettings.activationLineColor || '#808285');
    setActivationLineWidth(customSettings.activationLineWidth || 1);
    setActivationLineStyle(customSettings.activationLineStyle || 'dashed');
    setShowActivationHighlight(customSettings.showActivationHighlight !== false);
    setActivationHighlightOpacity(typeof customSettings.activationHighlightOpacity === 'number' ? customSettings.activationHighlightOpacity : 0.28);
    setShowMarkers(customSettings.showMarkers !== false);
    setInitialSizePercent(typeof customSettings.initialSizePercent === 'number' ? customSettings.initialSizePercent : 18);

    // Text settings
    setText(customSettings.text || '');
    setTextColor(customSettings.textColor || (overlay.name === 'longPosition' || overlay.name === 'shortPosition' || overlay.name === 'note' ? '#ffffff' : '#2196F3'));
    setFontSize(customSettings.fontSize || 14);
    setTextAlign(customSettings.textAlign || 'left');
    setIsBold(!!customSettings.bold);
    setIsItalic(!!customSettings.italic);
    setShowBorder(customSettings.showBorder !== undefined ? !!customSettings.showBorder : (overlay.name === 'note' ? false : true));
    setIsAnchored(!!customSettings.isAnchored);
    setTextValign(customSettings.textPosition?.vertical || 'middle');
    setTextHalign(customSettings.textPosition?.horizontal || 'right');
    setTextPlacement(customSettings.textPlacement || 'inside');

    // Fibonacci settings
    if (overlay.name === 'fibonacciRetracement') {
      setFibSettings({
        ...DEFAULT_FIB_SETTINGS,
        ...(customSettings || {}),
        trendLine: {
          ...DEFAULT_FIB_SETTINGS.trendLine,
          ...(customSettings.trendLine || {}),
        },
        levelsLine: {
          ...DEFAULT_FIB_SETTINGS.levelsLine,
          ...(customSettings.levelsLine || {}),
        },
        levels: customSettings.levels && customSettings.levels.length === 24
          ? customSettings.levels
          : DEFAULT_FIB_SETTINGS.levels,
        background: {
          ...DEFAULT_FIB_SETTINGS.background,
          ...(customSettings.background || {}),
        },
        oneColor: customSettings.oneColor || DEFAULT_FIB_SETTINGS.oneColor,
        oneTextColor: customSettings.oneTextColor,
      });
    }

    // Visibility settings
    if (customSettings.visibility) {
      setVisibility(customSettings.visibility);
    }

    // Points coordinates (Opposite mapping: 0 = latest candle, increasing towards first candle, negative in future)
    if (overlay.points) {
      const mappedPoints = overlay.points.map((pt: any) => {
        let barIndex = 0; // Default index relative to latest candle
        if (allCandles.length > 0) {
          const idx = allCandles.findIndex(c => c.timestamp === pt.timestamp);
          if (idx !== -1) {
            // Map idx array index to User Coordinate: C = (L - 1) - idx
            barIndex = (allCandles.length - 1) - idx;
          } else {
            // Approximate relative to last candle if timestamp is not exact
            const lastCandle = allCandles[allCandles.length - 1];
            if (lastCandle) {
              const timeDiff = pt.timestamp - lastCandle.timestamp;
              let timeframeMinutes = 1;
              const tf = timeframe.toLowerCase();
              if (tf.endsWith('m')) timeframeMinutes = parseInt(tf);
              else if (tf.endsWith('h')) timeframeMinutes = parseInt(tf) * 60;
              else if (tf.endsWith('d')) timeframeMinutes = parseInt(tf) * 1440;
              
              const indexDiff = Math.round(timeDiff / (timeframeMinutes * 60 * 1000));
              barIndex = -indexDiff;
            }
          }
        }
        return {
          price: parseFloat(pt.value).toFixed(prec),
          bar: barIndex,
          timestamp: pt.timestamp
        };
      });
      setPoints(mappedPoints);
    }

    setActiveTab('style');
    setActiveColorPicker(null);
    setActiveSelect(null);
    setIsTemplateDropdownOpen(false);
  }, [isOpen, overlay, allCandles, prec]);

  // Dragging event handlers - Direct DOM style mutation for 65fps drag performance
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Left click only
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      initialX: position.x,
      initialY: position.y,
      lastX: position.x,
      lastY: position.y
    };
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      
      const dialogWidth = containerRef.current?.offsetWidth || 420;
      const dialogHeight = containerRef.current?.offsetHeight || 400;
      const maxX = Math.max(0, window.innerWidth - dialogWidth);
      const maxY = Math.max(0, window.innerHeight - dialogHeight);

      const newX = Math.max(0, Math.min(maxX, dragStartRef.current.initialX + dx));
      const newY = Math.max(0, Math.min(maxY, dragStartRef.current.initialY + dy));
      
      if (containerRef.current) {
        containerRef.current.style.left = `${newX}px`;
        containerRef.current.style.top = `${newY}px`;
      }
      
      dragStartRef.current.lastX = newX;
      dragStartRef.current.lastY = newY;
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (dragStartRef.current.lastX !== undefined && dragStartRef.current.lastY !== undefined) {
        const finalPos = { x: dragStartRef.current.lastX, y: dragStartRef.current.lastY };
        setPosition(finalPos);
        savedDialogPosition = finalPos;
      }
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, position]);

  // Window resize handler to ensure dialog is always clamped within visible viewport
  useEffect(() => {
    const handleWindowResize = () => {
      if (!isOpen) return;
      const dialogWidth = containerRef.current?.offsetWidth || 420;
      const dialogHeight = containerRef.current?.offsetHeight || 400;
      const maxX = Math.max(0, window.innerWidth - dialogWidth);
      const maxY = Math.max(0, window.innerHeight - dialogHeight);

      setPosition((prev) => {
        const clampedX = Math.max(0, Math.min(maxX, prev.x));
        const clampedY = Math.max(0, Math.min(maxY, prev.y));
        if (clampedX !== prev.x || clampedY !== prev.y) {
          savedDialogPosition = { x: clampedX, y: clampedY };
          return { x: clampedX, y: clampedY };
        }
        return prev;
      });
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [isOpen]);

  // Real-Time Sync hook
  useEffect(() => {
    if (!isOpen || !overlay) return;

    if (isFirstLoadRef.current) {
      isFirstLoadRef.current = false;
      return;
    }

    const updatedSettings = overlay.name === 'fibonacciRetracement'
      ? {
          ...fibSettings,
          text,
          textColor: fibSettings.useOneColor ? (fibSettings.oneTextColor || fibSettings.oneColor || '#808080') : (fibSettings.textColor || textColor),
          fontSize: fibSettings.fontSize ?? fontSize,
          textAlign,
          bold: isBold,
          italic: isItalic,
          showBorder,
          textPosition: fibSettings.textPosition || {
            vertical: textValign,
            horizontal: textHalign,
          },
          textPlacement,
          visibility,
        }
      : {
          lineColor,
          lineWidth,
          lineStyle,
          startArrow,
          endArrow,
          extendType,
          fillColor,
          fillBackground,
          profitColor,
          lossColor,
          text,
          textColor,
          fontSize,
          textAlign,
          bold: isBold,
          italic: isItalic,
          showBorder,
          isAnchored,
          textPosition: {
            vertical: textValign,
            horizontal: textHalign
          },
          textPlacement,
          visibility,
          alwaysShowStats,
          showLines,
          showActivationLine,
          activationLineColor,
          activationLineWidth,
          activationLineStyle,
          showActivationHighlight,
          activationHighlightOpacity,
          showMarkers,
          initialSizePercent
        };

    const updatedPoints = points.map(pt => {
      let finalTimestamp = pt.timestamp;
      let resolvedDataIndex: number | undefined = undefined;

      if (allCandles.length > 0) {
        if (pt.bar !== undefined) {
          // Map from User Coordinate C to array index idx: idx = (L - 1) - C
          const idx = (allCandles.length - 1) - pt.bar;
          if (idx >= 0 && idx < allCandles.length) {
            const candle = allCandles[idx];
            if (candle) {
              finalTimestamp = candle.timestamp;
              resolvedDataIndex = idx;
            }
          } else if (idx >= allCandles.length) {
            const lastCandle = allCandles[allCandles.length - 1];
            if (lastCandle) {
              // pt.bar is negative in future. Diff index = -pt.bar
              const indexDiff = -pt.bar;
              let timeframeMinutes = 1;
              const tf = timeframe.toLowerCase();
              if (tf.endsWith('m')) timeframeMinutes = parseInt(tf);
              else if (tf.endsWith('h')) timeframeMinutes = parseInt(tf) * 60;
              else if (tf.endsWith('d')) timeframeMinutes = parseInt(tf) * 1440;
              
              finalTimestamp = lastCandle.timestamp + indexDiff * timeframeMinutes * 60 * 1000;
              resolvedDataIndex = idx;
            }
          } else {
            const firstCandle = allCandles[0];
            if (firstCandle) {
              const indexDiff = -idx;
              let timeframeMinutes = 1;
              const tf = timeframe.toLowerCase();
              if (tf.endsWith('m')) timeframeMinutes = parseInt(tf);
              else if (tf.endsWith('h')) timeframeMinutes = parseInt(tf) * 60;
              else if (tf.endsWith('d')) timeframeMinutes = parseInt(tf) * 1440;
              
              finalTimestamp = firstCandle.timestamp - indexDiff * timeframeMinutes * 60 * 1000;
              resolvedDataIndex = idx;
            }
          }
        } else {
          const idx = allCandles.findIndex(c => c.timestamp === pt.timestamp);
          if (idx !== -1) {
            resolvedDataIndex = idx;
          }
        }
      }

      return {
        timestamp: finalTimestamp,
        value: parseFloat(pt.price),
        ...(resolvedDataIndex !== undefined ? { dataIndex: resolvedDataIndex } : {})
      };
    });

    const pointsToSave = activeTab === 'coordinates' ? updatedPoints : (overlay.points || backupPointsRef.current || updatedPoints);
    onSave(updatedSettings, pointsToSave);
  }, [lineColor, lineWidth, lineStyle, startArrow, endArrow, extendType, fillColor, fillBackground, profitColor, lossColor, text, textColor, fontSize, textAlign, isBold, isItalic, showBorder, isAnchored, textValign, textHalign, textPlacement, points, visibility, alwaysShowStats, showLines, showActivationLine, activationLineColor, activationLineWidth, activationLineStyle, showActivationHighlight, activationHighlightOpacity, showMarkers, initialSizePercent, fibSettings]);

  if (!isOpen || !overlay) return null;

  const handleCancel = () => {
    if (backupSettingsRef.current && backupPointsRef.current) {
      onSave(backupSettingsRef.current, backupPointsRef.current);
    }
    onClose();
  };

  const handlePointChange = (index: number, field: 'price' | 'bar', val: string) => {
    setPoints(prev => {
      const updated = [...prev];
      if (field === 'price') {
        updated[index] = { ...updated[index], price: val };
      } else {
        const parsed = parseInt(val) || 0;
        updated[index] = { ...updated[index], bar: parsed };
      }
      return updated;
    });
  };

  const handleVisibilityChange = (unit: string, field: 'show' | 'min' | 'max', val: any) => {
    setVisibility(prev => {
      const updatedUnit = { ...prev[unit] };
      if (field === 'show') {
        updatedUnit.show = !!val;
      } else {
        const parsed = parseInt(val) || 0;
        updatedUnit[field] = parsed;
      }
      return { ...prev, [unit]: updatedUnit };
    });
  };

  const deleteNameOption = (name: string) => {
    deleteNameOptionBase(name);
    if (saveName === name) {
      setSaveName('');
    }
  };

  const deleteGroupOption = (groupName: string) => {
    deleteGroupOptionBase(groupName);
    if (saveGroup === groupName) {
      setSaveGroup('Default');
    }
  };

  const handleFibUpdate = (updates: Partial<FibCustomSettings>) => {
    setFibSettings(prev => ({
      ...prev,
      ...updates,
    }));
  };

  const applyTemplate = (settings: any) => {
    if (!settings) return;
    if (overlay?.name === 'fibonacciRetracement' || settings.levels) {
      setFibSettings({
        ...DEFAULT_FIB_SETTINGS,
        ...settings,
        trendLine: {
          ...DEFAULT_FIB_SETTINGS.trendLine,
          ...(settings.trendLine || {}),
        },
        levelsLine: {
          ...DEFAULT_FIB_SETTINGS.levelsLine,
          ...(settings.levelsLine || {}),
        },
        levels: settings.levels && settings.levels.length === 24
          ? settings.levels
          : DEFAULT_FIB_SETTINGS.levels,
        background: {
          ...DEFAULT_FIB_SETTINGS.background,
          ...(settings.background || {}),
        },
      });
    }
    setLineColor(settings.lineColor || '#2196F3');
    setLineWidth(settings.lineWidth || 1);
    setLineStyle(settings.lineStyle || 'solid');
    setExtendType(settings.extendType || 'none');
    setFillColor(settings.fillColor || 'rgba(33, 150, 243, 0.1)');
    setFillBackground(settings.fillBackground !== false);
    setProfitColor(settings.profitColor || 'rgba(76, 175, 80, 0.12)');
    setLossColor(settings.lossColor || 'rgba(244, 67, 54, 0.12)');
    setAlwaysShowStats(settings.alwaysShowStats === true);
    setShowLines(settings.showLines === true);
    setShowActivationLine(settings.showActivationLine !== false);
    setActivationLineColor(settings.activationLineColor || '#808285');
    setActivationLineWidth(settings.activationLineWidth || 1);
    setActivationLineStyle(settings.activationLineStyle || 'dashed');
    setShowActivationHighlight(settings.showActivationHighlight !== false);
    setActivationHighlightOpacity(typeof settings.activationHighlightOpacity === 'number' ? settings.activationHighlightOpacity : 0.28);
    setShowMarkers(settings.showMarkers !== false);
    setText(settings.text || '');
    setTextColor(settings.textColor || '#2196F3');
    setFontSize(settings.fontSize || 14);
    setIsBold(!!settings.bold);
    setIsItalic(!!settings.italic);
    setTextValign(settings.textPosition?.vertical || 'middle');
    setTextHalign(settings.textPosition?.horizontal || 'right');
    setTextPlacement(settings.textPlacement || 'inside');
    if (settings.visibility) setVisibility(settings.visibility);
    setIsTemplateDropdownOpen(false);

    // Sync template settings and coordinates immediately to prevent state sync race conditions
    const updatedSettings = overlay?.name === 'fibonacciRetracement'
      ? {
          ...DEFAULT_FIB_SETTINGS,
          ...settings,
          text: settings.text || text,
          textColor: settings.textColor || textColor,
          fontSize: settings.fontSize || fontSize,
          textAlign: settings.textAlign || textAlign,
          bold: settings.bold !== undefined ? !!settings.bold : isBold,
          italic: settings.italic !== undefined ? !!settings.italic : isItalic,
          showBorder: settings.showBorder !== undefined ? settings.showBorder !== false : showBorder,
          textPosition: {
            vertical: settings.textPosition?.vertical || textValign,
            horizontal: settings.textPosition?.horizontal || textHalign,
          },
          textPlacement: settings.textPlacement || textPlacement,
          visibility: settings.visibility || visibility,
        }
      : {
          lineColor: settings.lineColor || '#2196F3',
          lineWidth: settings.lineWidth || 1,
          lineStyle: settings.lineStyle || 'solid',
          extendType: settings.extendType || 'none',
          fillColor: settings.fillColor || 'rgba(33, 150, 243, 0.1)',
          fillBackground: settings.fillBackground !== false,
          profitColor: settings.profitColor || 'rgba(76, 175, 80, 0.12)',
          lossColor: settings.lossColor || 'rgba(244, 67, 54, 0.12)',
          alwaysShowStats: settings.alwaysShowStats === true,
          showLines: settings.showLines === true,
          showActivationLine: settings.showActivationLine !== false,
          activationLineColor: settings.activationLineColor || '#808285',
          activationLineWidth: settings.activationLineWidth || 1,
          activationLineStyle: settings.activationLineStyle || 'dashed',
          showActivationHighlight: settings.showActivationHighlight !== false,
          activationHighlightOpacity: typeof settings.activationHighlightOpacity === 'number' ? settings.activationHighlightOpacity : 0.28,
          showMarkers: settings.showMarkers !== false,
          initialSizePercent: typeof settings.initialSizePercent === 'number' ? settings.initialSizePercent : initialSizePercent,
          text: settings.text || '',
          textColor: settings.textColor || '#2196F3',
          fontSize: settings.fontSize || 14,
          textAlign: settings.textAlign || 'left',
          bold: !!settings.bold,
          italic: !!settings.italic,
          showBorder: settings.showBorder !== false,
          isAnchored: !!settings.isAnchored,
          boxWidth: settings.boxWidth ?? (overlay.extendData?.customSettings?.boxWidth),
          textPosition: {
            vertical: settings.textPosition?.vertical || 'middle',
            horizontal: settings.textPosition?.horizontal || 'right'
          },
          textPlacement: settings.textPlacement || 'inside',
          visibility: settings.visibility || visibility
        };

    const updatedPoints = points.map(pt => {
      let finalTimestamp = pt.timestamp;
      let resolvedDataIndex: number | undefined = undefined;

      if (allCandles.length > 0) {
        if (pt.bar !== undefined) {
          const idx = (allCandles.length - 1) - pt.bar;
          if (idx >= 0 && idx < allCandles.length) {
            const candle = allCandles[idx];
            if (candle) {
              finalTimestamp = candle.timestamp;
              resolvedDataIndex = idx;
            }
          } else if (idx >= allCandles.length) {
            const lastCandle = allCandles[allCandles.length - 1];
            if (lastCandle) {
              const indexDiff = -pt.bar;
              let timeframeMinutes = 1;
              const tf = timeframe.toLowerCase();
              if (tf.endsWith('m')) timeframeMinutes = parseInt(tf);
              else if (tf.endsWith('h')) timeframeMinutes = parseInt(tf) * 60;
              else if (tf.endsWith('d')) timeframeMinutes = parseInt(tf) * 1440;
              
              finalTimestamp = lastCandle.timestamp + indexDiff * timeframeMinutes * 60 * 1000;
              resolvedDataIndex = idx;
            }
          } else {
            const firstCandle = allCandles[0];
            if (firstCandle) {
              const indexDiff = -idx;
              let timeframeMinutes = 1;
              const tf = timeframe.toLowerCase();
              if (tf.endsWith('m')) timeframeMinutes = parseInt(tf);
              else if (tf.endsWith('h')) timeframeMinutes = parseInt(tf) * 60;
              else if (tf.endsWith('d')) timeframeMinutes = parseInt(tf) * 1440;
              
              finalTimestamp = firstCandle.timestamp - indexDiff * timeframeMinutes * 60 * 1000;
              resolvedDataIndex = idx;
            }
          }
        } else {
          const idx = allCandles.findIndex(c => c.timestamp === pt.timestamp);
          if (idx !== -1) {
            resolvedDataIndex = idx;
          }
        }
      }

      return {
        timestamp: finalTimestamp,
        value: parseFloat(pt.price),
        ...(resolvedDataIndex !== undefined ? { dataIndex: resolvedDataIndex } : {})
      };
    });

    onSave(updatedSettings, updatedPoints);
    onClose();
    if (onDeselectOverlay) {
      onDeselectOverlay();
    }
  };

  const resetToDefault = () => {
    if (overlay?.name === 'fibonacciRetracement') {
      setFibSettings(DEFAULT_FIB_SETTINGS);
    }
    setLineColor('#2196F3');
    setLineWidth(1);
    setLineStyle('solid');
    setExtendType('none');
    setFillColor('rgba(33, 150, 243, 0.1)');
    setFillBackground(true);
    setProfitColor('rgba(76, 175, 80, 0.12)');
    setLossColor('rgba(244, 67, 54, 0.12)');
    setAlwaysShowStats(false);
    setShowLines(false);
    setShowActivationLine(true);
    setActivationLineColor('#808285');
    setActivationLineWidth(1);
    setActivationLineStyle('dashed');
    setShowActivationHighlight(true);
    setActivationHighlightOpacity(0.28);
    setShowMarkers(true);
    setText('');
    setTextColor('#2196F3');
    setFontSize(14);
    setIsBold(false);
    setIsItalic(false);
    setTextValign('middle');
    setTextHalign('right');
    setVisibility({
      ticks: { show: true },
      seconds: { show: true, min: 1, max: 59 },
      minutes: { show: true, min: 1, max: 59 },
      hours: { show: true, min: 1, max: 24 },
      days: { show: true, min: 1, max: 365 },
      weeks: { show: true, min: 1, max: 52 },
      months: { show: true, min: 1, max: 12 },
      ranges: { show: true }
    });
    setIsTemplateDropdownOpen(false);
  };

  const handleConfirm = () => {
    const customSettings = overlay.extendData?.customSettings || {};
    const updatedSettings = overlay.name === 'fibonacciRetracement'
      ? {
          ...fibSettings,
          text,
          textColor: fibSettings.useOneColor ? (fibSettings.oneTextColor || fibSettings.oneColor || '#808080') : (fibSettings.textColor || textColor),
          fontSize: fibSettings.fontSize ?? fontSize,
          textAlign,
          bold: isBold,
          italic: isItalic,
          showBorder,
          textPosition: fibSettings.textPosition || {
            vertical: textValign,
            horizontal: textHalign,
          },
          textPlacement,
          visibility,
        }
      : {
          lineColor,
          lineWidth,
          lineStyle,
          startArrow,
          endArrow,
          extendType,
          fillColor,
          backgroundColor: fillColor,
          fillBackground,
          borderColor: borderColor || lineColor,
          profitColor,
          lossColor,
          alwaysShowStats,
          showLines,
          showActivationLine,
          activationLineColor,
          activationLineWidth,
          activationLineStyle,
          showActivationHighlight,
          activationHighlightOpacity,
          showMarkers,
          initialSizePercent,
          text,
          textColor,
          fontSize,
          textAlign,
          bold: isBold,
          italic: isItalic,
          showBorder,
          isAnchored,
          boxWidth: customSettings.boxWidth,
          textPosition: {
            vertical: textValign,
            horizontal: textHalign
          },
          textPlacement,
          visibility
        };
    const pointsToSave = overlay.points || backupPointsRef.current || [];
    onSave(updatedSettings, pointsToSave);
    onClose();
  };

  return (
    <>
      {/* Backdrop overlay to block canvas interaction and save changes on outside click */}
      <div 
        className="fixed inset-0 z-40 bg-black/20"
        onClick={handleConfirm}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
      />

      <div 
        ref={containerRef}
        role="dialog"
        data-no-deselect="true"
        className="fixed bg-modal-bg border border-border-def rounded-xl shadow-2xl w-[420px] flex flex-col z-50 text-txt-secondary select-none overflow-visible animate-in fade-in zoom-in-95 duration-150"
        style={{ 
          left: `${position.x}px`, 
          top: `${position.y}px`,
          boxShadow: '0 20px 30px -5px rgba(0, 0, 0, 0.6), 0 10px 15px -5px rgba(0, 0, 0, 0.4)'
        }}
      >
      {/* Draggable Header */}
      <div 
        ref={headerRef}
        onMouseDown={handleMouseDown}
        className="flex justify-between items-center px-5 py-4 border-b border-border-def cursor-move active:cursor-grabbing hover:bg-surface-hover transition-colors rounded-t-xl"
      >
        <span className="font-semibold text-[13.5px] tracking-wide text-txt-primary capitalize">
          {overlay.name === 'highlighter' ? 'Highlighter' : overlay.name === 'brush' ? 'Brush' : overlay.name === 'trendLine' ? 'Trendline' : overlay.name === 'fibonacciRetracement' ? 'Fib Retracement' : overlay.name === 'note' ? 'Note' : (overlay.name === 'fxText' || overlay.name === 'text') ? 'Text' : overlay.name} Settings
        </span>
        <button onClick={handleCancel} className="text-txt-muted hover:text-txt-primary transition-colors cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs navigation */}
      <div className="flex px-5 border-b border-border-def text-[12px] font-semibold gap-5 overflow-x-auto select-none bg-surface">
        {(
          overlay.name === 'brush' || overlay.name === 'highlighter'
            ? ['style', 'visibility'] as const
            : overlay.name === 'longPosition' || overlay.name === 'shortPosition'
              ? ['style', 'inputs', 'visibility'] as const
              : (overlay.name === 'fxText' || overlay.name === 'text')
                ? ['text', 'coordinates', 'visibility'] as const
                : overlay.name === 'fibonacciRetracement'
                  ? ['style', 'coordinates', 'visibility'] as const
                  : ['style', 'text', 'coordinates', 'visibility'] as const
        ).map(tab => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setActiveColorPicker(null); setActiveSelect(null); }}
            className={`py-3.5 border-b-2 capitalize transition-colors relative cursor-pointer ${
              activeTab === tab 
                ? 'border-accent text-accent font-bold' 
                : 'border-transparent text-txt-muted hover:text-txt-primary'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content Area - dynamic height adjust */}
      <div className="p-5 text-[12.5px] space-y-4 overflow-visible">
        
        {/* FIBONACCI STYLE TAB */}
        {overlay.name === 'fibonacciRetracement' && activeTab === 'style' && (
          <DrawingFibonacciStyleTab
            customSettings={fibSettings}
            onUpdate={handleFibUpdate}
            activeColorPicker={activeColorPicker}
            setActiveColorPicker={setActiveColorPicker}
            activeSelect={activeSelect}
            setActiveSelect={setActiveSelect}
          />
        )}

        {/* STYLE TAB */}
        {!isTextOverlay && overlay.name !== 'fibonacciRetracement' && activeTab === 'style' && (
          <DrawingStyleTab
            overlay={overlay}
            lineColor={lineColor}
            lineWidth={lineWidth}
            lineStyle={lineStyle}
            startArrow={startArrow}
            endArrow={endArrow}
            extendType={extendType}
            fillColor={fillColor}
            fillBackground={fillBackground}
            profitColor={profitColor}
            lossColor={lossColor}
            alwaysShowStats={alwaysShowStats}
            showLines={showLines}
            showActivationLine={showActivationLine}
            activationLineColor={activationLineColor}
            activationLineWidth={activationLineWidth}
            activationLineStyle={activationLineStyle}
            showActivationHighlight={showActivationHighlight}
            activationHighlightOpacity={activationHighlightOpacity}
            showMarkers={showMarkers}
            setLineColor={setLineColor}
            setLineWidth={setLineWidth}
            setLineStyle={setLineStyle}
            setStartArrow={setStartArrow}
            setEndArrow={setEndArrow}
            setExtendType={setExtendType}
            setFillColor={setFillColor}
            setFillBackground={setFillBackground}
            setProfitColor={setProfitColor}
            setLossColor={setLossColor}
            setAlwaysShowStats={setAlwaysShowStats}
            setShowLines={setShowLines}
            setShowActivationLine={setShowActivationLine}
            setActivationLineColor={setActivationLineColor}
            setActivationLineWidth={setActivationLineWidth}
            setActivationLineStyle={setActivationLineStyle}
            setShowActivationHighlight={setShowActivationHighlight}
            setActivationHighlightOpacity={setActivationHighlightOpacity}
            setShowMarkers={setShowMarkers}
            borderColor={borderColor}
            showBorder={showBorder}
            setShowBorder={setShowBorder}
            setBorderColor={setBorderColor}
            activeColorPicker={activeColorPicker}
            setActiveColorPicker={setActiveColorPicker}
            activeSelect={activeSelect}
            setActiveSelect={setActiveSelect}
          />
        )}


        {/* TEXT TAB */}
        {(activeTab === 'text' || (isTextOverlay && activeTab === 'style')) && (
          <DrawingTextTab
            isTextOverlay={isTextOverlay}
            text={text}
            textColor={textColor}
            fontSize={fontSize}
            isBold={isBold}
            isItalic={isItalic}
            textAlign={textAlign}
            showBorder={showBorder}
            textValign={textValign}
            textHalign={textHalign}
            textPlacement={textPlacement}
            setText={setText}
            setTextColor={setTextColor}
            setFontSize={setFontSize}
            setIsBold={setIsBold}
            setIsItalic={setIsItalic}
            setTextAlign={setTextAlign}
            setShowBorder={setShowBorder}
            setTextValign={setTextValign}
            setTextHalign={setTextHalign}
            setTextPlacement={setTextPlacement}
            activeColorPicker={activeColorPicker}
            setActiveColorPicker={setActiveColorPicker}
            activeSelect={activeSelect}
            setActiveSelect={setActiveSelect}
          />
        )}

        {/* INPUTS TAB (Risk/Reward Specific) */}
        {activeTab === 'inputs' && points.length >= 3 && (
          <DrawingInputsTab
            points={points}
            overlayName={overlay.name}
            pricePrecision={prec}
            initialSizePercent={initialSizePercent}
            onPointsChange={setPoints}
            onInitialSizePercentChange={setInitialSizePercent}
          />
        )}

        {/* COORDINATES TAB */}
        {activeTab === 'coordinates' && (
          <DrawingCoordinatesTab
            points={points}
            pricePrecision={prec}
            onPointChange={handlePointChange}
          />
        )}

        {/* VISIBILITY TAB */}
        {activeTab === 'visibility' && (
          <DrawingVisibilityTab
            visibility={visibility}
            onVisibilityChange={handleVisibilityChange}
          />
        )}

      </div>

      {/* Footer */}
      <div className="flex justify-between items-center px-5 py-4 border-t border-border-def text-[12px] bg-surface rounded-b-xl">
        
        {/* Templates Dropdown Button */}
        <div className="relative">
          <button
            onClick={() => setIsTemplateDropdownOpen(!isTemplateDropdownOpen)}
            className="flex items-center gap-2 bg-app-bg border border-border-def hover:border-border-focus rounded-lg px-3 py-1.5 font-semibold text-txt-secondary hover:text-txt-primary cursor-pointer select-none transition-all active:scale-95"
          >
            <span>Template</span>
            <ChevronDown className="w-3.5 h-3.5 text-txt-muted" />
          </button>
          {isTemplateDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsTemplateDropdownOpen(false)} />
              <div className="absolute left-0 top-full mt-2 bg-modal-bg border border-border-def rounded-xl shadow-2xl z-50 py-1 w-52 font-semibold animate-in fade-in slide-in-from-top-2 duration-100 overflow-visible flex flex-col">
                
                {/* Mode Tabs */}
                <div className="flex border-b border-border-sub">
                  <button
                    onClick={() => setActiveTemplateMode('light')}
                    className={`flex-1 text-center py-2 text-xs font-semibold border-r border-border-sub transition-colors ${
                      activeTemplateMode === 'light'
                        ? 'bg-accent-muted text-accent font-bold border-b border-accent'
                        : 'text-txt-muted hover:text-txt-primary'
                    }`}
                  >
                    Light
                  </button>
                  <button
                    onClick={() => setActiveTemplateMode('dark')}
                    className={`flex-1 text-center py-2 text-xs font-semibold transition-colors ${
                      activeTemplateMode === 'dark'
                        ? 'bg-accent-muted text-accent font-bold border-b border-accent'
                        : 'text-txt-muted hover:text-txt-primary'
                    }`}
                  >
                    Dark
                  </button>
                </div>

                {/* Actions Row */}
                <div className="flex border-b border-border-sub text-[11px]">
                  <button
                    onClick={() => {
                      setSaveName('');
                      setSaveGroup(selectedGroup || 'Default');
                      setSaveMode(activeTemplateMode);
                      setIsSaveModalOpen(true);
                      setIsTemplateDropdownOpen(false);
                    }}
                    className="flex-1 text-center py-2 text-accent hover:text-accent/80 font-bold border-r border-border-sub hover:bg-surface-hover transition-colors"
                  >
                    + Save As
                  </button>
                  <button
                    onClick={() => {
                      resetToDefault();
                      setIsTemplateDropdownOpen(false);
                    }}
                    className="flex-1 text-center py-2 text-txt-muted hover:text-status-error hover:bg-surface-hover transition-colors"
                  >
                    Reset
                  </button>
                </div>

                {/* Group Selector Dropdown */}
                {uniqueGroups.length > 0 && (
                  <div className="relative px-3 py-2 border-b border-border-sub bg-surface">
                    <button
                      onClick={() => setIsSelectGroupDropdownOpen(!isSelectGroupDropdownOpen)}
                      className="w-full flex items-center justify-between bg-app-bg border border-border-def hover:border-border-focus rounded-lg px-2.5 py-1.5 text-xs text-txt-secondary hover:text-txt-primary transition-all active:scale-98"
                    >
                      <span>{selectedGroup}</span>
                      <ChevronDown className="w-3 h-3 text-txt-muted" />
                    </button>
                    {isSelectGroupDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-[60]" onClick={() => setIsSelectGroupDropdownOpen(false)} />
                        <div className="absolute left-3 right-3 top-full mt-1 bg-modal-bg border border-border-def rounded-lg shadow-2xl z-[70] py-1 max-h-32 overflow-y-auto">
                          {uniqueGroups.map(grp => (
                            <button
                              key={grp}
                              onClick={() => {
                                setSelectedGroup(grp);
                                setIsSelectGroupDropdownOpen(false);
                              }}
                              className="w-full text-left px-3 py-1.5 hover:bg-surface-hover text-txt-secondary text-xs truncate"
                            >
                              {grp}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* Templates List */}
                <div className="max-h-40 overflow-y-auto py-1 bg-modal-bg">
                  {visibleTemplates.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-txt-muted text-center italic">No templates</div>
                  ) : (
                    visibleTemplates.map(tpl => (
                      <div
                        key={tpl.id}
                        className="group flex justify-between items-center px-4 py-1.5 hover:bg-surface-hover text-txt-secondary hover:text-txt-primary text-xs cursor-pointer"
                        onClick={() => {
                          applyTemplate(tpl.settings);
                          setIsTemplateDropdownOpen(false);
                        }}
                      >
                        <span className="truncate pr-2">{tpl.name}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTemplate(tpl.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 hover:bg-status-error/25 p-1 rounded transition-all text-status-error hover:text-status-error/80"
                          title="Delete template"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

              </div>
            </>
          )}
        </div>

        {/* Action buttons (Cancel / Ok) */}
        <div className="flex gap-2.5">
          <button
            onClick={handleCancel}
            className="px-4 py-1.5 border border-border-def hover:bg-surface-hover text-txt-secondary rounded-lg font-semibold cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="px-5 py-1.5 bg-accent hover:bg-accent-hover text-txt-inverse rounded-lg font-semibold cursor-pointer transition-colors shadow-lg"
          >
            Ok
          </button>
        </div>

      </div>

      {/* Save Template Custom Dialog (Popup) */}
      {isSaveModalOpen && (
        <div className="fixed inset-0 bg-overlay-bg backdrop-blur-xs z-[100] flex items-center justify-center animate-in fade-in duration-150">
          <div className="bg-modal-bg border border-border-def rounded-xl shadow-2xl w-[320px] p-5 flex flex-col gap-4 animate-in zoom-in-95 duration-150 text-txt-secondary">
            {/* Header */}
            <div className="flex justify-between items-center">
              <span className="font-semibold text-xs tracking-wider uppercase text-txt-primary">Save drawing template</span>
              <button 
                onClick={() => setIsSaveModalOpen(false)}
                className="text-txt-muted hover:text-txt-primary transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form Fields */}
            <div className="flex flex-col gap-3">
              {/* Name */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-txt-muted">Name</label>
                <SearchableDropdown
                  value={saveName}
                  onChange={setSaveName}
                  options={allUniqueNames}
                  onDeleteOption={deleteNameOption}
                  placeholder="CHoCH"
                  isOpen={isNameDropdownOpen}
                  setIsOpen={setIsNameDropdownOpen}
                />
              </div>

              {/* Group */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-semibold text-txt-muted">Group</label>
                <SearchableDropdown
                  value={saveGroup}
                  onChange={setSaveGroup}
                  options={allUniqueGroups}
                  onDeleteOption={deleteGroupOption}
                  placeholder="SMC"
                  isOpen={isGroupDropdownOpen}
                  setIsOpen={setIsGroupDropdownOpen}
                />
              </div>

              {/* Mode Select Buttons */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-semibold text-txt-muted">Mode</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSaveMode('light')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      saveMode === 'light'
                        ? 'bg-accent-muted border-accent text-accent font-bold'
                        : 'border-border-def bg-app-bg text-txt-muted hover:text-txt-primary hover:border-border-focus'
                    }`}
                  >
                    Light
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaveMode('dark')}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      saveMode === 'dark'
                        ? 'bg-accent-muted border-accent text-accent font-bold'
                        : 'border-border-def bg-app-bg text-txt-muted hover:text-txt-primary hover:border-border-focus'
                    }`}
                  >
                    Dark
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="flex gap-2 justify-end mt-2">
              <button
                type="button"
                onClick={() => setIsSaveModalOpen(false)}
                className="px-4 py-1.5 border border-border-def hover:bg-surface-hover text-txt-secondary rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!saveName.trim()}
                onClick={() => {
                  const customSettingsToSave = overlay.name === 'fibonacciRetracement'
                    ? {
                        ...fibSettings,
                        visibility
                      }
                    : {
                        lineColor,
                        lineWidth,
                        lineStyle,
                        extendType,
                        fillColor,
                        fillBackground,
                        profitColor,
                        lossColor,
                        alwaysShowStats,
                        showLines,
                        text,
                        textColor,
                        fontSize,
                        bold: isBold,
                        italic: isItalic,
                        textPosition: {
                          vertical: textValign,
                          horizontal: textHalign
                        },
                        visibility
                      };
                  saveTemplate({
                    name: saveName,
                    group: saveGroup,
                    mode: saveMode,
                    settings: customSettingsToSave
                  });
                  setActiveTemplateMode(saveMode);
                  setIsSaveModalOpen(false);
                }}
                className="px-5 py-1.5 bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:pointer-events-none text-txt-inverse rounded-lg text-xs font-semibold transition-colors shadow-lg shadow-accent/20 cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
    </>
  );
};
