# Store Layer

This layer acts as the **passive container** for the application's global and session-scoped state metadata. It serves as the single source of truth for reactive components in the Presentation layer.

---

## Architecture Overview

```
Presentation (UI Views) 
       │
       ├─ (Reads State via Selectors) ──► [Zustand Stores]
       ▼                                     ▲
[Coordinator Orchestrators] ─────────────────┤ (Mutates State via Actions)
```

---

## Architectural Rules & Invariants

1. **State Purity (No Business Logic)**: Store definitions must strictly contain state fields and basic actions. All calculations, timezone translations, resampling logic, and timestamp step calculations must live in the **Engine Layer**.
2. **Unidirectional Command Flow**: Views and templates should never mutate store properties directly. State transitions must occur by invoking Coordinator operations or firing explicit named store actions.
3. **Engine Isolation**: Store files are forbidden from importing any engine modules (`src/engine/*`). Engines are pure libraries and have zero knowledge of stores.
4. **Resource Exclusion**: Heavy resources (such as raw 1m candlestick arrays, timeframe cache arrays, directory handles, and canvas instances) must **never** be stored as reactive state keys. Stores only maintain metadata (such as asset names, timeframe keys, sync toggles, and serialized drawing definitions).
5. **Decoupled Persistence**: Store state transitions write to persistence (such as `localStorage` or `IndexedDB`) automatically using store subscribers or serialization middleware, completely separating storage protocols from visual components.

---

## Code Style & Conventions

* **Hook Naming**: Store hooks must follow the prefix format `use[Name]Store` (e.g. `useSettingsStore`).
* **Action Boundaries**: Actions must be named explicitly to describe the intent (e.g. `updateTimeframe`, `setReplayActive`) and must be grouped cleanly under an actions object or flat methods.
* **Typing**: All store interfaces and state fields must align with definitions inside [types.ts](file:///c:/Users/Himanshu/Documents/Projects/fx-freeplay/src/store/types.ts).
