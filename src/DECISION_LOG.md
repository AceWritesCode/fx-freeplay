# Architectural Decision Log: FX Freeplay Platform

This document records the core architectural design choices, rationales, alternatives considered, and trade-offs.

---

## ADR 001: Path Alias Resolution Mapping

* **Status**: Approved
* **Date**: 2026-07-31

### Decision
Introduce path aliases (`@/*` mapping to `src/*`) in both the Vite bundler (`vite.config.ts`) and the TypeScript compiler compiler options (`tsconfig.app.json`).

### Reason
The folder restructure will split the monolithic single-file layout into deeply nested directories. Direct relative references (e.g., `../../components/ColorPicker` or `../../../utils/dataUtils`) make files brittle to reorganize and lead to hard-to-maintain code. Path mapping resolves import targets globally.

### Alternatives Considered
* **Relative Imports**: Postponing path mapping and keeping relative paths. This was rejected because the folder restructure would require manual, error-prone rewrite of hundreds of import declarations.

### Trade-offs
* Requires aligning the configurations of both the Vite runner and the compiler.

---

## ADR 002: Centralized Configuration Layer (`src/config/`)

* **Status**: Approved
* **Date**: 2026-07-31

### Decision
Create a centralized configuration module (`src/config/`) containing timeframe presets, timezone lists, and theme presets, exposing them via a unified barrel file.

### Reason
Constants were scattered inside components (like `ThemeSettingsModal.tsx` and `App.tsx`). Centralization ensures that styling profiles, timezone offsets, and default limits are decoupled from React components.

### Alternatives Considered
* **Local constants**: Keeping constants close to where they are used. Rejected because it limits the ability of other engines (e.g. strategy backtester or database loaders) to reference default configurations.

### Trade-offs
* Adds a module dependency for UI elements, but guarantees single-source-of-truth.

---

## ADR 003: Business-Centric Domain Layer

* **Status**: Approved
* **Date**: 2026-07-31

### Decision
Reorganize the core data types and mathematics around fundamental trading domain concepts: `Market`, `Trade`, `Research`, `Strategy`, and `Analysis`.

### Reason
The prototype had data concepts structured around UI needs. A pure domain layer with **zero dependencies** on external libraries ensures that trading models, lot sizes, and stats remain independent of presentation libraries.

### Alternatives Considered
* **UI-driven Types**: Organizing typings by component layout (e.g. `drawingTypes.ts`, `chartTypes.ts`). Rejected because it ties core trading mathematics to KLineCharts/React concepts.

### Trade-offs
* Requires mapping data structures when interfacing with third-party charting formats.

---

## ADR 004: Postponing Routing Packages

* **Status**: Approved
* **Date**: 2026-07-31

### Decision
Postpone the introduction of external routing frameworks (like `react-router-dom`). Prepare routing infrastructure via a clean, state-driven workspace switcher tab.

### Reason
There is only one screen (the Chart Replay Workspace) in the current application. Adding React Router now introduces dependency peer conflicts with React 19. A state-based tab switcher works in offline file environments (`file://` and custom Tauri protocols).

### Alternatives Considered
* **React Router Integration**: Rejected due to React 19 dependency resolution overhead and unnecessary complexity.

### Trade-offs
* State-based workspace tabs must be updated manually in the future, but can easily be replaced by a router if a document-style link structure is ever required.
