# Market Domain Subsystem

## Purpose
Provides pure domain models and business calculations relating to market data structure, timeframe specifications, and timezone offsets.

## Responsibilities
* Timeframe parsing, comparison, and layout count calculations.
* Alignment of raw timeframe files to presets.
* Timezone shift adjustments on raw kline candles.

## What Belongs Here
* Pure, side-effect-free market utility calculations.
* Domain-specific type definitions for market variables.

## What Does NOT Belong Here
* React lifecycle, components, hooks, or context APIs.
* Active UI state setters or database engines.
* Chart library instances or canvas rendering logic.
