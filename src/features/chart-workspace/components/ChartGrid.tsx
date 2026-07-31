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
        <div ref={layoutContainerRef} className="h-full w-full bg-[#131722] p-1.5 gap-0">
          <div className="h-full w-full">
            {renderSlot(0)}
          </div>
        </div>
      );
    case '2v':
      return (
        <div ref={layoutContainerRef} className="flex flex-row h-full w-full bg-[#131722] p-1.5 gap-0">
          <div style={{ width: `${layoutSizes['2v'][0]}%` }} className="h-full">
            {renderSlot(0)}
          </div>
          <div
            onMouseDown={startResize('2v', 0, 'vertical', layoutContainerRef.current)}
            className="w-1.5 h-full cursor-col-resize hover:bg-indigo-500/50 bg-gray-900 border-l border-r border-gray-800 transition-colors z-20 flex-shrink-0"
          />
          <div style={{ width: `${layoutSizes['2v'][1]}%` }} className="h-full">
            {renderSlot(1)}
          </div>
        </div>
      );
    case '2h':
      return (
        <div ref={layoutContainerRef} className="flex flex-col h-full w-full bg-[#131722] p-1.5 gap-0">
          <div style={{ height: `${layoutSizes['2h'][0]}%` }} className="w-full">
            {renderSlot(0)}
          </div>
          <div
            onMouseDown={startResize('2h', 0, 'horizontal', layoutContainerRef.current)}
            className="h-1.5 w-full cursor-row-resize hover:bg-indigo-500/50 bg-gray-900 border-t border-b border-gray-800 transition-colors z-20 flex-shrink-0"
          />
          <div style={{ height: `${layoutSizes['2h'][1]}%` }} className="w-full">
            {renderSlot(1)}
          </div>
        </div>
      );
    case '3v':
      return (
        <div ref={layoutContainerRef} className="flex flex-row h-full w-full bg-[#131722] p-1.5 gap-0">
          <div style={{ width: `${layoutSizes['3v'][0]}%` }} className="h-full">
            {renderSlot(0)}
          </div>
          <div
            onMouseDown={startResize('3v', 0, 'vertical', layoutContainerRef.current)}
            className="w-1.5 h-full cursor-col-resize hover:bg-indigo-500/50 bg-gray-900 border-l border-r border-gray-800 transition-colors z-20 flex-shrink-0"
          />
          <div style={{ width: `${layoutSizes['3v'][1]}%` }} className="h-full">
            {renderSlot(1)}
          </div>
          <div
            onMouseDown={startResize('3v', 1, 'vertical', layoutContainerRef.current)}
            className="w-1.5 h-full cursor-col-resize hover:bg-indigo-500/50 bg-gray-900 border-l border-r border-gray-800 transition-colors z-20 flex-shrink-0"
          />
          <div style={{ width: `${layoutSizes['3v'][2]}%` }} className="h-full">
            {renderSlot(2)}
          </div>
        </div>
      );
    case '3h':
      return (
        <div ref={layoutContainerRef} className="flex flex-col h-full w-full bg-[#131722] p-1.5 gap-0">
          <div style={{ height: `${layoutSizes['3h'][0]}%` }} className="w-full">
            {renderSlot(0)}
          </div>
          <div
            onMouseDown={startResize('3h', 0, 'horizontal', layoutContainerRef.current)}
            className="h-1.5 w-full cursor-row-resize hover:bg-indigo-500/50 bg-gray-900 border-t border-b border-gray-800 transition-colors z-20 flex-shrink-0"
          />
          <div style={{ height: `${layoutSizes['3h'][1]}%` }} className="w-full">
            {renderSlot(1)}
          </div>
          <div
            onMouseDown={startResize('3h', 1, 'horizontal', layoutContainerRef.current)}
            className="h-1.5 w-full cursor-row-resize hover:bg-indigo-500/50 bg-gray-900 border-t border-b border-gray-800 transition-colors z-20 flex-shrink-0"
          />
          <div style={{ height: `${layoutSizes['3h'][2]}%` }} className="w-full">
            {renderSlot(2)}
          </div>
        </div>
      );
    case '3g1':
      return (
        <div ref={layoutContainerRef} className="flex flex-row h-full w-full bg-[#131722] p-1.5 gap-0">
          <div style={{ width: `${layoutSizes['3g1_main'][0]}%` }} className="h-full">
            {renderSlot(0)}
          </div>
          <div
            onMouseDown={startResize('3g1_main', 0, 'vertical', layoutContainerRef.current)}
            className="w-1.5 h-full cursor-col-resize hover:bg-indigo-500/50 bg-gray-900 border-l border-r border-gray-800 transition-colors z-20 flex-shrink-0"
          />
          <div
            ref={subContainerRef1}
            style={{ width: `${layoutSizes['3g1_main'][1]}%` }}
            className="flex flex-col h-full"
          >
            <div style={{ height: `${layoutSizes['3g1_sub'][0]}%` }} className="w-full">
              {renderSlot(1)}
            </div>
            <div
              onMouseDown={startResize('3g1_sub', 0, 'horizontal', subContainerRef1.current)}
              className="h-1.5 w-full cursor-row-resize hover:bg-indigo-500/50 bg-gray-900 border-t border-b border-gray-800 transition-colors z-20 flex-shrink-0"
            />
            <div style={{ height: `${layoutSizes['3g1_sub'][1]}%` }} className="w-full">
              {renderSlot(2)}
            </div>
          </div>
        </div>
      );
    case '3g2':
      return (
        <div ref={layoutContainerRef} className="flex flex-col h-full w-full bg-[#131722] p-1.5 gap-0">
          <div style={{ height: `${layoutSizes['3g2_main'][0]}%` }} className="w-full">
            {renderSlot(0)}
          </div>
          <div
            onMouseDown={startResize('3g2_main', 0, 'horizontal', layoutContainerRef.current)}
            className="h-1.5 w-full cursor-row-resize hover:bg-indigo-500/50 bg-gray-900 border-t border-b border-gray-800 transition-colors z-20 flex-shrink-0"
          />
          <div
            ref={subContainerRef1}
            style={{ height: `${layoutSizes['3g2_main'][1]}%` }}
            className="flex flex-row h-full w-full"
          >
            <div style={{ width: `${layoutSizes['3g2_sub'][0]}%` }} className="h-full">
              {renderSlot(1)}
            </div>
            <div
              onMouseDown={startResize('3g2_sub', 0, 'vertical', subContainerRef1.current)}
              className="w-1.5 h-full cursor-col-resize hover:bg-indigo-500/50 bg-gray-900 border-l border-r border-gray-800 transition-colors z-20 flex-shrink-0"
            />
            <div style={{ width: `${layoutSizes['3g2_sub'][1]}%` }} className="h-full">
              {renderSlot(2)}
            </div>
          </div>
        </div>
      );
    case '3g3':
      return (
        <div ref={layoutContainerRef} className="flex flex-row h-full w-full bg-[#131722] p-1.5 gap-0">
          <div
            ref={subContainerRef1}
            style={{ width: `${layoutSizes['3g3_main'][0]}%` }}
            className="flex flex-col h-full"
          >
            <div style={{ height: `${layoutSizes['3g3_sub'][0]}%` }} className="w-full">
              {renderSlot(0)}
            </div>
            <div
              onMouseDown={startResize('3g3_sub', 0, 'horizontal', subContainerRef1.current)}
              className="h-1.5 w-full cursor-row-resize hover:bg-indigo-500/50 bg-gray-900 border-t border-b border-gray-800 transition-colors z-20 flex-shrink-0"
            />
            <div style={{ height: `${layoutSizes['3g3_sub'][1]}%` }} className="w-full">
              {renderSlot(1)}
            </div>
          </div>
          <div
            onMouseDown={startResize('3g3_main', 0, 'vertical', layoutContainerRef.current)}
            className="w-1.5 h-full cursor-col-resize hover:bg-indigo-500/50 bg-gray-900 border-l border-r border-gray-800 transition-colors z-20 flex-shrink-0"
          />
          <div style={{ width: `${layoutSizes['3g3_main'][1]}%` }} className="h-full">
            {renderSlot(2)}
          </div>
        </div>
      );
    case '3g4':
      return (
        <div ref={layoutContainerRef} className="flex flex-col h-full w-full bg-[#131722] p-1.5 gap-0">
          <div
            ref={subContainerRef1}
            style={{ height: `${layoutSizes['3g4_main'][0]}%` }}
            className="flex flex-row h-full w-full"
          >
            <div style={{ width: `${layoutSizes['3g4_sub'][0]}%` }} className="h-full">
              {renderSlot(0)}
            </div>
            <div
              onMouseDown={startResize('3g4_sub', 0, 'vertical', subContainerRef1.current)}
              className="w-1.5 h-full cursor-col-resize hover:bg-indigo-500/50 bg-gray-900 border-l border-r border-gray-800 transition-colors z-20 flex-shrink-0"
            />
            <div style={{ width: `${layoutSizes['3g4_sub'][1]}%` }} className="h-full">
              {renderSlot(1)}
            </div>
          </div>
          <div
            onMouseDown={startResize('3g4_main', 0, 'horizontal', layoutContainerRef.current)}
            className="h-1.5 w-full cursor-row-resize hover:bg-indigo-500/50 bg-gray-900 border-t border-b border-gray-800 transition-colors z-20 flex-shrink-0"
          />
          <div style={{ height: `${layoutSizes['3g4_main'][1]}%` }} className="w-full">
            {renderSlot(2)}
          </div>
        </div>
      );
    case '4':
      return (
        <div ref={layoutContainerRef} className="flex flex-col h-full w-full bg-[#131722] p-1.5 gap-0">
          <div
            ref={subContainerRef1}
            style={{ height: `${layoutSizes['4_main'][0]}%` }}
            className="flex flex-row w-full"
          >
            <div style={{ width: `${layoutSizes['4_sub1'][0]}%` }} className="h-full">
              {renderSlot(0)}
            </div>
            <div
              onMouseDown={startResize('4_sub1', 0, 'vertical', subContainerRef1.current)}
              className="w-1.5 h-full cursor-col-resize hover:bg-indigo-500/50 bg-gray-900 border-l border-r border-gray-800 transition-colors z-20 flex-shrink-0"
            />
            <div style={{ width: `${layoutSizes['4_sub1'][1]}%` }} className="h-full">
              {renderSlot(1)}
            </div>
          </div>
          <div
            onMouseDown={startResize('4_main', 0, 'horizontal', layoutContainerRef.current)}
            className="h-1.5 w-full cursor-row-resize hover:bg-indigo-500/50 bg-gray-900 border-t border-b border-gray-800 transition-colors z-20 flex-shrink-0"
          />
          <div
            ref={subContainerRef2}
            style={{ height: `${layoutSizes['4_main'][1]}%` }}
            className="flex flex-row w-full animate-none"
          >
            <div style={{ width: `${layoutSizes['4_sub2'][0]}%` }} className="h-full">
              {renderSlot(2)}
            </div>
            <div
              onMouseDown={startResize('4_sub2', 0, 'vertical', subContainerRef2.current)}
              className="w-1.5 h-full cursor-col-resize hover:bg-indigo-500/50 bg-gray-900 border-l border-r border-gray-800 transition-colors z-20 flex-shrink-0"
            />
            <div style={{ width: `${layoutSizes['4_sub2'][1]}%` }} className="h-full">
              {renderSlot(3)}
            </div>
          </div>
        </div>
      );
    default:
      return null;
  }
};
