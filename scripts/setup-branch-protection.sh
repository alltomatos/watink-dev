#!/usr/bin/env bash
set -euo pipefail

# Uso:
#   REPO=owner/repo ./scripts/setup-branch-protection.sh
# Exemplo:
#   REPO=alltomatos/watinkdev ./scripts/setup-branch-protection.sh

: "${REPO:?Defina REPO=owner/repo}"

protect_branch() {
  local branch="$1"

  gh api -X PUT "repos/$REPO/branches/$branch/protection" \
    -H "Accept: application/vnd.github+json" \
    --input - <<'JSON'
{
  "required_status_checks": {
    "strict": true,
    "checks": []
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": false,
    "required_approving_review_count": 1,
    "require_last_push_approval": false
  },
  "restrictions": null,
  "required_conversation_resolution": true,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "block_creations": false,
  "required_signatures": false,
  "lock_branch": false,
  "allow_fork_syncing": true
}
JSON
}

ensure_develop() {
  if gh api "repos/$REPO/branches/develop" >/dev/null 2>&1; then
    echo "develop já existe"
  else
    echo "criando develop a partir de main"
    local sha
    sha=$(gh api "repos/$REPO/git/ref/heads/main" --jq '.object.sha')
    gh api -X POST "repos/$REPO/git/refs" -f ref='refs/heads/develop' -f sha="$sha" >/dev/null
  fi
}

ensure_develop
protect_branch main
protect_branch develop

echo "✅ Branch protection aplicada em main e develop"
