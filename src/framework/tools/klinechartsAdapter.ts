import { registerOverlay } from 'klinecharts';
import { ToolRegistry } from './ToolRegistry';

export function initializeToolFramework() {
  const tools = ToolRegistry.getAll();
  
  tools.forEach((tool) => {
    const overlayDef = tool.createOverlayDef();
    
    const originalCreatePointFigures = overlayDef.createPointFigures;
    if (originalCreatePointFigures) {
      overlayDef.createPointFigures = (params: any) => {
        const { chart, overlay } = params;
        if (chart && overlay) {
          if (!overlay.extendData) {
            overlay.extendData = {};
          }
          const isSelected = chart._selectedOverlayIds?.includes(overlay.id) ||
                             chart._selectedOverlayIds?.includes(`sync_${overlay.id}_from_${chart?._chartIndex}`);
          overlay.extendData.isSelected = !!isSelected;
        }
        return originalCreatePointFigures(params);
      };
    }

    const originalCreateYAxisFigures = overlayDef.createYAxisFigures;
    if (originalCreateYAxisFigures) {
      overlayDef.createYAxisFigures = (params: any) => {
        const { chart, overlay } = params;
        if (chart && overlay) {
          if (!overlay.extendData) {
            overlay.extendData = {};
          }
          const isSelected = chart._selectedOverlayIds?.includes(overlay.id) ||
                             chart._selectedOverlayIds?.includes(`sync_${overlay.id}_from_${chart?._chartIndex}`);
          overlay.extendData.isSelected = !!isSelected;
        }
        return originalCreateYAxisFigures(params);
      };
    }

    const originalCreateXAxisFigures = overlayDef.createXAxisFigures;
    if (originalCreateXAxisFigures) {
      overlayDef.createXAxisFigures = (params: any) => {
        const { chart, overlay } = params;
        if (chart && overlay) {
          if (!overlay.extendData) {
            overlay.extendData = {};
          }
          const isSelected = chart._selectedOverlayIds?.includes(overlay.id) ||
                             chart._selectedOverlayIds?.includes(`sync_${overlay.id}_from_${chart?._chartIndex}`);
          overlay.extendData.isSelected = !!isSelected;
        }
        return originalCreateXAxisFigures(params);
      };
    }

    registerOverlay({
      ...overlayDef,
      name: tool.id
    });
    
    console.log(`[Tool Framework] Registered overlay tool: ${tool.id}`);
  });
}
