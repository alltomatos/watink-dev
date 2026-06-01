#!/usr/bin/env node
// devops-ops.test.mjs — Tests for DevOps automation skill (GitFlow)

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  classifyType,
  classifyScope,
  scanForSecrets,
  buildSubject,
  buildBody,
  resolveFlowType,
  resolveMergeTarget,
  resolvePrBase,
  CONVENTIONAL_TYPES,
  BRANCH_PREFIXES,
  SECRET_PATTERNS,
  FORBIDDEN_BRANCHES,
  PROTECTED_BRANCHES,
  FLOW_PREFIXES,
  MAIN_BRANCH,
  DEVELOP_BRANCH,
} from "./devops-ops.mjs";

// ─── GitFlow Branch Resolution ────────────────────────────────────────────────

describe("resolveFlowType", () => {
  it("identifies feature branches by canonical prefix", () => {
    assert.equal(resolveFlowType("feature/my-new-auth"), "feature");
    assert.equal(resolveFlowType("feature/123-add-webhook"), "feature");
  });

  it("identifies release branches", () => {
    assert.equal(resolveFlowType("release/1.2.0"), "release");
    assert.equal(resolveFlowType("release/v2.0.0-rc1"), "release");
  });

  it("identifies hotfix branches", () => {
    assert.equal(resolveFlowType("hotfix/fix-jwt-expiry"), "hotfix");
    assert.equal(resolveFlowType("hotfix/1.1.1"), "hotfix");
  });

  it("identifies develop branch", () => {
    assert.equal(resolveFlowType("develop"), "develop");
  });

  it("identifies main branch", () => {
    assert.equal(resolveFlowType("main"), "main");
  });

  it("identifies master branch as main", () => {
    assert.equal(resolveFlowType("master"), "main");
  });

  it("maps legacy prefixes to feature flow", () => {
    assert.equal(resolveFlowType("feat/add-sms"), "feature");
    assert.equal(resolveFlowType("fix/jwt-bug"), "feature");
    assert.equal(resolveFlowType("chore/deps-update"), "feature");
    assert.equal(resolveFlowType("hardening/xss-fix"), "feature");
    assert.equal(resolveFlowType("robot/auto-pr"), "feature");
    assert.equal(resolveFlowType("groud/db-index"), "feature");
    assert.equal(resolveFlowType("tinker/experiment"), "feature");
  });

  it("returns unknown for unrecognized branches", () => {
    assert.equal(resolveFlowType("some-random-branch"), "unknown");
    assert.equal(resolveFlowType("experiment/try-this"), "unknown");
  });
});

describe("resolveMergeTarget", () => {
  it("feature branches merge to develop", () => {
    assert.equal(resolveMergeTarget("feature/my-feature"), DEVELOP_BRANCH);
    assert.equal(resolveMergeTarget("feat/my-feature"), DEVELOP_BRANCH);
  });

  it("release branches merge to main", () => {
    assert.equal(resolveMergeTarget("release/1.2.0"), MAIN_BRANCH);
  });

  it("hotfix branches merge to main", () => {
    assert.equal(resolveMergeTarget("hotfix/fix-urgent"), MAIN_BRANCH);
  });

  it("unknown branches default to develop", () => {
    assert.equal(resolveMergeTarget("random-branch"), DEVELOP_BRANCH);
  });
});

describe("resolvePrBase", () => {
  it("feature PRs target develop", () => {
    assert.equal(resolvePrBase("feature/add-api"), DEVELOP_BRANCH);
  });

  it("release PRs target main", () => {
    assert.equal(resolvePrBase("release/2.0.0"), MAIN_BRANCH);
  });

  it("hotfix PRs target main", () => {
    assert.equal(resolvePrBase("hotfix/fix-crash"), MAIN_BRANCH);
  });

  it("legacy prefixes still target develop", () => {
    assert.equal(resolvePrBase("fix/quick-patch"), DEVELOP_BRANCH);
    assert.equal(resolvePrBase("chore/cleanup"), DEVELOP_BRANCH);
  });
});

// ─── GitFlow Constants ────────────────────────────────────────────────────────

describe("GitFlow Constants", () => {
  it("FLOW_PREFIXES has all three flow types", () => {
    assert.ok(FLOW_PREFIXES.feature);
    assert.ok(FLOW_PREFIXES.release);
    assert.ok(FLOW_PREFIXES.hotfix);
  });

  it("FLOW_PREFIXES values end with slash", () => {
    Object.values(FLOW_PREFIXES).forEach((v) => {
      assert.ok(v.endsWith("/"), `Prefix '${v}' should end with /`);
    });
  });

  it("MAIN_BRANCH is 'main'", () => {
    assert.equal(MAIN_BRANCH, "main");
  });

  it("DEVELOP_BRANCH is 'develop'", () => {
    assert.equal(DEVELOP_BRANCH, "develop");
  });

  it("PROTECTED_BRANCHES includes main, master, and develop", () => {
    assert.ok(PROTECTED_BRANCHES.includes("main"));
    assert.ok(PROTECTED_BRANCHES.includes("master"));
    assert.ok(PROTECTED_BRANCHES.includes("develop"));
  });

  it("FORBIDDEN_BRANCHES includes main, master, and develop", () => {
    assert.ok(FORBIDDEN_BRANCHES.includes("main"));
    assert.ok(FORBIDDEN_BRANCHES.includes("master"));
    assert.ok(FORBIDDEN_BRANCHES.includes("develop"));
  });

  it("BRANCH_PREFIXES includes GitFlow prefixes", () => {
    assert.ok(BRANCH_PREFIXES.includes("feature"));
    assert.ok(BRANCH_PREFIXES.includes("release"));
    assert.ok(BRANCH_PREFIXES.includes("hotfix"));
  });

  it("BRANCH_PREFIXES includes legacy prefixes", () => {
    ["feat", "fix", "chore", "docs", "hardening", "robot", "groud", "tinker"].forEach((p) => {
      assert.ok(BRANCH_PREFIXES.includes(p), `Missing legacy prefix: ${p}`);
    });
  });
});

// ─── classifyType ─────────────────────────────────────────────────────────────

describe("classifyType", () => {
  it("detects security/hardening changes", () => {
    const diff = "fix security vulnerability in JWT validation";
    const stats = "business/pkg/utils/jwt.go | 5 +-";
    assert.equal(classifyType(diff, stats), "hardening");
  });

  it("detects bug fixes", () => {
    const diff = "fix resolve bug in queue processing";
    const stats = "business/internal/controllers/queue.go | 3 +-";
    assert.equal(classifyType(diff, stats), "fix");
  });

  it("detects documentation changes", () => {
    const diff = "update README with new instructions";
    const stats = "README.md | 10 +-";
    assert.equal(classifyType(diff, stats), "docs");
  });

  it("detects dependency changes", () => {
    const diff = "update dependencies for performance";
    const stats = "business/go.mod | 2 +- business/go.sum | 8 +-";
    assert.equal(classifyType(diff, stats), "chore");
  });

  it("detects test changes", () => {
    const diff = "add new test cases for validation";
    const stats = "business/internal/services/event_bus_test.go | 20 +";
    assert.equal(classifyType(diff, stats), "test");
  });

  it("detects CI/infrastructure changes", () => {
    const diff = "update workflow configuration";
    const stats = ".github/workflows/build-frontend.yaml | 5 +-";
    assert.equal(classifyType(diff, stats), "ci");
  });

  it("defaults to chore for ambiguous changes", () => {
    const diff = "minor formatting adjustments";
    const stats = "somefile.go | 2 +-";
    assert.equal(classifyType(diff, stats), "chore");
  });

  it("detects new features", () => {
    const diff = "add new feature for batch message sending";
    const stats = "business/internal/services/batch.go | 50 +";
    assert.equal(classifyType(diff, stats), "feat");
  });
});

// ─── classifyScope ────────────────────────────────────────────────────────────

describe("classifyScope", () => {
  it("identifies business scope", () => {
    assert.equal(classifyScope(["business/cmd/server/main.go"]), "business");
  });

  it("identifies frontend scope", () => {
    assert.equal(classifyScope(["frontend/src/App.js"]), "frontend");
  });

  it("identifies engine scope", () => {
    assert.equal(classifyScope(["engine-go/internal/whatsapp/service.go"]), "engine-go");
  });

  it("identifies CI scope", () => {
    assert.equal(classifyScope([".github/workflows/build.yaml"]), "ci");
  });

  it("identifies infra scope", () => {
    assert.equal(classifyScope(["scripts/setup.sh", "deploy/docker-plugin.yml"]), "infra");
  });

  it("identifies claude scope", () => {
    assert.equal(classifyScope([".claude/skills/devops-ops/SKILL.md"]), "claude");
  });

  it("returns root for top-level files", () => {
    assert.equal(classifyScope(["package.json", "CLAUDE.md"]), "root");
  });

  it("joins multiple scopes", () => {
    const result = classifyScope(["business/main.go", "frontend/src/App.js"]);
    assert.ok(result.includes("business"));
    assert.ok(result.includes("frontend"));
  });
});

// ─── scanForSecrets ───────────────────────────────────────────────────────────

describe("scanForSecrets", () => {
  it("detects .env files", () => {
    assert.deepEqual(scanForSecrets([".env", ".env.production"]), [".env", ".env.production"]);
  });

  it("detects key files", () => {
    assert.deepEqual(scanForSecrets(["server.key", "ca.pem"]), ["server.key", "ca.pem"]);
  });

  it("detects credential files", () => {
    assert.deepEqual(scanForSecrets(["credentials.json"]), ["credentials.json"]);
  });

  it("passes clean files", () => {
    assert.deepEqual(scanForSecrets(["main.go", "package.json", "README.md"]), []);
  });
});

// ─── buildSubject ─────────────────────────────────────────────────────────────

describe("buildSubject", () => {
  it("extracts function name from Go diff", () => {
    const diff = "+func NewEventBus() *EventBus {";
    const result = buildSubject(diff, "feat", ["event_bus.go"]);
    assert.ok(result.includes("NewEventBus"));
  });

  it("shows single filename for single file", () => {
    const diff = "+some random change";
    const result = buildSubject(diff, "fix", ["controllers/queue.go"]);
    assert.ok(result.includes("queue.go"));
  });

  it("lists up to 3 filenames", () => {
    const diff = "+change";
    const result = buildSubject(diff, "chore", ["a.go", "b.go", "c.go"]);
    assert.ok(result.includes("a.go"));
    assert.ok(result.includes("b.go"));
    assert.ok(result.includes("c.go"));
  });

  it("summarizes large change sets", () => {
    const diff = "+change";
    const files = Array.from({ length: 10 }, (_, i) => `file${i}.go`);
    const result = buildSubject(diff, "feat", files);
    assert.ok(result.includes("10 files changed"));
  });
});

// ─── buildBody ────────────────────────────────────────────────────────────────

describe("buildBody", () => {
  it("groups files by directory", () => {
    const files = ["business/main.go", "business/util.go", "frontend/src/App.js"];
    const stats = "3 files changed";
    const diff = "";
    const result = buildBody(files, stats, diff);
    assert.ok(result.includes("business:"));
    assert.ok(result.includes("frontend/src:"));
  });

  it("truncates large directory listings", () => {
    const files = Array.from({ length: 6 }, (_, i) => `business/file${i}.go`);
    const stats = "6 files";
    const diff = "";
    const result = buildBody(files, stats, diff);
    assert.ok(result.includes("+3 more"));
  });
});

// ─── Legacy Constants ─────────────────────────────────────────────────────────

describe("Legacy Constants", () => {
  it("CONVENTIONAL_TYPES includes required types", () => {
    ["feat", "fix", "chore", "docs", "hardening"].forEach((t) => {
      assert.ok(CONVENTIONAL_TYPES.includes(t), `Missing type: ${t}`);
    });
  });

  it("SECRET_PATTERNS catches env files", () => {
    assert.ok(SECRET_PATTERNS.some((p) => p.test(".env")));
    assert.ok(SECRET_PATTERNS.some((p) => p.test(".env.local")));
  });
});
