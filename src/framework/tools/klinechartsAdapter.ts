import { registerOverlay } from 'klinecharts';
import { ToolRegistry } from './ToolRegistry';
import { useDrawingStore } from '@/store';

export function initializeToolFramework() {
  const tools = ToolRegistry.getAll();
  
  tools.forEach((tool) => {
    const overlayDef = tool.createOverlayDef();
    
    const originalCreatePointFigures = overlayDef.createPointFigures;
    if (originalCreatePointFigures) {
      overlayDef.createPointFigures = (params: any) => {
        const { overlay } = params;
        if (overlay) {
          if (!overlay.extendData) {
            overlay.extendData = {};
          }
          const selectedIds = useDrawingStore.getState().selectedOverlayIds;
          const isSelected = typeof overlay.id === 'string' &&
                             !overlay.id.startsWith('sync_') &&
                             selectedIds?.includes(overlay.id);
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
          const selectedIds = useDrawingStore.getState().selectedOverlayIds;
          const isSelected = typeof overlay.id === 'string' &&
                             !overlay.id.startsWith('sync_') &&
                             selectedIds?.includes(overlay.id);
          overlay.extendData.isSelected = !!isSelected;
        }
        return originalCreateYAxisFigures(params);
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
          const selectedIds = useDrawingStore.getState().selectedOverlayIds;
          const isSelected = typeof overlay.id === 'string' &&
                             !overlay.id.startsWith('sync_') &&
                             selectedIds?.includes(overlay.id);
          overlay.extendData.isSelected = !!isSelected;
        }
        return originalCreateXAxisFigures(params);
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
  });
}
