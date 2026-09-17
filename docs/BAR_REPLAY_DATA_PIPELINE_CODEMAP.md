# Codebase Map: Bar Replay & Universal Data Pipeline

> **Phase 0 Investigation & Architectural Map**  
> **Target Revision**: Universal Market-Data Pipeline & Bar Replay Redesign  
> **Core Principle**: *"Replay advances time/data; it does NOT rebuild the chart."*  
> **Architectural Invariant**: *Drawings MUST NOT depend on candle data loading or candle rendering.*

---

## 1. Executive Summary

This document provides an exhaustive, code-grounded map of FX Freeplay's market-data pipeline, data loaders, viewport handlers, Replay engine, and KLineCharts `v10.0.0-beta3` integration.

The primary defect in the existing Bar Replay implementation is **destructive data thrashing**: on every replay step (every candle advance or speed tick), the application re-slices the candle array, re-registers `setDataLoader`, and calls `chart.resetData()`. `chart.resetData()` destroys KLineCharts' internal canvas overlay caches, resets in-progress drawing creation states (`currentStep`), and forcibly recalculates viewport scroll offsets, causing overlay figures to jump, glitch, or disappear.

---

## 2. File-by-File Data Pipeline Map

### 2.1 `src/coordinator/useWorkspaceCoordinator.ts`
- **Purpose**: Workspace orchestrator managing market data loading, timeframe generation, symbol switching, and slot data ingestion.
- **Important Functions/Methods**:
  - `loadDataForSlot(index: number, chart: any, options?: { preserveOffset?: boolean; customOffset?: number | null })`:
    - *What it does*: Fetches timeframe candles from cache/repository, filters candles if replay is active (`visibleData = tfData.slice(0, lastIdx + 1)`), sets `chart.setDataLoader()`, and calls `chart.resetData()`.
    - *Who calls it*: `useReplayCoordinator.ts` (on every replay step), `bootstrapWorkspace()`, `handleWatchlistSymbolSwitch()`.
    - *Input*: Slot index, chart instance, scroll offset options.
    - *Mutates/Returns*: Invokes `chart.setDataLoader` + `chart.resetData()`, mutates `allTimeframesData` state.
  - `getOrImportTimeframeData(symbol: string, tf: string)`:
    - *What it does*: Reads candles from in-memory `timezoneAdjustedCache`, IndexedDB `marketDataRepository`, or parses/resamples CSV files.
    - *Who calls it*: `loadDataForSlot`, `handleTimeframeSwitch`, `regenerateTimeframes`.
    - *Input*: Symbol name, timeframe string.
    - *Returns*: `Promise<KLineData[]>` (timezone-adjusted candle array).
  - `handleTimeframeSwitch(tf: string, overrideSymbol?: string)`:
    - *What it does*: Captures active viewport offset, loads target timeframe dataset, updates layout slots, resets chart data, and restores viewport offset.
    - *Who calls it*: `DrawingToolbar.tsx` / workspace timeframe selector.
    - *Returns*: `Promise<void>`.
- **Important Code Blocks**:
  - Lines 850-867 (`loadDataForSlot` replay slicing & `resetData` call):
    ```typescript
    const replayState = useReplayStore.getState();
    let visibleData = tfData;
    if (replayState.isReplayActive && replayState.replayCurrentTimestamp !== null) {
      const lastIdx = findCandleIndexByTimestamp(tfData, replayState.replayCurrentTimestamp);
      visibleData = lastIdx !== -1 ? tfData.slice(0, lastIdx + 1) : [];
    }
    chart.setDataLoader({ getBars: ({ type, callback }) => { ... callback(visibleData); } });
    chart.resetData(); // <--- Root cause of overlay thrashing on every step
    ```
- **Dependencies/Connections**:
  - Calls: `marketDataRepository`, `dataPipeline.ts`, `useDrawingStore`, `chart.setDataLoader`, `chart.resetData`.
  - Called by: `ChartWorkspace.tsx`, `useReplayCoordinator.ts`.

---

### 2.2 `src/coordinator/useReplayCoordinator.ts`
- **Purpose**: Controls Bar Replay lifecycle, autoplay timer loop, cut-point selection, bookmarking, and multi-slot replay synchronization.
- **Important Functions/Methods**:
  - `handleSelectCutPoint(timestamp: number, clickX?: number)`:
    - *What it does*: Creates a new `ReplaySession` via `replayEngine.createSession()`, sets status to `'PAUSED'`, subscribes to timestamp changes, and activates replay mode.
    - *Who calls it*: Chart container click listener when `isSelectingCutPoint === true`.
    - *Input*: Cut-point timestamp, click X pixel.
  - `handleReplayStepForward()` / `handleReplayStepBackward()`:
    - *What it does*: Invokes `session.stepForward()` / `session.stepBackward()`, advancing or rewinding the timeline.
    - *Who calls it*: Replay control bar buttons, keyboard shortcuts, autoplay `setInterval` loop.
  - Replay Data Sync `useEffect` (lines 453-583):
    - *What it does*: Reacts to `replayCurrentTimestamp` changes. Iterates over layout slots, calculates scroll offsets, and calls `await loadDataForSlotRef.current(index, chart, ...)`.
    - *Why it matters*: This is the trigger loop causing `loadDataForSlot` + `resetData()` to execute on every single step.
- **Dependencies/Connections**:
  - Calls: `replayEngine`, `useReplayStore`, `useLayoutStore`, `loadDataForSlot`.
  - Called by: `ChartWorkspace.tsx`, Replay toolbar UI.

---

### 2.3 `src/engine/replay/ReplayEngineImpl.ts` & `ReplaySessionImpl.ts`
- **Purpose**: Core domain engine managing replay sessions, timeline indices, status (`READY`, `PAUSED`, `PLAYING`, `COMPLETED`), and subscriber notifications.
- **Important Functions/Methods**:
  - `createSession(config: ReplaySessionConfig)`: Instantiates a `ReplaySessionImpl` with historical candles and `startIndex`.
  - `stepForward()` / `stepBackward()` / `jumpTo(index)`: Mutates timeline index and notifies subscribers with new `currentTimestamp`.
  - `getState()`: Returns `{ status, currentIndex, currentTimestamp, bookmarks, viewportRange }`.
- **Dependencies/Connections**:
  - Independent domain module. Does NOT touch DOM or KLineCharts directly.
  - Called by: `useReplayCoordinator.ts`.

---

### 2.4 `src/engine/charting/drawingReconciler.ts`
- **Purpose**: Reconciles Zustand drawing storage (`useDrawingStore`) with KLineCharts overlay instances.
- **Important Functions/Methods**:
  - `reconcileWorkspace(slots, chartInstancesRef, activeIndex, syncDrawings)`:
    - *What it does*: Calculates `WorkspaceSyncPlan` via `drawingSyncEngine.ts`, computes natural zLevels via `orderEngine.ts`, creates missing overlays, overrides modified overlays, and removes stale overlays.
    - *Who calls it*: `runWorkspaceReconciliation()`, `useDrawingStore` mutations, timeframe switch completion.
- **Important Code Blocks**:
  - Line 97 (`isActivelyDrawing` protection):
    ```typescript
    const isActivelyDrawing = !isSyncCopy && (
      (chart._activeDrawingId && ov.id === chart._activeDrawingId) ||
      (typeof ov.currentStep === 'number' && typeof ov.totalStep === 'number' && ov.currentStep < ov.totalStep && (!ov.points || ov.points.length === 0))
    );
    ```
    Protecting in-progress overlays from being removed as stale during reconciliation passes.
- **Dependencies/Connections**:
  - Calls: `drawingSyncEngine`, `DrawingChartAdapter`, `orderEngine`, `useDrawingStore`.
  - Called by: `useDrawingStore`, `useWorkspaceCoordinator`.

---

### 2.5 `src/engine/charting/drawingChartAdapter.ts`
- **Purpose**: Low-level view driver executing KLineCharts overlay operations (`createOverlay`, `overrideOverlay`, `removeOverlay`, `invalidatePane`).
- **Important Functions/Methods**:
  - `createOverlay(chart, options)`: Registers overlay with KLineCharts via `chart.createOverlay()`.
  - `overrideOverlay(chart, options)`: Updates overlay properties via `chart.overrideOverlay()`.
  - `invalidatePane(chart, paneId)`: Repaints HTML5 canvas pane without resetting chart data or viewport.
- **Dependencies/Connections**:
  - Directly wraps KLineCharts instance methods.
  - Called by: `drawingReconciler.ts`, `overlays.ts`, `DrawingDragReleaseHandler.ts`.

---

### 2.6 `src/engine/market/dataPipeline.ts`
- **Purpose**: Resampling 1m candles into higher timeframes (`resample1mToTimeframe`), timezone shifting (`shiftCandlesTimezone`), and timeframe cache management (`setTimezoneAdjustedBars`, `getTimezoneAdjustedBars`).
- **Dependencies/Connections**:
  - Called by: `useWorkspaceCoordinator.ts`.

---

### 2.7 `src/repository/DataManagementRepositoryImpl.ts` & `db.ts`
- **Purpose**: Asynchronous IndexedDB storage interface (`FXFreeplayDB` stores: `drawings`, `market_bars`, `watchlist`, `workspace_layout`, `settings`).
- **Dependencies/Connections**:
  - Called by: `useWorkspaceCoordinator.ts`, `useDrawingStore.ts`.

---

### 2.8 `src/store/useReplayStore.ts`
- **Purpose**: React Zustand store maintaining global replay state (`isReplayActive`, `replayCurrentTimestamp`, `replaySpeed`, `isReplayPlaying`, `isAutoShiftEnabled`, `bookmarks`).
- **Dependencies/Connections**:
  - Read/written by: `useReplayCoordinator.ts`, `ChartWorkspace.tsx`, Replay toolbar UI.

---

### 2.9 `src/store/useDrawingStore.ts`
- **Purpose**: Authoritative Zustand store for drawings, canonical order sequences (`orderStateBySymbol`), selected IDs, and folder hierarchies.
- **Architectural Boundary**: Completely independent of candle data loading. Stores drawing points as `{ timestamp, dataIndex, value }`.
- **Dependencies/Connections**:
  - Read/written by: `drawingReconciler.ts`, `overlays.ts`, `ObjectTreePanel.tsx`, `DrawingRepositoryImpl.ts`.

---

## 3. Complete End-to-End Traced Data & Replay Flow

```text
[IndexedDB: market_bars / CSV Import]
         │
         ▼
[DataManagementRepositoryImpl / dataPipeline.ts]
  (raw 1m bars resampled & timezone-adjusted)
         │
         ▼
[useWorkspaceCoordinator.ts: getOrImportTimeframeData]
  (populates allTimeframesData React state: Record<string, KLineData[]>)
         │
         ▼
[Replay Toolbar / Autoplay Loop: setInterval]
  (calls session.stepForward() in ReplaySessionImpl)
         │
         ▼
[ReplaySessionImpl -> notify()]
  (updates replayCurrentTimestamp in useReplayStore)
         │
         ▼
[useReplayCoordinator.ts: useEffect([replayCurrentTimestamp])]
  (triggers data sync for all active slots)
         │
         ▼
[useWorkspaceCoordinator.ts: loadDataForSlot]
  ├── visibleData = tfData.slice(0, lastIdx + 1)
  ├── chart.setDataLoader({ getBars: ({ type: 'init', callback }) => callback(visibleData) })
  └── chart.resetData()  <--- [DESTRUCTIVE BOTTLENECK]
         │
         ▼
[KLineCharts Engine]
  (wipes internal data list, invalidates overlay pixel caches, resets scroll offset)
         │
         ▼
[drawingReconciler.ts & DrawingChartAdapter]
  (re-evaluates canvas overlays, causing drawing handle jumps or in-progress drawing erasure)
```

---

## 4. Audit of Key API Occurrences

| API / Mechanism | File Locations | Current Function in Codebase | Rearchitecture Target |
| :--- | :--- | :--- | :--- |
| `setDataLoader` | `useWorkspaceCoordinator.ts` (329, 453, 857), `useReplayCoordinator.ts` (143) | Re-registers data loader callback on every timeframe switch & replay step | Register **once** per chart slot / symbol connection |
| `resetData` | `useWorkspaceCoordinator.ts` (339, 462, 866), `useReplayCoordinator.ts` (149, 194) | Wipes KLineCharts internal data list and rebuilds chart from scratch | **Eliminate** from replay stepping path entirely |
| `getBars` | `useWorkspaceCoordinator.ts` (330, 454, 858), `useReplayCoordinator.ts` (144) | Handles `loadType === 'init'` callback | Extend to support `type: 'forward' \| 'backward' \| 'update'` |
| `subscribeBar` | `klinecharts/dist/index.d.ts` (504) | Not currently invoked in application code | Potential mechanism for incremental single-candle streaming |
| `replayCurrentTimestamp` | `useReplayStore.ts`, `useReplayCoordinator.ts`, `useWorkspaceCoordinator.ts` | Global replay timestamp cursor | Use as a non-destructive visibility / clipping boundary |
| `loadDataForSlot` | `useWorkspaceCoordinator.ts` (814), `useReplayCoordinator.ts` (536) | Re-slices data array and reloads chart | Refactor to isolate initial load vs replay boundary updates |
| `invalidatePane` | `drawingChartAdapter.ts` (120), `overlays.ts`, `DrawingDragReleaseHandler.ts` | Repaints HTML5 canvas pane without resetting chart data | Primary repaint trigger during replay stepping |

---

## 5. Audit: Drawing System & Market Data Lifecycle Decoupling

### Architectural Rule
> **DRAWINGS MUST NOT DEPEND ON CANDLE DATA LOADING OR CANDLE RENDERING.**

### Existing Invariants & Verification
1. **Canonical State Independence**: Drawings in `useDrawingStore` store pure geometric points (`{ timestamp, dataIndex, value }`). They exist independently of whether candle data is loaded, missing, or empty.
2. **KLineCharts Overlay Rendering**: Overlays convert points to screen coordinates via `chart.convertToPixel([{ timestamp, value }])`.
3. **The Data Dependency Problem**:
   - Drawings do **not** depend on candles for their business logic or store state.
   - However, when `chart.resetData()` is called during replay, KLineCharts wipes its internal time-to-index index map. During the single-frame window where `resetData()` runs, `convertToPixel` fails or returns incorrect coordinates, causing overlay figures to briefly collapse to `(0,0)` or jump position.
   - **Conclusion**: The drawing system is architecturally decoupled. The glitch is caused purely by `chart.resetData()` destroying KLineCharts' internal coordinate lookup table.

---

## 6. KLineCharts `v10.0.0-beta3` API Capability Audit

Confirmed directly from `node_modules/klinecharts/dist/index.d.ts` (Package version: `10.0.0-beta3`):

### 1. How KLineCharts initially receives historical data
Via `chart.setDataLoader(dataLoader)` where `dataLoader.getBars` receives `params`:
```typescript
interface DataLoaderGetBarsParams {
  type: DataLoadType; // "init" | "forward" | "backward" | "update"
  timestamp: Nullable<number>;
  symbol: SymbolInfo;
  period: Period;
  callback: (data: KLineData[], more?: DataLoadMore) => void;
}
```
Initial load passes `type: "init"` and returns initial candles via `callback(bars, more)`.

### 2. How it requests additional historical data
When user scrolls near the left or right edge, KLineCharts automatically invokes `dataLoader.getBars` with `type: "backward"` (older data) or `type: "forward"` (newer data) and the edge `timestamp`.

### 3. How `getBars` works in `10.0.0-beta3`
`getBars` is an asynchronous data-provider callback. It receives `type`, `timestamp`, `symbol`, `period`, and a `callback(data, more)`.

### 4. How `subscribeBar` works in `10.0.0-beta3`
Interface definition in `index.d.ts:504`:
```typescript
interface DataLoaderSubscribeBarParams {
  symbol: SymbolInfo;
  period: Period;
  callback: (data: KLineData) => void;
}
interface DataLoader {
  getBars: (params: DataLoaderGetBarsParams) => void | Promise<void>;
  subscribeBar?: (params: DataLoaderSubscribeBarParams) => void;
  unsubscribeBar?: (params: DataLoaderUnsubscribeBarParams) => void;
}
```
`subscribeBar` registers a callback receiving single `KLineData` bar objects.

### 5. Supplying a single new candle without `resetData`
- **Method A**: Via `dataLoader.subscribeBar` callback `callback(newBar)`.
- **Method B**: Via `getBars` callback with `type: "update"` or `type: "forward"`.
- **Method C (Recommended for Replay)**: Load the full dataset once on `init`, and use `replayCurrentTimestamp` cutoff masking so stepping forward reveals existing candles without invoking `resetData()`.

### 6. Updating an existing candle
`subscribeBar` or `getBars` with `type: "update"` updates an existing candle in-place if `timestamp` matches the latest bar.

### 7. Historical data before already-loaded data
`getBars` with `type: "backward"` passes older bars to `callback(olderBars, { backward: true })`. KLineCharts prepends them automatically.

### 8. Behavior of timestamps and data indexes on incremental additions
- `timestamp` remains immutable.
- Prepending older historical data (`backward`) automatically shifts internal `dataIndex` values without mutating `timestamp` coordinate lookups.

### 9. Viewport movement data requests
KLineCharts handles edge detection natively and fires `getBars` (`type: "backward"`) when `onScroll` or viewport panning approaches the left boundary.

### 10. APIs to use instead of `resetData` during replay
- `chart.setDataLoader()` initialized once with full data on replay entry.
- `DrawingChartAdapter.invalidatePane(chart)` for non-destructive canvas repaints.
- `chart.setOffsetRightDistance()` / `chart.scrollToTimestamp()` for smooth viewport tracking.

### 11. Version Limitations of `10.0.0-beta3`
- `setDataLoader` is slot-scoped; each chart instance must have its `DataLoader` registered.
- `resetData()` must strictly be avoided during active drawing sessions and replay stepping.

---

## 7. Concise Investigation Report

### Current Data Flow
1. Data loaded from IndexedDB / CSV into `allTimeframesData` React state.
2. `useWorkspaceCoordinator.ts` registers `chart.setDataLoader()` and calls `chart.resetData()`.
3. Overlays reconciled via `drawingReconciler.ts`.

### Current Replay Flow
1. Replay timer updates `replayCurrentTimestamp` in `useReplayStore`.
2. `useReplayCoordinator` `useEffect` catches timestamp update and calls `loadDataForSlot`.
3. `loadDataForSlot` slices candle array and calls `chart.resetData()`.

### Current Caching Flow
1. Raw 1m data cached in IndexedDB `market_bars`.
2. Timeframe-resampled data cached in React state `allTimeframesData` and `timezoneAdjustedCache`.

### Current KLineCharts Integration
1. Chart instances managed via `chartInstancesRef`.
2. Overlays registered via `DrawingChartAdapter` & `overlays.ts`.
3. Data supplied via `setDataLoader` + `resetData()`.

### Current Drawing/Data Dependency Problems
1. `chart.resetData()` destroys KLineCharts' internal overlay coordinate lookup table, causing overlays to jump/glitch on every replay step.
2. In-progress drawings (`currentStep === 2`) lose context when `resetData()` fires.

### Files/Functions Likely to be Redesigned
- `useReplayCoordinator.ts` (Replay data sync effect — eliminate per-step `loadDataForSlot` calls).
- `useWorkspaceCoordinator.ts:loadDataForSlot` (Isolate initial data load from replay step updates).

### Files/Functions That Should Remain Untouched
- `useDrawingStore.ts` (Zustand drawing store).
- `DrawingRepositoryImpl.ts` & `db.ts` (Persistence).
- `DrawingDragReleaseHandler.ts` & tool implementations.
- `drawingReconciler.ts` & `DrawingChartAdapter.ts`.

### Confirmed KLineCharts Capabilities
- `v10.0.0-beta3` supports `setDataLoader` with `type: "init" | "forward" | "backward" | "update"`.
- Supports `subscribeBar` / `unsubscribeBar` for single-candle streaming.
- Supports non-destructive canvas invalidation (`invalidatePane`).

### Missing Information / Uncertainties
- Viewport lock behavior during replay autoplay when user manually drags chart pane.

### Recommended Next Architectural Investigation
- **Phase 1 Strategy**: Implement Option A (Load full dataset once on replay enter + apply `replayCurrentTimestamp` visibility cutoff + non-destructive canvas invalidation on step).
