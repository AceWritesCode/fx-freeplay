# FX Freeplay

A free, offline-first Forex bar replay and analysis tool — built for traders who want to practice reading price action without a broker or internet connection.

Load any CSV of OHLCV data, replay it bar by bar, draw on the chart, and study your edge — all locally in your browser.

---

## Features

- **CSV Import & Folder Mode** — Load single 1-minute OHLCV CSV files, or select a master folder containing subfolders for each trading pair (e.g. `EURUSD`, `GBPUSD`) containing timeframe-specific CSV files.
- **Watchlist & Multi-Folder Support** — Add extra symbols from multiple folders via the watchlist `+` button. Other imported symbols are preserved without disappearing.
- **On-Demand Loading & Smart Resampling** — Timeframe CSV files (such as `m1.csv`, `m5.csv`, `h1.csv`, `d1.csv`) are parsed lazily on-demand when switching timeframes. Missing timeframes are automatically resampled from the best available lower timeframe file to maximize history.
- **IndexedDB Auto-Restore Cache** — Active datasets, chart states, timeframe selection, and watchlist symbols persist in the browser's IndexedDB and localStorage, auto-restoring your workspace on page refresh.
- **Auto Price Precision** — Auto-detects the price precision directly from the historical closing data (handling Yen crosses, Gold, major pairs, and indices dynamically).
- **Custom Timeframes** — Define any timeframe by minutes, hours, days, weeks, or months.
- **Bar Replay** — Step through historical bars one at a time or play/pause with speed control.
- **Drawing Tools**
  - Trend Line (with Shift-lock for angle snapping)
  - Horizontal Line
  - Rectangle
  - Risk/Reward (Price Channel) tool
  - Text Annotation
- **Magnet Snapping** — Snap drawing handles to candle OHLC values. Weak (proximity-based) and Strong (always-on) modes, configurable via right-click.
- **Theme & Style Settings** — Customize candle colors, background, price line, grid, and more.
- **Timezone Support** — Display candles in your local timezone or exchange time.

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
- [Lucide React](https://lucide.dev/) — icons
- [PapaParse](https://www.papaparse.com/) — CSV parsing
- IndexedDB — local data persistence

---

## License

MIT

