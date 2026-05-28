#!/usr/bin/env node

// Simple health test for Watink platform

import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..', '..');

console.log('🔍 Testing Watink Platform...\n');

async function testService(name, url) {
  try {
    const response = await fetch(url);
    if (response.ok) {
      console.log(`✅ ${name}: UP (${response.status})`);
      return true;
    } else {
      console.log(`❌ ${name}: DOWN (${response.status})`);
      return false;
    }
  } catch (err) {
    console.log(`❌ ${name}: FAILED (${err.message})`);
    return false;
  }
}

async function main() {
  const results = [];

  // Test frontend
  const frontendUp = await testService('Frontend (Vite)', 'http://localhost:3000');
  results.push(['Frontend', frontendUp ? '✅' : '❌']);

  // Test if backend binary exists
  try {
    await fs.access(path.join(ROOT, 'business', 'watink-business'));
    console.log('✅ Backend Go: Built');
    results.push(['Backend Go', '✅']);
  } catch {
    console.log('❌ Backend Go: Not built');
    results.push(['Backend Go', '❌']);
  }

  // Test if frontend is built
  try {
    await fs.access(path.join(ROOT, 'frontend', 'build'));
    console.log('✅ Frontend Build: Complete');
    results.push(['Frontend Build', '✅']);
  } catch {
    console.log('❌ Frontend Build: Missing');
    results.push(['Frontend Build', '❌']);
  }

  // Print summary
  console.log('\n📊 Watink Platform Status:');
  console.log('='.repeat(40));
  results.forEach(([name, status]) => {
    console.log(`${status} ${name}`);
  });

  const passed = results.filter(([, status]) => status === '✅').length;
  const total = results.length;
  console.log('\n' + '='.repeat(40));
  console.log(`Summary: ${passed}/${total} checks passed`);
}

main().catch(console.error);