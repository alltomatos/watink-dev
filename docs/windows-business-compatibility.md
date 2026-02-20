# Watink Business for Windows — Compatibility Baseline

## Objective
Enable **Watink Business for Windows** with full compatibility across:
- watink opencore
- watink business

Without breaking the current Linux/VPS workflows.

## Current baseline (today)
- Main development and deploy flow is Linux-first (.sh, systemd, docker-compose variants).
- Windows entrypoint exists (start.bat), but there is no unified validation/bootstrap flow for Windows Business.
- Multiple packages/services (backend, business backend, frontend, plugin/engine) require deterministic startup order.

## Compatibility principles
1. **No regression on Linux**: existing shell scripts remain valid.
2. **Windows-first wrappers**: add .ps1 helpers for validation/bootstrap.
3. **Contract compatibility**: preserve API, auth, queue/ticket, and tenant behavior across OpenCore and Business.
4. **Deterministic startup checks**: verify env, paths, ports, Node/Go availability before launch.

## Compatibility matrix (initial)
| Area | OpenCore | Business | Windows status | Action |
|---|---|---|---|---|
| API routes/contracts | Required | Required | ⚠️ Needs validation | Add API contract smoke checks |
| Auth/session behavior | Required | Required | ⚠️ Needs validation | Add login + token lifecycle checks |
| Queue/Ticket flow | Optional | Critical | ⚠️ Needs validation | Add queue/ticket end-to-end smoke |
| Build/start scripts | Linux stable | Linux stable | ⚠️ Partial | Add PowerShell helper and npm wrappers |
| Path handling | Linux paths | Linux paths | ⚠️ Risk | Normalize path resolution in scripts |
| Release packaging | Existing | Existing | ⚠️ Partial | Add Windows build checklist |

## First milestones

### M1 — Baseline (this commit)
- Add this compatibility document.
- Add root npm scripts for Windows bootstrap/validation wrappers.
- Add scripts/windows-business-check.ps1 to validate local prerequisites and key files.

### M2 — Runtime parity checks
- Validate OpenCore + Business routes in the same runbook.
- Validate ticket/queue CRUD and event listener behavior.
- Validate frontend route loading for Business pages.

### M3 — Release hardening
- Windows runbook + rollback section.
- CI job for Windows smoke checks.
- Compatibility gate before release tagging.

## Runbook (baseline)
From repo root on Windows PowerShell:

`powershell
npm run windows:check
npm run windows:business
`

## Definition of done (Windows compatibility)
- OpenCore and Business can boot in Windows environment with documented commands.
- Core flows (auth, queue, ticket, contact, dashboard) pass smoke checks.
- No Linux script regressions introduced.
