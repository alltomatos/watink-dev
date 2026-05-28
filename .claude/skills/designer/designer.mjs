#!/usr/bin/env node

// Watink Designer — Frontend Design System Driver
// Parses MUI theme tokens, scans hardcoded colors, takes UI screenshots, modifies source files.

import { promises as fs } from 'fs';
import path from 'path';
import { exec as execAsync } from 'child_process';
import { fileURLToPath } from 'url';
import { promisify } from 'util';

const exec = promisify(execAsync);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.join(__dirname, '..', '..', '..');
const FRONTEND_SRC = path.join(ROOT, 'frontend', 'src');
const THEME_FILE = path.join(FRONTEND_SRC, 'context', 'DarkMode', 'index.js');
const TOKENS_CACHE = path.join(__dirname, 'tokens.json');

// ── Token Parser ──────────────────────────────────────────────────────────────

function extractThemeObject(source) {
  // Find createTheme({...}) content
  const startMarker = 'createTheme({';
  const startIdx = source.indexOf(startMarker);
  if (startIdx === -1) return null;

  const objStart = startIdx + startMarker.length - 1; // position of '{'
  let depth = 0;
  let i = objStart;

  while (i < source.length) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
    i++;
  }

  const raw = source.slice(objStart, i + 1);
  return raw;
}

function parseThemeTokens(source) {
  const raw = extractThemeObject(source);
  if (!raw) return null;

  const tokens = { palette: {}, typography: {}, shape: {}, overrides: {} };

  // Extract the palette section from the theme object
  const paletteSection = raw.match(/palette:\s*\{([\s\S]+?)\n\s{4}\}/);
  const paletteSrc = paletteSection ? paletteSection[1] : raw;

  // Extract primary/secondary — search within palette section only
  const primaryMatch = paletteSrc.match(/primary:\s*\{\s*main:\s*["']([^"']+)["']\s*\}/);
  if (primaryMatch) tokens.palette['primary.main'] = primaryMatch[1];

  const secondaryMatch = paletteSrc.match(/secondary:\s*\{\s*main:\s*["']([^"']+)["']\s*\}/);
  if (secondaryMatch) tokens.palette['secondary.main'] = secondaryMatch[1];

  // Extract background colors (within palette section)
  const bgMatches = [...paletteSrc.matchAll(/background:\s*\{([^}]+)\}/g)];
  bgMatches.forEach(m => {
    const block = m[1];
    const defaultMatch = block.match(/default:\s*([^,}]+)/);
    const paperMatch = block.match(/paper:\s*([^,}]+)/);
    if (defaultMatch) tokens.palette['background.default'] = defaultMatch[1].trim().replace(/['"]/g, '');
    if (paperMatch) tokens.palette['background.paper'] = paperMatch[1].trim().replace(/['"]/g, '');
  });

  // Extract text colors (within palette section)
  const textSection = paletteSrc.match(/text:\s*\{([^}]+)\}/);
  if (textSection) {
    const block = textSection[1];
    const textPrimaryMatch = block.match(/primary:\s*([^,}]+)/);
    const textSecondaryMatch = block.match(/secondary:\s*([^,}]+)/);
    if (textPrimaryMatch) tokens.palette['text.primary'] = textPrimaryMatch[1].trim().replace(/['"]/g, '');
    if (textSecondaryMatch) tokens.palette['text.secondary'] = textSecondaryMatch[1].trim().replace(/['"]/g, '');
  }

  // Extract type (light/dark)
  const typeMatch = paletteSrc.match(/type:\s*([^,\n}]+)/);
  if (typeMatch) tokens.palette.type = typeMatch[1].trim();

  // Extract typography (from raw theme object, not palette)
  const typoSection = raw.match(/typography:\s*\{([^}]+)\}/);
  if (typoSection) {
    const block = typoSection[1];
    const fontFamilyMatch = block.match(/fontFamily:\s*["']([^"']+)["']/);
    if (fontFamilyMatch) tokens.typography.fontFamily = fontFamilyMatch[1];

    const btnMatch = raw.match(/button:\s*\{\s*([^}]+)\}/);
    if (btnMatch) {
      tokens.typography.button = {};
      const btnTextTransform = btnMatch[1].match(/textTransform:\s*["']([^"']+)["']/);
      const btnFontWeight = btnMatch[1].match(/fontWeight:\s*(\d+)/);
      if (btnTextTransform) tokens.typography.button.textTransform = btnTextTransform[1];
      if (btnFontWeight) tokens.typography.button.fontWeight = parseInt(btnFontWeight[1]);
    }
  }

  // Extract shape
  const borderRadiusMatch = raw.match(/borderRadius:\s*(\d+)/);
  if (borderRadiusMatch) tokens.shape.borderRadius = parseInt(borderRadiusMatch[1]);

  // Extract overrides
  const overridesSection = raw.match(/overrides:\s*\{([\s\S]+?)\n\s{4}\}/);
  if (overridesSection) {
    const block = overridesSection[1];
    // MuiButton
    const btnRadius = block.match(/MuiButton:[\s\S]*?borderRadius:\s*(\d+)/);
    const btnPadding = block.match(/MuiButton:[\s\S]*?padding:\s*["']([^"']+)["']/);
    const btnBg = block.match(/containedPrimary:[\s\S]*?background:\s*["']([^"']+)["']/);
    const btnShadow = block.match(/containedPrimary:[\s\S]*?boxShadow:\s*["']([^"']+)["']/);
    if (btnRadius || btnPadding || btnBg || btnShadow) {
      tokens.overrides.MuiButton = {};
      if (btnRadius) tokens.overrides.MuiButton.borderRadius = parseInt(btnRadius[1]);
      if (btnPadding) tokens.overrides.MuiButton.padding = btnPadding[1];
      if (btnBg) tokens.overrides.MuiButton.background = btnBg[1];
      if (btnShadow) tokens.overrides.MuiButton.boxShadow = btnShadow[1];
    }
    // MuiPaper
    const paperRadius = block.match(/MuiPaper:[\s\S]*?borderRadius:\s*(\d+)/);
    const paperShadow = block.match(/MuiPaper:[\s\S]*?boxShadow:\s*["']([^"']+)["']/);
    if (paperRadius || paperShadow) {
      tokens.overrides.MuiPaper = {};
      if (paperRadius) tokens.overrides.MuiPaper.borderRadius = parseInt(paperRadius[1]);
      if (paperShadow) tokens.overrides.MuiPaper.boxShadow = paperShadow[1];
    }
    // MuiTab
    const tabTextTransform = block.match(/MuiTab:[\s\S]*?textTransform:\s*["']([^"']+)["']/);
    const tabFontWeight = block.match(/MuiTab:[\s\S]*?fontWeight:\s*(\d+)/);
    if (tabTextTransform || tabFontWeight) {
      tokens.overrides.MuiTab = {};
      if (tabTextTransform) tokens.overrides.MuiTab.textTransform = tabTextTransform[1];
      if (tabFontWeight) tokens.overrides.MuiTab.fontWeight = parseInt(tabFontWeight[1]);
    }
  }

  return tokens;
}

// ── Color Scanner ─────────────────────────────────────────────────────────────

const HEX_RE = /["'`]#([0-9a-fA-F]{3,8})["'`]/g;
const RGBA_RE = /rgba?\(\s*\d+\s*,\s*\d+\s*,\s*\d+/g;
const HSLA_RE = /hsla?\(\s*\d+/g;
const THEME_REF_RE = /theme\.palette\.\w+(\.\w+)?/g;

async function scanHardcodedColors() {
  const files = await findJsFiles(FRONTEND_SRC);
  const results = [];

  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');
    const rel = path.relative(ROOT, file);
    const hexColors = [];
    const rgbaColors = [];
    const themeRefs = [];

    let m;
    HEX_RE.lastIndex = 0;
    while ((m = HEX_RE.exec(content)) !== null) {
      hexColors.push(`#${m[1]}`);
    }

    RGBA_RE.lastIndex = 0;
    while ((m = RGBA_RE.exec(content)) !== null) {
      rgbaColors.push(m[0] + ')');
    }

    THEME_REF_RE.lastIndex = 0;
    while ((m = THEME_REF_RE.exec(content)) !== null) {
      themeRefs.push(m[0]);
    }

    if (hexColors.length > 0 || rgbaColors.length > 0) {
      results.push({
        file: rel,
        hexColors: [...new Set(hexColors)],
        rgbaColors: [...new Set(rgbaColors)],
        themeRefs: [...new Set(themeRefs)],
      });
    }
  }

  return results;
}

async function findJsFiles(dir) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== 'build') {
      out.push(...await findJsFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      out.push(full);
    }
  }
  return out;
}

// ── Audit ─────────────────────────────────────────────────────────────────────

async function runAudit(verbose) {
  const scan = await scanHardcodedColors();

  // Color duplication map
  const colorMap = {};
  for (const entry of scan) {
    for (const c of [...entry.hexColors, ...entry.rgbaColors]) {
      const key = c.toLowerCase();
      if (!colorMap[key]) colorMap[key] = [];
      colorMap[key].push(entry.file);
    }
  }

  // Find duplicated colors (same hex in 3+ files)
  const duplicated = Object.entries(colorMap)
    .filter(([, files]) => files.length >= 3)
    .sort((a, b) => b[1].length - a[1].length);

  // Files with no theme refs (fully hardcoded)
  const noThemeRefs = scan.filter(e => e.themeRefs.length === 0 && (e.hexColors.length > 0 || e.rgbaColors.length > 0));

  // Files that mix theme refs with hardcoded colors
  const mixed = scan.filter(e => e.themeRefs.length > 0 && (e.hexColors.length > 0 || e.rgbaColors.length > 0));

  console.log('═══ Watink Design Audit ═══\n');

  console.log(`📊 Summary:`);
  console.log(`   Files with hardcoded colors: ${scan.length}`);
  console.log(`   Files with theme refs only:  ${scan.filter(e => e.themeRefs.length > 0 && e.hexColors.length === 0 && e.rgbaColors.length === 0).length}`);
  console.log(`   Files mixing both:           ${mixed.length}`);
  console.log(`   Files fully hardcoded:       ${noThemeRefs.length}`);
  console.log(`   Unique duplicated colors:    ${duplicated.length}\n`);

  if (duplicated.length > 0) {
    console.log('🔴 Top Duplicated Colors (3+ files):');
    for (const [color, files] of duplicated.slice(0, 15)) {
      console.log(`   ${color.padEnd(20)} → ${files.length} files`);
      if (verbose) {
        for (const f of files.slice(0, 5)) {
          console.log(`     · ${f}`);
        }
        if (files.length > 5) console.log(`     · ... and ${files.length - 5} more`);
      }
    }
    console.log();
  }

  if (mixed.length > 0) {
    console.log('🟡 Files Mixing Theme Refs + Hardcoded Colors:');
    for (const e of mixed.slice(0, 10)) {
      console.log(`   ${e.file}`);
      if (verbose) {
        console.log(`     Theme refs: ${e.themeRefs.join(', ')}`);
        console.log(`     Hardcoded:  ${e.hexColors.concat(e.rgbaColors).join(', ')}`);
      }
    }
    if (mixed.length > 10) console.log(`   ... and ${mixed.length - 10} more`);
    console.log();
  }

  if (noThemeRefs.length > 0) {
    console.log('🟠 Fully Hardcoded (no theme.palette refs):');
    for (const e of noThemeRefs.slice(0, 10)) {
      const colors = e.hexColors.concat(e.rgbaColors);
      console.log(`   ${e.file}  (${colors.length} colors)`);
      if (verbose) {
        console.log(`     ${colors.join(', ')}`);
      }
    }
    if (noThemeRefs.length > 10) console.log(`   ... and ${noThemeRefs.length - 10} more`);
    console.log();
  }

  // Dark mode gap detection
  const darkModeVars = ['darkMode', '"dark"', "'dark'"];
  const darkModeFiles = scan.filter(e => {
    // Files that use hardcoded colors but don't condition on darkMode
    return (e.hexColors.length > 0 || e.rgbaColors.length > 0);
  });
  console.log(`🌙 Dark Mode: ${darkModeFiles.length} files with colors to review for dark-mode support\n`);

  return { scan, duplicated, mixed, noThemeRefs };
}

// ── Modify ────────────────────────────────────────────────────────────────────

async function modifyToken(tokenPath, value) {
  const source = await fs.readFile(THEME_FILE, 'utf-8');

  const replacements = {
    'palette.primary.main': { pattern: /primary:\s*\{\s*main:\s*["']([^"']+)["']\s*\}/, build: v => `primary: { main: "${v}" }` },
    'palette.secondary.main': { pattern: /secondary:\s*\{\s*main:\s*["']([^"']+)["']\s*\}/, build: v => `secondary: { main: "${v}" }` },
    'palette.background.default': { pattern: /default:\s*(?:darkMode\s*\?\s*["']([^"']+)["']\s*:\s*["']([^"']+)["'])/, build: null },
    'palette.background.paper': { pattern: /paper:\s*(?:darkMode\s*\?\s*["']([^"']+)["']\s*:\s*["']([^"']+)["'])/, build: null },
    'palette.text.primary': { pattern: /primary:\s*(?:darkMode\s*\?\s*["']([^"']+)["']\s*:\s*["']([^"']+)["'])/, build: null },
    'palette.text.secondary': { pattern: /secondary:\s*(?:darkMode\s*\?\s*["']([^"']+)["']\s*:\s*["']([^"']+)["'])/, build: null },
    'typography.fontFamily': { pattern: /fontFamily:\s*["']([^"']+)["']/, build: v => `fontFamily: "${v}"` },
    'shape.borderRadius': { pattern: /borderRadius:\s*(\d+)/, build: v => `borderRadius: ${v}` },
  };

  const key = tokenPath;
  const rep = replacements[key];

  if (!rep) {
    // Try generic approach: find `key: "value"` or `key: number`
    const parts = key.split('.');
    const leaf = parts[parts.length - 1];
    const genericPattern = new RegExp(`${leaf}:\\s*["']?([^"',}]+)["']?`);
    const match = source.match(genericPattern);
    if (match) {
      const isString = match[1].startsWith('#') || match[1].startsWith('rgb') || match[1].includes("'") || /^[A-Z]/.test(match[1]);
      const newLine = isString ? `${leaf}: "${value}"` : `${leaf}: ${value}`;
      const newSource = source.replace(genericPattern, newLine);
      if (newSource !== source) {
        await fs.writeFile(THEME_FILE, newSource, 'utf-8');
        console.log(`✅ Modified ${key} → ${value}`);
        console.log(`   File: ${path.relative(ROOT, THEME_FILE)}`);
        return;
      }
    }
    console.error(`❌ Token "${key}" not found. Run 'tokens' to see available paths.`);
    process.exit(1);
  }

  // For simple replacements (non-conditional)
  if (rep.build) {
    const match = source.match(rep.pattern);
    if (match) {
      const newSource = source.replace(rep.pattern, rep.build(value));
      if (newSource !== source) {
        await fs.writeFile(THEME_FILE, newSource, 'utf-8');
        console.log(`✅ Modified ${key} → ${value}`);
        console.log(`   File: ${path.relative(ROOT, THEME_FILE)}`);
        return;
      }
    }
  }

  // For conditional (darkMode ? x : y) replacements
  if (rep.build === null) {
    console.log(`⚠️  Token "${key}" uses conditional dark/light mode values.`);
    console.log(`   Edit manually in ${path.relative(ROOT, THEME_FILE)}`);
    console.log(`   Or use --mode light|dark to specify which mode to change.`);
    return;
  }

  console.error(`❌ Could not modify "${key}". Pattern not matched.`);
  process.exit(1);
}

// ── Preview ───────────────────────────────────────────────────────────────────

async function takeScreenshot(opts) {
  const url = opts.port === 8082 ? 'http://localhost:8082' : 'http://localhost:3000';
  const output = opts.output || 'watink-design-preview.png';
  const route = opts.route || '/';
  const wait = parseInt(opts.wait) || 2000;

  // Check if app is running
  try {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error('not ok');
  } catch {
    console.error(`❌ App not running at ${url}. Start it with the run-watink skill first.`);
    process.exit(1);
  }

  try {
    let browser, page;

    // Try puppeteer first (more control for navigation + localStorage)
    try {
      const puppeteer = (await import('puppeteer')).default;
      browser = await puppeteer.launch({ headless: true });
      page = await browser.newPage();
      await page.setViewport({ width: 1920, height: 1080 });

      // Navigate first to set localStorage
      await page.goto(url, { waitUntil: 'networkidle2' });

      // Set theme and mode via localStorage
      if (opts.theme) {
        await page.evaluate((theme) => {
          localStorage.setItem('appTheme', theme);
        }, opts.theme);
      }
      if (opts.mode) {
        await page.evaluate((mode) => {
          // The darkMode state is internal React state, not localStorage.
          // We can only set appTheme via localStorage.
          // For dark mode, we'd need to add a localStorage key.
          // For now, log a note.
          console.log(`Dark mode toggle is React state — cannot set via localStorage directly.`);
        }, opts.mode);
      }

      // Reload to apply localStorage changes
      if (opts.theme) {
        await page.goto(url, { waitUntil: 'networkidle2' });
      }

      // Navigate to route
      if (route !== '/') {
        await page.goto(`${url}${route}`, { waitUntil: 'networkidle2' });
      }

      // Wait for render
      await new Promise(r => setTimeout(r, wait));

      await page.screenshot({ path: output, fullPage: false });
      await browser.close();
      console.log(`📸 Screenshot saved to ${output}`);
      console.log(`   URL: ${url}${route}`);
      if (opts.theme) console.log(`   Theme: ${opts.theme}`);
      return;
    } catch {}

    // Fallback to chromium-cli
    try {
      const fullUrl = route === '/' ? url : `${url}${route}`;
      await exec(`chromium-cli --headless --window-size=1920,1080 --screenshot=${output} ${fullUrl}`);
      console.log(`📸 Screenshot saved to ${output}`);
      console.log(`   URL: ${fullUrl} (note: --theme and --mode require puppeteer)`);
      return;
    } catch {}

    console.error('❌ No screenshot tool available. Install puppeteer or chromium-cli.');
    process.exit(1);
  } catch (err) {
    console.error('❌ Screenshot failed:', err.message);
    process.exit(1);
  }
}

// ── Themes ────────────────────────────────────────────────────────────────────

async function listThemes() {
  console.log('═══ Available Themes ═══\n');
  console.log('  apple  — Apple-inspired design (default)');
  console.log('           Clean white/light with #007AFF primary');
  console.log('           MainLayoutDefault — traditional MUI drawer');
  console.log();
  console.log('  saas   — SaaS dashboard design');
  console.log('           Dark sidebar (#1E293B), light content (#F1F5F9)');
  console.log('           MainLayoutSaaS — modern collapsible drawer');
  console.log();
  console.log('Set via localStorage key "appTheme" or in DarkMode context.');
}

async function switchTheme(name) {
  const valid = ['apple', 'saas'];
  if (!valid.includes(name)) {
    console.error(`❌ Unknown theme "${name}". Available: ${valid.join(', ')}`);
    process.exit(1);
  }

  const source = await fs.readFile(THEME_FILE, 'utf-8');

  // Change the default appTheme
  const newSource = source.replace(
    /setAppTheme\("apple"\)/,
    `setAppTheme("${name}")`
  ).replace(
    /localStorage\.setItem\("appTheme",\s*"apple"\)/,
    `localStorage.setItem("appTheme", "${name}")`
  ).replace(
    /setAppTheme\("saas"\)/,
    `setAppTheme("${name}")`
  );

  // Also change the initial state default
  const updated = newSource.replace(
    /const \[appTheme, setAppTheme\] = useState\("[^"]+"\)/,
    `const [appTheme, setAppTheme] = useState("${name}")`
  );

  if (updated !== source) {
    await fs.writeFile(THEME_FILE, updated, 'utf-8');
    console.log(`✅ Default theme switched to "${name}"`);
    console.log(`   File: ${path.relative(ROOT, THEME_FILE)}`);
  } else {
    console.log(`ℹ️  Theme is already "${name}" or no changes needed.`);
  }
}

async function diffThemes(a, b) {
  console.log(`═══ Theme Diff: ${a} vs ${b} ═══\n`);
  console.log('Note: Both themes share the same createTheme tokens.');
  console.log('The main differences are in the layout components:\n');

  const layouts = {
    apple: path.join(FRONTEND_SRC, 'layout', 'MainLayoutDefault.js'),
    saas: path.join(FRONTEND_SRC, 'layout', 'MainLayoutSaaS.js'),
  };

  for (const [name, file] of Object.entries(layouts)) {
    if (!(await fs.access(file).then(() => true).catch(() => false))) continue;
    const content = await fs.readFile(file, 'utf-8');
    const hexColors = [];
    let m;
    const re = /["'`]#([0-9a-fA-F]{3,8})["'`]/g;
    while ((m = re.exec(content)) !== null) {
      hexColors.push(`#${m[1]}`);
    }
    const unique = [...new Set(hexColors)];
    console.log(`${name} (${path.relative(ROOT, file)}):`);
    console.log(`  Colors: ${unique.join(', ')}`);

    // Key structural differences
    if (content.includes('drawerWidth = 260')) console.log(`  Sidebar: 260px, dark (#1E293B)`);
    else if (content.includes('drawerWidth = 240')) console.log(`  Sidebar: 240px, white`);

    console.log();
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { command: argv[0] || '', flags: {}, positional: [] };
  for (let i = 1; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (i + 1 < argv.length && !argv[i + 1].startsWith('--')) {
        args.flags[key] = argv[++i];
      } else {
        args.flags[key] = true;
      }
    } else {
      args.positional.push(arg);
    }
  }
  return args;
}

async function main() {
  const argv = process.argv.slice(2);
  const args = parseArgs(argv);

  switch (args.command) {
    case 'tokens': {
      const source = await fs.readFile(THEME_FILE, 'utf-8');
      const tokens = parseThemeTokens(source);
      if (!tokens) {
        console.error('❌ Could not parse theme from', THEME_FILE);
        process.exit(1);
      }

      if (args.flags.json) {
        console.log(JSON.stringify(tokens, null, 2));
      } else {
        console.log('═══ Watink Theme Tokens ═══\n');

        console.log('🎨 Palette:');
        for (const [k, v] of Object.entries(tokens.palette)) {
          console.log(`   ${k.padEnd(28)} ${v}`);
        }

        console.log('\n✏️  Typography:');
        for (const [k, v] of Object.entries(tokens.typography)) {
          if (typeof v === 'object') {
            console.log(`   ${k}:`);
            for (const [sk, sv] of Object.entries(v)) {
              console.log(`     ${sk.padEnd(18)} ${sv}`);
            }
          } else {
            console.log(`   ${k.padEnd(28)} ${v}`);
          }
        }

        console.log('\n🔷 Shape:');
        for (const [k, v] of Object.entries(tokens.shape)) {
          console.log(`   ${k.padEnd(28)} ${v}`);
        }

        console.log('\n🛠  Overrides:');
        for (const [component, overrides] of Object.entries(tokens.overrides)) {
          console.log(`   ${component}:`);
          for (const [k, v] of Object.entries(overrides)) {
            console.log(`     ${k.padEnd(18)} ${v}`);
          }
        }
      }

      // Cache tokens
      await fs.writeFile(TOKENS_CACHE, JSON.stringify(tokens, null, 2), 'utf-8');
      break;
    }

    case 'audit': {
      await runAudit(!!args.flags.verbose);
      break;
    }

    case 'preview': {
      await takeScreenshot({
        route: args.flags.route,
        theme: args.flags.theme,
        mode: args.flags.mode,
        wait: args.flags.wait,
        output: args.flags.output,
        port: args.flags.port ? parseInt(args.flags.port) : 3000,
      });
      break;
    }

    case 'modify': {
      const token = args.flags.token;
      const value = args.flags.value;
      if (!token || !value) {
        console.error('Usage: designer.mjs modify --token <path> --value <value>');
        console.error('Example: designer.mjs modify --token palette.primary.main --value "#0066FF"');
        process.exit(1);
      }
      await modifyToken(token, value);
      break;
    }

    case 'themes': {
      if (args.flags.diff) {
        const [a, b] = args.flags.diff.split(',');
        await diffThemes(a || 'apple', b || 'saas');
      } else if (args.flags.switch) {
        await switchTheme(args.flags.switch);
      } else {
        await listThemes();
      }
      break;
    }

    default:
      console.log(`
Watink Designer — Frontend Design System

Usage:
  node .claude/skills/designer/designer.mjs <command> [options]

Commands:
  tokens              Extract and display theme tokens
  audit               Scan for hardcoded colors and design issues
  preview             Take screenshot of running app
  modify              Change a theme token in source file
  themes              List, compare, or switch themes

Options:
  tokens --json                Output raw JSON
  audit --verbose              Show per-file details
  preview --route /path        Navigate to route before capture
  preview --theme apple|saas   Set theme via localStorage
  preview --mode dark|light    Set dark/light mode
  preview --wait 3000          Wait ms before capture (default 2000)
  preview --output file.png    Output filename
  modify --token <path> --value <val>  Modify a token
  themes --diff apple,saas     Compare two themes
  themes --switch <name>       Change default theme
`);
      process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
