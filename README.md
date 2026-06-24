# FX Freeplay

A free, offline-first Forex bar replay and analysis tool — built for traders who want to practice reading price action without a broker or internet connection.

Load any CSV of OHLCV data, replay it bar by bar, draw on the chart, and study your edge — all locally in your browser.

---

## Features

- **CSV Import** — Load 1-minute OHLCV data from a CSV file. Supports MetaTrader, TradingView, and custom formats
- **Multi-Timeframe Resampling** — Automatically resamples 1m data into 5m, 15m, 30m, 1H, 4H, D, W, M
- **Custom Timeframes** — Define any timeframe by minutes, hours, days, weeks, or months
- **Bar Replay** — Step through historical bars one at a time or play/pause with speed control
- **IndexedDB Caching** — Loaded data is cached locally so you never have to re-import on refresh
- **Data Management** — Update existing data with a new CSV, download the current dataset, or clear the database
- **Drawing Tools**
  - Trend Line (with Shift-lock for angle snapping)
  - Horizontal Line
  - Rectangle
  - Risk/Reward (Price Channel) tool
  - Text Annotation
- **Magnet Snapping** — Snap drawing handles to candle OHLC values. Weak (proximity-based) and Strong (always-on) modes, configurable via right-click
- **Theme & Style Settings** — Customise candle colours, background, price line, grid, and more
- **Timezone Support** — Display candles in your local timezone or exchange time

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

