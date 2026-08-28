import React from 'react';

interface ChartGridProps {
  layoutType: string;
  layoutContainerRef: React.RefObject<HTMLDivElement | null>;
  subContainerRef1: React.RefObject<HTMLDivElement | null>;
  subContainerRef2: React.RefObject<HTMLDivElement | null>;
  layoutSizes: Record<string, number[]>;
  startResize: (
    layout: string,
    index: number,
    direction: 'vertical' | 'horizontal',
    container: HTMLDivElement | null
  ) => (e: React.MouseEvent) => void;
  renderSlot: (index: number) => React.ReactNode;
}

export const ChartGrid: React.FC<ChartGridProps> = (props) => {
  const {
    layoutType,
    layoutContainerRef,
    subContainerRef1,
    subContainerRef2,
    layoutSizes,
    startResize,
    renderSlot,
  } = props;

  switch (layoutType) {
    case '1':
      return (
        <div ref={layoutContainerRef} className="h-full w-full bg-app-bg p-1.5 gap-0">
          <div key="slot_wrapper_0" className="h-full w-full">
            {renderSlot(0)}
          </div>
        </div>
      );
    case '2v': {
      const sizes = layoutSizes['2v'] || [50, 50];
      return (
        <div ref={layoutContainerRef} className="flex flex-row h-full w-full bg-app-bg p-1.5 gap-0">
          <div key="slot_wrapper_0" style={{ width: `${sizes[0]}%` }} className="h-full">
            {renderSlot(0)}
          </div>
          <div
            onMouseDown={startResize('2v', 0, 'vertical', layoutContainerRef.current)}
            className="w-1.5 h-full cursor-col-resize hover:bg-accent/50 bg-surface border-l border-r border-border-def transition-colors z-20 flex-shrink-0"
          />
          <div key="slot_wrapper_1" style={{ width: `${sizes[1]}%` }} className="h-full">
            {renderSlot(1)}
          </div>
        </div>
      );
    }
    case '2h': {
      const sizes = layoutSizes['2h'] || [50, 50];
      return (
        <div ref={layoutContainerRef} className="flex flex-col h-full w-full bg-app-bg p-1.5 gap-0">
          <div key="slot_wrapper_0" style={{ height: `${sizes[0]}%` }} className="w-full">
            {renderSlot(0)}
          </div>
          <div
            onMouseDown={startResize('2h', 0, 'horizontal', layoutContainerRef.current)}
            className="h-1.5 w-full cursor-row-resize hover:bg-accent/50 bg-surface border-t border-b border-border-def transition-colors z-20 flex-shrink-0"
          />
          <div key="slot_wrapper_1" style={{ height: `${sizes[1]}%` }} className="w-full">
            {renderSlot(1)}
          </div>
        </div>
      );
    }
    case '3v': {
      const sizes = layoutSizes['3v'] || [33.33, 33.33, 33.34];
      return (
        <div ref={layoutContainerRef} className="flex flex-row h-full w-full bg-app-bg p-1.5 gap-0">
          <div key="slot_wrapper_0" style={{ width: `${sizes[0]}%` }} className="h-full">
            {renderSlot(0)}
          </div>
          <div
            onMouseDown={startResize('3v', 0, 'vertical', layoutContainerRef.current)}
            className="w-1.5 h-full cursor-col-resize hover:bg-accent/50 bg-surface border-l border-r border-border-def transition-colors z-20 flex-shrink-0"
          />
          <div key="slot_wrapper_1" style={{ width: `${sizes[1]}%` }} className="h-full">
            {renderSlot(1)}
          </div>
          <div
            onMouseDown={startResize('3v', 1, 'vertical', layoutContainerRef.current)}
            className="w-1.5 h-full cursor-col-resize hover:bg-accent/50 bg-surface border-l border-r border-border-def transition-colors z-20 flex-shrink-0"
          />
          <div key="slot_wrapper_2" style={{ width: `${sizes[2]}%` }} className="h-full">
            {renderSlot(2)}
          </div>
        </div>
      );
    }
    case '3h': {
      const sizes = layoutSizes['3h'] || [33.33, 33.33, 33.34];
      return (
        <div ref={layoutContainerRef} className="flex flex-col h-full w-full bg-app-bg p-1.5 gap-0">
          <div key="slot_wrapper_0" style={{ height: `${sizes[0]}%` }} className="w-full">
            {renderSlot(0)}
          </div>
          <div
            onMouseDown={startResize('3h', 0, 'horizontal', layoutContainerRef.current)}
            className="h-1.5 w-full cursor-row-resize hover:bg-accent/50 bg-surface border-t border-b border-border-def transition-colors z-20 flex-shrink-0"
          />
          <div key="slot_wrapper_1" style={{ height: `${sizes[1]}%` }} className="w-full">
            {renderSlot(1)}
          </div>
          <div
            onMouseDown={startResize('3h', 1, 'horizontal', layoutContainerRef.current)}
            className="h-1.5 w-full cursor-row-resize hover:bg-accent/50 bg-surface border-t border-b border-border-def transition-colors z-20 flex-shrink-0"
          />
          <div key="slot_wrapper_2" style={{ height: `${sizes[2]}%` }} className="w-full">
            {renderSlot(2)}
          </div>
        </div>
      );
    }
    case '3g1': {
      const mainSizes = layoutSizes['3g1_main'] || [66.66, 33.34];
      const subSizes = layoutSizes['3g1_sub'] || [50, 50];
      return (
        <div ref={layoutContainerRef} className="flex flex-row h-full w-full bg-app-bg p-1.5 gap-0">
          <div key="slot_wrapper_0" style={{ width: `${mainSizes[0]}%` }} className="h-full">
            {renderSlot(0)}
          </div>
          <div
            onMouseDown={startResize('3g1_main', 0, 'vertical', layoutContainerRef.current)}
            className="w-1.5 h-full cursor-col-resize hover:bg-accent/50 bg-surface border-l border-r border-border-def transition-colors z-20 flex-shrink-0"
          />
          <div
            ref={subContainerRef1}
            style={{ width: `${mainSizes[1]}%` }}
            className="flex flex-col h-full"
          >
            <div key="slot_wrapper_1" style={{ height: `${subSizes[0]}%` }} className="w-full">
              {renderSlot(1)}
            </div>
            <div
              onMouseDown={startResize('3g1_sub', 0, 'horizontal', subContainerRef1.current)}
              className="h-1.5 w-full cursor-row-resize hover:bg-accent/50 bg-surface border-t border-b border-border-def transition-colors z-20 flex-shrink-0"
            />
            <div key="slot_wrapper_2" style={{ height: `${subSizes[1]}%` }} className="w-full">
              {renderSlot(2)}
            </div>
          </div>
        </div>
      );
    }
    case '3g2': {
      const mainSizes = layoutSizes['3g2_main'] || [66.66, 33.34];
      const subSizes = layoutSizes['3g2_sub'] || [50, 50];
      return (
        <div ref={layoutContainerRef} className="flex flex-col h-full w-full bg-app-bg p-1.5 gap-0">
          <div key="slot_wrapper_0" style={{ height: `${mainSizes[0]}%` }} className="w-full">
            {renderSlot(0)}
          </div>
          <div
            onMouseDown={startResize('3g2_main', 0, 'horizontal', layoutContainerRef.current)}
            className="h-1.5 w-full cursor-row-resize hover:bg-accent/50 bg-surface border-t border-b border-border-def transition-colors z-20 flex-shrink-0"
          />
          <div
            ref={subContainerRef1}
            style={{ height: `${mainSizes[1]}%` }}
            className="flex flex-row h-full w-full"
          >
            <div key="slot_wrapper_1" style={{ width: `${subSizes[0]}%` }} className="h-full">
              {renderSlot(1)}
            </div>
            <div
              onMouseDown={startResize('3g2_sub', 0, 'vertical', subContainerRef1.current)}
              className="w-1.5 h-full cursor-col-resize hover:bg-accent/50 bg-surface border-l border-r border-border-def transition-colors z-20 flex-shrink-0"
            />
            <div key="slot_wrapper_2" style={{ width: `${subSizes[1]}%` }} className="h-full">
              {renderSlot(2)}
            </div>
          </div>
        </div>
      );
    }
    case '3g3': {
      const mainSizes = layoutSizes['3g3_main'] || [33.34, 66.66];
      const subSizes = layoutSizes['3g3_sub'] || [50, 50];
      return (
        <div ref={layoutContainerRef} className="flex flex-row h-full w-full bg-app-bg p-1.5 gap-0">
          <div
            ref={subContainerRef1}
            style={{ width: `${mainSizes[0]}%` }}
            className="flex flex-col h-full"
          >
            <div key="slot_wrapper_0" style={{ height: `${subSizes[0]}%` }} className="w-full">
              {renderSlot(0)}
            </div>
            <div
              onMouseDown={startResize('3g3_sub', 0, 'horizontal', subContainerRef1.current)}
              className="h-1.5 w-full cursor-row-resize hover:bg-accent/50 bg-surface border-t border-b border-border-def transition-colors z-20 flex-shrink-0"
            />
            <div key="slot_wrapper_1" style={{ height: `${subSizes[1]}%` }} className="w-full">
              {renderSlot(1)}
            </div>
          </div>
          <div
            onMouseDown={startResize('3g3_main', 0, 'vertical', layoutContainerRef.current)}
            className="w-1.5 h-full cursor-col-resize hover:bg-accent/50 bg-surface border-l border-r border-border-def transition-colors z-20 flex-shrink-0"
          />
          <div key="slot_wrapper_2" style={{ width: `${mainSizes[1]}%` }} className="h-full">
            {renderSlot(2)}
          </div>
        </div>
      );
    }
    case '3g4': {
      const mainSizes = layoutSizes['3g4_main'] || [50, 50];
      const subSizes = layoutSizes['3g4_sub'] || [50, 50];
      return (
        <div ref={layoutContainerRef} className="flex flex-col h-full w-full bg-app-bg p-1.5 gap-0">
          <div
            ref={subContainerRef1}
            style={{ height: `${mainSizes[0]}%` }}
            className="flex flex-row h-full w-full"
          >
            <div key="slot_wrapper_0" style={{ width: `${subSizes[0]}%` }} className="h-full">
              {renderSlot(0)}
            </div>
            <div
              onMouseDown={startResize('3g4_sub', 0, 'vertical', subContainerRef1.current)}
              className="w-1.5 h-full cursor-col-resize hover:bg-accent/50 bg-surface border-l border-r border-border-def transition-colors z-20 flex-shrink-0"
            />
            <div key="slot_wrapper_1" style={{ width: `${subSizes[1]}%` }} className="h-full">
              {renderSlot(1)}
            </div>
          </div>
          <div
            onMouseDown={startResize('3g4_main', 0, 'horizontal', layoutContainerRef.current)}
            className="h-1.5 w-full cursor-row-resize hover:bg-accent/50 bg-surface border-t border-b border-border-def transition-colors z-20 flex-shrink-0"
          />
          <div key="slot_wrapper_2" style={{ height: `${mainSizes[1]}%` }} className="w-full">
            {renderSlot(2)}
          </div>
        </div>
      );
    }
    case '4':
    case '4g': {
      const mainSizes = layoutSizes['4g_main'] || layoutSizes['4_main'] || [50, 50];
      const sub1Sizes = layoutSizes['4g_left'] || layoutSizes['4_sub1'] || [50, 50];
      const sub2Sizes = layoutSizes['4g_right'] || layoutSizes['4_sub2'] || [50, 50];
      const mainKey = layoutSizes['4g_main'] ? '4g_main' : '4_main';
      const sub1Key = layoutSizes['4g_left'] ? '4g_left' : '4_sub1';
      const sub2Key = layoutSizes['4g_right'] ? '4g_right' : '4_sub2';
      return (
        <div ref={layoutContainerRef} className="flex flex-col h-full w-full bg-app-bg p-1.5 gap-0">
          <div
            ref={subContainerRef1}
            style={{ height: `${mainSizes[0]}%` }}
            className="flex flex-row w-full"
          >
            <div key="slot_wrapper_0" style={{ width: `${sub1Sizes[0]}%` }} className="h-full">
              {renderSlot(0)}
            </div>
            <div
              onMouseDown={startResize(sub1Key, 0, 'vertical', subContainerRef1.current)}
              className="w-1.5 h-full cursor-col-resize hover:bg-accent/50 bg-surface border-l border-r border-border-def transition-colors z-20 flex-shrink-0"
            />
            <div key="slot_wrapper_1" style={{ width: `${sub1Sizes[1]}%` }} className="h-full">
              {renderSlot(1)}
            </div>
          </div>
          <div
            onMouseDown={startResize(mainKey, 0, 'horizontal', layoutContainerRef.current)}
            className="h-1.5 w-full cursor-row-resize hover:bg-accent/50 bg-surface border-t border-b border-border-def transition-colors z-20 flex-shrink-0"
          />
          <div
            ref={subContainerRef2}
            style={{ height: `${mainSizes[1]}%` }}
            className="flex flex-row w-full animate-none"
          >
            <div key="slot_wrapper_2" style={{ width: `${sub2Sizes[0]}%` }} className="h-full">
              {renderSlot(2)}
            </div>
            <div
              onMouseDown={startResize(sub2Key, 0, 'vertical', subContainerRef2.current)}
              className="w-1.5 h-full cursor-col-resize hover:bg-accent/50 bg-surface border-l border-r border-border-def transition-colors z-20 flex-shrink-0"
            />
            <div key="slot_wrapper_3" style={{ width: `${sub2Sizes[1]}%` }} className="h-full">
              {renderSlot(3)}
            </div>
          </div>
        </div>
      );
    }
    case '4v': {
      const sizes = layoutSizes['4v'] || [25, 25, 25, 25];
      return (
        <div ref={layoutContainerRef} className="flex flex-row h-full w-full bg-app-bg p-1.5 gap-0">
          <div key="slot_wrapper_0" style={{ width: `${sizes[0]}%` }} className="h-full">
            {renderSlot(0)}
          </div>
          <div
            onMouseDown={startResize('4v', 0, 'vertical', layoutContainerRef.current)}
            className="w-1.5 h-full cursor-col-resize hover:bg-accent/50 bg-surface border-l border-r border-border-def transition-colors z-20 flex-shrink-0"
          />
          <div key="slot_wrapper_1" style={{ width: `${sizes[1]}%` }} className="h-full">
            {renderSlot(1)}
          </div>
          <div
            onMouseDown={startResize('4v', 1, 'vertical', layoutContainerRef.current)}
            className="w-1.5 h-full cursor-col-resize hover:bg-accent/50 bg-surface border-l border-r border-border-def transition-colors z-20 flex-shrink-0"
          />
          <div key="slot_wrapper_2" style={{ width: `${sizes[2]}%` }} className="h-full">
            {renderSlot(2)}
          </div>
          <div
            onMouseDown={startResize('4v', 2, 'vertical', layoutContainerRef.current)}
            className="w-1.5 h-full cursor-col-resize hover:bg-accent/50 bg-surface border-l border-r border-border-def transition-colors z-20 flex-shrink-0"
          />
          <div key="slot_wrapper_3" style={{ width: `${sizes[3]}%` }} className="h-full">
            {renderSlot(3)}
          </div>
        </div>
      );
    }
    case '4h': {
      const sizes = layoutSizes['4h'] || [25, 25, 25, 25];
      return (
        <div ref={layoutContainerRef} className="flex flex-col h-full w-full bg-app-bg p-1.5 gap-0">
          <div key="slot_wrapper_0" style={{ height: `${sizes[0]}%` }} className="w-full">
            {renderSlot(0)}
          </div>
          <div
            onMouseDown={startResize('4h', 0, 'horizontal', layoutContainerRef.current)}
            className="h-1.5 w-full cursor-row-resize hover:bg-accent/50 bg-surface border-t border-b border-border-def transition-colors z-20 flex-shrink-0"
          />
          <div key="slot_wrapper_1" style={{ height: `${sizes[1]}%` }} className="w-full">
            {renderSlot(1)}
          </div>
          <div
            onMouseDown={startResize('4h', 1, 'horizontal', layoutContainerRef.current)}
            className="h-1.5 w-full cursor-row-resize hover:bg-accent/50 bg-surface border-t border-b border-border-def transition-colors z-20 flex-shrink-0"
          />
          <div key="slot_wrapper_2" style={{ height: `${sizes[2]}%` }} className="w-full">
            {renderSlot(2)}
          </div>
          <div
            onMouseDown={startResize('4h', 2, 'horizontal', layoutContainerRef.current)}
            className="h-1.5 w-full cursor-row-resize hover:bg-accent/50 bg-surface border-t border-b border-border-def transition-colors z-20 flex-shrink-0"
          />
          <div key="slot_wrapper_3" style={{ height: `${sizes[3]}%` }} className="w-full">
            {renderSlot(3)}
          </div>
        </div>
      );
    }
    default:
      return null;
  }
};
