import React from 'react';
import { useDrawingStore } from '@/store';
import { getOriginalDrawingId, mirrorLiveOverlayUpdate } from '@/engine/charting';
import { FloatingTrendLineText } from '@/components/FloatingTrendLineText';
import { FloatingRectangleText } from '@/components/FloatingRectangleText';
import { FloatingTextToolEditor } from '@/components/FloatingTextToolEditor';

interface SlotFloatingTextOverlaysProps {
  chart: any;
  selectedOverlayIds: string[];
  hoveredOverlayId: string | null;
  chartInstancesRef: React.MutableRefObject<(any | null)[]>;
  syncAllDrawings: () => void;
  setDrawingTrigger: React.Dispatch<React.SetStateAction<number>>;
}

export const SlotFloatingTextOverlays: React.FC<SlotFloatingTextOverlaysProps> = ({
  chart,
  selectedOverlayIds,
  hoveredOverlayId,
  chartInstancesRef,
  syncAllDrawings,
  setDrawingTrigger,
}) => {
  if (!chart) return null;

  const allTextOverlays = chart.getOverlays().filter((o: any) =>
    ['trendLine', 'rectangle', 'fxText', 'text'].includes(o.name)
  );

  return (
    <>
      {allTextOverlays.map((ov: any) => {
        const handleTextChange = (newText: string) => {
          const originalId = getOriginalDrawingId(ov.id);
          const resolved = useDrawingStore.getState().findSymbolByDrawingId(originalId);
          if (resolved) {
            const { symbol: drawingSymbol, drawing: currentDrawing } = resolved;
            const mergedExtendData = {
              ...(currentDrawing.extendData || {}),
              customSettings: {
                ...(currentDrawing.extendData?.customSettings || {}),
                text: newText,
              },
            };
            useDrawingStore.getState().updateSymbolDrawing(drawingSymbol, originalId, {
              extendData: mergedExtendData,
            });
            // Push updated text to source chart's in-memory overlay so deselection does not revert it
            if (chart && originalId) {
              chart.overrideOverlay({
                id: originalId,
                extendData: mergedExtendData,
              });
            }
            mirrorLiveOverlayUpdate(chart, originalId, { extendData: mergedExtendData }, chartInstancesRef);
          }

          setDrawingTrigger((prev) => prev + 1);
        };

        if (ov.name === 'trendLine') {
          return (
            <FloatingTrendLineText
              key={ov.id}
              chart={chart}
              overlay={ov}
              isSelected={selectedOverlayIds.includes(ov.id)}
              isHovered={hoveredOverlayId === ov.id}
              onTextChange={handleTextChange}
              syncAllDrawings={syncAllDrawings}
            />
          );
        }
        if (ov.name === 'rectangle') {
          return (
            <FloatingRectangleText
              key={ov.id}
              chart={chart}
              overlay={ov}
              isSelected={selectedOverlayIds.includes(ov.id)}
              isHovered={hoveredOverlayId === ov.id}
              onTextChange={handleTextChange}
              syncAllDrawings={syncAllDrawings}
            />
          );
        }
        if (ov.name === 'fxText' || ov.name === 'text') {
          return (
            <FloatingTextToolEditor
              key={ov.id}
              chart={chart}
              overlay={ov}
              isSelected={selectedOverlayIds.includes(ov.id)}
              isHovered={hoveredOverlayId === ov.id}
              onTextChange={handleTextChange}
              syncAllDrawings={syncAllDrawings}
            />
          );
        }
        return null;
      })}
    </>
  );
};
