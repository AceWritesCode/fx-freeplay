import { registerOverlay } from 'klinecharts';
import { ToolRegistry } from './ToolRegistry';

export function initializeToolFramework() {
  const tools = ToolRegistry.getAll();
  
  tools.forEach((tool) => {
    // klinecharts expects the overlay object returned by the definition
    const overlayDef = tool.createOverlayDef();
    
    // Ensure the name matches the tool id so we can reference it
    // if the definition doesn't enforce this already.
    registerOverlay({
      ...overlayDef,
      name: tool.id
    });
    
    console.log(`[Tool Framework] Registered overlay tool: ${tool.id}`);
  });
}
