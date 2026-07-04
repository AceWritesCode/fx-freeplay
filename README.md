# FX Freeplay

A free, offline-first Forex bar replay and analysis tool — built for traders who want to practice reading price action without a broker or internet connection.

Load any CSV of OHLCV data, replay it bar by bar, draw on the chart, and study your edge — all locally in your browser.

---

## Features

### Core Chart & Data
- **CSV Import & Folder Mode** — Load single 1-minute OHLCV CSV files, or select a master folder containing subfolders for each trading pair (e.g. `EURUSD`, `GBPUSD`) containing timeframe-specific CSV files.
- **Watchlist & Multi-Folder Support** — Add extra symbols from multiple folders via the watchlist `+` button. Other imported symbols are preserved without disappearing.
- **On-Demand Loading & Smart Resampling** — Timeframe CSV files (such as `m1.csv`, `m5.csv`, `h1.csv`, `d1.csv`) are parsed lazily on-demand when switching timeframes. Missing timeframes are automatically resampled from the best available lower timeframe file to maximize history.
- **IndexedDB Auto-Restore Cache** — Active datasets, chart states, timeframe selection, and watchlist symbols persist in the browser's IndexedDB and localStorage, auto-restoring your workspace on page refresh.
- **Auto Price Precision** — Auto-detects the price precision directly from the historical closing data (handling Yen crosses, Gold, major pairs, and indices dynamically).
- **Custom Timeframes** — Define any timeframe by minutes, hours, days, weeks, or months.
- **Bar Replay** — Step through historical bars one at a time or play/pause with speed control.
- **Magnet Snapping** — Snap drawing handles to candle OHLC values. Weak (proximity-based) and Strong (always-on) modes.
- **Theme & Style Settings** — Customize candle colors, background, price line, grid, and more.
- **Timezone Support** — Display candles in your local timezone or exchange time.

### Drawing Framework *(New)*

A fully extensible, production-grade drawing tool system built on top of KLineCharts. Designed so new drawing tools can be added by implementing a single blueprint.

#### TrendLine Tool
The first fully-implemented drawing tool. Serves as the reference implementation for all future tools.

- **Draw** — Click to place two anchor points; Shift-lock snaps to 0°, 45°, and 90° angles.
- **Inline Text Annotation** — Double-click any trendline to type a label directly on the chart. Text renders at the midpoint, splitting the line around it with a background-transparent gap.
- **Extension Modes** — Extend lines to the left, right, or both directions beyond anchor points.
- **Midpoint Handle** — Optional mid-point dot indicator on the line.
- **Price Labels** — Toggle price labels at each anchor point.
- **Timeframe Visibility** — Control which timeframes the line is visible on (ticks, seconds, minutes, hours, days, weeks, months) with min/max range sliders per bucket.
- **Statistics Panel** — Shows bars count, percentage change, pips, and angle between the two anchor points, rendered directly on the canvas near the line.
- **Real-time Sync** — All drawings sync across multi-chart split layouts automatically.

#### Drawing Floating Toolbar
A draggable, context-sensitive toolbar that appears whenever a drawing is selected.

- **Color Pickers** — Separate pickers for line color and text color, with full HSVA color wheel + hex/RGB inputs.
- **Line Width** — Quick selector (1–4px).
- **Line Style** — Solid, Dashed, or Dotted.
- **Lock / Unlock** — Toggle position lock on selected drawings.
- **Delete** — Remove selected drawings (with confirmation if any are locked).
- **Settings** — Open the full settings dialog.
- **Templates** — Save and apply named style templates (with Light/Dark mode & Group support).
- **Mutual Exclusivity** — Only one panel (color picker, style dropdown, or template menu) is open at a time.

#### Drawing Settings Dialog
A draggable, floating dialog with full per-drawing configuration.

- **Style Tab** — Line color, text color, line width, line style, extension mode, bold/italic, font size, text position.
- **Visibility Tab** — Toggle visibility per timeframe bucket, with min/max range sliders.
- **Coordinates Tab** — Manually enter precise price and bar-index coordinates for each anchor point.
- **Real-time Preview** — Changes are applied live to the chart; Cancel restores originals.
- **Template Management** — Save current settings as a named template (with group + Light/Dark mode tagging). Templates are per-tool and stored in localStorage.

#### Style Persistence
- When you change any drawing's style settings and click **Save**, those values become the **default** for all future drawings of that same type, surviving page refresh.
- New drawings automatically inherit the last-saved default style for their tool type.

---

## Architecture — Drawing Framework

```
src/
├── framework/
│   ├── DrawingState.ts          # Zustand store: DrawingInstance, DrawingPoint
│   └── tools/
│       ├── ToolRegistry.ts      # ToolDefinition, ToolSettingSchema, ToolTemplate types + registry singleton
│       ├── klinechartsAdapter.ts # Bridges ToolDefinition → KLineCharts overlay creation
│       ├── index.ts             # Barrel export
│       └── implementations/
│           └── TrendLine.tsx    # Reference implementation (blueprint for new tools)
│
├── components/
│   ├── DrawingFloatingToolbar.tsx  # Draggable context toolbar (color, style, templates)
│   ├── DrawingSettingsDialog.tsx   # Full per-drawing settings dialog
│   ├── FloatingTrendLineText.tsx   # Inline DOM text-edit overlay for trendline annotations
│   └── ColorPicker.tsx             # Reusable HSVA color picker
│
└── utils/
    └── overlays.ts              # getInteractiveOverlayOptions() — sets up overlay event hooks,
                                 # loads per-tool defaults from localStorage on new drawing creation
```

### How to Add a New Tool

1. **Create** `src/framework/tools/implementations/YourTool.tsx` modeled after `TrendLine.tsx`.
2. **Define** a `ToolDefinition` object with:
   - `id`, `name`, `icon`
   - `settingsSchema` — describes all configurable properties and their types/defaults
   - `defaultTemplates` — any built-in templates
   - `createOverlayDef()` — returns a KLineCharts `OverlayTemplate` with your draw/hit/render logic
3. **Register** it: `ToolRegistry.register(YourTool)` in `tools/index.ts`.
4. The toolbar, settings dialog, templates, and style persistence all work automatically.

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) v18+

### Install & Run

```bash
# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
```

The output is placed in `dist/`. You can open `dist/index.html` directly in a browser (no server needed).

---

## Data Format

FX Freeplay expects a **1-minute OHLCV CSV** file. Supported column layouts:

| Date | Time | Open | High | Low | Close | Volume |
|------|------|------|------|-----|-------|--------|

Date formats like `YYYY.MM.DD`, `YYYY-MM-DD`, `MM/DD/YYYY` and time formats like `HH:MM`, `HH:MM:SS` are all auto-detected.

> The app stores up to **300,000 rows** of 1-minute data. Older rows are automatically trimmed when you update the dataset.

---

## Tech Stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite](https://vitejs.dev/) — build tool
- [KLineCharts v10](https://klinecharts.com/) — charting engine
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Zustand](https://github.com/pmndrs/zustand) — drawing state management
- [Lucide React](https://lucide.dev/) — icons
- [PapaParse](https://www.papaparse.com/) — CSV parsing
- IndexedDB — local data persistence

---

## Roadmap

- [ ] Object Tree panel (list, show/hide, reorder, group drawings)
- [ ] More drawing tools (Horizontal Line, Rectangle, Fibonacci Retracement, Pitchfork…)
- [ ] Drawing import/export (JSON)
- [ ] Screenshot / share chart view

---

## License

MIT
