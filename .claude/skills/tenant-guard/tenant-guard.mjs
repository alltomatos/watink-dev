#!/usr/bin/env node

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..', '..');

const TENANT_MODELS = [
  'Client', 'Contact', 'ConversationEmbedding', 'Deal', 'Flow', 'Group',
  'KnowledgeBase', 'KnowledgeBaseSource', 'Message', 'Pipeline', 'Protocol',
  'Queue', 'QuickAnswer', 'Setting', 'Tag', 'Ticket', 'TicketLog', 'User', 'Whatsapp',
];

function lineNumber(source, index) {
  return source.slice(0, index).split('\n').length;
}

function modelNameFromSnippet(snippet) {
  const match = snippet.match(/models\.([A-Za-z0-9_]+)/);
  return match?.[1] ?? 'unknown';
}

function hasTenantFilter(snippet) {
  return /tenantId|TenantID|tenant_id|current_tenant/i.test(snippet);
}

function hasDangerousMutation(snippet) {
  return /\.(Delete|Update|Updates|Save)\s*\(/.test(snippet) || /\.Exec\s*\(/.test(snippet);
}

function tenantModelRegex() {
  return new RegExp(`models\\.(${TENANT_MODELS.join('|')})\\b`);
}

export function analyzeSource(filePath, source) {
  const findings = [];
  const modelRegex = tenantModelRegex();
  const funcRegex = /(?:^|\n)func\s+[\s\S]*?(?=\nfunc\s+|$)/g;
  const functions = [...source.matchAll(funcRegex)];
  const scopes = functions.length ? functions : [{ 0: source, index: 0 }];

  for (const scope of scopes) {
    const scopeSource = scope[0];
    const scopeOffset = scope.index ?? 0;
    const chains = scopeSource.matchAll(/(?:database\.DB|tx|db)\.[^;\n]{0,420}?(?:Delete|Update|Updates|Save|Find|First|Scan|Exec)\s*\([^\n;]*/g);

    for (const match of chains) {
      const snippet = match[0];
      const prefix = scopeSource.slice(Math.max(0, (match.index ?? 0) - 160), match.index ?? 0);
      const localContext = `${prefix}\n${snippet}`;
      const touchesTenantModel = modelRegex.test(localContext) || /"(Tickets|Users|Whatsapps|Contacts|Messages|Flows|Queues|Tags|Settings)"/.test(localContext);
      if (!touchesTenantModel) continue;
      if (hasTenantFilter(localContext)) continue;

      findings.push({
        file: filePath,
        line: lineNumber(source, scopeOffset + (match.index ?? 0)),
        severity: hasDangerousMutation(snippet) ? 'HIGH' : 'MEDIUM',
        model: modelNameFromSnippet(localContext),
        message: 'Tenant-owned query without visible tenantId filter',
        snippet: snippet.replace(/\s+/g, ' ').trim(),
      });
    }
  }

  return findings;
}

async function walk(target) {
  const absolute = path.resolve(ROOT, target);
  const stat = await fs.stat(absolute);
  if (stat.isFile()) return absolute.endsWith('.go') && !absolute.endsWith('_test.go') ? [absolute] : [];

  const entries = await fs.readdir(absolute, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const child = path.join(absolute, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path.relative(ROOT, child)));
    if (entry.isFile() && entry.name.endsWith('.go') && !entry.name.endsWith('_test.go')) files.push(child);
  }
  return files;
}

async function main() {
  const targets = process.argv.slice(2);
  const scopedTargets = targets.length ? targets : ['business/internal/controllers', 'business/internal/services'];
  const files = (await Promise.all(scopedTargets.map(walk))).flat();
  const findings = [];

  for (const file of files) {
    const source = await fs.readFile(file, 'utf8');
    findings.push(...analyzeSource(path.relative(ROOT, file), source));
  }

  if (!findings.length) {
    console.log('tenant-guard: no suspicious tenant query patterns found.');
    return;
  }

  console.log(`tenant-guard: ${findings.length} finding(s)\n`);
  for (const finding of findings) {
    console.log(`[${finding.severity}] ${finding.file}:${finding.line} ${finding.message}`);
    console.log(`  model: ${finding.model}`);
    console.log(`  ${finding.snippet}\n`);
  }

  process.exitCode = findings.some(f => f.severity === 'HIGH') ? 1 : 0;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}
