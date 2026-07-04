import { ToolRegistry } from './ToolRegistry';
import { TrendLineTool } from './implementations/TrendLine';
import { initializeToolFramework } from './klinechartsAdapter';

// Register all tools
ToolRegistry.register(TrendLineTool);

// Export registry and initialization function
export { ToolRegistry, initializeToolFramework };
export * from './ToolRegistry';
