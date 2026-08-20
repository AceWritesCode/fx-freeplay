---
trigger: always_on
---

# FX FREEPLAY WORKSPACE RULES

These rules apply only to this repository.

---

# 1. PROJECT HANDBOOK

`PROJECT_HANDBOOK.md` is the project's single source of truth.

Before making architectural or implementation decisions:

* Read the handbook.
* Follow the documented architecture.
* Respect established conventions.
* Do not contradict approved architectural decisions without discussion.

If completed work changes:

* architecture
* roadmap
* subsystem design
* engineering principles
* project milestones
* implementation status

Do **not** update the handbook automatically.

Instead ask:

> "This changes PROJECT_HANDBOOK.md. Would you like me to prepare an update?"

Update the handbook only after approval.

---

# 2. ARCHITECTURE FIRST

Major work follows this workflow:

Design

↓

Review

↓

Approval

↓

Implementation

Architecture must be approved before implementation begins.

Do not redesign approved architecture during implementation unless a genuine architectural issue is discovered.

---

# 3. LAYERED ARCHITECTURE

Preserve the approved application architecture.

Presentation

↓

Coordinator

↓

Store

↓

Engine

↓

Repository

↓

Driver

Do not bypass layers.

Each layer should have a single, well-defined responsibility.

---

# 4. ENGINE RULES

The Engine layer contains:

* business behavior
* algorithms
* execution logic
* deterministic workflows

The Engine must remain framework independent.

Never import:

* React
* Zustand
* persistence
* browser APIs
* chart libraries

---

# 5. REPOSITORY RULES

Repositories own persistence.

Responsibilities include:

* data access
* persistence orchestration
* storage abstraction

Repositories must never contain:

* UI logic
* business algorithms
* replay execution
* rendering logic

Repositories must remain independent of the underlying storage technology.

---

# 6. STORE RULES

Stores own runtime application state only.

Stores must not own:

* business algorithms
* persistence
* replay execution

Stores communicate through explicit actions.

Treat stores as runtime caches, not sources of business truth.

---

# 7. COORDINATOR RULES

Coordinators orchestrate workflows.

Responsibilities include:

* coordinating layers
* scheduling
* user-driven workflows
* mapping engine events to stores

Coordinators must not accumulate business logic.

If substantial algorithms appear inside a Coordinator, recommend moving them into the appropriate Engine or Repository.

---

# 8. SUBSYSTEM ORGANIZATION

Extend existing subsystems whenever practical.

Avoid:

* miscellaneous utility folders
* duplicate abstractions
* overlapping responsibilities

Every new module should have a clear architectural home.

---

# 9. DOCUMENTATION

When introducing or significantly changing a subsystem:

* update subsystem documentation where appropriate

Do not modify `PROJECT_HANDBOOK.md` automatically.

Always request approval first.

---

# 10. ENGINEERING PRINCIPLES

Prioritize:

* correctness
* clarity
* maintainability
* deterministic behavior
* explicit architecture
* incremental evolution
* reviewable implementation

Avoid:

* speculative abstractions
* unnecessary complexity
* premature optimization
* architectural rewrites
* framework coupling inside domain logic

---

# 11. REFACTORING POLICY

Do not refactor working code simply because it can be cleaner.

Refactoring should occur only when it:

* removes technical debt
* improves maintainability
* supports an approved feature
* resolves architectural drift

Prefer stability over perfection.

---

# 12. LONG-TERM PHILOSOPHY

Build systems that are easy to extend rather than easy to rewrite.

Protect approved architecture.

Add new capabilities by extending existing subsystems instead of replacing them.

Every implementation should leave the project easier to understand than before.
