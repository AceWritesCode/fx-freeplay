# Market Engine Subsystem

## Purpose
Coordinates the market data processing pipeline, timeframe cache builders, and raw data queries.

## Responsibilities
* Initializing timezone-adjusted timeframe cache dictionaries.
* Shifting replay ticks to align with timezone updates.
* Querying in-memory raw symbol klines.

## What Belongs Here
* Timeframe cache generation and supplemental dataset updates.
* Data pipeline orchestrator logic.

## What Does NOT Belong Here
* React lifecycle, states, or components.
* Drawing geometry, canvas layers, or layouts.
