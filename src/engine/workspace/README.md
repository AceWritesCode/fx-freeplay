# Workspace Services Subsystem

## Purpose
Exposes layout settings, configuration cache, and app persistence layer abstractions.

## Responsibilities
* Wrapping `localStorage` reads/writes safely.
* Centralizing app state keys (layouts, sizes, offsets, active symbols).

## What Belongs Here
* Storage serialization, default recovery, and workspace persistence routines.

## What Does NOT Belong Here
* Chart instance creation or canvas overlays.
* React hooks or timezone calculations.
