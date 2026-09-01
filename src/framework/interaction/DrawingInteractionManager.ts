import { useEffect, useRef, useMemo } from 'react';
import { ModifierKeyTracker } from './ModifierKeyTracker';
import { MarqueeSelectionHandler } from './MarqueeSelectionHandler';
import { DrawingKeyboardShortcuts } from './DrawingKeyboardShortcuts';

export interface DrawingInteractionConfig {
  chartContainersRef: React.MutableRefObject<(HTMLDivElement | null)[]>;
  chartInstancesRef: React.MutableRefObject<(any | null)[]>;
  activeTool: string | null;
  selectedOverlayIds: string[];
  onSelectOverlayIds: (ids: string[]) => void;
  onDeleteSelected: () => void;
  onCancelTool: () => void;
  slots: any[];
}

export function useDrawingInteraction(config: DrawingInteractionConfig) {
  const modifierTracker = useMemo(() => new ModifierKeyTracker(), []);
  const marqueeHandlerRef = useRef<MarqueeSelectionHandler | null>(null);
  const shortcutsRef = useRef<DrawingKeyboardShortcuts | null>(null);

  // Expose modifier ref on chart instances for overlay clicks
  const isCtrlPressedRef = useRef(false);
  const isShiftPressedRef = useRef(false);
  const isSpacePressedRef = useRef(false);

  useEffect(() => {
    modifierTracker.start();

    const unsubscribe = modifierTracker.subscribe((state) => {
      isCtrlPressedRef.current = state.isCtrlPressed || state.isMetaPressed;
      isShiftPressedRef.current = state.isShiftPressed;
      isSpacePressedRef.current = state.isSpacePressed;

      config.chartInstancesRef.current.forEach((chart) => {
        if (chart) {
          chart._isCtrlPressedRef = isCtrlPressedRef;
          chart._isShiftPressedRef = isShiftPressedRef;
          chart._isSpacePressedRef = isSpacePressedRef;
        }
      });
    });

    config.chartInstancesRef.current.forEach((chart) => {
      if (chart) {
        chart._isCtrlPressedRef = isCtrlPressedRef;
        chart._isShiftPressedRef = isShiftPressedRef;
        chart._isSpacePressedRef = isSpacePressedRef;
      }
    });

    return () => {
      unsubscribe();
      modifierTracker.stop();
    };
  }, [modifierTracker, config.chartInstancesRef]);

  // Marquee Selection Lifecycle
  useEffect(() => {
    if (!marqueeHandlerRef.current) {
      marqueeHandlerRef.current = new MarqueeSelectionHandler({
        chartContainersRef: config.chartContainersRef,
        chartInstancesRef: config.chartInstancesRef,
        modifierTracker,
        activeTool: config.activeTool,
        onSelectOverlayIds: config.onSelectOverlayIds,
        selectedOverlayIds: config.selectedOverlayIds,
      });
    } else {
      marqueeHandlerRef.current.updateOptions({
        chartContainersRef: config.chartContainersRef,
        chartInstancesRef: config.chartInstancesRef,
        modifierTracker,
        activeTool: config.activeTool,
        onSelectOverlayIds: config.onSelectOverlayIds,
        selectedOverlayIds: config.selectedOverlayIds,
      });
    }

    marqueeHandlerRef.current.attach();

    return () => {
      marqueeHandlerRef.current?.detach();
    };
  }, [
    config.chartContainersRef,
    config.chartInstancesRef,
    config.activeTool,
    config.onSelectOverlayIds,
    config.selectedOverlayIds,
    config.slots,
    modifierTracker,
  ]);

  // Keyboard Shortcuts Lifecycle
  useEffect(() => {
    if (!shortcutsRef.current) {
      shortcutsRef.current = new DrawingKeyboardShortcuts({
        activeTool: config.activeTool,
        selectedOverlayIds: config.selectedOverlayIds,
        onDeleteSelected: config.onDeleteSelected,
        onCancelTool: config.onCancelTool,
        onClearSelection: () => config.onSelectOverlayIds([]),
      });
    } else {
      shortcutsRef.current.updateOptions({
        activeTool: config.activeTool,
        selectedOverlayIds: config.selectedOverlayIds,
        onDeleteSelected: config.onDeleteSelected,
        onCancelTool: config.onCancelTool,
        onClearSelection: () => config.onSelectOverlayIds([]),
      });
    }

    shortcutsRef.current.attach();

    return () => {
      shortcutsRef.current?.detach();
    };
  }, [
    config.activeTool,
    config.selectedOverlayIds,
    config.onDeleteSelected,
    config.onCancelTool,
    config.onSelectOverlayIds,
  ]);

  return {
    modifierTracker,
    isCtrlPressedRef,
    isShiftPressedRef,
    isSpacePressedRef,
  };
}
