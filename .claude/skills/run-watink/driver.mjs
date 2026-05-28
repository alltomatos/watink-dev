#!/usr/bin/env node

// Watink Platform Driver — manages Docker Compose services, health checks, and screenshots.
// Tested on: Ubuntu 26.04 WSL2, Go 1.25, Node 24, Docker 28.

import { spawn } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import path from 'path';
import { exec as execAsync } from 'child_process';
import { fileURLToPath } from 'url';

const exec = promisify(execAsync);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..', '..', '..');

const GO_PATH = `${process.env.HOME}/go/bin:/usr/local/go/bin`;
const ENV = {
  ...process.env,
  PATH: `${GO_PATH}:${process.env.PATH}`,
  GOROOT: '/usr/local/go',
  GOPATH: `${process.env.HOME}/gopath`,
};

class WatinkDriver {
  constructor() {
    this.processes = new Map();
    this.composeFile = path.join(ROOT, 'docker-compose.dev.yml');
    this.composeBizFile = path.join(ROOT, 'docker-compose.business.yml');
  }

  // ── helpers ──

  async _exec(cmd, opts = {}) {
    return exec(cmd, { ...opts, env: ENV, timeout: opts.timeout || 30000 });
  }

  async _which(bin) {
    try {
      await this._exec(`which ${bin}`);
      return true;
    } catch { return false; }
  }

  async _waitFor(url, name, maxAttempts = 30) {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const resp = await fetch(url);
        if (resp.ok) return true;
      } catch {}
      await new Promise(r => setTimeout(r, 2000));
    }
    return false;
  }

  _activeComposeFile() {
    // Prefer dev compose if it exists and has been used
    try { fs.accessSync(this.composeFile); return this.composeFile; }
    catch { return this.composeBizFile; }
  }

  // ── commands ──

  async init() {
    console.log('Watink Platform Driver — init\n');

    const checks = [
      ['Docker', async () => { await this._exec('docker info'); return 'OK'; }],
      ['Go 1.24+', async () => { const { stdout } = await this._exec('go version'); return stdout.trim(); }],
      ['Node 20+', async () => { const { stdout } = await this._exec('node --version'); return stdout.trim(); }],
      ['chromium-browser', async () => { return (await this._which('chromium-browser')) ? 'found' : 'MISSING — apt-get install -y chromium-browser'; }],
      ['Frontend build', async () => { await fs.access(path.join(ROOT, 'frontend', 'build', 'index.html')); return 'found'; }],
      ['Backend binary', async () => { await fs.access(path.join(ROOT, 'business', 'watink-business')); return 'found'; }],
      ['Engine binary', async () => { await fs.access(path.join(ROOT, 'engine-go', 'engine-go')); return 'found'; }],
      ['Plugin Manager binary', async () => { await fs.access(path.join(ROOT, 'plugin-manager', 'plugin-manager')); return 'found'; }],
    ];

    for (const [name, fn] of checks) {
      try {
        const result = await fn();
        console.log(`  ✓ ${name}: ${result}`);
      } catch (e) {
        console.log(`  ✗ ${name}: ${e.message}`);
      }
    }
  }

  async build() {
    console.log('Building all services...\n');

    // Frontend (must be first — output syncs to Go embed dir)
    console.log('1/4 Frontend...');
    await this._exec('npm run build', { cwd: path.join(ROOT, 'frontend'), timeout: 120000 });
    console.log('  ✓ Frontend built');

    // Backend Go
    console.log('2/4 Backend Go...');
    await this._exec('CGO_ENABLED=1 go build -o watink-business ./cmd/server/main.go', {
      cwd: path.join(ROOT, 'business'), timeout: 120000,
    });
    console.log('  ✓ Backend built');

    // Engine Go
    console.log('3/4 Engine Go...');
    await this._exec('go build -o engine-go ./cmd/engine/main.go', {
      cwd: path.join(ROOT, 'engine-go'), timeout: 120000,
    });
    console.log('  ✓ Engine built');

    // Plugin Manager
    console.log('4/4 Plugin Manager...');
    await this._exec('go build -o plugin-manager .', {
      cwd: path.join(ROOT, 'plugin-manager'), timeout: 60000,
    });
    console.log('  ✓ Plugin Manager built');

    console.log('\nAll builds complete.');
  }

  async launch() {
    const composeFile = this._activeComposeFile();
    console.log(`Launching Watink with ${path.basename(composeFile)}...\n`);

    // Create .env if missing
    const envPath = path.join(ROOT, '.env');
    try { fs.accessSync(envPath); } catch {
      await fs.copyFile(path.join(ROOT, '.env.example'), envPath);
      console.log('Created .env from .env.example');
    }

    // Start Docker Compose
    console.log('Starting Docker services...');
    await this._exec(`docker compose -f "${composeFile}" up -d`, { timeout: 120000 });

    // Wait for PostgreSQL
    console.log('Waiting for PostgreSQL...');
    for (let i = 0; i < 30; i++) {
      try {
        const { stdout } = await this._exec(
          `docker exec $(docker ps -qf "name=postgres" | head -1) pg_isready -U postgres`,
          { timeout: 5000 }
        );
        if (stdout.includes('accepting connections')) break;
      } catch {}
      await new Promise(r => setTimeout(r, 2000));
    }

    // Wait for backend
    console.log('Waiting for backend...');
    const backendOk = await this._waitFor('http://localhost:8082/api/v1/health', 'Backend');
    console.log(backendOk ? '  ✓ Backend healthy' : '  ✗ Backend not responding');

    // Wait for marketplace hub
    console.log('Waiting for marketplace hub...');
    const hubOk = await this._waitFor('http://localhost:8090', 'Hub');
    console.log(hubOk ? '  ✓ Hub healthy' : '  ✗ Hub not responding');

    // Wait for plugin manager
    console.log('Waiting for plugin manager...');
    const pmOk = await this._waitFor('http://localhost:8081/api/v1/plugins/instance', 'Plugin Manager');
    console.log(pmOk ? '  ✓ Plugin Manager healthy' : '  ✗ Plugin Manager not responding');

    console.log('\nServices:');
    console.log("  Frontend (embedded): http://localhost:8082");
    console.log('  Backend API:         http://localhost:8082/api/v1');
    console.log('  Plugin Manager:      http://localhost:8081');
    console.log('  Marketplace Hub:     http://localhost:8090');
    console.log('  RabbitMQ Management: http://localhost:15672 (guest/guest)');
  }

  async stop() {
    const composeFile = this._activeComposeFile();
    console.log('Stopping Docker services...');
    await this._exec(`docker compose -f "${composeFile}" down`, { timeout: 60000 });
    console.log('All services stopped.');
  }

  async ss() {
    const composeFile = this._activeComposeFile();
    let containers = [];
    try {
      const { stdout } = await this._exec(`docker compose -f "${composeFile}" ps --format "{{.Name}}\\t{{.Status}}\\t{{.Ports}}"`);
      containers = stdout.trim().split('\n').filter(Boolean);
    } catch {
      console.log('No running Docker containers.');
      return;
    }

    console.log('Container Status:\n');
    for (const line of containers) {
      console.log(`  ${line}`);
    }

    // Health endpoints
    const endpoints = [
      ['Backend', 'http://localhost:8082/api/v1/health'],
      ['Plugin Manager', 'http://localhost:8081/api/v1/plugins/instance'],
      ['Marketplace Hub', 'http://localhost:8090'],
    ];

    console.log('\nHealth Checks:\n');
    for (const [name, url] of endpoints) {
      try {
        const resp = await fetch(url);
        const body = await resp.text();
        console.log(`  ${name}: ${resp.status} ${body.substring(0, 80)}`);
      } catch (e) {
        console.log(`  ${name}: FAILED (${e.message})`);
      }
    }
  }

  async health() {
    try {
      const resp = await fetch('http://localhost:8082/api/v1/health');
      const data = await resp.json();
      console.log('Backend Health:', JSON.stringify(data, null, 2));
    } catch (e) {
      console.error('Backend health check failed:', e.message);
    }
  }

  async screenshot(filename = 'watink-screenshot.png') {
    const outPath = path.resolve(filename);
    // Try backend (embedded frontend) first, then Vite dev server
    let url;
    try { await fetch('http://localhost:8082/api/v1/health'); url = 'http://localhost:8082'; } catch {
      try { await fetch('http://localhost:3000'); url = 'http://localhost:3000'; } catch {
        console.error('No frontend available. Start the app first.');
        return;
      }
    }

    // Try chromium-browser (installed via apt on Ubuntu/WSL)
    if (await this._which('chromium-browser')) {
      try {
        await this._exec(
          `chromium-browser --headless --no-sandbox --disable-gpu --screenshot=${outPath} --window-size=1920,1080 ${url}`,
          { timeout: 30000 }
        );
        // chromium-browser on snap writes to a private tmp — find the file
        try { fs.accessSync(outPath); }
        catch {
          // Try snap private tmp
          const { stdout } = await this._exec(
            `find /tmp/snap-private-tmp -name "${path.basename(outPath)}" -type f 2>/dev/null | head -1`
          );
          if (stdout.trim()) {
            await this._exec(`cp "${stdout.trim()}" "${outPath}"`);
          }
        }
        if (fs.existsSync(outPath)) {
          console.log(`Screenshot saved: ${outPath}`);
          return;
        }
      } catch (e) {
        console.error('chromium-browser screenshot failed:', e.message);
      }
    }

    console.error('No screenshot tool available. Install chromium-browser: apt-get install -y chromium-browser');
  }

  async dev() {
    // Start frontend dev server (Vite) for hot-reload
    console.log('Starting frontend dev server...');
    const child = spawn('npx', ['vite', '--port', '3000', '--host', '0.0.0.0'], {
      cwd: path.join(ROOT, 'frontend'),
      stdio: ['pipe', 'pipe', 'pipe'],
      detached: true,
      shell: true,
      env: ENV,
    });

    child.stdout.on('data', (data) => {
      const line = data.toString().trim();
      if (line) console.log(`[Vite] ${line}`);
    });

    child.stderr.on('data', (data) => {
      const line = data.toString().trim();
      if (line) console.error(`[Vite] ${line}`);
    });

    this.processes.set('vite', child);
    child.unref();

    const ok = await this._waitFor('http://localhost:3000', 'Vite');
    console.log(ok ? 'Frontend dev server ready: http://localhost:3000' : 'Frontend dev server failed to start');
  }

  async test() {
    console.log('Running test suites...\n');

    const suites = [
      { name: 'Backend Go', cmd: 'go test ./...', cwd: path.join(ROOT, 'business'), timeout: 120000 },
      { name: 'Engine Go', cmd: 'go test ./...', cwd: path.join(ROOT, 'engine-go'), timeout: 120000 },
      { name: 'Plugin Manager', cmd: 'go test ./...', cwd: path.join(ROOT, 'plugin-manager'), timeout: 60000 },
      { name: 'Frontend lint', cmd: 'npm run lint', cwd: path.join(ROOT, 'frontend'), timeout: 60000 },
    ];

    for (const s of suites) {
      try {
        const { stdout, stderr } = await this._exec(s.cmd, { cwd: s.cwd, timeout: s.timeout });
        const output = (stdout + stderr).trim();
        const lastLines = output.split('\n').slice(-3).join('\n');
        console.log(`  ✓ ${s.name}:\n${lastLines}\n`);
      } catch (e) {
        console.log(`  ✗ ${s.name}: FAILED\n${e.message.split('\n').slice(-5).join('\n')}\n`);
      }
    }
  }
}

// ── CLI ──

const driver = new WatinkDriver();
const command = process.argv[2];
const args = process.argv.slice(3);

switch (command) {
  case 'init':      driver.init(); break;
  case 'build':     driver.build(); break;
  case 'launch':    driver.launch(); break;
  case 'stop':      driver.stop(); break;
  case 'ss':        driver.ss(); break;
  case 'screenshot': driver.screenshot(args[0]); break;
  case 'health':    driver.health(); break;
  case 'dev':       driver.dev(); break;
  case 'test':      driver.test(); break;
  default:
    console.log(`
Watink Platform Driver

Usage: node .claude/skills/run-watink/driver.mjs <command>

Commands:
  init       Check prerequisites (Docker, Go, Node, binaries, browser)
  build      Build all services (frontend → backend → engine → plugin-manager)
  launch     Start all Docker Compose services
  stop       Stop all Docker Compose services
  ss         Show container status and health checks
  health     Fetch GET /api/v1/health from backend
  screenshot Take screenshot of frontend (default: watink-screenshot.png)
  dev        Start Vite frontend dev server on port 3000
  test       Run all test suites

Prerequisites:
  export PATH=$PATH:/usr/local/go/bin:$HOME/go/bin
  apt-get install -y chromium-browser
  `);
    process.exit(1);
}

process.on('SIGINT', async () => {
  console.log('\nShutting down...');
  for (const [name, child] of driver.processes) {
    child.kill('SIGTERM');
  }
  process.exit(0);
});
