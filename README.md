# FX Freeplay

A free, offline-first Forex charting and bar-replay tool for traders who want to study price action without a broker or an internet connection.

Load your own historical OHLCV data, replay it bar by bar, mark up the chart with a full drawing suite, and practice reading a market in real time — all locally in your browser, with nothing uploaded anywhere.

FX Freeplay is growing into a complete trading research platform: charting and replay today, with journaling, analytics, and backtesting on the way.

---

## Current Features

### Data & Charting
- **Large historical datasets** — import as much history as your broker or data source provides. Load a single OHLCV CSV, or point the app at a master folder with one subfolder per symbol.
- **On-demand loading & smart resampling** — per-timeframe files (`m1.csv`, `m5.csv`, `h1.csv`, `d1.csv`…) are parsed lazily when you switch timeframes, and missing timeframes are resampled from the best available lower timeframe.
- **Watchlist** — follow multiple symbols, including ones added from different folders.
- **Custom timeframes** — define any interval in minutes, hours, days, weeks, or months.
- **Auto price precision** and **timezone support** (local or exchange time).

### Bar Replay
- Step forward one bar at a time, or play with adjustable speed.
- Study setups with the outcome hidden, then reveal it bar by bar.

### Workspace
- **Multi-chart layouts** — up to four charts at once in vertical, horizontal, and grid arrangements, with symbol, interval, date-range, crosshair, and drawing sync between them.
- **Drawing tools** — trendlines, rays, horizontal and vertical lines, rectangles, circles, arrows, curves, freehand paths, brush, highlighter, text annotations, and long/short position (risk-reward) tools — each with a floating style toolbar, a full settings dialog, saveable templates, and style defaults that persist.
- **Chart utilities** — magnet snapping to candle OHLC values, measure tool, marquee zoom, favorites toolbar, lock-all / hide-all, and stay-in-drawing mode.
- **Object Tree** — see every object on the chart and select, show/hide, lock, or remove it from one panel.
- **Custom themes** — Light, Dark, and AMOLED presets, plus fully customizable candle, background, grid, and price-line colors you can save as your own theme.
- **Workspace persistence** — datasets, chart state, layout, timeframe, drawings, and watchlist are cached in the browser (IndexedDB / localStorage) and restored automatically on refresh. A data management screen lets you clear individual items or run a factory reset.

---

## Installation / Getting Started

**Prerequisite:** [Node.js](https://nodejs.org/) (LTS version).

```bash
git clone https://github.com/AceWritesCode/fx-freeplay.git
cd fx-freeplay
npm install
npm run dev
```

Then open <http://localhost:5173>.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Type-check and build for production into `dist/` |
| `npm run preview` | Serve the built `dist/` output locally |
| `npm run lint` | Run ESLint |

After `npm run build`, you can open `dist/index.html` directly in your browser and use the app fully offline — no terminal or server required.

**Windows quick start:** run `build.bat` once to install dependencies and build, then double-click `fx-freeplay.bat` to launch the app in your default browser.

### Getting data

Any OHLCV CSV will work. For folder mode, use one subfolder per symbol with timeframe files inside:

```
MyData/
├── EURUSD/
│   ├── m1.csv
│   └── h1.csv
└── GBPUSD/
    └── m1.csv
```

A MetaTrader 5 exporter script, `Candlesticks_Data_Export.ex5`, is included to generate compatible files. Copy it into MT5's `MQL5\Scripts` folder (**File → Open Data Folder**), refresh **Scripts** in the Navigator panel, then drag it onto any chart.

> ⚠️ In the script's settings window, tick **Allow DLL imports** on the **Dependencies** tab before running it. MT5's sandbox otherwise prevents the script from writing files outside its own folders.

Useful inputs on the **Inputs** tab:

- **Symbol Mode** — export just the current chart symbol, or the top 5 symbols in Market Watch.
- **Export Mode** — `Single File` (M1 only) or `Multi File` (all timeframes, in a per-symbol subfolder).
- **File Write Mode** — `Append` fetches only candles formed since the last run; `Overwrite` redownloads everything.
- **External Export Path** — optional Windows path to copy the finished CSVs straight to a folder of your choice. Left blank, files stay in `MQL5\Files\MyExports`.

Only fully closed candles are exported, so replay datasets stay accurate.

---

## What's Coming Next

- **Screenshots** — capture and export the current chart view.
- **GIFs & screen recording** — record replay sequences to review or share.
- **Trade Journal** — log trades, reasoning, and notes alongside your replay sessions.
- **Analytics** — performance metrics and statistics across your logged trades.
- **Backtesting** — run and evaluate strategies against imported history.
- **Trade History Import** — *planned, not yet confirmed.* This feature depends on access that has not yet been granted or finalized, so it is **not available today** and may change.

---

## Project Status

FX Freeplay is at **stable Version 1** (tag `v1.0.0`) — a complete, usable charting and replay environment, with the drawing framework, multi-chart workspace, replay engine, theming, and workspace persistence all in place.

Version 1 is the foundation the rest of the platform is built on. Active development is now focused on the research side: journaling, analytics, and backtesting.

---

## Tech Stack

React 19 · TypeScript · Vite · Tailwind CSS v4 · KLineCharts v10 · Zustand · PapaParse · IndexedDB

---

## License

MIT
