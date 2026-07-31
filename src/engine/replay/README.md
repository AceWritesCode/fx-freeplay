# Replay Engine Subsystem

## Purpose
Manages trading platform playback pacing, scheduling timer loops, and index navigation logic for replay bars.

## Responsibilities
* Standalone intervals (`setInterval`) and start/stop play cycles via `ReplayTimer`.
* Searching indices by timestamp and index-stepping navigation math.

## What Belongs Here
* Replay loop timing, duration speed parameters, and state-free navigators.
* Non-UI playback calculation routines.

## What Does NOT Belong Here
* React lifecycle, states, setters, or DOM elements.
* Chart library coordinate conversions.
