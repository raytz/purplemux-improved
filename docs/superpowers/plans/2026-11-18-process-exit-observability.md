# Process Exit Observability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist enough supervisor and fatal-error evidence to identify why the Purplemux HTTP process stopped.

**Architecture:** The long-lived CLI supervisor owns durable lifecycle records because it can still observe a child killed by a signal. A small CommonJS recorder appends JSONL and atomically replaces the last-exit snapshot; the server adds an observation-only fatal exception monitor that preserves Node's default termination behavior.

**Tech Stack:** Node.js CommonJS supervisor, TypeScript server entry, node:test, filesystem JSONL.

**Spec:** `.specs/v22/changes/process-exit-observability/spec.md`

## Global Constraints

- Do not add automatic restart behavior.
- Do not change Electron lifecycle or tmux preservation behavior.
- Recording failures must never block startup, upgrade, rollback, or shutdown.
- Fatal-error observation must not install a recovery handler.

## Review Focus

- A child killed after readiness must retain its signal and produce a nonzero supervisor result.
- An operator-requested signal must be distinguishable from an unexpected child signal.
- Upgrade termination must not be mislabeled as a crash.
- Disk-write failures must preserve existing supervisor control flow.
- Repeated lifecycle writes must leave valid JSONL and an atomic final snapshot.

---

### Task 1: Durable lifecycle recorder

**Files:**
- Create: `bin/process-lifecycle.cjs`
- Test: `tests/cli/process-lifecycle.test.cjs`

**Interfaces:**
- Produces: `createLifecycleRecorder({ directory?, fs?, now? })` with `record(event)` and `recordExit(event)`.

- [ ] **Step 1: Write failing recorder tests** covering append, atomic last-exit replacement, permissions, and write failure isolation.
- [ ] **Step 2: Run `node --test tests/cli/process-lifecycle.test.cjs` and confirm failure because the module is absent.**
- [ ] **Step 3: Implement synchronous best-effort JSONL append and atomic snapshot replacement.**
- [ ] **Step 4: Run the recorder tests and confirm they pass.**

### Task 2: Supervisor exit classification

**Files:**
- Modify: `bin/server-supervisor.cjs`
- Modify: `tests/cli/server-supervisor.test.cjs`

**Interfaces:**
- Consumes: `createLifecycleRecorder()` from Task 1.
- Produces: lifecycle events with `reason`, `code`, `signal`, `phase`, `uptimeMs`, process identity and target identity.

- [ ] **Step 1: Add failing tests** for normal/nonzero exits, unexpected signals, parent stop signals, upgrade, timeout, spawn error, and recorder failures.
- [ ] **Step 2: Run the supervisor suite and confirm the new assertions fail.**
- [ ] **Step 3: Track termination reason and pass both `(code, signal)` through the finish path.**
- [ ] **Step 4: Record spawn, ready, stop-request and exit events; make unexpected signal termination nonzero.**
- [ ] **Step 5: Run both CLI suites and confirm they pass.**

### Task 3: Fatal child-process diagnostics

**Files:**
- Create: `src/lib/process-fatal-observer.ts`
- Create: `tests/unit/lib/process-fatal-observer.test.ts`
- Modify: `server.ts`

**Interfaces:**
- Produces: `installProcessFatalObserver(processLike?)` using `uncaughtExceptionMonitor` and structured stderr output without consuming the exception.

- [ ] **Step 1: Add failing tests** for error serialization, non-Error values, PID/origin fields, and idempotent installation.
- [ ] **Step 2: Run the focused Vitest file and confirm failure.**
- [ ] **Step 3: Implement the observer and install it before server startup.**
- [ ] **Step 4: Run focused tests, full TypeScript checking, and ESLint for changed source files.**

### Task 4: Evidence and delivery

**Files:**
- Create: `.specs/v22/changes/process-exit-observability/task.md`
- Create: `.specs/v22/changes/process-exit-observability/result/verify.md`

**Interfaces:**
- Consumes: verification results from Tasks 1-3.
- Produces: reviewable evidence and MR-ready branch.

- [ ] **Step 1: Run CLI tests, focused unit tests, `pnpm tsc --noEmit`, changed-file ESLint, build, and `git diff --check`.**
- [ ] **Step 2: Record exact results and known limitations in the requirement-local evidence files.**
- [ ] **Step 3: Review the diff for secrets, unrelated changes, and spec coverage.**
- [ ] **Step 4: Commit, push `feat/process-exit-observability`, and create the MR.**
