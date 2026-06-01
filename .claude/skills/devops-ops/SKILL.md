---
name: devops-ops
description: Automate GitFlow workflows for Watink. Use when managing feature branches, releases, hotfixes, or maintaining the GitFlow lifecycle (main/develop/feature/release/hotfix).
---

# DevOps Ops with GitFlow

Automates the GitFlow lifecycle and DevOps operations for the Watink monorepo.

## Architecture

```
┌───────────────────────────────────────────────────────────────────────┐
│                     devops-ops.mjs (GitFlow Enhanced)                 │
├──────────────┬────────────┬─────────────┬─────────────────────────┤
│  feature     │  release   │  hotfix     │     devops              │
│ start/finish │  start/finish │ start/finish │    repo/commit/docker   │
│ merge/abort  │  promote   │  merge/abort│     ci/health/branch     │
│ status       │  publish   │  status     │     protection          │
└──────────────┴────────────┴─────────────┴─────────────────────────┘
```

## GitFlow Commands

| Command | Description |
|---|---|
| `feature <start/finish/merge/abort> <name>` | Feature branch lifecycle |
| `release <start/finish/merge/abort> <version>` | Release branch lifecycle |
| `hotfix <start/finish/merge/abort> <name> <version>` | Hotfix branch lifecycle |
| `flow status` | Current GitFlow state and branch diagram |
| `flow init` | Initialize GitFlow if missing (main/develop) |

## DevOps Commands

| Command | Description |
|---|---|
| `auto-commit` | Stage changes, generate Conventional Commit, commit, push |
| `smart-commit` | Auto-commit + create draft PR |
| `create-repo <name> [org]` | Create repo with GitFlow structure |
| `push` | Push current branch with upstream tracking |
| `pr [title]` | Create PR to target branch (develop for features, main for releases/hotfixes) |
| `branch <type>/<name>` | Create branch following GitFlow conventions |
| `ci-status` | Check GitHub Actions status for current branch |
| `ci-logs [run-id]` | Fetch CI logs |
| `docker-ps` | Show dev stack status |
| `docker-logs <service>` | Tail service logs |
| `stack-health` | Run full stack health check |
| `branch-protection` | Apply protection rules to main/develop

## Commands

| Command | Description |
|---|---|
| `auto-commit` | Stage changed files, generate conventional commit message from diff, commit, and push |
| `smart-commit` | Same as auto-commit but opens draft PR after push |
| `create-repo <name> [org]` | Create a new GitHub repository (public by default), clone locally |
| | Options: `--private`, `--org=NAME`, `--description=TEXT`, `--template=REPO` |
| `branch <type>/<name>` | Create branch following project convention (`feat/`, `fix/`, `chore/`, `hardening/`, `hotfix/`, `robot/`, `groud/`, `tinker/`) |
| `push` | Push current branch to origin with upstream tracking |
| `pr [title]` | Create PR from current branch to `develop` (or `main` for hotfix), with auto-generated body |
| | Options: `--base=BRANCH`, `--draft`, `--reviewer=USER` |
| `release <version>` | Create git tag, trigger release workflow, monitor CI status |
| `promote <source> <target>` | Promote a pre-release to stable via `promote-business-release` workflow |
| `ci-status` | Check GitHub Actions status for current branch |
| `ci-logs [run-id]` | Fetch logs for a CI run (latest if no run-id) |
| `docker-ps` | Show dev stack container status with health |
| `docker-logs <service>` | Tail logs for a dev stack service |
| `stack-health` | Run full stack health check (delegates to `run-watink/driver.mjs verify-stack`) |
| `branch-protection` | Apply branch protection rules to `main` and `develop` (delegates to `scripts/setup-branch-protection.sh`) |

## GitFlow Model

```
  main      ○─────●─────●─────●─────●  (production)
                \                     /
  develop    ○───●─────●─────●───●───●  (integration)
                  \       /     \
  feature       ●───●───●      ●───●  (current work)
  release             ●──────●
  hotfix     ●───────────────────●
```

### Branch Lifecycle

| Branch | Created from | Merges into | Naming |
|---|---|---|---|
| `feature/*` | `develop` | `develop` | `feature/<name>` or legacy `feat/<name>` |
| `release/*` | `develop` | `main` + back-merge `develop` | `release/<version>` |
| `hotfix/*` | `main` | `main` + back-merge `develop` | `hotfix/<name>` |

### Feature Flow

```bash
node devops-ops.mjs feature start add-webhook        # from develop
# ... work, auto-commit, auto-commit ...
node devops-ops.mjs feature finish add-webhook        # --no-ff merge to develop, delete branch
node devops-ops.mjs feature merge add-webhook         # --no-ff merge, keep branch
node devops-ops.mjs feature abort add-webhook         # delete branch, return to develop
```

### Release Flow

```bash
node devops-ops.mjs release start 1.2.0              # from develop
# ... bug fixes only, no new features ...
node devops-ops.mjs release finish 1.2.0              # merge to main + tag + back-merge develop + delete
node devops-ops.mjs release merge 1.2.0               # merge to main + tag + back-merge, keep branch
node devops-ops.mjs release abort 1.2.0               # delete branch, return to develop
```

### Hotfix Flow

```bash
node devops-ops.mjs hotfix start fix-jwt-expiry       # from main
# ... minimal fix ...
node devops-ops.mjs hotfix finish fix-jwt-expiry 1.1.1  # merge main + tag + back-merge develop + delete
node devops-ops.mjs hotfix merge fix-jwt-expiry        # merge + tag + back-merge, keep branch
node devops-ops.mjs hotfix abort fix-jwt-expiry        # delete branch, return to main
```

### Flow Init

```bash
node devops-ops.mjs flow-init                          # create main + develop if missing
```

### Flow Status

```bash
node devops-ops.mjs flow-status                        # show diagram + current branch type + merge target
```

## Commit Message Generation

The `auto-commit` and `smart-commit` commands analyze the staged diff to produce **Conventional Commits**:

1. Read `git diff --cached --stat` and `git diff --cached`
2. Classify changes by scope (`business/`, `engine-go/`, `frontend/`, `plugin-manager/`, etc.)
3. Determine type: `feat` (new files/functions), `fix` (bug fixes), `chore` (deps/config), `docs` (markdown), `hardening` (security), `refactor` (restructuring)
4. Generate subject line: `<type>(<scope>): <summary>`
5. Add bullet-point body with key changes
6. Append `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`
7. Commit and push

### Safety Guardrails

- **Never commit to `main` or `develop` directly** — skill refuses on protected branches
- **Never push secrets** — pre-commit scan rejects files matching `.env`, `*.key`, `*.pem`, `credentials*`
- **Dry-run mode** — `--dry-run` flag shows what would be committed without executing
- **Dirty check** — warns if working tree has unstaged changes alongside staged ones
- **Branch type enforcement** — `feature finish` on a non-feature branch is rejected

## PR Generation

The `pr` command auto-generates PR bodies with:

- **Technical summary** from commit history since branch point
- **Risk/impact** assessment based on files changed (e.g., DB migrations = high risk)
- **Test evidence** section (prompts user to fill)
- **Rollback plan** section (prompts user to fill)
- Ends with Claude Code attribution

## Repository Creation

`create-repo` handles:

1. `gh repo create` with flags
2. Clone to local workspace
3. Initialize with Watink-standard files (`.gitignore`, `CLAUDE.md` template, branch protection)
4. Create `develop` branch from `main`
5. Apply branch protection rules

## Critical Files

| File | Role |
|---|---|
| `.claude/skills/devops-ops/devops-ops.mjs` | Main script |
| `.github/workflows/release-business-binaries.yml` | Release workflow |
| `.github/workflows/promote-business-release.yml` | Promotion workflow |
| `scripts/setup-branch-protection.sh` | Branch protection setup |
| `docker-compose.dev.yml` | Dev stack definition |

## Prerequisites

- `gh` CLI authenticated (`gh auth status`)
- Git configured (`user.name`, `user.email`)
- Docker + Docker Compose for stack commands
- Node 20+ for script execution

## Gotchas

- **RabbitMQ race condition**: engine may fail briefly on startup if RabbitMQ isn't ready. `stack-health` retries automatically.
- **Gitleaks in CI**: secret scanning runs on every PR to `main`. If `auto-commit` pushes a false positive, use `gitleaks detect --no-git` locally first.
- **Release workflow** requires `WATINK_BUSINESS_PAT` secret in the repo — creating new repos won't have this.
- **Docker dev stack**: first `up --build` is slow (~5 min). Subsequent starts are fast due to volumes.
- **Branch naming**: project convention uses prefixes like `robot/`, `groud/`, `tinker/` — the `branch` command enforces this.
- **Push protection**: GitHub push protection may reject commits containing secrets even if local pre-commit hooks miss them.

## Troubleshooting

| Symptom | Check |
|---|---|
| `gh` command fails | Run `gh auth status` — token may be expired |
| Push rejected (protected branch) | You're on `main` — create a feature branch first |
| CI stuck in pending | Check GitHub Actions tab; runner may be offline |
| Docker service unhealthy | `docker compose -f docker-compose.dev.yml ps` — look for `health: unhealthy` |
| Release workflow not triggered | Must be a push to `master` matching path filter, or manual `workflow_dispatch` |
| PR creation fails | Ensure branch has commits ahead of base, and `gh` has repo scope |
