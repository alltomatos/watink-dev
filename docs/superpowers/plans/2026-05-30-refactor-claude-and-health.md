# Refactor CLAUDE.md and Add Health Check Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor CLAUDE.md for action-oriented access and create an orchestrator script `.claude/scripts/health-check.mjs` to unify platform diagnostics.

**Architecture:** 
- `CLAUDE.md` reorganized into "Quick Start", "Action Guide", and "Legacy/Reference". Includes mandatory security "Golden Rule".
- `health-check.mjs` (Node.js) invokes existing skill logic (run-watink driver + tenant-guard).

**Tech Stack:** Node.js (scripts), Markdown (documentation).

---

### Task 1: Refactor CLAUDE.md

- [ ] Write restructured CLAUDE.md.
- [ ] Ensure "Golden Rule" on Tenant Security is visible.

### Task 2: Create .claude/scripts/health-check.mjs

- [ ] Create script skeleton.
- [ ] Implement service health check using `run-watink` driver logic.
- [ ] Implement backend code scan using `tenant-guard` logic.
- [ ] Add summary output.

### Task 3: Final Verification

- [ ] Run `health-check.mjs`.
- [ ] Verify `CLAUDE.md` readability.
