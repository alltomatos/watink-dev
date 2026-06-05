# Triage Labels

Maps canonical triage roles to GitHub label names.

| Canonical Role | GitHub Label | Description |
|----------------|-------------|-------------|
| `needs-triage` | `triage` | Issue needs evaluation — no priority or scope assigned yet |
| `needs-info` | `needs-info` | Waiting on reporter for reproduction steps, logs, or clarification |
| `ready-for-agent` | `ready-for-agent` | Scoped, unblocked, AFK-safe — agent can implement autonomously |
| `ready-for-human` | `ready-for-human` | Requires human judgment, design decision, or manual verification |
| `wontfix` | `wontfix` | Acknowledged but will not be addressed |

## Additional labels in use
| Label | Purpose |
|-------|---------|
| `bug` | Confirmed defect |
| `feature` | New functionality request |
| `security` | Security-related (handle privately) |
| `multitenancy` | Affects tenant isolation or RLS |
| `engine` | Engine-Go related |
| `frontend` | React/UI related |
| `hardening` | Security hardening or quality improvement |
