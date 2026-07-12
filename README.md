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

#### Long / Short Position (Risk/Reward) Tools
Interactive position sizing tools to plan and calculate R:R ratios directly on the chart.

- **One-Click Drop** — Click to instantly place a default 1:1 Risk/Reward box on the chart.
- **Grab Handles** — 6 interactive handle points to resize targets (TP), stop loss (SL), and entry values horizontally or vertically.
- **Dynamic Stats & Badges** — Computes and renders TP (pips), SL (pips), and the Risk-to-Reward ratio in real-time.
- **Opaque Color Syncing** — Automatically synchronizes the line borders and text badge backgrounds with the base solid color of your Profit/Loss zone backgrounds.
- **Custom Line & Border Visibility** — Option to show or hide the TP/SL boundary and entry lines. When enabled, they follow your custom thickness (lineWidth) and type (lineStyle) preferences.
- **Y-Axis Tag Integration** — Adds color-coordinated tags for TP, Entry, and SL values directly onto the right Y-axis price scale.
- **Real-time Sync** — Position boxes, settings, and templates sync seamlessly across multi-chart split layouts.

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

## Getting Started: Beginner's Installation Guide

If you have never coded before or have no experience with developer tools, don't worry! This step-by-step guide will walk you through exactly how to set up and run FX Freeplay on your local computer.

### Step 1: Install Node.js
Node.js is a runtime helper required to launch the local application server.
1. Go to the official website: [https://nodejs.org/](https://nodejs.org/)
2. Click the green button labeled **LTS** (Long Term Support). This is the stable version recommended for most users.
3. Open the downloaded installer file (e.g., `.msi` for Windows or `.pkg` for Mac) and double-click to run it.
4. Follow the installer prompts: click **Next**, accept the license terms, and keep all default settings checked. Click **Finish** once installed.

### Step 2: Download FX Freeplay
1. Scroll to the top of this GitHub repository page.
2. Click the green **Code** button on the right side.
3. Select **Download ZIP** from the dropdown menu.
4. Locate the downloaded file (`fx-freeplay-main.zip`) on your computer and extract (unzip) it.
5. Move the extracted folder to a convenient place like your **Documents** folder or your **Desktop**.

### Step 3: Open the Terminal or Command Prompt
The terminal is a text-based window where you can run commands.
* **On Windows:** Press the `Windows Key` on your keyboard, type **Command Prompt** (or `cmd`), and press `Enter`.
* **On Mac:** Press `Command + Spacebar` to open Spotlight, type **Terminal**, and press `Enter`.

### Step 4: Navigate to the FX Freeplay Folder
You need to tell the terminal to go inside the folder you just extracted.
1. In the terminal window, type `cd ` (type the letters `c` and `d`, followed by a single space. **Do not press Enter yet**).
2. Drag and drop the extracted `fx-freeplay-main` folder from your desktop/finder directly into the terminal window. The terminal will automatically type out the full folder path for you.
3. Press `Enter`. You are now inside the project directory!

### Step 5: Install Dependencies
In the terminal window, type the following command and press `Enter`:
```bash
npm install
```
*Note: A bunch of text will scroll past as it downloads the charting libraries and styling utilities. This can take 30 to 60 seconds. Once it's finished, you'll see your normal terminal line waiting for another command.*

### Step 6: Start the Replay Tool!
To launch the tool, type the following command and press `Enter`:
```bash
npm run dev
```
You should see a message saying the local server is running. 
1. Open your web browser (Chrome, Safari, Edge, etc.).
2. In the address bar, type: **`http://localhost:5173`** and press `Enter`.
3. The FX Freeplay charting interface will load! You can now load your CSV files and start replaying.

To stop the server at any point, go back to your terminal window and press `Ctrl + C` (on both Windows and Mac).

---

### Running Offline (Without a Server)
If you want to compile the entire project into a single offline file that doesn't require a terminal or server to run:
1. In the terminal window, run:
   ```bash
   npm run build
   ```
2. Once complete, a folder named `dist` will be created inside your project folder.
3. Simply go inside `dist` using your normal file explorer and double-click `index.html`. It will open and run completely offline directly in your browser.

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
