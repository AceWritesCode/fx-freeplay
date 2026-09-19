import React from 'react';

export const ToolIconWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="w-[22px] h-[22px] flex items-center justify-center flex-shrink-0 text-current pointer-events-none select-none">
    {children}
  </span>
);

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

export const DeleteIcon = ({ className = "w-full h-full text-current", style }: { className?: string; style?: React.CSSProperties } = {}) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className={className} style={style}>
    <path fill="currentColor" d="M18 7h5v1h-2.01l-1.33 14.64a1.5 1.5 0 0 1-1.5 1.36H9.84a1.5 1.5 0 0 1-1.49-1.36L7.01 8H5V7h5V6c0-1.1.9-2 2-2h4a2 2 0 0 1 2 2v1Zm-6-2a1 1 0 0 0-1 1v1h6V6a1 1 0 0 0-1-1h-4ZM8.02 8l1.32 14.54a.5.5 0 0 0 .5.46h8.33a.5.5 0 0 0 .5-.46L19.99 8H8.02Z" />
  </svg>
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
      <path fill="currentColor" d="M9.877 3.607a3.997 3.997 0 0 1 5.508 1.27l.026.043-.848.53-.01-.017-.005.004a2.998 2.998 0 0 0-5.474 2.226 3 3 0 0 0 .302.79l.08.133L10.964 11H19.5l.256.012A2.5 2.5 0 0 1 22 13.5v7a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 6 20.5v-7a2.5 2.5 0 0 1 2.244-2.488L8.5 11h1.27L8.612 9.15a4 4 0 0 1-.58-1.645 4 4 0 0 1 1.845-3.898M8.5 12A1.5 1.5 0 0 0 7 13.5v7A1.5 1.5 0 0 0 8.5 22h11a1.5 1.5 0 0 0 1.5-1.5v-7a1.5 1.5 0 0 0-1.5-1.5zm5.5 3a1 1 0 0 1 1 1v2a1 1 0 1 1-2 0v-2a1 1 0 0 1 1-1" />
    )}
  </svg>
);

export const HideAllDrawingsIcon = ({ className = "w-full h-full text-current" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className={className}>
    <path fill="currentColor" fillRule="evenodd" d="M5 10.76l-.41-.72-.03-.04.03-.04a15 15 0 012.09-2.9c1.47-1.6 3.6-3.12 6.32-3.12 2.73 0 4.85 1.53 6.33 3.12a15.01 15.01 0 012.08 2.9l.03.04-.03.04a15 15 0 01-2.09 2.9c-1.47 1.6-3.6 3.12-6.32 3.12-2.73 0-4.85-1.53-6.33-3.12a15 15 0 01-1.66-2.18zm17.45-.98L22 10l.45.22-.01.02a5.04 5.04 0 01-.15.28 16.01 16.01 0 01-2.23 3.1c-1.56 1.69-3.94 3.44-7.06 3.44-3.12 0-5.5-1.75-7.06-3.44a16 16 0 01-2.38-3.38v-.02h-.01L4 10l-.45-.22.01-.02a5.4 5.4 0 01.15-.28 16 16 0 012.23-3.1C7.5 4.69 9.88 2.94 13 2.94c3.12 0 5.5 1.75 7.06 3.44a16.01 16.01 0 012.38 3.38v-.02h.01zM22 10l.45-.22.1.22-.1.22L22 10zM3.55 9.78L4 10l-.45.22-.1-.22.1-.22zm6.8.22A2.6 2.6 0 0113 7.44 2.6 2.6 0 0115.65 10 2.6 2.6 0 0113 12.56 2.6 2.6 0 0110.35 10zM13 6.44A3.6 3.6 0 009.35 10 3.6 3.6 0 0013 13.56c2 0 3.65-1.58 3.65-3.56A3.6 3.6 0 0013 6.44zm7.85 12l.8-.8.7.71-.79.8a.5.5 0 000 .7l.59.59c.2.2.5.2.7 0l1.8-1.8.7.71-1.79 1.8a1.5 1.5 0 01-2.12 0l-.59-.59a1.5 1.5 0 010-2.12zM16.5 21.5l-.35-.35a.5.5 0 00-.07.07l-1 1.5-1 1.5a.5.5 0 00.42.78h4a2.5 2.5 0 001.73-.77A2.5 2.5 0 0021 22.5a2.5 2.5 0 00-.77-1.73A2.5 2.5 0 0018.5 20a3.1 3.1 0 00-1.65.58 5.28 5.28 0 00-.69.55v.01h-.01l.35.36zm.39.32l-.97 1.46-.49.72h3.07c.34 0 .72-.17 1.02-.48.3-.3.48-.68.48-1.02 0-.34-.17-.72-.48-1.02-.3-.3-.68-.48-1.02-.48-.35 0-.75.18-1.1.42a4.27 4.27 0 00-.51.4z" />
  </svg>
);
