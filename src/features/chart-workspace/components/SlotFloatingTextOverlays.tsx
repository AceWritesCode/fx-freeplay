import React from 'react';
import { useDrawingStore } from '@/store';
import { getOriginalDrawingId, mirrorLiveOverlayUpdate, runWorkspaceReconciliation } from '@/engine/charting';
import { FloatingTrendLineText } from '@/components/FloatingTrendLineText';
import { FloatingRectangleText } from '@/components/FloatingRectangleText';
import { FloatingTextToolEditor } from '@/components/FloatingTextToolEditor';
import { FloatingFibonacciText } from '@/components/FloatingFibonacciText';
import { FloatingNoteText } from '@/components/FloatingNoteText';

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
    ['trendLine', 'rectangle', 'fxText', 'text', 'fibonacciRetracement', 'note'].includes(o.name)
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

        const handleDeleteDrawing = (overlayId: string) => {
          const originalId = getOriginalDrawingId(overlayId);
          const resolved = useDrawingStore.getState().findSymbolByDrawingId(originalId);
          if (resolved) {
            useDrawingStore.getState().removeSymbolDrawing(resolved.symbol, originalId);
          }
          useDrawingStore.getState().removeSymbolDrawingById(originalId);
          if (chart) {
            chart.removeOverlay(overlayId);
            chart.removeOverlay(originalId);
          }
          const currentSelected = useDrawingStore.getState().selectedOverlayIds || [];
          if (currentSelected.includes(originalId) || currentSelected.includes(overlayId)) {
            useDrawingStore.getState().setSelectedOverlayIds(
              currentSelected.filter((id) => id !== originalId && id !== overlayId)
            );
          }
          runWorkspaceReconciliation(chartInstancesRef);
          setDrawingTrigger((prev) => prev + 1);
        };

        const handleFibLevelTextChange = (levelVal: number, newText: string) => {
          const originalId = getOriginalDrawingId(ov.id);
          const resolved = useDrawingStore.getState().findSymbolByDrawingId(originalId);
          if (resolved) {
            const { symbol: drawingSymbol, drawing: currentDrawing } = resolved;
            const currentCustom = currentDrawing.extendData?.customSettings || {};
            const currentLevelTexts = currentCustom.levelTexts || {};
            const updatedLevelTexts = {
              ...currentLevelTexts,
              [String(levelVal)]: newText,
            };
            const updatedLevels = (currentCustom.levels || []).map((l: any) =>
              l.level === levelVal ? { ...l, text: newText } : l
            );
            const mergedExtendData = {
              ...(currentDrawing.extendData || {}),
              customSettings: {
                ...currentCustom,
                levelTexts: updatedLevelTexts,
                levels: updatedLevels,
              },
            };
            useDrawingStore.getState().updateSymbolDrawing(drawingSymbol, originalId, {
              extendData: mergedExtendData,
            });
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

        if (ov.name === 'fibonacciRetracement') {
          return (
            <FloatingFibonacciText
              key={ov.id}
              chart={chart}
              overlay={ov}
              isSelected={selectedOverlayIds.includes(ov.id)}
              isHovered={hoveredOverlayId === ov.id}
              onLevelTextChange={handleFibLevelTextChange}
              syncAllDrawings={syncAllDrawings}
            />
          );
        }
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
        if (ov.name === 'note') {
          return (
            <FloatingNoteText
              key={ov.id}
              chart={chart}
              overlay={ov}
              isSelected={selectedOverlayIds.includes(ov.id)}
              isHovered={hoveredOverlayId === ov.id}
              onTextChange={handleTextChange}
              onDelete={handleDeleteDrawing}
              syncAllDrawings={syncAllDrawings}
            />
          );
        }
        return null;
      })}
    </>
  );
};
