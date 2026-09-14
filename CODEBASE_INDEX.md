# FX Freeplay — Codebase Navigation Index

> Fast-lookup architectural map for developers and coding agents.
> Documents actual implementation reality. Do not treat as exhaustive API documentation.

---

## 1. Subsystem Map & Sources of Truth

| Subsystem | Primary File / Entry Point | Authoritative State Location | Responsibility / What It Owns |
| :--- | :--- | :--- | :--- |
| **Drawing State** | `src/store/useDrawingStore.ts` | Zustand (`drawingsBySymbol`) | Canonical drawing definitions, points, styles, locks, visibility, active/selected IDs. |
| **Drawing Persistence** | `src/repository/DrawingRepositoryImpl.ts` | IndexedDB (`FXFreeplayDB` -> `drawings`) | Asynchronous serialization of drawings and folders per uppercase symbol key. |
| **Drawing Reconciliation** | `src/engine/charting/drawingReconciler.ts` | Engine (`desiredOverlays` Map diff) | Idempotent diffing: syncs Zustand drawings into live KLineCharts overlays per chart slot. |
| **Chart Adapter** | `src/engine/charting/drawingChartAdapter.ts` | Stateless View Driver | Direct imperative KLineCharts API wrapper (`createOverlay`, `overrideOverlay`, `removeOverlay`). |
| **Gesture & Mode Authority** | `src/framework/interaction/MarqueeSelectionHandler.ts` | Interaction Engine (`isExclusiveMarqueeMode`) | Enforces exclusive Ctrl+drag marquee mode; locks out drawing body/anchor drags. |
| **Hover & Anchor Priority** | `src/framework/interaction/useDrawingHoverCursor.ts` | Interaction Hook (`_promotedOverlayInfo`) | Hit testing, cursor styling, control anchor generation, temporary hidden-anchor z-promotion via DrawingChartAdapter. |
| **Drawing Event Callbacks** | `src/utils/overlays.ts` | Shared Utility (`getInteractiveOverlayOptions`) | KLineCharts overlay lifecycle hooks (`onPressedMoveStart`, `onPressedMoving`, `onPressedMoveEnd`, `onClick`). |
| **Object Tree / Hierarchy** | `src/components/ObjectTreePanel.tsx` | Zustand (`orderStateBySymbol.sequence`) via `buildTreeHierarchyFromCanonical` | Tree orchestrator & interaction layer. Decomposed into `src/components/object-tree/` presentation components (`ObjectTreeToolbar`, `ObjectTreeEmptyState`, `DrawingTreeItem`, `FolderTreeItem`). Renders tree derived purely from canonical sequence. |
| **Viewport & Timeframe** | `src/features/chart-workspace/useChartViewport.ts` | Viewport Hook (`handleTimeframeSwitch`) | Timeframe transition: preserves historical spatial position, barSpace, and Y-axis scale mode. |
| **Session Display (Engine)** | `src/features/session-display/engine/calculateSessionOccurrences.ts` | Domain Engine (Pure functional) | Generates UTC bounding timestamps for trading sessions across DST and timezone boundaries. |
| **Session Display (Render)** | `src/features/session-display/renderer/sessionBackgroundIndicator.ts` | KLineCharts Indicator (`zLevel: -1`) | Renders session boxes behind candles via `ctx.globalCompositeOperation = 'destination-over'`. |
| **Replay & Backtesting** | `src/engine/replay/ReplayEngineImpl.ts` | `useReplayStore.ts` + `ReplaySessionImpl.ts` | Historical bar slicing, step navigation, play/pause ticker, cutpoint timeline tracking. |
| **Multi-Chart Sync (Layout)** | `src/coordinator/chartLayoutCoordinator.ts` | `useLayoutStore.ts` + `syncEngine.ts` | Crosshair, time, scroll, and zoom synchronization across multi-pane slot layouts. |
| **Multi-Chart Sync (Drawings)**| `src/engine/charting/drawingSyncEngine.ts` | Engine (`syncAllDrawings`) | Replicates drawings across chart slots and transforms slot-specific coordinates. |
| **Canonical Order & Z-Stacking** | `src/engine/charting/orderEngine.ts` | Domain Engine (Pure functional) + `useDrawingStore` (`orderStateBySymbol`) | Canonical ordering authority (`SymbolOrderState`, `sequence: string[]` containing drawing IDs and `'candles'` singleton sentinel, folder contiguity invariant, pure reordering operations). Drives runtime z-level projection in `drawingReconciler.ts` and tree hierarchy in `ObjectTreePanel.tsx`. Protects temporary visual promotion (`_promotedOverlayInfo`). |

---

## 2. "Start Here" Modification Guide

* **To modify drawing drag physics or anchor movement:**  
  $\rightarrow$ Start at `src/utils/overlays.ts` (`onPressedMoving`, `onPressedMoveEnd`).
* **To modify drawing hover detection, anchor hit tolerance, or cursor changes:**  
  $\rightarrow$ Start at `src/framework/interaction/useDrawingHoverCursor.ts`.
* **To modify marquee selection or multi-select exclusivity:**  
  $\rightarrow$ Start at `src/framework/interaction/MarqueeSelectionHandler.ts`.
* **To modify drawing z-order or visual canvas stacking:**  
  $\rightarrow$ Start at `src/store/useDrawingStore.ts` (`setSymbolOrderSequence`) & `src/engine/charting/drawingReconciler.ts` (`calculateZLevelsFromSequence`).
* **To modify Object Tree UI, folder management, or tree drag-and-drop:**  
  $\rightarrow$ Start at `src/components/ObjectTreePanel.tsx` and `src/engine/charting/orderEngine.ts` (`buildTreeHierarchyFromCanonical`).
* **To modify drawing persistence and IndexedDB storage:**  
  $\rightarrow$ Start at `src/repository/DrawingRepositoryImpl.ts` and `src/repository/db.ts`.
* **To modify multi-chart slot drawing replication:**  
  $\rightarrow$ Start at `src/engine/charting/drawingSyncEngine.ts`.
* **To modify timeframe viewport switching or price-axis scale preservation:**  
  $\rightarrow$ Start at `src/features/chart-workspace/useChartViewport.ts`.
* **To modify session background box rendering or occurrences:**  
  $\rightarrow$ Start at `src/features/session-display/renderer/sessionBackgroundIndicator.ts`.
* **To modify replay navigation or bar stepping:**  
  $\rightarrow$ Start at `src/engine/replay/replayNavigation.ts` & `src/store/useReplayStore.ts`.

---

## 3. Important Data & Event Flows

### Drawing Creation Flow
```
User finish drawing gesture
  ├──> utils/overlays.ts (onDrawEnd)
  ├──> store/useDrawingStore.ts (addSymbolDrawing)
  ├──> repository/DrawingRepositoryImpl.ts (saveDrawings -> IndexedDB)
  ├──> engine/charting/drawingSyncEngine.ts (syncAllDrawings)
  └──> engine/charting/drawingReconciler.ts (reconcileChartSlotOverlays)
         └──> engine/charting/drawingChartAdapter.ts (createOverlay -> KLineCharts)
```

### Drawing Drag / Move Flow
```
Pointer drag gesture
  ├──> framework/interaction/MarqueeSelectionHandler.ts (verifies isExclusiveMarqueeMode is false)
  ├──> utils/overlays.ts (onPressedMoving updates coordinates in-memory)
  └──> Pointer release (onPressedMoveEnd)
         ├──> store/useDrawingStore.ts (updateSymbolDrawing)
         └──> repository/DrawingRepositoryImpl.ts (saveDrawings -> IndexedDB)
```

### Timeframe Switch Viewport Flow
```
User selects new timeframe
  ├──> features/chart-workspace/useChartViewport.ts (handleTimeframeSwitch)
  ├──> Capture anchor: chart.getBarSpace(), convertToPixel(anchorTime), Y-axis scale range
  ├──> coordinator/chartLayoutCoordinator.ts (loads new timeframe data from repository)
  └──> Restore: chart.setBarSpace(), scrollToTimestamp(), temporary manual Y-scale override
```

---

## 4. Chart Runtime State (Monkey-Patched Properties)

Custom runtime properties attached directly to KLineCharts instances:

| Property Name | Written By | Read By | Purpose / Representation |
| :--- | :--- | :--- | :--- |
| `_isMarqueeSelecting` | `MarqueeSelectionHandler.ts` | `MarqueeSelectionHandler.ts`, `overlays.ts` | Boolean: indicates active Ctrl+drag marquee gesture. Locks out drawing moves. |
| `_justFinishedMarquee`| `MarqueeSelectionHandler.ts` | `overlays.ts` (`onClick`) | Boolean: transient 50ms lockout suppressing trailing clicks on marquee release. |
| `_isCtrlPressedRef` | `ChartWorkspace.tsx` | `MarqueeSelectionHandler.ts` | React ref: mirrors keyboard Ctrl / Meta press state for gesture exclusivity. |
| `_isShiftPressedRef`| `ChartWorkspace.tsx` | `MarqueeSelectionHandler.ts` | React ref: mirrors keyboard Shift press state for additive selection. |
| `_promotedOverlayInfo`| `DrawingChartAdapter.ts`, `useDrawingHoverCursor.ts`, `ChartWorkspace.tsx` | `drawingReconciler.ts`, `useDrawingHoverCursor.ts`, `DrawingChartAdapter.ts` | Object `{ id, originalZLevel, temporaryZLevel }`: temporary runtime visual promotion (anchor hover, Object Tree hover, edit mode). Never mutates canonical sequence or persistent storage. |
| `_activeDraggingIndex`| `useDrawingHoverCursor.ts`, `overlays.ts` | `overlays.ts`, `useDrawingHoverCursor.ts` | Number or `null`: differentiates anchor drag (number) vs entire drawing body drag (`null`). |
| `_candlesOrder` | None (legacy; no longer written) | `ObjectTreePanel.tsx` | Number (default 500): legacy tie-breaker fallback for empty-folder placement in `buildTreeHierarchyFromCanonical`. Obsolete for runtime z-levels. |
| `_showCandles` | `ObjectTreePanel.tsx` | `ObjectTreePanel.tsx` | Boolean: tracks visibility toggle state of candlestick series. |
| `_activeTool` | `ChartWorkspace.tsx` | `overlays.ts` | String: active drawing or cursor tool name (e.g. `'eraser'`, `'trendLine'`). |
| `_activeCursorTool` | `ChartWorkspace.tsx` | `overlays.ts` | String: active cursor mode (e.g. `'crosshair'`, `'pointer'`, `'eraser'`). |
| `_selectedOverlayIds`| `ChartWorkspace.tsx` | `useDrawingHoverCursor.ts`, `overlays.ts` | String[]: selected overlay IDs bridged from React state to canvas callbacks. |
| `_setSelectedOverlayIds`| `ChartWorkspace.tsx`| `overlays.ts`, `MarqueeSelectionHandler.ts` | Callback: imperative bridge to trigger React selection state changes. |

---

## 5. Storage Directory

### IndexedDB (`FXFreeplayDB`, Version 1)
Managed in `src/repository/db.ts`:

* `drawings`: Drawings keyed by uppercase symbol (`"EURUSD"`). Folders stored under `"FOLDERS_${symbol}"`. Canonical order state stored under `"ORDER_${symbol}"` (`SymbolOrderRecord`).
* `market_bars`: Cached historical OHLC candle data per symbol and timeframe.
* `watchlist`: Saved user watchlist items and order.
* `workspace_layout`: Multi-chart layout configuration and active slots.
* `settings`: Persisted application settings and preferences.
* `metadata`: Data management metadata and dataset import records.

### Key LocalStorage Keys
* `fx_wrapper_settings`: Desktop wrapper window, startup module, and theme options (`wrapperPersistence.ts`).
* `fx_session_display_settings`: Configured trading session definitions and visibility (`sessionDisplayPersistence.ts`).
* `fx_favorite_drawings`: Pinned drawing tools on floating toolbar (`FavoriteDrawingToolbar.tsx`).
* `fx_drawing_templates`: User-saved style presets for drawing tools (`useDrawingTemplates.ts`).
* `fx_color_picker_custom_colors`: Custom palette entries saved in color picker (`ColorPicker.tsx`).
* `fx_folders_${symbol}`: Legacy fallback key for folders (migrated into IndexedDB by `DrawingRepositoryImpl.ts`).

---

## 6. Architectural Boundaries

```
[Presentation]  ObjectTreePanel (Orchestrator), ObjectTreeToolbar, DrawingTreeItem,
                FolderTreeItem, ObjectTreeEmptyState, DrawingToolbar, ChartWorkspace
       │
[Coordinator]   chartLayoutCoordinator, useDrawingCoordinator, useWorkspaceCoordinator
       │
   [Store]      useDrawingStore, useLayoutStore, useReplayStore, useSettingsStore
       │
   [Engine]      drawingSyncEngine, drawingReconciler, orderEngine, calculateSessionOccurrences, ReplayEngine
       │
[Repository]    DrawingRepositoryImpl, DataManagementRepositoryImpl, db.ts (IndexedDB)
       │
  [Driver]      DrawingChartAdapter, sessionBackgroundIndicator, KLineCharts Library
```

---

## 7. Known Navigation Hazards

1. **Monolithic Components with Mixed Concerns:**
   * `src/components/ObjectTreePanel.tsx` has been decomposed at the presentation layer into `ObjectTreeToolbar.tsx`, `ObjectTreeEmptyState.tsx`, `DrawingTreeItem.tsx`, and `FolderTreeItem.tsx`. The main panel now acts primarily as the Object Tree orchestrator and interaction layer. Direct repository writes were eliminated (Phase 1A/1B). Main Series/Candles remains intentionally inline because it is coupled to the upcoming Phase 2 z-index/order redesign.
   * `src/utils/overlays.ts` contains tool registrations mixed with multi-chart pointer event orchestration.
2. **Canonical Order Architecture & Runtime Z-Stacking (Phase 2 COMPLETE):**
   * **Phase 2A Foundation (`src/engine/charting/orderEngine.ts`):** Established pure, deterministic canonical ordering model:
     - `SymbolOrderState { symbol: string; sequence: string[]; candlesVisible: boolean }`
     - `sequence: string[]` contains drawing IDs and the `'candles'` singleton sentinel (index `0` = topmost / front; last index = bottommost / back).
     - **Folder contiguity invariant:** Folders are logical containers (`drawing.extendData.folderId`); all drawings belonging to the same folder form a single, contiguous block in `sequence`.
     - Pure ordering operations: `validateOrderSequence`, `normalizeOrderSequence`, `repairFolderContiguity`, `bringToFront`, `sendToBack`, `bringForward`, `sendBackward`, `moveFolderBlock`, `moveDrawingIntoFolder`, `moveDrawingOutOfFolder`, `insertDrawing`, `duplicateDrawing`, `deleteFromSequence`.
     - Store integration in `src/store/useDrawingStore.ts`: `orderStateBySymbol`, `getSymbolOrderSequence`, `setSymbolOrderSequence`, `reorderSymbolItem`, `moveSymbolFolderBlock`, `moveSymbolDrawingFolder`.
   * **Phase 2B Persistence & Migration (`src/repository/types.ts`, `DrawingRepositoryImpl.ts`, `useDrawingStore.ts`):**
     - Repository DTO `SymbolOrderRecord { symbol: string; sequence: string[]; candlesVisible: boolean }` avoids inverted layer dependencies.
     - Persisted under key `"ORDER_${symbol.toUpperCase()}"` in IndexedDB store `drawings`.
     - Pure deterministic migration `migrateLegacyOrderToCanonical()`: uses legacy `drawing.extendData.order` (descending) as primary ordering source, unranked drawings sort to top (`Infinity`), deterministic ID tie-breaking, folder contiguity repaired by clustering children around highest-ranked child, and `'candles'` sentinel placed bottommost by default.
     - Store lifecycle `loadSymbolOrderState(symbol)`: loads existing canonical state from repository if present, normalizes against current drawings/folders, or automatically runs legacy migration and persists when no canonical state exists yet.
     - Mutators (`setSymbolOrderSequence`) automatically persist canonical state through repository.
     - Full compatibility: legacy `extendData.order` and `folder.order` are preserved completely untouched.
   * **Phase 2C Runtime Z-Level Reconciliation & Object Tree Integration (COMPLETE):**
     - **Runtime z-level projection:** `calculateZLevelsFromSequence` in `drawingReconciler.ts` derives drawing overlay `zLevel` directly from canonical sequence indices. `reconcileChartSlotOverlays` applies `zLevel` via `chartAdapter.overrideOverlay` without destroying or recreating overlays.
     - **Temporary visual promotion isolation:** `DrawingChartAdapter.ts` manages temporary elevation (`_promotedOverlayInfo`) for anchor hover, Object Tree hover, and edit mode selection. Temporary elevation overrides canvas visual zLevel immediately without modifying canonical sequence or persisting to storage.
     - **Reconciliation protection:** `reconcileChartSlotOverlays` preserves `_promotedOverlayInfo.originalZLevel` when updating base levels, ensuring restoration on mouse leave or edit end remains accurate.
     - **Object Tree derivation:** `buildTreeHierarchyFromCanonical` in `orderEngine.ts` projects canonical sequence directly into the tree hierarchy. Folders occupy the position of their child block; empty folders fall back to legacy `folder.order` compatibility.
     - **Object Tree Drag & Drop:** Drag/drop operations invoke pure canonical reorder mutations (`setSymbolOrderSequence`, `moveSymbolFolderBlock`, `moveSymbolDrawingFolder`), maintaining single-source-of-truth invariants.
     - **Legacy Decommissioning:** `_candlesOrder` is deprecated/read-only (compatibility tie-breaker only). `extendData.order` remains only as legacy creation metadata.
3. **Physical Canvas Separation for Candlesticks:**
   * Candlesticks live on `_mainCanvas` (DOM layer 0). Overlays live on `_overlayCanvas` (DOM layer 1).
   * No overlay `zLevel` can physically place a standard overlay behind candlestick bodies. Only Indicators with `zLevel < 0` composite behind candles via `destination-over`.
4. **Decommissioned Reorder Logic:**
   * Legacy `recalculateAndRecreateOverlays` helper and the legacy order-normalization `useEffect` were removed from `ObjectTreePanel.tsx` in Phase 2C. Reordering now operates strictly through canonical store actions and non-destructive reconciliation.
5. **Untyped Chart Monkey-Patching:**
   * Properties listed in Section 4 are not declared in KLineCharts TypeScript types. Searching for them requires full-text search across `src/`.
