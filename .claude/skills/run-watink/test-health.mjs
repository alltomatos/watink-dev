#!/usr/bin/env node

// Health test for Watink platform

import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..', '..');

async function testEndpoint(name, url) {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (response.ok) {
      console.log(`  [OK] ${name}: UP (${response.status})`);
      return true;
    }
    console.log(`  [FAIL] ${name}: DOWN (${response.status})`);
    return false;
  } catch (err) {
    console.log(`  [FAIL] ${name}: ${err.message}`);
    return false;
  }
}

async function testFile(name, filePath) {
  try {
    await fs.access(filePath);
    console.log(`  [OK] ${name}: found`);
    return true;
  } catch {
    console.log(`  [FAIL] ${name}: missing`);
    return false;
  }
}

async function main() {
  console.log('Watink Platform Health Check\n');

  const results = [];

  console.log('Endpoints:');
  const checks = [
    ['Frontend (Vite dev)', 'http://localhost:3000'],
    ['Backend Go (embedded)', 'http://localhost:8082/api/v1/health'],
    ['Plugin Manager', 'http://localhost:8081/api/v1/plugins/instance'],
    ['Marketplace Hub', 'http://localhost:8090'],
    ['RabbitMQ Management', 'http://localhost:15672'],
  ];
  for (const [name, url] of checks) {
    const ok = await testEndpoint(name, url);
    results.push([name, ok]);
  }

  console.log('\nBuild artifacts:');
  const files = [
    ['Backend binary', path.join(ROOT, 'business', 'watink-business')],
    ['Engine binary', path.join(ROOT, 'engine-go', 'engine-go')],
    ['Plugin Manager binary', path.join(ROOT, 'plugin-manager', 'plugin-manager')],
    ['Frontend build', path.join(ROOT, 'frontend', 'build', 'index.html')],
  ];
  for (const [name, filePath] of files) {
    const ok = await testFile(name, filePath);
    results.push([name, ok]);
  }

  const passed = results.filter(([, ok]) => ok).length;
  const total = results.length;
  console.log(`\n${'='.repeat(40)}`);
  console.log(`Summary: ${passed}/${total} checks passed`);

  process.exit(passed === total ? 0 : 1);
}

main().catch(console.error);
