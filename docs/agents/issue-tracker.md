# Issue Tracker

## Platform
GitHub — `gh` CLI

## Commands
| Action | Command |
|--------|---------|
| Create issue | `gh issue create --title "..." --body "..." --label "..."` |
| List open | `gh issue list --state open` |
| View issue | `gh issue view <number>` |
| Close issue | `gh issue close <number>` |
| Comment | `gh issue comment <number> --body "..."` |
| Add label | `gh issue edit <number> --add-label "..."` |
| Remove label | `gh issue edit <number> --remove-label "..."` |
| Link PR | `gh pr create --fixes <number>` |

## Conventions
- All issues must include `tenantId` context if related to multitenancy
- Security issues use `security` label + private report (no public PoC)
- Conventional Commits on PR titles: `feat:`, `fix:`, `chore:`, `hardening:`
