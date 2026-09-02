import React, { useEffect } from 'react';
import { 
  Star,
} from 'lucide-react';
import { ToolRegistry } from '@/framework/tools';
import { useDrawingStore } from '@/store';

export const TextIcon = ({ className = "w-full h-full text-current", style }: { className?: string; style?: React.CSSProperties } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className={className} style={style}>
    <path fill="currentColor" d="M8 6.5c0-.28.22-.5.5-.5H14v16h-2v1h5v-1h-2V6h5.5c.28 0 .5.22.5.5V9h1V6.5c0-.83-.67-1.5-1.5-1.5h-12C7.67 5 7 5.67 7 6.5V9h1V6.5Z" />
  </svg>
);

export const NoteIcon = ({ className = "w-full h-full text-current", style }: { className?: string; style?: React.CSSProperties } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className={className} style={style}>
    <path fill="currentColor" fillRule="evenodd" d="M5 3h17v13H5V3Zm8 14H5a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1h17a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-8v4.05a2.5 2.5 0 1 1-1 0V17Zm.5 8a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3ZM14 5h3a1 1 0 0 1 1 1v2h-1V6h-3v7h2v1h-5v-1h2V6h-3v2H9V6a1 1 0 0 1 1-1h4Z" />
  </svg>
);

export const TableIconComponent = ({ className = "w-full h-full text-current", style }: { className?: string; style?: React.CSSProperties } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className={className} style={style}>
    <path fill="currentColor" fillRule="evenodd" d="M4 5a1 1 0 0 0-1 1v17a1 1 0 0 0 1 1h20a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H4Zm0 1h5v5H4V6Zm0 12v5h5v-5H4Zm6 0v5h14v-5H10Zm14-1v-5H10v5h14ZM9 17H4v-5h5v5Zm1-6V6h14v5H10Z" />
  </svg>
);

export const CalloutIcon = ({ className = "w-full h-full text-current", style }: { className?: string; style?: React.CSSProperties } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className={className} style={style}>
    <path fill="currentColor" fillRule="nonzero" d="M6 21.586l3.586-3.586h13.407c.004 0 .007-11.993.007-11.993 0-.007-17-.007-17-.007v15.586zm-1 2.414v-18.005c0-.549.451-.995.995-.995h17.01c.549 0 .995.45.995 1.007v11.986c0 .556-.45 1.007-1.007 1.007h-12.993l-5 5z" />
  </svg>
);

export const DeleteIcon = ({ className = "w-full h-full text-current", style }: { className?: string; style?: React.CSSProperties } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className={className} style={style}>
    <path fill="currentColor" d="M18 7h5v1h-2.01l-1.33 14.64a1.5 1.5 0 0 1-1.5 1.36H9.84a1.5 1.5 0 0 1-1.49-1.36L7.01 8H5V7h5V6c0-1.1.9-2 2-2h4a2 2 0 0 1 2 2v1Zm-6-2a1 1 0 0 0-1 1v1h6V6a1 1 0 0 0-1-1h-4ZM8.02 8l1.32 14.54a.5.5 0 0 0 .5.46h8.33a.5.5 0 0 0 .5-.46L19.99 8H8.02Z" />
  </svg>
);

export const TEXT_TOOLS = [
  {
    id: 'text',
    name: 'Text',
    icon: TextIcon,
  },
  {
    id: 'note',
    name: 'Note',
    icon: NoteIcon,
  },
  {
    id: 'table',
    name: 'Table',
    icon: TableIconComponent,
  },
  {
    id: 'callout',
    name: 'Callout',
    icon: CalloutIcon,
  },
];

export const ToolIconWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="w-[22px] h-[22px] flex items-center justify-center flex-shrink-0 text-current pointer-events-none select-none">
    {children}
  </span>
);

// ─── TradingView SVG Icon Components ─────────────────────────────────────────

export const MeasureIcon = ({ className = "w-full h-full text-current", style }: { className?: string; style?: React.CSSProperties } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className={className} style={style}>
    <path fill="currentColor" d="M2 9.75a1.5 1.5 0 0 0-1.5 1.5v5.5a1.5 1.5 0 0 0 1.5 1.5h24a1.5 1.5 0 0 0 1.5-1.5v-5.5a1.5 1.5 0 0 0-1.5-1.5zm0 1h3v2.5h1v-2.5h3.25v3.9h1v-3.9h3.25v2.5h1v-2.5h3.25v3.9h1v-3.9H22v2.5h1v-2.5h3a.5.5 0 0 1 .5.5v5.5a.5.5 0 0 1-.5.5H2a.5.5 0 0 1-.5-.5v-5.5a.5.5 0 0 1 .5-.5z" transform="rotate(-45 14 14)" />
  </svg>
);

export const ZoomInIcon = ({ className = "w-full h-full text-current", style }: { className?: string; style?: React.CSSProperties } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className={className} style={style} fill="currentColor">
    <path d="M17.646 18.354l4 4 .708-.708-4-4z"></path>
    <path d="M12.5 21a8.5 8.5 0 1 1 0-17 8.5 8.5 0 0 1 0 17zm0-1a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15z"></path>
    <path d="M9 13h7v-1H9z"></path>
    <path d="M13 16V9h-1v7z"></path>
  </svg>
);

export const ZoomOutIcon = ({ className = "w-full h-full text-current", style }: { className?: string; style?: React.CSSProperties } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className={className} style={style} fill="currentColor">
    <path d="M17.646 18.354l4 4 .708-.708-4-4z"></path>
    <path d="M12.5 21a8.5 8.5 0 1 1 0-17 8.5 8.5 0 0 1 0 17zm0-1a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15z"></path>
    <path d="M9 13h7v-1H9z"></path>
  </svg>
);

export const NormalMagnetIcon = ({ className = "w-full h-full text-current", style }: { className?: string; style?: React.CSSProperties } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className={className} style={style}>
    <g fill="currentColor" fillRule="evenodd">
      <path fillRule="nonzero" d="M14 10a2 2 0 0 0-2 2v11H6V12c0-4.416 3.584-8 8-8s8 3.584 8 8v11h-6V12a2 2 0 0 0-2-2zm-3 2a3 3 0 0 1 6 0v10h4V12c0-3.864-3.136-7-7-7s-7 3.136-7 7v10h4V12z"></path>
      <path d="M6.5 18h5v1h-5zm10 0h5v1h-5z"></path>
    </g>
  </svg>
);

export const WeakMagnetIcon = ({ className = "w-full h-full text-current", style }: { className?: string; style?: React.CSSProperties } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className={className} style={style}>
    <g fill="currentColor" fillRule="evenodd">
      <path fillRule="nonzero" d="M14 10a2 2 0 0 0-2 2v11H6V12c0-4.416 3.584-8 8-8s8 3.584 8 8v11h-6V12a2 2 0 0 0-2-2zm-3 2a3 3 0 0 1 6 0v10h4V12c0-3.864-3.136-7-7-7s-7 3.136-7 7v10h4V12z"></path>
      <path d="M6.5 18h5v1h-5zm10 0h5v1h-5z"></path>
    </g>
  </svg>
);

export const StrongMagnetIcon = ({ className = "w-full h-full text-current", style }: { className?: string; style?: React.CSSProperties } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className={className} style={style}>
    <path fill="currentColor" fillRule="nonzero" d="M14 5a7 7 0 0 0-7 7v3h4v-3a3 3 0 1 1 6 0v3h4v-3a7 7 0 0 0-7-7zm7 11h-4v3h4v-3zm-10 0H7v3h4v-3zm-5-4a8 8 0 1 1 16 0v8h-6v-8a2 2 0 1 0-4 0v8H6v-8zm3.293 11.294l-1.222-2.037.858-.514 1.777 2.963-2 1 1.223 2.037-.858.514-1.778-2.963 2-1zm9.778-2.551l.858.514-1.223 2.037 2 1-1.777 2.963-.858-.514 1.223-2.037-2-1 1.777-2.963z" />
  </svg>
);

export const StayInDrawingModeIcon = ({ className = "w-full h-full text-current" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className={className}>
    <path fill="currentColor" d="M17.27 4.56a2.5 2.5 0 0 0-3.54 0l-.58.59-9 9-1 1-.15.14V20h4.7l.15-.15 1-1 9-9 .59-.58a2.5 2.5 0 0 0 0-3.54l-1.17-1.17Zm-2.83.7a1.5 1.5 0 0 1 2.12 0l1.17 1.18a1.5 1.5 0 0 1 0 2.12l-.23.23-3.3-3.29.24-.23Zm-.94.95 3.3 3.29-8.3 8.3-3.3-3.3 8.3-8.3Zm-9 9 3.3 3.29-.5.5H4v-3.3l.5-.5Zm16.5.29a1.5 1.5 0 0 0-3 0V18h4.5c.83 0 1.5.67 1.5 1.5v4c0 .83-.67 1.5-1.5 1.5h-6a1.5 1.5 0 0 1-1.5-1.5v-4c0-.83.67-1.5 1.5-1.5h.5v-2.5a2.5 2.5 0 0 1 5 0v.5h-1v-.5ZM16.5 19a.5.5 0 0 0-.5.5v4c0 .28.22.5.5.5h6a.5.5 0 0 0 .5-.5v-4a.5.5 0 0 0-.5-.5h-6Zm2.5 4v-2h1v2h-1Z" />
  </svg>
);

export const LockAllDrawingsIcon = ({ className = "w-full h-full text-current", locked = false }: { className?: string; locked?: boolean }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className={className} fill="none">
    {locked ? (
      <path fill="currentColor" d="M14 4a4 4 0 0 1 4 4v3h1.5a2.5 2.5 0 0 1 2.5 2.5v7a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 6 20.5v-7A2.5 2.5 0 0 1 8.5 11H10V8a4 4 0 0 1 4-4m-5.5 8A1.5 1.5 0 0 0 7 13.5v7A1.5 1.5 0 0 0 8.5 22h11a1.5 1.5 0 0 0 1.5-1.5v-7a1.5 1.5 0 0 0-1.5-1.5zm5.5 3a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0v-2a1 1 0 0 1 1-1m0-10a3 3 0 0 0-3 3v3h6V8a3 3 0 0 0-3-3" />
    ) : (
      <path fill="currentColor" d="M9.877 3.607a3.997 3.997 0 0 1 5.508 1.27l.026.043-.848.53-.01-.017-.005.004a2.998 2.998 0 0 0-5.474 2.226 3 3 0 0 0 .302.79l.08.133L10.964 11H19.5l.256.012A2.5 2.5 0 0 1 22 13.5v7a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 6 20.5v-7a2.5 2.5 0 0 1 2.244-2.488L8.5 11h1.27L8.612 9.15a4 4 0 0 1-.58-1.645 4 4 0 0 1 1.845-3.898M8.5 12A1.5 1.5 0 0 0 7 13.5v7A1.5 1.5 0 0 0 8.5 22h11a1.5 1.5 0 0 0 1.5-1.5v-7a1.5 1.5 0 0 0-1.5-1.5zm5.5 3a1 1 0 0 1 1 1v2a1 1 0 0 1-2 0v-2a1 1 0 0 1 1-1" />
    )}
  </svg>
);

export const HideAllDrawingsIcon = ({ className = "w-full h-full text-current" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className={className}>
    <path fill="currentColor" fillRule="evenodd" d="M5 10.76l-.41-.72-.03-.04.03-.04a15 15 0 012.09-2.9c1.47-1.6 3.6-3.12 6.32-3.12 2.73 0 4.85 1.53 6.33 3.12a15.01 15.01 0 012.08 2.9l.03.04-.03.04a15 15 0 01-2.09 2.9c-1.47 1.6-3.6 3.12-6.32 3.12-2.73 0-4.85-1.53-6.33-3.12a15 15 0 01-1.66-2.18zm17.45-.98L22 10l.45.22-.01.02a5.04 5.04 0 01-.15.28 16.01 16.01 0 01-2.23 3.1c-1.56 1.69-3.94 3.44-7.06 3.44-3.12 0-5.5-1.75-7.06-3.44a16 16 0 01-2.38-3.38v-.02h-.01L4 10l-.45-.22.01-.02a5.4 5.4 0 01.15-.28 16 16 0 012.23-3.1C7.5 4.69 9.88 2.94 13 2.94c3.12 0 5.5 1.75 7.06 3.44a16.01 16.01 0 012.38 3.38v-.02h.01zM22 10l.45-.22.1.22-.1.22L22 10zM3.55 9.78L4 10l-.45.22-.1-.22.1-.22zm6.8.22A2.6 2.6 0 0113 7.44 2.6 2.6 0 0115.65 10 2.6 2.6 0 0113 12.56 2.6 2.6 0 0110.35 10zM13 6.44A3.6 3.6 0 009.35 10 3.6 3.6 0 0013 13.56c2 0 3.65-1.58 3.65-3.56A3.6 3.6 0 0013 6.44zm7.85 12l.8-.8.7.71-.79.8a.5.5 0 000 .7l.59.59c.2.2.5.2.7 0l1.8-1.8.7.71-1.79 1.8a1.5 1.5 0 01-2.12 0l-.59-.59a1.5 1.5 0 010-2.12zM16.5 21.5l-.35-.35a.5.5 0 00-.07.07l-1 1.5-1 1.5a.5.5 0 00.42.78h4a2.5 2.5 0 001.73-.77A2.5 2.5 0 0021 22.5a2.5 2.5 0 00-.77-1.73A2.5 2.5 0 0018.5 20a3.1 3.1 0 00-1.65.58 5.28 5.28 0 00-.69.55v.01h-.01l.35.36zm.39.32l-.97 1.46-.49.72h3.07c.34 0 .72-.17 1.02-.48.3-.3.48-.68.48-1.02 0-.34-.17-.72-.48-1.02-.3-.3-.68-.48-1.02-.48-.35 0-.75.18-1.1.42a4.27 4.27 0 00-.51.4z" />
  </svg>
);

export const CURSOR_TOOLS = [
  {
    id: 'cross',
    name: 'Cross',
    icon: ({ className = "w-full h-full text-current" }: { className?: string } = {}) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className={className}>
        <g fill="currentColor">
          <path d="M18 15h8v-1h-8z"></path>
          <path d="M14 18v8h1v-8zM14 3v8h1v-8zM3 15h8v-1h-8z"></path>
        </g>
      </svg>
    )
  },
  {
    id: 'dot',
    name: 'Dot',
    icon: ({ className = "w-full h-full text-current" }: { className?: string } = {}) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className={className}>
        <circle fill="currentColor" cx="14" cy="14" r="3"></circle>
      </svg>
    )
  },
  {
    id: 'arrow',
    name: 'Arrow',
    icon: ({ className = "w-full h-full text-current" }: { className?: string } = {}) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className={className}>
        <path fill="currentColor" d="M11.682 16.09l3.504 6.068 1.732-1-3.497-6.057 3.595-2.1L8 7.74v10.512l3.682-2.163zm-.362 1.372L7 20V6l12 7-4.216 2.462 3.5 6.062-3.464 2-3.5-6.062z"></path>
      </svg>
    )
  },
  {
    id: 'eraser',
    name: 'Eraser',
    icon: ({ className = "w-full h-full text-current" }: { className?: string } = {}) => (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 29 31" className={className}>
        <g fill="currentColor" fillRule="nonzero">
          <path d="M15.3 22l8.187-8.187c.394-.394.395-1.028.004-1.418l-4.243-4.243c-.394-.394-1.019-.395-1.407-.006l-11.325 11.325c-.383.383-.383 1.018.007 1.407l1.121 1.121h7.656zm-9.484-.414c-.781-.781-.779-2.049-.007-2.821l11.325-11.325c.777-.777 2.035-.78 2.821.006l4.243 4.243c.781.781.78 2.048-.004 2.832l-8.48 8.48h-8.484l-1.414-1.414z"></path>
          <path d="M13.011 22.999h7.999v-1h-7.999zM13.501 11.294l6.717 6.717.707-.707-6.717-6.717z"></path>
        </g>
      </svg>
    )
  }
];

interface DrawingToolbarProps {
  hasData: boolean;
  activeTool: string | null;
  setActiveTool: (tool: string | null) => void;
  cancelDrawingSession: () => void;
  selectedCursorId: string;
  setSelectedCursorId: (id: string) => void;
  isCursorMenuOpen: boolean;
  setIsCursorMenuOpen: (open: boolean) => void;
  cursorMenuPos: { x: number; y: number };
  setCursorMenuPos: (pos: { x: number; y: number }) => void;
  selectedLineToolId: string;
  setSelectedLineToolId: (id: string) => void;
  isLineMenuOpen: boolean;
  setIsLineMenuOpen: (open: boolean) => void;
  lineMenuPos: { x: number; y: number };
  setLineMenuPos: (pos: { x: number; y: number }) => void;
  selectedShapeToolId: string;
  setSelectedShapeToolId: (id: string) => void;
  isShapeMenuOpen: boolean;
  setIsShapeMenuOpen: (open: boolean) => void;
  shapeMenuPos: { x: number; y: number };
  setShapeMenuPos: (pos: { x: number; y: number }) => void;
  selectedTextToolId: string;
  setSelectedTextToolId: (id: string) => void;
  isTextMenuOpen: boolean;
  setIsTextMenuOpen: (open: boolean) => void;
  textMenuPos: { x: number; y: number };
  setTextMenuPos: (pos: { x: number; y: number }) => void;
  selectedForecastToolId: string;
  setSelectedForecastToolId: (id: string) => void;
  isForecastMenuOpen: boolean;
  setIsForecastMenuOpen: (open: boolean) => void;
  forecastMenuPos: { x: number; y: number };
  setForecastMenuPos: (pos: { x: number; y: number }) => void;
  magnetMode: 'normal' | 'normal_magnet' | 'weak_magnet' | 'strong_magnet';
  isMagnetMenuOpen: boolean;
  setIsMagnetMenuOpen: (open: boolean) => void;
  magnetMenuPos: { x: number; y: number };
  setMagnetMenuPos: (pos: { x: number; y: number }) => void;
  handleSelectTool: (toolName: string) => void;
  handleClearDrawings: () => void;
  handleToggleMagnet: () => void;
  selectMagnetMode: (mode: 'weak_magnet' | 'normal_magnet' | 'strong_magnet') => void;
  cursorMenuRef: React.RefObject<HTMLDivElement | null>;
  lineMenuRef: React.RefObject<HTMLDivElement | null>;
  shapeMenuRef: React.RefObject<HTMLDivElement | null>;
  textMenuRef: React.RefObject<HTMLDivElement | null>;
  forecastMenuRef: React.RefObject<HTMLDivElement | null>;
  magnetMenuRef: React.RefObject<HTMLDivElement | null>;
  canZoomOut?: boolean;
  handleZoomOut?: () => void;
  chartInstanceRef?: any;
  activeOverlayIdRef?: any;
  isAllDrawingsLocked?: boolean;
  handleToggleLockAllDrawings?: () => void;
  isAllDrawingsHidden?: boolean;
  handleToggleHideAllDrawings?: () => void;
}

export const DrawingToolbar: React.FC<DrawingToolbarProps> = (props) => {
  const {
    hasData,
    activeTool,
    setActiveTool,
    cancelDrawingSession,
    selectedCursorId,
    setSelectedCursorId,
    isCursorMenuOpen,
    setIsCursorMenuOpen,
    cursorMenuPos,
    setCursorMenuPos,
    selectedLineToolId,
    setSelectedLineToolId,
    isLineMenuOpen,
    setIsLineMenuOpen,
    lineMenuPos,
    setLineMenuPos,
    selectedShapeToolId,
    setSelectedShapeToolId,
    isShapeMenuOpen,
    setIsShapeMenuOpen,
    shapeMenuPos,
    setShapeMenuPos,
    selectedTextToolId,
    setSelectedTextToolId,
    isTextMenuOpen,
    setIsTextMenuOpen,
    textMenuPos,
    setTextMenuPos,
    selectedForecastToolId,
    setSelectedForecastToolId,
    isForecastMenuOpen,
    setIsForecastMenuOpen,
    forecastMenuPos,
    setForecastMenuPos,
    magnetMode,
    isMagnetMenuOpen,
    setIsMagnetMenuOpen,
    magnetMenuPos,
    setMagnetMenuPos,
    handleSelectTool,
    handleClearDrawings,
    handleToggleMagnet,
    selectMagnetMode,
    canZoomOut,
    handleZoomOut,
    cursorMenuRef,
    lineMenuRef,
    shapeMenuRef,
    textMenuRef,
    forecastMenuRef,
    magnetMenuRef,
    isAllDrawingsLocked: externalIsAllDrawingsLocked,
    handleToggleLockAllDrawings,
    isAllDrawingsHidden: externalIsAllDrawingsHidden,
    handleToggleHideAllDrawings,
  } = props;

  const [localIsAllDrawingsLocked, setLocalIsAllDrawingsLocked] = React.useState(false);
  const [localIsAllDrawingsHidden, setLocalIsAllDrawingsHidden] = React.useState(false);

  const isAllDrawingsLocked = externalIsAllDrawingsLocked ?? localIsAllDrawingsLocked;
  const isAllDrawingsHidden = externalIsAllDrawingsHidden ?? localIsAllDrawingsHidden;

  const {
    favoriteTools,
    isFavoriteToolbarOpen,
    toggleFavoriteTool,
    setFavoriteToolbarOpen,
    isStayInDrawingMode,
    setStayInDrawingMode,
  } = useDrawingStore();

  const renderFavoriteButton = (toolId: string) => {
    const isFav = favoriteTools.includes(toolId);
    return (
      <button
        type="button"
        title={isFav ? 'Remove from favorites' : 'Add to favorites'}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleFavoriteTool(toolId);
        }}
        className="p-1 rounded hover:bg-surface-elevated transition-colors text-txt-muted flex items-center justify-center outline-none focus:outline-none"
      >
        <Star
          className={`w-3.5 h-3.5 transition-colors ${
            isFav ? 'fill-amber-400 text-amber-400' : 'text-txt-muted hover:text-amber-400'
          }`}
        />
      </button>
    );
  };

  const closeAllMenus = (except?: 'cursor' | 'line' | 'shape' | 'text' | 'forecast' | 'magnet') => {
    if (except !== 'cursor') setIsCursorMenuOpen(false);
    if (except !== 'line') setIsLineMenuOpen(false);
    if (except !== 'shape') setIsShapeMenuOpen(false);
    if (except !== 'text') setIsTextMenuOpen(false);
    if (except !== 'forecast') setIsForecastMenuOpen(false);
    if (except !== 'magnet') setIsMagnetMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        cursorMenuRef.current?.contains(target) ||
        lineMenuRef.current?.contains(target) ||
        shapeMenuRef.current?.contains(target) ||
        textMenuRef.current?.contains(target) ||
        forecastMenuRef.current?.contains(target) ||
        magnetMenuRef.current?.contains(target)
      ) {
        return;
      }
      closeAllMenus();
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [
    cursorMenuRef,
    lineMenuRef,
    shapeMenuRef,
    textMenuRef,
    forecastMenuRef,
    magnetMenuRef,
    setIsCursorMenuOpen,
    setIsLineMenuOpen,
    setIsShapeMenuOpen,
    setIsTextMenuOpen,
    setIsForecastMenuOpen,
    setIsMagnetMenuOpen,
  ]);

  return (
    <aside className="w-[52px] bg-surface border-r border-border-def flex flex-col items-start pl-[4px] py-3 gap-3.5 z-40">
      
      {/* Grouped Cursor Tools: Select / Crosshair */}
      {(() => {
        const activeCursorTool = CURSOR_TOOLS.find(t => t.id === selectedCursorId) || CURSOR_TOOLS[0];
        const Icon = activeCursorTool.icon;
        const isGroupActive = activeCursorTool.id === 'eraser' ? activeTool === 'eraser' : !activeTool;
        return (
          <div className="relative flex items-center bg-transparent rounded-lg">
            <button
              title={activeCursorTool.name}
              aria-label={activeCursorTool.name}
              data-tooltip={activeCursorTool.name}
              disabled={!hasData}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                closeAllMenus();
                if (activeCursorTool.id === 'eraser') {
                  if (activeTool === 'eraser') {
                    setActiveTool(null);
                  } else {
                    setActiveTool('eraser');
                  }
                } else {
                  cancelDrawingSession();
                  setStayInDrawingMode(false);
                }
              }}
              className={`p-1.5 rounded-md border transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
                isGroupActive
                  ? 'border-transparent bg-accent-muted text-accent z-10'
                  : 'border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
              }`}
              style={{ width: '34px', height: '34px' }}
            >
              <ToolIconWrapper>
                <Icon className="w-full h-full text-current" />
              </ToolIconWrapper>
            </button>
            <button
              title="More cursor tools"
              disabled={!hasData}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                setCursorMenuPos({ x: rect.right, y: rect.top });
                const nextState = !isCursorMenuOpen;
                closeAllMenus('cursor');
                setIsCursorMenuOpen(nextState);
              }}
              className={`border rounded-md transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
                isCursorMenuOpen
                  ? 'border-transparent bg-accent-muted text-accent z-10'
                  : 'border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
              }`}
              style={{ width: '12px', height: '34px' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" className="w-2 h-2 text-current">
                <path d="M5.5 3L10.5 8L5.5 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {isCursorMenuOpen && (
              <div
                ref={cursorMenuRef}
                className="fixed z-[100] bg-modal-bg border border-border-def rounded-lg shadow-2xl py-1 text-sm min-w-[260px] text-txt-secondary select-none"
                style={{
                  left: `${cursorMenuPos.x + 6}px`,
                  top: `${cursorMenuPos.y}px`,
                }}
              >
                {[
                  {
                    toolIds: ['cross', 'dot', 'arrow']
                  },
                  {
                    toolIds: ['eraser']
                  }
                ].map((section, idx, arr) => (
                  <div key={idx} className="flex flex-col">
                    <div className="flex flex-col">
                      {section.toolIds.map(toolId => {
                        const tool = CURSOR_TOOLS.find(t => t.id === toolId);
                        if (!tool) return null;
                        const ToolIcon = tool.icon;
                        const isSelected = selectedCursorId === tool.id && (tool.id === 'eraser' ? activeTool === 'eraser' : !activeTool);
                        return (
                          <button
                            key={tool.id}
                            onClick={() => {
                              setSelectedCursorId(tool.id);
                              if (tool.id === 'eraser') {
                                setActiveTool('eraser');
                              } else {
                                cancelDrawingSession();
                                setStayInDrawingMode(false);
                              }
                              closeAllMenus();
                            }}
                            className={`group flex items-center justify-between px-3.5 py-2 w-full text-left transition-colors ${
                              isSelected
                                ? 'bg-surface-elevated text-txt-primary font-medium'
                                : 'hover:bg-surface-hover text-txt-secondary'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className={`w-7 h-7 flex items-center justify-center rounded ${isSelected ? 'text-accent' : 'text-txt-muted group-hover:text-txt-primary'}`}>
                                <ToolIcon />
                              </span>
                              <span className="text-xs">{tool.name}</span>
                            </div>
                            
                            <div className="flex items-center gap-3.5">
                              {renderFavoriteButton(tool.id)}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    {idx < arr.length - 1 && (
                      <div className="border-t border-border-sub my-1"></div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Grouped Drawing Tools: Lines */}
      {(() => {
        const activeLineTool = ToolRegistry.get(selectedLineToolId) || ToolRegistry.get('trendLine');
        if (!activeLineTool) return null;
        const Icon = activeLineTool.icon;
        const isGroupActive = activeTool && ToolRegistry.get(activeTool)?.group === 'lines';
        return (
          <div className="relative flex items-center bg-transparent rounded-lg">
            <button
              title={activeLineTool.name}
              disabled={!hasData}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                closeAllMenus();
                handleSelectTool(activeLineTool.id);
              }}
              className={`p-1.5 rounded-md border transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
                isGroupActive
                  ? 'border-transparent bg-accent-muted text-accent z-10'
                  : 'border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
              }`}
              style={{ width: '34px', height: '34px' }}
            >
              <ToolIconWrapper>
                <Icon className="w-full h-full text-current" />
              </ToolIconWrapper>
            </button>
            <button
              title="More line tools"
              disabled={!hasData}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                setLineMenuPos({ x: rect.right, y: rect.top });
                const nextState = !isLineMenuOpen;
                closeAllMenus('line');
                setIsLineMenuOpen(nextState);
              }}
              className={`border rounded-md transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
                isLineMenuOpen
                  ? 'border-transparent bg-accent-muted text-accent z-10'
                  : 'border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
              }`}
              style={{ width: '12px', height: '34px' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" className="w-2 h-2 text-current">
                <path d="M5.5 3L10.5 8L5.5 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {isLineMenuOpen && (
              <div
                ref={lineMenuRef}
                className="fixed z-[100] bg-modal-bg border border-border-def rounded-lg shadow-2xl py-1 text-sm min-w-[260px] text-txt-secondary select-none"
                style={{
                  left: `${lineMenuPos.x + 6}px`,
                  top: `${lineMenuPos.y}px`,
                }}
              >
                {/* Header */}
                <div className="px-3.5 py-2 text-[10px] font-bold text-txt-muted uppercase tracking-wider">
                  Lines
                </div>

                {/* Items */}
                <div className="flex flex-col">
                  {ToolRegistry.getAll()
                    .filter(tool => tool.group === 'lines')
                    .map(tool => {
                      const ToolIcon = tool.icon;
                      const isSelected = selectedLineToolId === tool.id;
                      return (
                        <button
                          key={tool.id}
                          onClick={() => {
                            setSelectedLineToolId(tool.id);
                            handleSelectTool(tool.id);
                            closeAllMenus();
                          }}
                          className={`group flex items-center justify-between px-3.5 py-2 w-full text-left transition-colors ${
                            isSelected
                              ? 'bg-surface-elevated text-txt-primary font-medium'
                              : 'hover:bg-surface-hover text-txt-secondary'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className={`w-7 h-7 flex items-center justify-center rounded ${isSelected ? 'text-accent' : 'text-txt-muted group-hover:text-txt-primary'}`}>
                              <ToolIcon className="w-6 h-6 text-current" />
                            </span>
                            <span className="text-xs">{tool.name}</span>
                          </div>
                          
                            <div className="flex items-center gap-3.5">
                              {tool.hotkey && (
                                <span className="text-[10px] text-txt-muted font-mono pr-1">
                                  {tool.hotkey}
                                </span>
                              )}
                              {renderFavoriteButton(tool.id)}
                            </div>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Grouped Drawing Tools: Shapes & Brushes */}
      {(() => {
        const activeShapeTool = ToolRegistry.get(selectedShapeToolId) || ToolRegistry.get('brush');
        if (!activeShapeTool) return null;
        const Icon = activeShapeTool.icon;
        const isGroupActive = activeTool && ToolRegistry.get(activeTool)?.group === 'shapes';
        return (
          <div className="relative flex items-center bg-transparent rounded-lg">
            <button
              title={activeShapeTool.name}
              disabled={!hasData}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                closeAllMenus();
                handleSelectTool(activeShapeTool.id);
              }}
              className={`p-1.5 rounded-md border transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
                isGroupActive
                  ? 'border-transparent bg-accent-muted text-accent z-10'
                  : 'border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
              }`}
              style={{ width: '34px', height: '34px' }}
            >
              <ToolIconWrapper>
                <Icon className="w-full h-full text-current" />
              </ToolIconWrapper>
            </button>
            <button
              title="More shapes & brushes"
              disabled={!hasData}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                setShapeMenuPos({ x: rect.right, y: rect.top });
                const nextState = !isShapeMenuOpen;
                closeAllMenus('shape');
                setIsShapeMenuOpen(nextState);
              }}
              className={`border rounded-md transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
                isShapeMenuOpen
                  ? 'border-transparent bg-accent-muted text-accent z-10'
                  : 'border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
              }`}
              style={{ width: '12px', height: '34px' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" className="w-2 h-2 text-current">
                <path d="M5.5 3L10.5 8L5.5 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {isShapeMenuOpen && (
              <div
                ref={shapeMenuRef}
                className="fixed z-[100] bg-modal-bg border border-border-def rounded-lg shadow-2xl py-1 text-sm min-w-[260px] text-txt-secondary select-none"
                style={{
                  left: `${shapeMenuPos.x + 6}px`,
                  top: `${shapeMenuPos.y}px`,
                }}
              >
                {[
                  {
                    title: 'Brushes',
                    toolIds: ['brush', 'highlighter']
                  },
                  {
                    title: 'Arrows',
                    toolIds: ['arrow']
                  },
                  {
                    title: 'Shapes',
                    toolIds: ['rectangle', 'path', 'circle', 'curve']
                  }
                ].map((section, idx, arr) => (
                  <div key={section.title} className="flex flex-col">
                    {/* Section Header */}
                    <div className="px-3.5 py-1.5 text-[10px] font-bold text-txt-muted uppercase tracking-wider">
                      {section.title}
                    </div>

                    {/* Section Tools */}
                    <div className="flex flex-col">
                      {section.toolIds.map(toolId => {
                        const tool = ToolRegistry.get(toolId);
                        if (!tool) return null;
                        const ToolIcon = tool.icon;
                        const isSelected = selectedShapeToolId === tool.id;
                        return (
                          <button
                            key={tool.id}
                            onClick={() => {
                              setSelectedShapeToolId(tool.id);
                              handleSelectTool(tool.id);
                              closeAllMenus();
                            }}
                            className={`group flex items-center justify-between px-3.5 py-1.5 w-full text-left transition-colors ${
                              isSelected
                                ? 'bg-surface-elevated text-txt-primary font-medium'
                                : 'hover:bg-surface-hover text-txt-secondary'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span className={`w-7 h-7 flex items-center justify-center rounded ${isSelected ? 'text-accent' : 'text-txt-muted group-hover:text-txt-primary'}`}>
                                <ToolIcon className="w-6 h-6 text-current" />
                              </span>
                              <span className="text-xs">{tool.name}</span>
                            </div>
                            
                            <div className="flex items-center gap-3.5">
                              {tool.hotkey && (
                                <span className="text-[10px] text-txt-muted font-mono pr-1">
                                  {tool.hotkey}
                                </span>
                              )}
                              {renderFavoriteButton(tool.id)}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Divider Line */}
                    {idx < arr.length - 1 && (
                      <div className="border-t border-border-sub my-1"></div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Grouped Drawing Tools: Text & Notes */}
      {(() => {
        const activeTextTool = TEXT_TOOLS.find(t => t.id === selectedTextToolId) || TEXT_TOOLS[0];
        const Icon = activeTextTool.icon;
        const isGroupActive = activeTool && (activeTool === 'text' || activeTool === 'note' || activeTool === 'table' || activeTool === 'callout');
        return (
          <div className="relative flex items-center bg-transparent rounded-lg">
            <button
              title={activeTextTool.name}
              disabled={!hasData}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                closeAllMenus();
                if (activeTextTool.id === 'text') {
                  handleSelectTool('text');
                }
              }}
              className={`p-1.5 rounded-md border transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
                isGroupActive
                  ? 'border-transparent bg-accent-muted text-accent z-10'
                  : 'border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
              }`}
              style={{ width: '34px', height: '34px' }}
            >
              <ToolIconWrapper>
                <Icon className="w-full h-full text-current" />
              </ToolIconWrapper>
            </button>
            <button
              title="More text & notes tools"
              disabled={!hasData}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                setTextMenuPos({ x: rect.right, y: rect.top });
                const nextState = !isTextMenuOpen;
                closeAllMenus('text');
                setIsTextMenuOpen(nextState);
              }}
              className={`border rounded-md transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
                isTextMenuOpen
                  ? 'border-transparent bg-accent-muted text-accent z-10'
                  : 'border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
              }`}
              style={{ width: '12px', height: '34px' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" className="w-2 h-2 text-current">
                <path d="M5.5 3L10.5 8L5.5 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {isTextMenuOpen && (
              <div
                ref={textMenuRef}
                className="fixed z-[100] bg-modal-bg border border-border-def rounded-lg shadow-2xl py-1 text-sm min-w-[200px] text-txt-secondary select-none"
                style={{
                  left: `${textMenuPos.x + 6}px`,
                  top: `${textMenuPos.y}px`,
                }}
              >
                {/* Header */}
                <div className="px-3.5 py-1.5 text-[10px] font-bold text-txt-muted uppercase tracking-wider">
                  Text & Notes
                </div>

                {/* Items */}
                <div className="flex flex-col">
                  {TEXT_TOOLS.map(tool => {
                    const ToolIcon = tool.icon;
                    const isSelected = selectedTextToolId === tool.id;
                    return (
                      <button
                        key={tool.id}
                        onClick={() => {
                          setSelectedTextToolId(tool.id);
                          if (tool.id === 'text') {
                            handleSelectTool('text');
                          }
                          closeAllMenus();
                        }}
                        className={`group flex items-center justify-between px-3.5 py-1.5 w-full text-left transition-colors ${
                          isSelected
                            ? 'bg-surface-elevated text-txt-primary font-medium'
                            : 'hover:bg-surface-hover text-txt-secondary'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-7 h-7 flex items-center justify-center rounded ${
                            isSelected ? 'text-accent' : 'text-txt-muted group-hover:text-txt-primary'
                          }`}>
                            <ToolIcon className="w-5 h-5 text-current" />
                          </span>
                          <span className="text-xs">{tool.name}</span>
                        </div>
                        <div className="flex items-center gap-3.5">
                          {renderFavoriteButton(tool.id)}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Grouped Drawing Tools: Forecast (Long / Short position) */}
      {(() => {
        const activeForecastTool = ToolRegistry.get(selectedForecastToolId) || ToolRegistry.get('longPosition');
        if (!activeForecastTool) return null;
        const Icon = activeForecastTool.icon;
        const isGroupActive = activeTool && ToolRegistry.get(activeTool)?.group === 'forecast';
        return (
          <div className="relative flex items-center bg-transparent rounded-lg">
            <button
              title={activeForecastTool.name}
              disabled={!hasData}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                closeAllMenus();
                handleSelectTool(activeForecastTool.id);
              }}
              className={`p-1.5 rounded-md border transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
                isGroupActive
                  ? 'border-transparent bg-accent-muted text-accent z-10'
                  : 'border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
              }`}
              style={{ width: '34px', height: '34px' }}
            >
              <ToolIconWrapper>
                <Icon className="w-full h-full text-current" />
              </ToolIconWrapper>
            </button>
            <button
              title="More forecasting tools"
              disabled={!hasData}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                setForecastMenuPos({ x: rect.right, y: rect.top });
                const nextState = !isForecastMenuOpen;
                closeAllMenus('forecast');
                setIsForecastMenuOpen(nextState);
              }}
              className={`border rounded-md transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
                isForecastMenuOpen
                  ? 'border-transparent bg-accent-muted text-accent z-10'
                  : 'border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
              }`}
              style={{ width: '12px', height: '34px' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" className="w-2 h-2 text-current">
                <path d="M5.5 3L10.5 8L5.5 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {isForecastMenuOpen && (
              <div
                ref={forecastMenuRef}
                className="fixed z-[100] bg-modal-bg border border-border-def rounded-lg shadow-2xl py-1 text-sm min-w-[200px] text-txt-secondary select-none"
                style={{
                  left: `${forecastMenuPos.x + 6}px`,
                  top: `${forecastMenuPos.y}px`,
                }}
              >
                {/* Section header */}
                <div className="px-3.5 py-1.5 text-[10px] font-bold text-txt-muted uppercase tracking-wider">
                  Forecasting
                </div>
                {(['longPosition', 'shortPosition'] as const).map(toolId => {
                  const tool = ToolRegistry.get(toolId);
                  if (!tool) return null;
                  const ToolIcon = tool.icon;
                  const isSelected = selectedForecastToolId === tool.id;
                  return (
                    <button
                      key={tool.id}
                      onClick={() => {
                        setSelectedForecastToolId(tool.id);
                        handleSelectTool(tool.id);
                        closeAllMenus();
                      }}
                      className={`group flex items-center justify-between px-3.5 py-1.5 w-full text-left transition-colors ${
                        isSelected
                          ? 'bg-surface-elevated text-txt-primary font-medium'
                          : 'hover:bg-surface-hover text-txt-secondary'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-7 h-7 flex items-center justify-center rounded ${
                          isSelected ? 'text-accent' : 'text-txt-muted group-hover:text-txt-primary'
                        }`}>
                          <ToolIcon className="w-6 h-6 text-current" />
                        </span>
                        <span className="text-xs">{tool.name}</span>
                      </div>
                      <div className="flex items-center gap-3.5">
                        {renderFavoriteButton(tool.id)}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* Any other tools not in 'lines', 'shapes', or 'forecast' groups */}
      {ToolRegistry.getAll()
        .filter(tool => !tool.group)
        .map((tool) => {
          const Icon = tool.icon;
          const isActive = activeTool === tool.id;
          return (
            <button
              key={tool.id}
              title={tool.name}
              disabled={!hasData}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                closeAllMenus();
                handleSelectTool(tool.id);
              }}
              className={`p-1.5 rounded-md border border-transparent transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
                isActive
                  ? 'bg-accent-muted text-accent'
                  : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
              }`}
              style={{ width: '34px', height: '34px' }}
            >
              <ToolIconWrapper>
                <Icon className="w-full h-full text-current" />
              </ToolIconWrapper>
            </button>
          );
        })}

      {/* Divider 1: End of Drawing Tools */}
      <div className="w-[34px] border-t border-border-def/60 my-0.5" />

      {/* --- UTILITIES GROUP (Measure & Zoom) --- */}
      {/* Measure / Scale Tool */}
      <button
        title="Measure (Shift + Click & Drag)"
        aria-label="Measure"
        data-tooltip="Measure"
        disabled={!hasData}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          closeAllMenus();
          if (activeTool === 'measure') {
            setActiveTool(null);
          } else {
            handleSelectTool('measure');
          }
        }}
        className={`p-1.5 rounded-md border border-transparent transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
          activeTool === 'measure'
            ? 'bg-accent-muted text-accent'
            : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
        }`}
        style={{ width: '34px', height: '34px' }}
      >
        <ToolIconWrapper>
          <MeasureIcon className="w-full h-full text-current" />
        </ToolIconWrapper>
      </button>

      {/* Zoom In Tool */}
      <button
        title="Zoom in"
        aria-label="Zoom in"
        data-tooltip="Zoom in"
        disabled={!hasData}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          closeAllMenus();
          if (activeTool === 'zoomIn') {
            setActiveTool(null);
          } else {
            handleSelectTool('zoomIn');
          }
        }}
        className={`p-1.5 rounded-md border border-transparent transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
          activeTool === 'zoomIn'
            ? 'bg-accent-muted text-accent'
            : 'text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
        }`}
        style={{ width: '34px', height: '34px' }}
      >
        <ToolIconWrapper>
          <ZoomInIcon className="w-full h-full text-current" />
        </ToolIconWrapper>
      </button>

      {/* Zoom Out Tool (Appears when zoomed in) */}
      {canZoomOut && (
        <button
          title="Zoom out"
          aria-label="Zoom out"
          data-tooltip="Zoom out"
          disabled={!hasData}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            closeAllMenus();
            handleZoomOut?.();
          }}
          className="p-1.5 rounded-md border border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none"
          style={{ width: '34px', height: '34px' }}
        >
          <ToolIconWrapper>
            <ZoomOutIcon className="w-full h-full text-current" />
          </ToolIconWrapper>
        </button>
      )}

      {/* Divider 2: End of Utilities */}
      <div className="w-[34px] border-t border-border-def/60 my-0.5" />

      {/* --- ACTION TOOLS GROUP (Magnet, Stay in Drawing Mode, Lock All, Hide All) --- */}
      {/* Magnet Tool with Dropdown Chevron */}
      {(() => {
        const isMagnetActive = magnetMode !== 'normal';
        return (
          <div className="relative flex items-center bg-transparent rounded-lg">
            <button
              title="Magnet Mode (Snap to OHLC)"
              disabled={!hasData}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                closeAllMenus();
                handleToggleMagnet();
              }}
              className={`p-1.5 rounded-md border transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
                isMagnetActive
                  ? 'border-transparent bg-accent-muted text-accent z-10'
                  : 'border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
              }`}
              style={{ width: '34px', height: '34px' }}
            >
              <ToolIconWrapper>
                {magnetMode === 'strong_magnet' && (
                  <StrongMagnetIcon className="w-full h-full text-current" />
                )}
                {magnetMode === 'weak_magnet' && (
                  <WeakMagnetIcon className="w-full h-full text-current" />
                )}
                {(magnetMode === 'normal_magnet' || magnetMode === 'normal') && (
                  <NormalMagnetIcon className="w-full h-full text-current" />
                )}
              </ToolIconWrapper>
            </button>
            <button
              title="More magnet options"
              disabled={!hasData}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => {
                e.stopPropagation();
                const rect = e.currentTarget.getBoundingClientRect();
                setMagnetMenuPos({ x: rect.right, y: rect.top });
                const nextState = !isMagnetMenuOpen;
                closeAllMenus('magnet');
                setIsMagnetMenuOpen(nextState);
              }}
              className={`border rounded-md transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
                isMagnetMenuOpen
                  ? 'border-transparent bg-accent-muted text-accent z-10'
                  : 'border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
              }`}
              style={{ width: '12px', height: '34px' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" className="w-2 h-2 text-current">
                <path d="M5.5 3L10.5 8L5.5 13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            {isMagnetMenuOpen && (
              <div
                ref={magnetMenuRef}
                className="fixed z-[100] bg-modal-bg border border-border-def rounded-lg shadow-2xl py-1 text-sm min-w-[200px] text-txt-secondary select-none"
                style={{
                  left: `${magnetMenuPos.x + 6}px`,
                  top: `${magnetMenuPos.y}px`,
                }}
              >
                {/* Header */}
                <div className="px-3.5 py-1.5 text-[10px] font-bold text-txt-muted uppercase tracking-wider">
                  Magnet Mode
                </div>

                {/* Items */}
                <div className="flex flex-col">
                  {[
                    { id: 'weak_magnet', name: 'Weak Magnet', icon: WeakMagnetIcon },
                    { id: 'strong_magnet', name: 'Strong Magnet', icon: StrongMagnetIcon },
                  ].map((item) => {
                    const ItemIcon = item.icon;
                    const isSelected = magnetMode === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          selectMagnetMode(item.id as 'weak_magnet' | 'strong_magnet');
                          setIsMagnetMenuOpen(false);
                        }}
                        className={`group flex items-center justify-between px-3.5 py-1.5 w-full text-left transition-colors ${
                          isSelected
                            ? 'bg-surface-elevated text-txt-primary font-medium'
                            : 'hover:bg-surface-hover text-txt-secondary'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-7 h-7 flex items-center justify-center rounded ${
                              isSelected ? 'text-accent' : 'text-txt-muted group-hover:text-txt-primary'
                            }`}
                          >
                            <ItemIcon className="w-5 h-5 text-current" />
                          </span>
                          <span className="text-xs">{item.name}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Stay in Drawing Mode */}
      <button
        title={isStayInDrawingMode ? 'Stay in Drawing Mode (Active)' : 'Stay in Drawing Mode'}
        aria-label="Stay in Drawing Mode"
        data-tooltip="Stay in Drawing Mode"
        disabled={!hasData}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          closeAllMenus();
          setStayInDrawingMode(!isStayInDrawingMode);
        }}
        className={`p-1.5 rounded-md border transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
          isStayInDrawingMode
            ? 'border-transparent bg-accent-muted text-accent'
            : 'border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
        }`}
        style={{ width: '34px', height: '34px' }}
      >
        <ToolIconWrapper>
          <StayInDrawingModeIcon className="w-full h-full text-current" />
        </ToolIconWrapper>
      </button>

      {/* Lock All Drawings */}
      <button
        title={isAllDrawingsLocked ? 'Unlock All Drawing Tools' : 'Lock All Drawing Tools'}
        aria-label="Lock All Drawing Tools"
        data-tooltip="Lock All Drawing Tools"
        disabled={!hasData}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          closeAllMenus();
          if (handleToggleLockAllDrawings) {
            handleToggleLockAllDrawings();
          } else {
            setLocalIsAllDrawingsLocked(!isAllDrawingsLocked);
          }
        }}
        className={`p-1.5 rounded-md border transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
          isAllDrawingsLocked
            ? 'border-transparent bg-accent-muted text-accent'
            : 'border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
        }`}
        style={{ width: '34px', height: '34px' }}
      >
        <ToolIconWrapper>
          <LockAllDrawingsIcon className="w-full h-full text-current" locked={isAllDrawingsLocked} />
        </ToolIconWrapper>
      </button>

      {/* Hide All Drawings */}
      <button
        title={isAllDrawingsHidden ? 'Show All Drawings' : 'Hide All Drawings'}
        aria-label="Hide All Drawings"
        data-tooltip="Hide All Drawings"
        disabled={!hasData}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          closeAllMenus();
          if (handleToggleHideAllDrawings) {
            handleToggleHideAllDrawings();
          } else {
            setLocalIsAllDrawingsHidden(!isAllDrawingsHidden);
          }
        }}
        className={`p-1.5 rounded-md border transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
          isAllDrawingsHidden
            ? 'border-transparent bg-accent-muted text-accent'
            : 'border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent'
        }`}
        style={{ width: '34px', height: '34px' }}
      >
        <ToolIconWrapper>
          <HideAllDrawingsIcon className="w-full h-full text-current" />
        </ToolIconWrapper>
      </button>

      {/* Divider 3: End of Action Tools */}
      <div className="w-[34px] border-t border-border-def/60 my-0.5" />

      {/* --- DELETE ALL DRAWINGS --- */}
      <button
        title="Remove All Drawings"
        aria-label="Remove All Drawings"
        data-tooltip="Remove All Drawings"
        disabled={!hasData}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => {
          closeAllMenus();
          handleClearDrawings();
        }}
        className="p-1.5 rounded-md border border-transparent text-txt-muted hover:text-status-error hover:bg-surface-hover disabled:opacity-30 disabled:hover:bg-transparent transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none"
        style={{ width: '34px', height: '34px' }}
      >
        <ToolIconWrapper>
          <DeleteIcon className="w-full h-full text-current" />
        </ToolIconWrapper>
      </button>

      {/* Bottom Sidebar: Favorite Drawing Tools Toolbar Toggle */}
      <div className="mt-auto w-[44px] flex items-center justify-center pt-2 pb-0.5">
        <button
          title="Favorite Drawing Tools Toolbar"
          aria-label="Favorite Drawing Tools Toolbar"
          data-tooltip="Favorite Drawing Tools Toolbar"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            closeAllMenus();
            setFavoriteToolbarOpen(!isFavoriteToolbarOpen);
          }}
          className={`p-1.5 rounded-md border transition-all flex items-center justify-center outline-none focus:outline-none focus:ring-0 focus-visible:outline-none select-none ${
            isFavoriteToolbarOpen
              ? 'bg-surface-elevated text-txt-primary border-border-def shadow-sm'
              : 'border-transparent text-txt-muted hover:text-txt-primary hover:bg-surface-hover'
          }`}
          style={{ width: '34px', height: '34px' }}
        >
          <ToolIconWrapper>
            <Star className={`w-full h-full ${isFavoriteToolbarOpen ? 'fill-current text-txt-primary' : 'text-current'}`} />
          </ToolIconWrapper>
        </button>
      </div>
    </aside>
  );
};
