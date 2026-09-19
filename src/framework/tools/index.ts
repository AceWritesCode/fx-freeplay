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
import { LongPositionTool, ShortPositionTool } from './implementations/ForecastingTools';
import { TextTool } from './implementations/TextTool';
import { NoteTool } from './implementations/NoteTool';
import { CalloutTool } from './implementations/CalloutTool';
import { FibonacciRetracementTool } from './implementations/FibonacciRetracement';
import { initializeToolFramework, registerToolWithKLineCharts } from './klinechartsAdapter';

// Register all tools
ToolRegistry.register(TrendLineTool);
ToolRegistry.register(RayTool);
ToolRegistry.register(HorizontalLineTool);
ToolRegistry.register(HorizontalRayTool);
ToolRegistry.register(VerticalLineTool);
ToolRegistry.register(FibonacciRetracementTool);
ToolRegistry.register(BrushTool);
ToolRegistry.register(HighlighterTool);
ToolRegistry.register(ArrowTool);
ToolRegistry.register(RectangleTool);
ToolRegistry.register(PathTool);
ToolRegistry.register(CircleTool);
ToolRegistry.register(CurveTool);
ToolRegistry.register(LongPositionTool);
ToolRegistry.register(ShortPositionTool);
ToolRegistry.register(TextTool);
ToolRegistry.register(NoteTool);
ToolRegistry.register(CalloutTool);

// Initialize all tools with KLineCharts overlay registry
initializeToolFramework();

// Export registry, initialization function, and shared tool utilities
export { ToolRegistry, initializeToolFramework, registerToolWithKLineCharts };
export * from './ToolRegistry';
export * from './toolUtils';
export * from './implementations/FibonacciRetracement';
export * from './implementations/NoteTool';
export * from './implementations/CalloutTool';
export * from './implementations/TextTool';
export * from './sharedTextLayout';
