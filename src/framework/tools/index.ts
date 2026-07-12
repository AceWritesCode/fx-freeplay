import { ToolRegistry } from './ToolRegistry';
import { TrendLineTool } from './implementations/TrendLine';
import { RayTool } from './implementations/Ray';
import { HorizontalLineTool } from './implementations/HorizontalLine';
import { HorizontalRayTool } from './implementations/HorizontalRay';
import { VerticalLineTool } from './implementations/VerticalLine';
import { 
  BrushTool, 
  HighlighterTool, 
  ArrowTool, 
  RectangleTool, 
  PathTool, 
  CircleTool, 
  CurveTool 
} from './implementations/ShapesAndBrushes';
import { initializeToolFramework } from './klinechartsAdapter';

// Register all tools
ToolRegistry.register(TrendLineTool);
ToolRegistry.register(RayTool);
ToolRegistry.register(HorizontalLineTool);
ToolRegistry.register(HorizontalRayTool);
ToolRegistry.register(VerticalLineTool);
ToolRegistry.register(BrushTool);
ToolRegistry.register(HighlighterTool);
ToolRegistry.register(ArrowTool);
ToolRegistry.register(RectangleTool);
ToolRegistry.register(PathTool);
ToolRegistry.register(CircleTool);
ToolRegistry.register(CurveTool);

// Export registry and initialization function
export { ToolRegistry, initializeToolFramework };
export * from './ToolRegistry';
