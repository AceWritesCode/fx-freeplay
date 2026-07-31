# Charting Engine Subsystem

## Purpose
Provides viewport coordinates, snapping mathematics, alignment sync, and geometric hit-testing for chart slots.

## Responsibilities
* Snapping canvas points to candlestick candles.
* Aligning, zoomed spacing, and crosshair sync updates across layout grids.
* Pure line/polygon hit-testing and selection bounds intersection.

## What Belongs Here
* Math algorithms for canvas coords, offsets, intervals, and geometry.
* Viewport sync formulas.

## What Does NOT Belong Here
* React states or component bindings.
* Local storage persistence or file parsing.
