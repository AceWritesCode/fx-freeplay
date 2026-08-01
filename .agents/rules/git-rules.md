---
trigger: always_on
---

# Git Workflow Policy — FX Freeplay

This document defines the mandatory Git workflow for the FX Freeplay project.

These rules are intended to protect the integrity of the repository and ensure that every architectural decision remains reviewable, traceable, and reversible.

These rules are mandatory for all future work.

---

# Core Principles

1. **`main` is always stable.**
2. Every feature is developed in its own branch.
3. No direct commits to `main`.
4. No automatic pushes.
5. No automatic merges.
6. No Git operation that changes repository history may be performed without explicit approval from the Project Manager.

---

# Branch Strategy

Every independent task must have its own feature branch.

Examples:

```
feature/replay-engine
feature/bookmarks
feature/journaling
feature/analytics-dashboard
feature/mt5-bridge
feature/tauri-migration
```

For bug fixes:

```
fix/replay-timeline
fix/import-crash
fix/watchlist-loading
```

For refactoring:

```
refactor/replay-engine
refactor/repository-layer
```

Never combine unrelated work into the same branch.

---

# Branch Creation Rules

Before implementation begins:

1. Create a new branch from the latest `main`.
2. Verify the working tree is clean.
3. Perform all work inside the feature branch.

Never develop directly on `main`.

---

# Commit Policy

Each commit must represent **one logical change**.

Do not combine unrelated fixes into a single commit.

## The Single-Question Rule

Every commit should answer one question:

> "What changed?"

If the commit message requires the word **"and"** to describe multiple unrelated fixes, it should be split into separate commits.

**Correct:**

```
fix(replay): restore replay cutpoint selection

fix(workspace): restore reset view behavior

fix(workspace): correct layout toolbar routing
```

**Incorrect:**

```
fix: restore replay cutpoint, reset view and layout toolbar routing
```

## The Independent-Revert Test

Before committing, ask:

> "Can this change be reverted independently without affecting the others?"

If the answer is **yes**, it belongs in its own commit.

## Exceptions

Grouping related changes into one commit is acceptable when they are logically inseparable.

Examples:

* Refactoring a subsystem across multiple files
* Renaming a module that touches many call sites
* Completing one architectural milestone that requires coordinated changes
* A single feature that spans several files by necessity

The deciding factor is **logical cohesion**, not the number of files modified.

## General Guidance

Avoid:

* WIP commits
* Temporary commits
* Debug commits
* "Fix again" commits
* Commits that bundle unrelated regressions or features

Prefer small, logical, independently reviewable commits.

---

# Push Policy

The Coding Agent may push commits to the remote feature branch when appropriate.

However:

* Never push directly to `main`.
* Never create or merge Pull Requests automatically.
* Never delete branches automatically.

---

# Pull Request Policy

After implementation is approved:

The Coding Agent should stop and report:

* Branch name
* Commit summary
* Implementation summary

The Project Manager decides whether a Pull Request should be created.

The Coding Agent must never assume approval.

---

# Merge Policy

Only the Project Manager decides when to merge.

The Coding Agent must never:

* Merge branches
* Squash commits
* Rebase onto `main`
* Fast-forward merge
* Delete branches after merge

without explicit instruction.

---

# Architecture Review Rule

No branch may be merged until:

1. Architecture review is complete.
2. Implementation review is complete.
3. Project Manager gives final approval.

Only then may the branch be merged into `main`.

---

# Git Operations Requiring Approval

The Coding Agent must ask for approval before performing:

* Creating a Pull Request
* Merging any branch
* Rebasing
* Force pushing
* Deleting any branch
* Renaming branches
* Modifying Git history
* Cherry-picking commits
* Resetting commits
* Reverting commits
* Creating releases or tags

Do not ask for approval for normal local commits.

---

# Branch Completion

When a branch has been approved:

The Coding Agent should report:

* Branch name
* Commit hash(es)
* Files modified
* Test status

Then wait for instructions.

---

# Emergency Rule

If the Coding Agent discovers:

* Merge conflicts
* Corrupted history
* Accidental commits to `main`
* Failed rebase
* Conflicting branches

Stop immediately.

Do not attempt to repair Git history independently.

Report the issue and wait for instructions.

---

# Workflow Summary

```
main
    │
    ├── Create feature branch
    │
    ▼
Architecture
    │
    ▼
Implementation
    │
    ▼
Implementation Report
    │
    ▼
Architecture Review
    │
    ▼
Project Manager Approval
    │
    ▼
Push Feature Branch
    │
    ▼
Pull Request
    │
    ▼
Merge into main
    │
    ▼
Delete branch (only if approved)
```

---

# Guiding Principle

Git is not merely a backup system.

It is the project's history.

Every branch should represent one coherent objective.

Every merge should represent an approved architectural milestone.

The repository should always allow any major feature to be traced, reviewed, and reverted independently if necessary.
