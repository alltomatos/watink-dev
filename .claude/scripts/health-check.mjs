#!/usr/bin/env node

// Watink Platform Health Check — orchestrates stack verification and tenant security scan.
// 1. Stack verification (Docker containers, backend health, DB, RabbitMQ)
// 2. Tenant security scan (business/internal/controllers, business/internal/services)
// Exit 0 = all healthy, 1 = issues detected.

import { exec as execAsync } from 'child_process';
import { promises as fs } from 'fs';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const exec = promisify(execAsync);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Path Resolution ──

// Walk up from __dirname to find the repo root (directory with package.json).
// Works from both main checkout and git worktrees.
async function findRepoRoot() {
  let dir = __dirname;
  for (let i = 0; i < 10; i++) {
    try {
      await fs.access(path.join(dir, 'package.json'));
      return dir;
    } catch {}
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return path.resolve(__dirname, '..', '..');
}

// Use `git rev-parse --show-toplevel` to find the true git working directory.
// In a worktree, this returns the worktree root; in the main checkout, the repo root.
async function gitWorkDir() {
  const repoRoot = await findRepoRoot();
  try {
    const { stdout } = await exec('git rev-parse --show-toplevel', {
      cwd: repoRoot,
      timeout: 5000,
    });
    return stdout.trim();
  } catch {
    return repoRoot;
  }
}

// Resolve a skill script.
// When running in a worktree, prefer the main repo's copy of .claude/skills/
// because worktree copies may be stale or incomplete.
async function findScript(workDir, ...segments) {
  const localCandidate = path.join(workDir, '.claude', 'skills', ...segments);
  let mainRepoCandidate = null;

  // If workDir is a worktree, find the main repo root and prefer it
  try {
    const gitPath = path.join(workDir, '.git');
    const gitStat = await fs.stat(gitPath);
    if (gitStat.isFile()) {
      const content = await fs.readFile(gitPath, 'utf8');
      const match = content.match(/gitdir:\s*(.+)/);
      if (match) {
        const gitDir = match[1].trim();
        let dir = gitDir;
        while (dir !== path.dirname(dir)) {
          try {
            const mainGit = path.join(dir, '.git');
            const stat = await fs.stat(mainGit);
            if (stat.isDirectory()) {
              mainRepoCandidate = path.join(dir, '.claude', 'skills', ...segments);
              break;
            }
          } catch {}
          dir = path.dirname(dir);
        }
      }
    }
  } catch {}

  // Prefer main repo (more up-to-date), then fall back to local
  const candidates = mainRepoCandidate
    ? [mainRepoCandidate, localCandidate]
    : [localCandidate];

  for (const candidate of candidates) {
    try { await fs.access(candidate); return candidate; } catch {}
  }
  return null;
}

// ── Shell Execution ──

async function runScript(scriptPath, args = [], cwd) {
  try {
    const { stdout, stderr } = await exec(
      `node "${scriptPath}" ${args.join(' ')}`,
      { cwd, timeout: 90000, env: process.env }
    );
    return { ok: true, stdout: stdout.trim(), stderr: stderr.trim(), code: 0 };
  } catch (err) {
    // exec throws on non-zero exit; stdout/stderr may still have useful output
    return {
      ok: false,
      stdout: (err.stdout || '').trim(),
      stderr: (err.stderr || '').trim(),
      code: err.code || 1,
    };
  }
}

// ── Check 1: Stack Verification ──

async function checkStack(workDir) {
  console.log('\n━━━ 1. Stack Verification ━━━');
  console.log('Checking Docker containers, backend health, database, and RabbitMQ...\n');

  const driverPath = await findScript(workDir, 'run-watink', 'driver.mjs');
  if (!driverPath) {
    console.log('  ✗ driver.mjs not found — skipping stack verification');
    return { name: 'Stack Verification', passed: false, code: 1, skipped: true };
  }

  const result = await runScript(driverPath, ['verify-stack'], workDir);

  if (result.stdout) console.log(result.stdout);
  if (result.stderr && !result.ok) console.log(result.stderr);

  const passed = result.ok;
  console.log(passed ? '\n  ✓ Stack verification PASSED' : '\n  ✗ Stack verification FAILED');

  return { name: 'Stack Verification', passed, code: result.code };
}

// ── Check 2: Tenant Security Scan ──

async function checkTenantSecurity(workDir) {
  console.log('\n━━━ 2. Tenant Security Scan ━━━');
  console.log('Scanning business/internal/controllers and business/internal/services...\n');

  const guardPath = await findScript(workDir, 'tenant-guard', 'tenant-guard.mjs');
  if (!guardPath) {
    console.log('  ✗ tenant-guard.mjs not found — skipping tenant security scan');
    return { name: 'Tenant Security Scan', passed: false, code: 1, skipped: true };
  }

  const result = await runScript(guardPath, [], workDir);

  if (result.stdout) console.log(result.stdout);
  if (result.stderr && !result.ok) console.log(result.stderr);

  const passed = result.ok;
  console.log(passed ? '\n  ✓ Tenant security scan PASSED' : '\n  ✗ Tenant security scan FAILED');

  return { name: 'Tenant Security Scan', passed, code: result.code };
}

// ── Main ──

async function main() {
  console.log('╔══════════════════════════════════════════╗');
  console.log('║     Watink Platform Health Check         ║');
  console.log('╚══════════════════════════════════════════╝');

  const workDir = await gitWorkDir();
  const checks = [];

  // Sequential execution: stack first, then tenant guard
  checks.push(await checkStack(workDir));
  checks.push(await checkTenantSecurity(workDir));

  // ── Summary ──

  const failures = checks.filter(c => !c.passed);

  console.log('\n━━━ Summary ━━━');
  for (const check of checks) {
    const icon = check.passed ? '✓' : '✗';
    const note = check.skipped ? ' (skipped — script not found)' : '';
    console.log(`  ${icon} ${check.name}${note}`);
  }

  if (failures.length === 0) {
    console.log('\n✅ All checks PASSED — platform healthy\n');
    process.exitCode = 0;
  } else {
    console.log(`\n❌ ${failures.length} check(s) FAILED — action required\n`);
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error('Fatal error:', err.message);
    process.exit(1);
  });
}
