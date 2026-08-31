import type { ToolDefinition } from '../ToolRegistry';
import { drawGrabHandles } from '../toolUtils';

// Text Icon Component
const TextToolIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28" className={className}>
    <path fill="currentColor" d="M6 7h16v3h-6.5v12h-3V10H6V7z" />
  </svg>
);

const isOverlayVisible = (overlay: any, chart: any) => {
  const customSettings = (overlay?.extendData as any)?.customSettings || {};
  const visibility = customSettings.visibility;
  if (!visibility) return true;
  const tf = chart?._loadedTimeframe || '1m';
  const match = tf.match(/^(\d+)([a-zA-Z]+)$/);
  if (!match) return true;
  const value = parseInt(match[1]);
  const unitChar = match[2];
  let unit = 'minutes';
  if (unitChar === 's') unit = 'seconds';
  else if (unitChar === 'm') unit = 'minutes';
  else if (unitChar === 'h' || unitChar === 'H') unit = 'hours';
  else if (unitChar === 'd' || unitChar === 'D') unit = 'days';
  else if (unitChar === 'w' || unitChar === 'W') unit = 'weeks';
  else if (unitChar === 'M') unit = 'months';

  const rule = visibility[unit];
  if (!rule) return true;
  if (!rule.show) return false;
  if (rule.min !== undefined && value < rule.min) return false;
  if (rule.max !== undefined && value > rule.max) return false;
  return true;
};

export const TextTool: ToolDefinition = {
  id: 'text',
  name: 'Text',
  icon: TextToolIcon,
  group: 'text',
  hotkey: 'Alt + T',
  settingsSchema: [
    { id: 'textColor', label: 'Text Color', type: 'color', defaultValue: '#2196F3' },
    { id: 'fontSize', label: 'Font Size', type: 'number', defaultValue: 14, min: 8, max: 72, step: 1 },
    { id: 'bold', label: 'Bold', type: 'boolean', defaultValue: false },
    { id: 'italic', label: 'Italic', type: 'boolean', defaultValue: false },
    { id: 'fillBackground', label: 'Background', type: 'boolean', defaultValue: false },
    { id: 'fillColor', label: 'Background Color', type: 'color', defaultValue: 'rgba(33, 150, 243, 0.1)' },
    { id: 'showBorder', label: 'Show Border', type: 'boolean', defaultValue: true },
    { id: 'lineColor', label: 'Border Color', type: 'color', defaultValue: '#2196F3' },
    { id: 'boxWidth', label: 'Box Width', type: 'number', defaultValue: 200, min: 50, max: 1000, step: 10 },
    { id: 'isAnchored', label: 'Anchor to Chart', type: 'boolean', defaultValue: false }
  ],
  defaultTemplates: [
    { id: 'default', name: 'Default', commonSettings: { textColor: '#2196F3', fontSize: 14, boxWidth: 200, isAnchored: false } }
  ],

  createOverlayDef: () => ({
    name: 'text',
    totalStep: 2,
    needDefaultPointFigure: false,
    createPointFigures: ({ overlay, coordinates, chart }) => {
      if (chart && !isOverlayVisible(overlay, chart)) {
        return [];
      }
      if (coordinates.length === 0) return [];

      // Do not render any figure while moving mouse cursor before the first click
      const isDrawn = !!(overlay?.extendData as any)?.isDrawn || ((chart as any)?._activeDrawingId !== overlay?.id && (overlay?.extendData as any)?.isDrawn !== false);
      if (!isDrawn) return [];

      const customSettings = (overlay?.extendData as any)?.customSettings || {};
      const lineColor = customSettings.lineColor || '#2196F3';
      const lineWidth = customSettings.lineWidth || 1;
      const fillColor = customSettings.fillBackground ? (customSettings.fillColor || 'rgba(33, 150, 243, 0.1)') : 'transparent';
      const showBorder = customSettings.showBorder !== false;
      const boxWidth = customSettings.boxWidth || 200;
      const boxHeight = customSettings.boxHeight || 40;

      const p1 = coordinates[0];
      const x = p1.x;
      const y = p1.y;
      const w = boxWidth;
      const h = boxHeight;

      const figures: any[] = [];

      // Optional background / border box figure
      figures.push({
        type: 'rect',
        attrs: { x, y, width: w, height: h },
        styles: {
          style: showBorder ? 'stroke_fill' : (customSettings.fillBackground ? 'fill' : 'none'),
          color: fillColor,
          borderColor: showBorder ? lineColor : 'transparent',
          borderSize: showBorder ? lineWidth : 0,
        },
        ignoreEvent: false
      });

      // Grab Handles when selected or hovered
      const isSelected = (overlay.extendData as any)?.isSelected;
      const isHovered = (overlay.extendData as any)?.isHovered;
      if (isSelected || isHovered) {
        // Construct 4 corners + right-center handle for width resizing
        const handles = [
          { x, y }, // 0: top-left
          { x: x + w, y }, // 1: top-right
          { x: x + w, y: y + h }, // 2: bottom-right
          { x, y: y + h }, // 3: bottom-left
          { x: x + w, y: y + h / 2 } // 4: right-center (width handle)
        ];
        drawGrabHandles(figures, handles, overlay.lock || false);
      }

      return figures;
    }
  }),

  onDrawEnd: (event: any) => {
    const points = event.overlay.points;
    if (!points || points.length === 0) return;

    const customSettings = event.overlay.extendData?.customSettings || {};
    const updatedExtendData = {
      ...(event.overlay.extendData || {}),
      customSettings: {
        boxWidth: 200,
        textColor: '#2196F3',
        fontSize: 14,
        isAnchored: false,
        ...customSettings,
      },
      isDrawn: true,
      isNewText: true // Marker for immediate text editing
    };

    event.chart.overrideOverlay({
      id: event.overlay.id,
      extendData: updatedExtendData
    });
  },

  onPressedMoving: (event: any, draggedIndex: number) => {
    if (draggedIndex === undefined || draggedIndex === null) return false;

    const overlay = event.overlay;
    const customSettings = overlay.extendData?.customSettings || {};

    // Handle width adjustment via right handles (index 1, 2, 4)
    if (draggedIndex === 1 || draggedIndex === 2 || draggedIndex === 4) {
      const p1 = event.coordinates[0];
      if (p1 && typeof event.x === 'number') {
        const newWidth = Math.max(60, event.x - p1.x);
        event.chart.overrideOverlay({
          id: overlay.id,
          extendData: {
            ...overlay.extendData,
            customSettings: {
              ...customSettings,
              boxWidth: newWidth
            }
          }
        });
        return true;
      }
    }

    return false;
  }
};
