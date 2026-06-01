#!/usr/bin/env node
// devops-ops.mjs — Watink DevOps automation skill
// Handles: auto-commit, smart-commit, create-repo, branch, push, pr, release,
//          promote, ci-status, ci-logs, docker-ps, docker-logs, stack-health,
//          branch-protection

import { execSync, exec as execCb } from "node:child_process";
import { promises as fs } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const exec = promisify(execCb);
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "../../..");

// ─── Constants ────────────────────────────────────────────────────────────────

const CONVENTIONAL_TYPES = ["feat", "fix", "chore", "docs", "hardening", "refactor", "test", "ci"];
const BRANCH_PREFIXES = ["feature", "release", "hotfix", "feat", "fix", "chore", "docs", "hardening", "robot", "groud", "tinker", "refactor", "test", "ci"];
const SECRET_PATTERNS = [/\.env($|\.)/i, /\.key$/i, /\.pem$/i, /credentials/i, /\.p12$/i, /\.jks$/i];
const FORBIDDEN_BRANCHES = ["main", "master", "develop"];
const PROTECTED_BRANCHES = ["main", "master", "develop"];
const MAIN_BRANCH = "main";
const DEVELOP_BRANCH = "develop";
const FLOW_PREFIXES = {
  feature: "feature/",
  release: "release/",
  hotfix: "hotfix/",
};
const CO_AUTHOR = "Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function run(cmd, opts = {}) {
  const defaultOpts = { cwd: ROOT, encoding: "utf-8", stdio: "pipe" };
  try {
    return execSync(cmd, { ...defaultOpts, ...opts });
  } catch (err) {
    if (opts.allowFail) return err.stdout || "";
    throw err;
  }
}

function runAsync(cmd, opts = {}) {
  return exec(cmd, { cwd: ROOT, encoding: "utf-8", ...opts });
}

function log(msg) {
  console.log(msg);
}

function logErr(msg) {
  console.error(`❌ ${msg}`);
}

function logOk(msg) {
  console.log(`✅ ${msg}`);
}

function logInfo(msg) {
  console.log(`ℹ️  ${msg}`);
}

function logWarn(msg) {
  console.warn(`⚠️  ${msg}`);
}

function getCurrentBranch() {
  return run("git rev-parse --abbrev-ref HEAD").trim();
}

function getRepoSlug() {
  const remote = run("git remote get-url origin").trim();
  const match = remote.match(/[:/]([^/]+\/[^/]+?)(?:\.git)?$/);
  return match ? match[1] : null;
}

function hasStagedChanges() {
  const out = run("git diff --cached --name-only").trim();
  return out.length > 0;
}

function hasUnstagedChanges() {
  const out = run("git diff --name-only").trim();
  return out.length > 0;
}

function hasUntrackedFiles() {
  const out = run("git ls-files --others --exclude-standard").trim();
  return out.length > 0;
}

// ─── GitFlow Branch Resolution ────────────────────────────────────────────────

function resolveFlowType(branch) {
  if (branch.startsWith(FLOW_PREFIXES.feature)) return "feature";
  if (branch.startsWith(FLOW_PREFIXES.release)) return "release";
  if (branch.startsWith(FLOW_PREFIXES.hotfix)) return "hotfix";
  if (branch === DEVELOP_BRANCH) return "develop";
  if (branch === MAIN_BRANCH || branch === "master") return "main";
  // Legacy prefixes map to feature flow
  const legacyFeature = ["feat", "fix", "chore", "docs", "hardening", "robot", "groud", "tinker", "refactor", "test", "ci"];
  const prefix = branch.split("/")[0];
  if (legacyFeature.includes(prefix)) return "feature";
  return "unknown";
}

function resolveMergeTarget(branch) {
  const flowType = resolveFlowType(branch);
  switch (flowType) {
    case "feature": return DEVELOP_BRANCH;
    case "release": return MAIN_BRANCH;
    case "hotfix": return MAIN_BRANCH;
    default: return DEVELOP_BRANCH;
  }
}

function resolvePrBase(branch) {
  // PR target depends on flow type:
  // feature → develop, release → main (release PR), hotfix → main (hotfix PR)
  // But we also open a back-merge PR to develop for release/hotfix
  const flowType = resolveFlowType(branch);
  switch (flowType) {
    case "feature": return DEVELOP_BRANCH;
    case "release": return MAIN_BRANCH;
    case "hotfix": return MAIN_BRANCH;
    default: return DEVELOP_BRANCH;
  }
}

function validateFlowBranch(branch, expectedType) {
  const actual = resolveFlowType(branch);
  if (actual !== expectedType) {
    logErr(`Expected ${expectedType} branch, but current branch '${branch}' is type '${actual}'.`);
    process.exitCode = 1;
    return false;
  }
  return true;
}

function branchExists(branch) {
  const local = run(`git branch --list ${branch}`).trim();
  if (local) return true;
  const remote = run(`git branch -r --list origin/${branch}`, { allowFail: true }).trim();
  return !!remote;
}

function ensureBranchExists(branch) {
  if (!branchExists(branch)) {
    logErr(`Required branch '${branch}' does not exist. Run 'flow init' first.`);
    process.exitCode = 1;
    return false;
  }
  return true;
}

// ─── GitFlow Diagram ──────────────────────────────────────────────────────────

function flowDiagram() {
  const current = getCurrentBranch();
  const flowType = resolveFlowType(current);

  const lines = [
    "",
    "  ───────────────── GitFlow Status ─────────────────",
    "",
    `  main      ○─────●─────●─────●─────●  (production)`,
    `                \\                     /`,
    `  develop    ○───●─────●─────●───●───●  (integration)`,
    `                  \\       /     \\`,
    `  feature       ●───●───●      ●───●  (current work)`,
    `  release             ●──────●`,
    `  hotfix     ●───────────────────●`,
    "",
  ];

  const marker = {
    main: "  ▲ you are here (main)",
    develop: "                              ▲ you are here (develop)",
    feature: "          ▲ you are here",
    release: "                          ▲ you are here",
    hotfix: "            ▲ you are here",
    unknown: "",
  };

  if (marker[flowType]) lines.push(marker[flowType]);
  lines.push("");
  lines.push(`  Current: ${current}  (${flowType})`);
  lines.push(`  Merge target: ${resolveMergeTarget(current)}`);
  lines.push("");

  return lines.join("\n");
}

// ─── Secret Detection ─────────────────────────────────────────────────────────

function scanForSecrets(files) {
  const flagged = files.filter((f) => SECRET_PATTERNS.some((p) => p.test(f)));
  return flagged;
}

// ─── Commit Message Generation ────────────────────────────────────────────────

function classifyType(diff, stats) {
  const lower = diff.toLowerCase();
  if (/\bsecurity\b|\bvulnerability\b|\bhardening\b/i.test(lower)) return "hardening";
  if (/\bbug\b|\bfix\b|\bpatch\b|\bresolve\b/i.test(lower)) return "fix";
  if (/\.md$|\.txt$|README|CHANGELOG|CLAUDE\.md/i.test(stats)) return "docs";
  if (/package\.json|go\.mod|go\.sum|package-lock\.json/i.test(stats)) return "chore";
  if (/\btest\b|_test\.go|\.test\.|spec\./i.test(stats)) return "test";
  if (/\brefactor\b|\brename\b|\bmove\b|\bextract\b/i.test(lower)) return "refactor";
  if (/\.github\/workflows|\.yml$|\.yaml$|Dockerfile|docker-compose/i.test(stats)) return "ci";
  if (/\badd\b|\bnew\b|\bcreate\b|\bimplement\b|\bfeature\b/i.test(lower)) return "feat";
  return "chore";
}

function classifyScope(files) {
  const scopes = new Set();
  for (const f of files) {
    const top = f.split("/")[0];
    if (["business", "engine-go", "frontend", "plugin-manager", "marketplace-hub", "packages", "legacy"].includes(top)) {
      scopes.add(top);
    } else if (f.startsWith(".github")) {
      scopes.add("ci");
    } else if (f.startsWith("scripts") || f.startsWith("deploy")) {
      scopes.add("infra");
    } else if (f.startsWith(".claude")) {
      scopes.add("claude");
    }
  }
  if (scopes.size === 0) return "root";
  if (scopes.size === 1) return [...scopes][0];
  return [...scopes].sort().join(",");
}

function generateCommitMessage(dryRun = false) {
  if (!hasStagedChanges()) {
    logErr("No staged changes. Stage files with `git add` first.");
    return null;
  }

  const files = run("git diff --cached --name-only").trim().split("\n").filter(Boolean);
  const stats = run("git diff --cached --stat").trim();
  const diff = run("git diff --cached", { maxBuffer: 5 * 1024 * 1024 });

  // Secret scan
  const secrets = scanForSecrets(files);
  if (secrets.length > 0) {
    logErr(`Secret/credential files detected — refusing to commit:`);
    secrets.forEach((f) => logErr(`  • ${f}`));
    return null;
  }

  // Dirty tree warning
  if (hasUnstagedChanges() || hasUntrackedFiles()) {
    logWarn("Working tree has unstaged or untracked changes alongside staged ones.");
  }

  const type = classifyType(diff, stats);
  const scope = classifyScope(files);

  // Build subject from first meaningful change
  const subject = buildSubject(diff, type, files);
  const body = buildBody(files, stats, diff);

  const msg = `${type}(${scope}): ${subject}\n\n${body}\n\n${CO_AUTHOR}`;

  if (dryRun) {
    logInfo("Dry-run — would commit with message:");
    log("---");
    log(msg);
    log("---");
    return null;
  }

  return msg;
}

function buildSubject(diff, type, files) {
  // Try to extract a short description from the diff
  const lines = diff.split("\n").slice(0, 100);
  const addedLines = lines.filter((l) => l.startsWith("+") && !l.startsWith("+++")).map((l) => l.slice(1).trim());

  // Look for function names or meaningful additions
  const funcMatch = addedLines.find((l) => /^(func|def|function|const|export|class)\s/i.test(l));
  if (funcMatch) {
    const cleaned = funcMatch.replace(/^(func|def|function|const|export|class)\s+/i, "").slice(0, 60);
    return cleaned;
  }

  // Fall back to file list summary
  if (files.length === 1) {
    const base = files[0].split("/").pop();
    return `update ${base}`;
  }
  if (files.length <= 3) {
    return files.map((f) => f.split("/").pop()).join(", ").slice(0, 60);
  }
  return `${files.length} files changed`;
}

function buildBody(files, stats, diff) {
  const bullets = [];

  // Group by directory
  const grouped = {};
  for (const f of files) {
    const dir = f.includes("/") ? f.split("/").slice(0, -1).join("/") : ".";
    if (!grouped[dir]) grouped[dir] = [];
    grouped[dir].push(f.split("/").pop());
  }

  for (const [dir, filenames] of Object.entries(grouped)) {
    const label = dir === "." ? "root" : dir;
    if (filenames.length <= 3) {
      bullets.push(`- ${label}: ${filenames.join(", ")}`);
    } else {
      bullets.push(`- ${label}: ${filenames.slice(0, 3).join(", ")} +${filenames.length - 3} more`);
    }
  }

  return bullets.join("\n");
}

async function cmdFeature(args) {
  const [action, name] = args;
  if (!action || !["start", "finish", "merge", "abort"].includes(action)) {
    logErr("Usage: devops-ops.mjs feature <start|finish|merge|abort> <name>");
    process.exitCode = 1;
    return;
  }

  const branchName = name ? (name.startsWith(FLOW_PREFIXES.feature) ? name : `${FLOW_PREFIXES.feature}${name}`) : null;

  switch (action) {
    case "start":
      if (!name) { logErr("Feature name required."); process.exitCode = 1; return; }
      ensureBranchExists(DEVELOP_BRANCH);
      run(`git checkout ${DEVELOP_BRANCH}`);
      run(`git checkout -b ${branchName}`);
      logOk(`Feature branch '${branchName}' started from ${DEVELOP_BRANCH}`);
      break;

    case "finish":
    case "merge":
      const current = branchName || getCurrentBranch();
      if (!validateFlowBranch(current, "feature")) return;
      ensureBranchExists(DEVELOP_BRANCH);
      logInfo(`Merging ${current} into ${DEVELOP_BRANCH}...`);
      run(`git checkout ${DEVELOP_BRANCH}`);
      run(`git merge --no-ff ${current}`);
      logOk(`Merged ${current} into ${DEVELOP_BRANCH}`);
      if (action === "finish") {
        run(`git branch -d ${current}`, { allowFail: true });
        logOk(`Deleted branch ${current}`);
      }
      break;

    case "abort":
      const toAbort = branchName || getCurrentBranch();
      if (!validateFlowBranch(toAbort, "feature")) return;
      run(`git checkout ${DEVELOP_BRANCH}`);
      run(`git branch -D ${toAbort}`);
      logOk(`Aborted and deleted feature branch ${toAbort}`);
      break;
  }
}

async function cmdReleaseFlow(args) {
  const [action, version] = args;
  if (!action || !["start", "finish", "merge", "abort"].includes(action)) {
    logErr("Usage: devops-ops.mjs release <start|finish|merge|abort> <version>");
    process.exitCode = 1;
    return;
  }

  const branchName = version ? (version.startsWith(FLOW_PREFIXES.release) ? version : `${FLOW_PREFIXES.release}${version}`) : null;

  switch (action) {
    case "start":
      if (!version) { logErr("Release version required."); process.exitCode = 1; return; }
      ensureBranchExists(DEVELOP_BRANCH);
      run(`git checkout ${DEVELOP_BRANCH}`);
      run(`git checkout -b ${branchName}`);
      logOk(`Release branch '${branchName}' started from ${DEVELOP_BRANCH}`);
      break;

    case "finish":
    case "merge":
      const current = branchName || getCurrentBranch();
      if (!validateFlowBranch(current, "release")) return;
      ensureBranchExists(MAIN_BRANCH);
      ensureBranchExists(DEVELOP_BRANCH);

      // Merge to main
      logInfo(`Merging ${current} into ${MAIN_BRANCH}...`);
      run(`git checkout ${MAIN_BRANCH}`);
      run(`git merge --no-ff ${current}`);

      // Tag
      const ver = current.replace(FLOW_PREFIXES.release, "");
      run(`git tag -a ${ver} -m "Release ${ver}"`);
      logOk(`Merged into ${MAIN_BRANCH} and tagged ${ver}`);

      // Back-merge to develop
      logInfo(`Back-merging ${current} into ${DEVELOP_BRANCH}...`);
      run(`git checkout ${DEVELOP_BRANCH}`);
      run(`git merge --no-ff ${current}`);
      logOk(`Back-merged into ${DEVELOP_BRANCH}`);

      if (action === "finish") {
        run(`git branch -d ${current}`, { allowFail: true });
        logOk(`Deleted branch ${current}`);
      }
      break;

    case "abort":
      const toAbort = branchName || getCurrentBranch();
      if (!validateFlowBranch(toAbort, "release")) return;
      run(`git checkout ${DEVELOP_BRANCH}`);
      run(`git branch -D ${toAbort}`);
      logOk(`Aborted and deleted release branch ${toAbort}`);
      break;
  }
}

async function cmdHotfixFlow(args) {
  const [action, name, version] = args;
  if (!action || !["start", "finish", "merge", "abort"].includes(action)) {
    logErr("Usage: devops-ops.mjs hotfix <start|finish|merge|abort> <name> [version]");
    process.exitCode = 1;
    return;
  }

  const branchName = name ? (name.startsWith(FLOW_PREFIXES.hotfix) ? name : `${FLOW_PREFIXES.hotfix}${name}`) : null;

  switch (action) {
    case "start":
      if (!name) { logErr("Hotfix name required."); process.exitCode = 1; return; }
      ensureBranchExists(MAIN_BRANCH);
      run(`git checkout ${MAIN_BRANCH}`);
      run(`git checkout -b ${branchName}`);
      logOk(`Hotfix branch '${branchName}' started from ${MAIN_BRANCH}`);
      break;

    case "finish":
    case "merge":
      const current = branchName || getCurrentBranch();
      if (!validateFlowBranch(current, "hotfix")) return;
      ensureBranchExists(MAIN_BRANCH);
      ensureBranchExists(DEVELOP_BRANCH);

      // Merge to main
      logInfo(`Merging ${current} into ${MAIN_BRANCH}...`);
      run(`git checkout ${MAIN_BRANCH}`);
      run(`git merge --no-ff ${current}`);

      // Tag if version provided
      const tagVer = version || current.replace(FLOW_PREFIXES.hotfix, "");
      run(`git tag -a ${tagVer} -m "Hotfix ${tagVer}"`);
      logOk(`Merged into ${MAIN_BRANCH} and tagged ${tagVer}`);

      // Back-merge to develop
      logInfo(`Back-merging ${current} into ${DEVELOP_BRANCH}...`);
      run(`git checkout ${DEVELOP_BRANCH}`);
      run(`git merge --no-ff ${current}`);
      logOk(`Back-merged into ${DEVELOP_BRANCH}`);

      if (action === "finish") {
        run(`git branch -d ${current}`, { allowFail: true });
        logOk(`Deleted branch ${current}`);
      }
      break;

    case "abort":
      const toAbort = branchName || getCurrentBranch();
      if (!validateFlowBranch(toAbort, "hotfix")) return;
      run(`git checkout ${MAIN_BRANCH}`);
      run(`git branch -D ${toAbort}`);
      logOk(`Aborted and deleted hotfix branch ${toAbort}`);
      break;
  }
}

async function cmdFlowInit(args) {
  logInfo("Initializing GitFlow...");

  if (!branchExists(MAIN_BRANCH)) {
    run(`git checkout -b ${MAIN_BRANCH}`);
    logOk(`Created ${MAIN_BRANCH}`);
  }

  if (!branchExists(DEVELOP_BRANCH)) {
    run(`git checkout ${MAIN_BRANCH}`);
    run(`git checkout -b ${DEVELOP_BRANCH}`);
    logOk(`Created ${DEVELOP_BRANCH}`);
  }

  run(`git checkout ${DEVELOP_BRANCH}`);
  logOk("GitFlow initialized. You are on 'develop'.");
}

async function cmdAutoCommit(args) {
  const dryRun = args.includes("--dry-run");
  const branch = getCurrentBranch();

  if (FORBIDDEN_BRANCHES.includes(branch)) {
    logErr(`Direct commits to '${branch}' are forbidden. Create a feature branch first.`);
    process.exitCode = 1;
    return;
  }

  const msg = generateCommitMessage(dryRun);
  if (!msg) {
    if (!dryRun) process.exitCode = 1;
    return;
  }

  run(`git commit -m "${msg.replace(/"/g, '\\"').replace(/\$/g, "\\$")}"`);
  logOk(`Committed on ${branch}`);

  // Push
  const upstream = run("git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || echo ''").trim();
  if (upstream) {
    run("git push");
    logOk("Pushed to origin");
  } else {
    run(`git push -u origin ${branch}`);
    logOk(`Pushed to origin (set upstream: ${branch})`);
  }
}

async function cmdSmartCommit(args) {
  await cmdAutoCommit(args);
  if (process.exitCode) return;
  await cmdPr(args.filter((a) => a !== "--dry-run"));
}

async function cmdCreateRepo(args) {
  // Parse args
  let name = null;
  let org = null;
  let isPrivate = false;
  let description = "";
  let template = "";

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--private") isPrivate = true;
    else if (a.startsWith("--org=")) org = a.split("=")[1];
    else if (a.startsWith("--description=")) description = a.split("=").slice(1).join("=");
    else if (a.startsWith("--template=")) template = a.split("=")[1];
    else if (!a.startsWith("-")) name = a;
  }

  if (!name) {
    logErr("Usage: devops-ops.mjs create-repo <name> [--private] [--org=X] [--description=X] [--template=X]");
    process.exitCode = 1;
    return;
  }

  const visibility = isPrivate ? "private" : "public";
  const fullName = org ? `${org}/${name}` : name;

  let cmd = `gh repo create ${fullName} --${visibility}`;
  if (description) cmd += ` --description "${description}"`;
  if (template) cmd += ` --template ${template}`;

  logInfo(`Creating ${visibility} repo: ${fullName}`);
  const result = run(cmd, { allowFail: true });
  if (!result) {
    logErr("Failed to create repository.");
    process.exitCode = 1;
    return;
  }

  logOk(`Repository created: ${fullName}`);

  // Clone
  const cloneUrl = `https://github.com/${fullName}.git`;
  const localPath = join(ROOT, name);
  logInfo(`Cloning to ${localPath}...`);
  run(`git clone ${cloneUrl} ${localPath}`, { allowFail: true });
  logOk("Cloned locally");

  // Set up branch protection if we have push access
  logInfo("Setting up branch protection...");
  try {
    run(`gh api repos/${fullName}/branches/main/protection `
      + `--method PUT `
      + `-f "required_status_checks[strict]=true" `
      + `-f "required_status_checks[contexts][]=[]" `
      + `-f "enforce_admins=true" `
      + `-f "required_pull_request_reviews[dismiss_stale_reviews]=true" `
      + `-f "required_pull_request_reviews[require_code_owner_reviews]=false" `
      + `-f "restrictions=null" `, { allowFail: true });
    logOk("Branch protection applied to main");
  } catch {
    logWarn("Could not apply branch protection (may need admin access)");
  }

  // Create develop branch
  try {
    run(`git -C ${localPath} checkout -b develop`);
    run(`git -C ${localPath} push -u origin develop`);
    logOk("Created 'develop' branch");
  } catch {
    logWarn("Could not create 'develop' branch");
  }
}

async function cmdBranch(args) {
  const branchName = args[0];
  if (!branchName) {
    logErr("Usage: devops-ops.mjs branch <type>/<name>  (e.g., feat/my-feature)");
    process.exitCode = 1;
    return;
  }

  const prefix = branchName.split("/")[0];
  if (!BRANCH_PREFIXES.includes(prefix)) {
    logErr(`Invalid branch prefix '${prefix}'. Allowed: ${BRANCH_PREFIXES.join(", ")}`);
    process.exitCode = 1;
    return;
  }

  const flowType = resolveFlowType(branchName);
  const base = flowType === "hotfix" ? MAIN_BRANCH : DEVELOP_BRANCH;
  if (!ensureBranchExists(base)) return;

  run(`git checkout ${base}`);
  logInfo(`Starting ${flowType} branch from ${base}`);
  run(`git checkout -b ${branchName}`);
  logOk(`Branch created: ${branchName}`);
}

async function cmdPush(args) {
  const branch = getCurrentBranch();
  const upstream = run("git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null || echo ''").trim();

  if (upstream) {
    run("git push");
    logOk(`Pushed ${branch} to origin`);
  } else {
    run(`git push -u origin ${branch}`);
    logOk(`Pushed ${branch} to origin (new upstream)`);
  }
}

async function cmdPr(args) {
  const branch = getCurrentBranch();

  if (FORBIDDEN_BRANCHES.includes(branch)) {
    logErr("Cannot create PR from protected branch. Switch to a feature branch.");
    process.exitCode = 1;
    return;
  }

  // Determine GitFlow PR target
  let base = resolvePrBase(branch);
  let title = args.find((a) => !a.startsWith("-")) || "";
  let isDraft = args.includes("--draft");
  let reviewer = "";

  for (const a of args) {
    if (a.startsWith("--base=")) base = a.split("=")[1];
    if (a.startsWith("--reviewer=")) reviewer = a.split("=")[1];
  }

  // Auto-generate title from branch name if not provided
  if (!title) {
    title = branch.replace(/^[^/]+\//, "").replace(/[-_]/g, " ");
    title = title.charAt(0).toUpperCase() + title.slice(1);
  }

  // Build PR body
  const mergeBase = run(`git merge-base ${base} HEAD`).trim();
  const commits = run(`git log ${mergeBase}..HEAD --oneline`).trim();
  const diffStat = run(`git diff ${mergeBase}...HEAD --stat`).trim();
  const files = run(`git diff ${mergeBase}...HEAD --name-only`).trim().split("\n").filter(Boolean);

  // Risk assessment
  let risk = "low";
  if (files.some((f) => /migration|\.sql$|schema/i.test(f))) risk = "high";
  else if (files.some((f) => /auth|jwt|rls|security|middleware/i.test(f))) risk = "medium";
  else if (files.length > 20) risk = "medium";

  const body = [
    `## Technical Summary`,
    ``,
    commits || "No commits found.",
    ``,
    `## Files Changed (${files.length})`,
    ``,
    diffStat || "No changes.",
    ``,
    `## Risk Assessment: ${risk.toUpperCase()}`,
    ``,
    risk === "high" ? "⚠️ Contains database migrations or schema changes — review carefully." : risk === "medium" ? "Moderate risk — security-related or large change set." : "Low risk — standard changes.",
    ``,
    `## Test Evidence`,
    ``,
    `_To be filled by reviewer/author._`,
    ``,
    `## Rollback Plan`,
    ``,
    risk === "high" ? "Revert commit + run reverse migration." : "Revert commit.",
    ``,
    `---`,
    `🤖 Generated with [Claude Code](https://claude.com/claude-code)`,
  ].join("\n");

  // Create PR
  let cmd = `gh pr create --base ${base} --title "${title}" --body "${body.replace(/"/g, '\\"')}"`;
  if (isDraft) cmd += " --draft";
  if (reviewer) cmd += ` --reviewer ${reviewer}`;

  const result = run(cmd, { allowFail: true });
  if (result) {
    logOk(`PR created: ${result.trim()}`);
  } else {
    logErr("Failed to create PR. Ensure branch has commits ahead of base.");
    process.exitCode = 1;
  }
}

async function cmdRelease(args) {
  const version = args[0];
  if (!version) {
    logErr("Usage: devops-ops.mjs release <version>  (e.g., v1.2.0)");
    process.exitCode = 1;
    return;
  }

  const slug = getRepoSlug();
  if (!slug) {
    logErr("Cannot determine repo slug from remote.");
    process.exitCode = 1;
    return;
  }

  logInfo(`Creating release ${version}...`);

  // Tag
  run(`git tag -a ${version} -m "Release ${version}"`);
  run(`git push origin ${version}`);
  logOk(`Tag ${version} pushed`);

  // Trigger release workflow
  logInfo("Triggering release workflow...");
  const isPrerelease = version.includes("-") || version.includes("rc") || version.includes("beta");
  const cmd = `gh workflow run release-business-binaries.yml `
    + `-f version=${version} `
    + `-f prerelease=${isPrerelease} `
    + `-f environment_name=production`;
  run(cmd, { allowFail: true });
  logOk("Release workflow triggered");

  // Monitor
  logInfo("Monitoring CI... (check with: devops-ops.mjs ci-status)");
}

async function cmdPromote(args) {
  const [source, target] = args;
  if (!source || !target) {
    logErr("Usage: devops-ops.mjs promote <source-tag> <target-tag>  (e.g., v1.2.0-rc1 v1.2.0)");
    process.exitCode = 1;
    return;
  }

  const isPrerelease = args.includes("--prerelease");
  const notes = args.find((a) => a.startsWith("--notes="))?.split("=").slice(1).join("=") || "";

  logInfo(`Promoting ${source} → ${target}...`);
  const cmd = `gh workflow run promote-business-release.yml `
    + `-f source_tag=${source} `
    + `-f target_tag=${target} `
    + `-f prerelease=${isPrerelease} `
    + `-f notes="${notes}"`;
  run(cmd, { allowFail: true });
  logOk("Promotion workflow triggered");
}

async function cmdCiStatus(args) {
  const slug = getRepoSlug();
  if (!slug) {
    logErr("Cannot determine repo slug.");
    process.exitCode = 1;
    return;
  }

  const branch = getCurrentBranch();
  logInfo(`CI status for ${branch}...`);

  const result = run(`gh pr checks ${branch} 2>/dev/null || gh run list --branch ${branch} --limit 5`, { allowFail: true });
  log(result || "No CI runs found for this branch.");
}

async function cmdCiLogs(args) {
  const runId = args[0];

  if (runId) {
    logInfo(`Fetching logs for run ${runId}...`);
    const result = run(`gh run view ${runId} --log`, { allowFail: true });
    log(result || "No logs available.");
  } else {
    const slug = getRepoSlug();
    const branch = getCurrentBranch();
    logInfo(`Fetching latest run for ${branch}...`);
    const latestRun = run(`gh run list --branch ${branch} --limit 1 --json databaseId --jq '.[0].databaseId'`, { allowFail: true }).trim();
    if (latestRun) {
      const result = run(`gh run view ${latestRun} --log`, { allowFail: true });
      log(result || "No logs available.");
    } else {
      logErr("No CI runs found for this branch.");
      process.exitCode = 1;
    }
  }
}

async function cmdDockerPs() {
  const composeFile = join(ROOT, "docker-compose.dev.yml");
  try {
    await fs.access(composeFile);
    const result = run(`docker compose -f ${composeFile} ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"`);
    log(result);
  } catch {
    logErr("docker-compose.dev.yml not found or Docker not running.");
    process.exitCode = 1;
  }
}

async function cmdDockerLogs(args) {
  const service = args[0];
  if (!service) {
    logErr("Usage: devops-ops.mjs docker-logs <service>  (e.g., watink-business, engine-go, watink-rabbitmq)");
    process.exitCode = 1;
    return;
  }

  const composeFile = join(ROOT, "docker-compose.dev.yml");
  run(`docker compose -f ${composeFile} logs --tail=100 ${service}`, { stdio: "inherit" });
}

async function cmdStackHealth() {
  const driverPath = join(ROOT, ".claude/skills/run-watink/driver.mjs");
  try {
    await fs.access(driverPath);
    logInfo("Running full stack health check...");
    run(`node ${driverPath} verify-stack`, { stdio: "inherit" });
  } catch {
    logErr("run-watink/driver.mjs not found. Ensure the skill is installed.");
    process.exitCode = 1;
  }
}

async function cmdBranchProtection() {
  const scriptPath = join(ROOT, "scripts/setup-branch-protection.sh");
  try {
    await fs.access(scriptPath);
    logInfo("Applying branch protection rules...");
    run(`bash ${scriptPath}`, { stdio: "inherit" });
    logOk("Branch protection applied");
  } catch {
    logErr("scripts/setup-branch-protection.sh not found.");
    process.exitCode = 1;
  }
}

// ─── CLI Dispatch ─────────────────────────────────────────────────────────────

const COMMANDS = {
  "auto-commit": cmdAutoCommit,
  "smart-commit": cmdSmartCommit,
  "create-repo": cmdCreateRepo,
  branch: cmdBranch,
  push: cmdPush,
  pr: cmdPr,
  release: cmdReleaseFlow,
  promote: cmdPromote,
  "ci-status": cmdCiStatus,
  "ci-logs": cmdCiLogs,
  "docker-ps": cmdDockerPs,
  "docker-logs": cmdDockerLogs,
  "stack-health": cmdStackHealth,
  "branch-protection": cmdBranchProtection,
  "flow-status": () => log(flowDiagram()),
  "flow-init": cmdFlowInit,
  feature: cmdFeature,
  hotfix: cmdHotfixFlow,
};

async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  if (!command || command === "--help" || command === "help") {
    log("devops-ops.mjs — Watink DevOps Automation");
    log("");
    log("Commands:");
    for (const [name] of Object.entries(COMMANDS)) {
      log(`  ${name}`);
    }
    log("");
    log("Run: node devops-ops.mjs <command> [args...]");
    return;
  }

  const handler = COMMANDS[command];
  if (!handler) {
    logErr(`Unknown command: ${command}`);
    log(`Available: ${Object.keys(COMMANDS).join(", ")}`);
    process.exitCode = 1;
    return;
  }

  try {
    await handler(args);
  } catch (err) {
    logErr(`Command '${command}' failed: ${err.message}`);
    process.exitCode = 1;
  }
}

// Guard for testability — only run CLI when executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

// ─── Exports for Testing ──────────────────────────────────────────────────────

export {
  classifyType,
  classifyScope,
  scanForSecrets,
  generateCommitMessage,
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
};
