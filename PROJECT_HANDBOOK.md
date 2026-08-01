# FX Freeplay Project Handbook

**Version:** v0.3-state-architecture\
**Status:** Phase 3 Complete • Phase 4 Ready

------------------------------------------------------------------------

# Table of Contents

1.  Project Vision
2.  Project Identity
3.  Long-Term Goals
4.  Core Engineering Philosophy
5.  Architecture Overview
6.  Layer Responsibilities
7.  Repository Organization
8.  Architectural Rules
9.  Phase History
10. Git Workflow
11. Coding Standards
12. Documentation Standards
13. Review Workflow
14. AI Collaboration Guide
15. Phase 3 Specification
16. Long-Term Roadmap
17. Architecture Decision Records
18. Current Project Snapshot

------------------------------------------------------------------------

# 1. Project Vision

FX Freeplay is evolving into a professional Trading Research Platform.

It is not intended to become another charting application.

Its long-term purpose is to help traders:

-   Study market behaviour
-   Replay historical markets
-   Build hypotheses
-   Validate strategies
-   Perform structured research
-   Improve execution quality

Every architectural decision should support this vision.

------------------------------------------------------------------------

# 2. Project Identity

Mission:

Create a professional, maintainable, extensible research platform
capable of growing for years without requiring architectural rewrites.

Success is measured by:

-   clarity
-   maintainability
-   correctness
-   scalability
-   developer experience

Not by feature count.

------------------------------------------------------------------------

# 3. Long-Term Goals

Roadmap

v0.1 Prototype

v0.2 Foundation

v0.3 State Architecture

v0.4 SQLite Integration

v0.5 Desktop (Tauri)

v0.6 Research Platform Alpha

v1.0 Trading Research Platform MVP

Future

-   Strategy Lab
-   Statistical Reports
-   Session Analytics
-   Trade Journaling
-   Replay Research
-   Portfolio Analytics
-   AI-assisted Research

------------------------------------------------------------------------

# 4. Core Engineering Philosophy

Architecture before implementation.

Review before coding.

Incremental refactoring over rewrites.

Prefer explicit design.

Small reviewable changes.

Single Responsibility Principle.

Domain-driven organization.

Behaviour and State are different concerns.

Documentation is part of the product.

Every abstraction must solve a real problem.

Avoid speculative engineering.

------------------------------------------------------------------------

# 5. Architecture Overview

Presentation

↓

Coordinator

↓

Store (Phase 3)

↓

Engine

↓

Domain

Presentation renders UI.

Coordinator orchestrates.

Store owns application state.

Engine owns behaviour.

Domain owns business knowledge.

------------------------------------------------------------------------

# 6. Layer Responsibilities

## Presentation

Responsible for:

-   Rendering
-   User interaction
-   Display logic

Never contains business logic.

------------------------------------------------------------------------

## Coordinator

Responsible for:

-   Connecting UI
-   Calling stores
-   Calling engines
-   Orchestrating flows

Should not contain algorithms.

------------------------------------------------------------------------

## Store

Responsible for:

-   Global application state
-   Actions
-   Persistence decisions

Stores never own business algorithms.

------------------------------------------------------------------------

## Engine

Responsible for:

-   Algorithms
-   Calculations
-   Replay
-   Synchronization
-   Processing

Engine must remain framework independent.

No React.

No UI.

------------------------------------------------------------------------

## Domain

Responsible for:

-   Pure business concepts
-   Trading concepts
-   Timeframe knowledge
-   Market rules

No infrastructure.

No framework code.

------------------------------------------------------------------------

# 7. Repository Organization

Presentation/

features/

engine/

domain/

config/

Each folder exists for one responsibility.

Avoid dumping helpers into generic utility folders.

Subsystem-first organization.

------------------------------------------------------------------------

# 8. Architectural Rules

-   Engine never imports React.
-   Domain stays pure.
-   Coordinator remains thin.
-   Store owns state.
-   Engine owns behaviour.
-   Components own presentation.
-   Prefer composition.
-   Prefer explicit dependencies.
-   Avoid circular dependencies.
-   Never introduce architecture without review.

------------------------------------------------------------------------

# 9. Phase History

## Phase 0

Infrastructure

Completed:

-   Path aliases
-   Configuration centralization
-   Decision log
-   Domain skeleton

------------------------------------------------------------------------

## Phase 1

Monolith Decomposition

Completed:

-   Header
-   Sidebar
-   Footer
-   Chart Grid
-   ChartWorkspace separation

------------------------------------------------------------------------

## Phase 2

Architecture Foundation

Completed:

Replay

Synchronization

Geometry

Data Processing

Persistence

Timeframe utilities

README files

Barrel exports

Git milestone

Tagged:

v0.2-foundation

Status:

COMPLETE

------------------------------------------------------------------------

# 10. Git Workflow

Default branch:

main

Development:

feature/\*

Bug fixes:

bugfix/\*

Major milestones:

Annotated tags

Examples

v0.2-foundation

Every phase ends with:

Review

Testing

Merge

Tag

New feature branch

------------------------------------------------------------------------

# 11. Coding Standards

Meaningful names.

Subsystem organization.

One responsibility per module.

Prefer explicit APIs.

Document architectural decisions.

Do not over-abstract.

No dead code.

No hidden dependencies.

------------------------------------------------------------------------

# 12. Documentation Standards

Every subsystem should contain:

README.md

Describe:

Purpose

Responsibilities

What belongs

What doesn't belong

Future direction

------------------------------------------------------------------------

# 13. Review Workflow

Design

↓

Review

↓

Approval

↓

Implementation

↓

Review

↓

Merge

Architecture is reviewed before code.

------------------------------------------------------------------------

# 14. AI Collaboration Guide

Future AI assistants must:

Understand architecture before coding.

Never bypass layers.

Never move business logic into React.

Avoid helper dumping.

Respect subsystem boundaries.

Explain trade-offs.

Prefer incremental refactoring.

Do not implement speculative abstractions.

Follow existing conventions.

------------------------------------------------------------------------

# 15. Phase 3 Specification

Goal

Design state ownership.

No implementation until architecture approval.

Stores to evaluate:

Replay Store

Layout Store

Watchlist Store

Settings Store

Future Research Store

Questions to answer

What is global?

What stays local?

What is persisted?

How stores communicate?

Which engine each store uses?

------------------------------------------------------------------------

# 16. Phase 4 Specification

## Goal
Implement the repository-driven persistence architecture.

## Repository & Persistence Architecture
- Permanent repository layer abstraction isolates persistence drivers from the core stores and coordinators.
- Repositories implemented:
  - `MarketDataRepository`: Handles OHLCV price candles per symbol/timeframe.
  - `WatchlistRepository`: Handles symbols list, active symbol, import mode, and folder handles.
  - `WorkspaceLayoutRepository`: Handles active slots configurations and synchronization flags.
  - `DrawingRepository`: Handles drawings and annotations per symbol.
  - `SettingsRepository`: Handles global visual parameters and custom timeframe lists.

## Persistence Drivers
- *Browser Persistence Driver*: Currently implemented using IndexedDB and LocalStorage, serving as a temporary driver behind the repository layer during web-only execution.
- *Native SQLite Driver*: Long-term destination driver, to be swapped in seamlessly during Tauri desktop migration without changing stores, coordinators, or repository interfaces.

## Data Ingestion & Lifecycle
- *Market Data System*: Integrates with CSV/directory imports. Writes through `MarketDataRepository`.
- *Workspace Persistence*: Sequentially restores settings, watchlists, folder handles, layouts, and data caches on startup.
- *Runtime Cache Isolation*: Memory raw data cache manages active working sets, Zustand stores own transient application state, and repositories own persistent storage.

------------------------------------------------------------------------

# 17. Long-Term Roadmap

Foundation

↓

State

↓

Persistence

↓

Desktop

↓

Research

↓

Analytics

↓

Automation

↓

AI Assistance

↓

Production Platform

------------------------------------------------------------------------

# 18. Architecture Decision Records

Key Decisions

-   Engine separated from UI.
-   Domain kept framework independent.
-   State postponed until architecture stabilized.
-   Documentation treated as first-class.
-   Git milestones used for architectural checkpoints.
-   Review-first development workflow adopted.
-   State Architecture implemented via decoupled Zustand stores and Coordinator layers (Phase 3).
-   Persistence Driver Strategy (Phase 4):
    - *Persistence Architecture*: Permanent abstraction barrier (Repositories) completely decoupled from stores and coordinators.
    - *Browser Persistence Driver*: Temporary browser-backed proxy implementation (IndexedDB and localStorage) for Vite-only execution.
    - *Native SQLite Driver*: Target persistence engine, to be swapped in seamlessly during Tauri desktop migration without changing application architecture.
-   Technical Debt tracked for future stages:
    - Replay loop and ticks math should eventually migrate fully into the Replay Engine.
    - Monitor WorkspaceCoordinator code-size and split it if it grows too large.
    - Revisit the drawing synchronization architecture when advanced features are added.
    - Re-evaluate decentralized persistence ownership if future complexity justifies centralizing it.
    - Intentional Architectural Debt: The browser-backed persistence driver serves as a proxy driver under the repository interface. This driver is temporary and will be replaced with native SQLite during Tauri migration.

------------------------------------------------------------------------

# 19. Current Project Snapshot

Version

v0.4-persistence

Branch

feature/state-architecture

Completed

✔ Phase 0

✔ Phase 1

✔ Phase 2

✔ Phase 3

✔ Phase 4

Current Goal

Phase 5

Desktop Integration

Project Status

Stable

Persistence Architecture and Repository layer approved & completed. Ready for Phase 5.
