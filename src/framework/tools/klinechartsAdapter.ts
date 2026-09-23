import { registerOverlay, registerFigure, utils } from 'klinecharts';
import { ToolRegistry } from './ToolRegistry';
import { useDrawingStore } from '@/store';
import { getOriginalDrawingId, registerPhysicalFigures } from '@/engine/charting';

export function registerToolWithKLineCharts(tool: any) {
  const overlayDef = tool.createOverlayDef();
  
  const originalCreatePointFigures = overlayDef.createPointFigures;
  if (originalCreatePointFigures) {
    overlayDef.createPointFigures = (params: any) => {
      const { overlay } = params;
      if (overlay) {
        if (!overlay.extendData) {
          overlay.extendData = {};
        }
        const selectedIds = useDrawingStore.getState().selectedOverlayIds || [];
        const originalId = typeof overlay.id === 'string' ? getOriginalDrawingId(overlay.id) : null;
        const isSelected = typeof overlay.id === 'string' &&
                           (selectedIds.includes(overlay.id) || (!!originalId && selectedIds.includes(originalId)));
        overlay.extendData.isSelected = !!isSelected;
      }
      return originalCreatePointFigures(params);
    };
  }

  const originalCreateYAxisFigures = overlayDef.createYAxisFigures;
  if (originalCreateYAxisFigures) {
    overlayDef.createYAxisFigures = (params: any) => {
      const { overlay } = params;
      if (overlay) {
        if (!overlay.extendData) {
          overlay.extendData = {};
        }
        const selectedIds = useDrawingStore.getState().selectedOverlayIds || [];
        const originalId = typeof overlay.id === 'string' ? getOriginalDrawingId(overlay.id) : null;
        const isSelected = typeof overlay.id === 'string' &&
                           (selectedIds.includes(overlay.id) || (!!originalId && selectedIds.includes(originalId)));
        overlay.extendData.isSelected = !!isSelected;
      }
      const figures = originalCreateYAxisFigures(params);
      if (!figures) return [];
      const figureList = Array.isArray(figures) ? figures : [figures];
      // Price-axis labels represent price levels, not drawing bodies, and must never intercept pointer gestures
      figureList.forEach((fig: any) => {
        if (fig) fig.ignoreEvent = true;
      });
      return figures;
    };
  }

  const originalCreateXAxisFigures = overlayDef.createXAxisFigures;
  if (originalCreateXAxisFigures) {
    overlayDef.createXAxisFigures = (params: any) => {
      const { overlay } = params;
      if (overlay) {
        if (!overlay.extendData) {
          overlay.extendData = {};
        }
        const selectedIds = useDrawingStore.getState().selectedOverlayIds || [];
        const originalId = typeof overlay.id === 'string' ? getOriginalDrawingId(overlay.id) : null;
        const isSelected = typeof overlay.id === 'string' &&
                           (selectedIds.includes(overlay.id) || (!!originalId && selectedIds.includes(originalId)));
        overlay.extendData.isSelected = !!isSelected;
      }
      const figures = originalCreateXAxisFigures(params);
      if (!figures) return [];
      const figureList = Array.isArray(figures) ? figures : [figures];
      // Time-axis labels represent time levels, not drawing bodies, and must never intercept pointer gestures
      figureList.forEach((fig: any) => {
        if (fig) fig.ignoreEvent = true;
      });
      return figures;
    };
  }

  registerOverlay({
    needDefaultPointFigure: false,
    needDefaultXAxisFigure: false,
    needDefaultYAxisFigure: false,
    ...overlayDef,
    name: overlayDef.name || tool.id
  });
  
  console.log(`[Tool Framework] Registered overlay tool: ${tool.id}`);
}

export function initializeToolFramework() {
  registerPhysicalFigures({ registerFigure, utils });
  const tools = ToolRegistry.getAll();
  tools.forEach((tool) => {
    registerToolWithKLineCharts(tool);
  });
}
