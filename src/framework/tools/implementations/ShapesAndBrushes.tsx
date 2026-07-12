import type { ToolDefinition } from '../ToolRegistry';

// 1. Brush SVG Icon
const BrushIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className={className}>
    <g fill="currentColor" fillRule="nonzero">
      <path d="M1.789 23l.859-.854.221-.228c.18-.19.38-.409.597-.655.619-.704 1.238-1.478 1.815-2.298.982-1.396 1.738-2.776 2.177-4.081 1.234-3.667 5.957-4.716 8.923-1.263 3.251 3.785-.037 9.38-5.379 9.38h-9.211zm9.211-1c4.544 0 7.272-4.642 4.621-7.728-2.45-2.853-6.225-2.015-7.216.931-.474 1.408-1.273 2.869-2.307 4.337-.599.852-1.241 1.653-1.882 2.383l-.068.078h6.853z" />
      <path d="M18.182 6.002l-1.419 1.286c-1.031.935-1.075 2.501-.096 3.48l1.877 1.877c.976.976 2.553.954 3.513-.045l5.65-5.874-.721-.693-5.65 5.874c-.574.596-1.507.609-2.086.031l-1.877-1.877c-.574-.574-.548-1.48.061-2.032l1.419-1.286-.672-.741z" />
    </g>
  </svg>
);

// 2. Highlighter SVG Icon
const HighlighterIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 23" className={className}>
    <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M13.402 0L6.78144 6.71532C6.67313 6.82518 6.5917 6.95862 6.54354 7.10518L5.13578 11.3889C4.89843 12.1111 5.08375 12.9074 5.61449 13.4458L5.68264 13.5149L0 19.2789L8.12695 22.4056L11.2874 19.1999L11.3556 19.269C11.8863 19.8073 12.6713 19.9953 13.3834 19.7546L17.6013 18.3285C17.7493 18.2784 17.8835 18.1945 17.9931 18.0832L24.6912 11.2892L23.9857 10.5837L17.515 17.147L7.70658 7.19818L14.1076 0.705575L13.402 0ZM6.07573 11.7067L7.24437 8.15061L16.576 17.6158L13.0701 18.8012C12.7141 18.9215 12.3215 18.8275 12.0562 18.5584L6.31509 12.7351C6.04972 12.466 5.95706 12.0678 6.07573 11.7067ZM6.30539 14.3045L10.509 18.5682L7.87935 21.2355L1.78414 18.8904L6.30539 14.3045Z" />
  </svg>
);

// 3. Arrow SVG Icon
const ArrowIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className={className}>
    <g fill="currentColor">
      <path fillRule="nonzero" d="M7.354 21.354l14-14-.707-.707-14 14z" />
      <path d="M21 7l-8 3 5 5z" />
      <path fillRule="nonzero" d="M22.5 7c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5zM5.5 24c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5z" />
    </g>
  </svg>
);

// 4. Rectangle SVG Icon
const RectangleIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className={className}>
    <g fill="currentColor" fillRule="nonzero">
      <path d="M7.5 6h13v-1h-13z" id="Line" />
      <path d="M7.5 23h13v-1h-13z" />
      <path d="M5 7.5v13h1v-13z" />
      <path d="M22 7.5v13h1v-13z" />
      <path d="M5.5 7c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5zM22.5 7c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5zM22.5 24c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5zM5.5 24c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5z" />
    </g>
  </svg>
);

// 5. Path SVG Icon
const PathIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className={className}>
    <path fill="currentColor" d="M11 10.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm4 7a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0zm11-8.8V13h1V7h-6v1h4.3l-7.42 7.41a2.49 2.49 0 0 0-2.76 0l-3.53-3.53a2.5 2.5 0 1 0-4.17 0L1 18.29l.7.71 6.42-6.41a2.49 2.49 0 0 0 2.76 0l3.53 3.53a2.5 2.5 0 1 0 4.17 0z" />
  </svg>
);

// 6. Circle SVG Icon
const CircleIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className={className} fill="none">
    <path stroke="currentColor" d="M16 14a2 2 0 1 1-4 0 2 2 0 0 1 4 0Z" />
    <path fill="currentColor" fillRule="evenodd" d="M4.5 14a9.5 9.5 0 0 1 18.7-2.37 2.5 2.5 0 0 0 0 4.74A9.5 9.5 0 0 1 4.5 14Zm19.7 2.5a10.5 10.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5ZM22.5 14a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z" />
  </svg>
);

// 7. Curve SVG Icon
const CurveIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className={className}>
    <g fill="currentColor" fillRule="nonzero">
      <path d="M6.256 20.652c.548-3.024 1.607-5.962 3.329-8.312l-.807-.591c-1.825 2.493-2.933 5.565-3.506 8.725l.984.178z" />
      <path d="M12.243 9.657c2.365-1.764 5.345-2.846 8.416-3.402l-.178-.984c-3.21.581-6.326 1.712-8.836 3.584l.598.802z" />
      <path d="M10.5 12c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5zM22.5 7c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5zM5.5 24c.828 0 1.5-.672 1.5-1.5s-.672-1.5-1.5-1.5-1.5.672-1.5 1.5.672 1.5 1.5 1.5zm0 1c-1.381 0-2.5-1.119-2.5-2.5s1.119-2.5 2.5-2.5 2.5 1.119 2.5 2.5-1.119 2.5-2.5 2.5z" />
    </g>
  </svg>
);

const createPlaceholderOverlay = (name: string) => ({
  name,
  totalStep: 3,
  needDefaultPointFigure: true,
  createPointFigures: ({ overlay, coordinates }: any) => {
    const customSettings = (overlay?.extendData as any)?.customSettings || {};
    const lineColor = customSettings.lineColor || '#2196F3';
    const lineWidth = customSettings.lineWidth || 1;
    const figures: any[] = [];
    if (coordinates.length === 2) {
      figures.push({
        type: 'line',
        attrs: { coordinates: [coordinates[0], coordinates[1]] },
        styles: { color: lineColor, size: lineWidth }
      });
    }
    return figures;
  }
});

export const BrushTool: ToolDefinition = {
  id: 'brush',
  name: 'Brush',
  icon: BrushIcon,
  group: 'shapes',
  settingsSchema: [],
  defaultTemplates: [{ id: 'default', name: 'Default', commonSettings: {} }],
  createOverlayDef: () => createPlaceholderOverlay('brush')
};

export const HighlighterTool: ToolDefinition = {
  id: 'highlighter',
  name: 'Highlighter',
  icon: HighlighterIcon,
  group: 'shapes',
  settingsSchema: [],
  defaultTemplates: [{ id: 'default', name: 'Default', commonSettings: {} }],
  createOverlayDef: () => createPlaceholderOverlay('highlighter')
};

export const ArrowTool: ToolDefinition = {
  id: 'arrow',
  name: 'Arrow',
  icon: ArrowIcon,
  group: 'shapes',
  settingsSchema: [],
  defaultTemplates: [{ id: 'default', name: 'Default', commonSettings: {} }],
  createOverlayDef: () => createPlaceholderOverlay('arrow')
};

export const RectangleTool: ToolDefinition = {
  id: 'rectangle',
  name: 'Rectangle',
  icon: RectangleIcon,
  group: 'shapes',
  hotkey: 'Alt + Shift + R',
  settingsSchema: [],
  defaultTemplates: [{ id: 'default', name: 'Default', commonSettings: {} }],
  createOverlayDef: () => createPlaceholderOverlay('rectangle')
};

export const PathTool: ToolDefinition = {
  id: 'path',
  name: 'Path',
  icon: PathIcon,
  group: 'shapes',
  settingsSchema: [],
  defaultTemplates: [{ id: 'default', name: 'Default', commonSettings: {} }],
  createOverlayDef: () => createPlaceholderOverlay('path')
};

export const CircleTool: ToolDefinition = {
  id: 'circle',
  name: 'Circle',
  icon: CircleIcon,
  group: 'shapes',
  settingsSchema: [],
  defaultTemplates: [{ id: 'default', name: 'Default', commonSettings: {} }],
  createOverlayDef: () => createPlaceholderOverlay('circle')
};

export const CurveTool: ToolDefinition = {
  id: 'curve',
  name: 'Curve',
  icon: CurveIcon,
  group: 'shapes',
  settingsSchema: [],
  defaultTemplates: [{ id: 'default', name: 'Default', commonSettings: {} }],
  createOverlayDef: () => createPlaceholderOverlay('curve')
};
