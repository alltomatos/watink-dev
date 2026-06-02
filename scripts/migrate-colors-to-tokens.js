#!/usr/bin/env node
/**
 * Migration Script: hardcoded colors → CSS var() tokens
 *
 * Safe mode: only explicit mappings are replaced.
 * Scope defaults to frontend/src, accepts optional path arg.
 *
 * Usage:
 *   node scripts/migrate-colors-to-tokens.js
 *   node scripts/migrate-colors-to-tokens.js frontend/src/components
 *   node scripts/migrate-colors-to-tokens.js frontend/src/components --dry-run
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const targetArg = args.find((a) => !a.startsWith("--"));
const TARGET_DIR = path.resolve(ROOT, targetArg || "frontend/src");

const HEX_REPLACEMENTS = new Map(Object.entries({
	// neutrals / surfaces
	"#fff": "var(--bg-surface)",
	"#ffffff": "var(--bg-surface)",
	"#fafafa": "var(--bg-surface)",
	"#f8fafc": "var(--bg-default)",
	"#f5f5f5": "var(--bg-surface-alt)",
	"#f1f5f9": "var(--bg-surface-alt)",
	"#f0f0f0": "var(--bg-surface-alt)",
	"#e2e8f0": "var(--border-default)",
	"#e0e0e0": "var(--border-default)",
	"#ddd": "var(--border-default)",
	"#ccc": "var(--border-default)",
	"#999": "var(--text-muted)",
	"#9e9e9e": "var(--text-muted)",
	"#94a3b8": "var(--text-secondary)",
	"#757575": "var(--text-muted)",
	"#64748b": "var(--text-muted)",
	"#334155": "var(--text-primary)",
	"#303030": "var(--text-primary)",
	"#1e293b": "var(--text-primary)",
	"#000": "var(--text-primary)",
	"#000000": "var(--text-primary)",

	// info / blue
	"#e3f2fd": "var(--status-info-bg)",
	"#bbdefb": "var(--status-info-8)",
	"#90caf9": "var(--status-info-15)",
	"#64b5f6": "var(--status-info-30)",
	"#42a5f5": "var(--status-info)",
	"#2196f3": "var(--status-info)",
	"#1976d2": "var(--status-info)",
	"#1565c0": "var(--status-info)",
	"#0d47a1": "var(--status-info)",
	"#0277bd": "var(--status-info)",
	"#01579b": "var(--status-info)",
	"#3f51b5": "var(--status-info)",
	"#0097a7": "var(--status-info)",
	"#00bcd4": "var(--status-info)",
	"#e0f7fa": "var(--status-info-bg)",
	"#b2ebf2": "var(--status-info-8)",

	// success / green
	"#e8f5e9": "var(--status-success-bg)",
	"#c8e6c9": "var(--status-success-10)",
	"#a5d6a7": "var(--status-success-10)",
	"#4caf50": "var(--status-success)",
	"#388e3c": "var(--status-success)",
	"#2e7d32": "var(--status-success)",
	"#1b5e20": "var(--status-success)",
	"#10b981": "var(--status-success)",

	// warning / orange/yellow
	"#fff3e0": "var(--status-warning-bg)",
	"#ffecb3": "var(--status-warning-bg)",
	"#ffe0b2": "var(--status-warning-bg)",
	"#ffcc80": "var(--status-warning-bg)",
	"#ffb74d": "var(--status-warning)",
	"#ff9800": "var(--status-warning)",
	"#ffa000": "var(--status-warning)",
	"#f57c00": "var(--status-warning)",
	"#ef6c00": "var(--status-warning)",
	"#e65100": "var(--status-warning)",

	// error / red/pink
	"#ffebee": "var(--status-error-bg)",
	"#ffcdd2": "var(--status-error-10)",
	"#ef9a9a": "var(--status-error-10)",
	"#f44336": "var(--status-error)",
	"#e53935": "var(--status-error)",
	"#d32f2f": "var(--status-error)",
	"#c62828": "var(--status-error)",
	"#b71c1c": "var(--status-error)",
	"#ef4444": "var(--status-error)",
	"#fce4ec": "var(--status-error-bg)",
	"#f8bbd9": "var(--status-error-10)",
	"#c2185b": "var(--status-error)",

	// purple/default fallback hues
	"#ede7f6": "var(--status-default-bg)",
	"#d1c4e9": "var(--status-default-bg)",
	"#7b1fa2": "var(--status-default-text)",
	"#8e24aa": "var(--status-default-text)",
	"#7e57c2": "var(--status-default-text)",
	"#9c27b0": "var(--status-default-text)",

	// additional high-frequency safe mappings
	"#bdbdbd": "var(--border-default)",
	"#f9fafb": "var(--bg-surface-alt)",
	"#f9f9f9": "var(--bg-surface-alt)",
	"#6b7280": "var(--text-muted)",
	"#9ca3af": "var(--text-muted)",
	"#666": "var(--text-muted)",
	"#888": "var(--text-muted)",
	"#8884d8": "var(--status-default-text)",
	"#f5f6fa": "var(--bg-surface-alt)",
	"#f5f7fa": "var(--bg-surface-alt)",
	"#ebecf0": "var(--border-default)",
	"#f4f5f7": "var(--bg-surface-alt)",
	"#f4f6f8": "var(--bg-surface-alt)",
	"#e1f5fe": "var(--status-info-bg)",
	"#eff6ff": "var(--status-info-bg)",
	"#ecfdf5": "var(--status-success-bg)",
	"#fef2f2": "var(--status-error-bg)",
	"#f5f3ff": "var(--status-default-bg)",
	"#f3e5f5": "var(--status-default-bg)",
	"#e8eaf6": "var(--status-info-bg)",
	"#e1bee7": "var(--status-default-bg)",
	"#c5cae9": "var(--status-info-15)",
	"#f59e0b": "var(--status-warning)",
	"#3b82f6": "var(--status-info)",
	"#8b5cf6": "var(--status-default-text)",
	"#e91e63": "var(--status-error)",
	"#0088fe": "var(--status-info)",
	"#25d366": "var(--status-success)",
	"#1a1a1a": "var(--text-primary)",
	"#111b21": "var(--text-primary)",
	"#f0f2f5": "var(--bg-surface-alt)",
	"#c3cfe2": "var(--border-default)",
	"#f0f7ff": "var(--status-info-bg)",
	"#006064": "var(--status-info)",
	"#4a148c": "var(--status-default-text)",
	"#6a1b9a": "var(--status-default-text)",
	"#880e4f": "var(--status-error)",
	"#283593": "var(--status-info)",
	"#ff6f00": "var(--status-warning)",
}));

const REGEX_REPLACEMENTS = [
	[/0 1px 3px rgba\(0,\s*0,\s*0,\s*0\.12\),\s*0 1px 2px rgba\(0,\s*0,\s*0,\s*0\.24\)/g, "var(--shadow-md)"],
	[/0 4px 6px -1px rgba\(0,\s*0,\s*0,\s*0\.05\),\s*0 2px 4px -1px rgba\(0,\s*0,\s*0,\s*0\.03\)/g, "var(--shadow-sm)"],
	[/rgba\(0,\s*0,\s*0,\s*0\.12\)/g, "var(--border-divider)"],
	[/rgba\(0,\s*0,\s*0,\s*0\.05\)/g, "var(--border-subtle)"],
	[/rgba\(0,\s*0,\s*0,\s*0\.03\)/g, "var(--border-weak)"],
	[/rgba\(0,\s*0,\s*0,\s*0\.2\)/g, "var(--overlay-dark)"],
	[/rgba\(0,\s*0,\s*0,\s*0\.25\)/g, "var(--overlay-dark)"],
	[/rgba\(0,\s*0,\s*0,\s*0\.5\)/g, "var(--overlay-dark-medium)"],
	[/rgba\(0,\s*0,\s*0,\s*0\.7\)/g, "var(--overlay-dark-strong)"],
	[/rgba\(255,\s*255,\s*255,\s*0\.3\)/g, "var(--overlay-light)"],
	[/rgba\(255,\s*255,\s*255,\s*0\.7\)/g, "var(--overlay-medium)"],
	[/rgba\(255,\s*255,\s*255,\s*0\.9\)/g, "var(--overlay-medium)"],
	[/rgba\(255,\s*255,\s*255,\s*0\.95\)/g, "var(--overlay-strong)"],
	[/rgba\(16,\s*185,\s*129,\s*0\.1\)/g, "var(--status-success-10)"],
	[/rgba\(239,\s*68,\s*68,\s*0\.1\)/g, "var(--status-error-10)"],
	[/rgba\(33,\s*150,\s*243,\s*0\.04\)/g, "var(--status-info-4)"],
	[/rgba\(33,\s*150,\s*243,\s*0\.08\)/g, "var(--status-info-8)"],
	[/rgba\(33,\s*150,\s*243,\s*0\.15\)/g, "var(--status-info-15)"],
	[/rgba\(33,\s*150,\s*243,\s*0\.3\)/g, "var(--status-info-30)"],
	[/rgba\(33,\s*150,\s*243,\s*0\.4\)/g, "var(--status-info-40)"],
];

const SKIP = [
	"frontend/src/theme/",
	"frontend/src/hooks/useThemeTokens.js",
	"frontend/src/helpers/tagColors.js",
	"frontend/src/layout/MainListItems.js",
	"frontend/src/pages/FlowBuilder/",
	"frontend/src/components/ColorPicker/",
	"node_modules/",
	"build/",
];

function walk(dir) {
	let out = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) out = out.concat(walk(full));
		else if (/\.(js|jsx)$/.test(entry.name)) out.push(full);
	}
	return out;
}

function shouldSkip(file) {
	const rel = path.relative(ROOT, file).replace(/\\/g, "/");
	return SKIP.some((s) => rel.includes(s));
}

function replaceHex(content) {
	let count = 0;
	const next = content.replace(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g, (match) => {
		const key = match.toLowerCase();
		const replacement = HEX_REPLACEMENTS.get(key);
		if (!replacement) return match;
		count++;
		return replacement;
	});
	return { content: next, count };
}

const files = fs.statSync(TARGET_DIR).isDirectory() ? walk(TARGET_DIR) : [TARGET_DIR];
let changed = 0;
let replacements = 0;
const changedFiles = [];
const unmapped = new Map();

for (const file of files) {
	if (shouldSkip(file)) continue;
	let content = fs.readFileSync(file, "utf8");
	const original = content;
	let fileCount = 0;

	for (const [regex, token] of REGEX_REPLACEMENTS) {
		const matches = content.match(regex);
		if (matches) {
			fileCount += matches.length;
			content = content.replace(regex, token);
		}
	}

	const hex = replaceHex(content);
	content = hex.content;
	fileCount += hex.count;

	const remaining = content.match(/#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b|rgba?\([^)]+\)|hsla?\([^)]+\)/g) || [];
	for (const color of remaining) {
		const key = color.toLowerCase();
		if (!unmapped.has(key)) unmapped.set(key, new Set());
		unmapped.get(key).add(path.relative(ROOT, file));
	}

	if (content !== original) {
		changed++;
		replacements += fileCount;
		changedFiles.push(`${path.relative(ROOT, file)} (${fileCount})`);
		if (!dryRun) fs.writeFileSync(file, content, "utf8");
	}
}

console.log("═══════════════════════════════════════════════");
console.log(`  MIGRAÇÃO hardcoded colors → var(--token) ${dryRun ? "[DRY-RUN]" : ""}`);
console.log("═══════════════════════════════════════════════");
console.log(`  Target:              ${path.relative(ROOT, TARGET_DIR) || "."}`);
console.log(`  Arquivos analisados: ${files.length}`);
console.log(`  Arquivos alterados:  ${changed}`);
console.log(`  Substituições:       ${replacements}`);
console.log(`  Cores não mapeadas:  ${unmapped.size}`);

if (changedFiles.length) {
	console.log("\n✅ Arquivos atualizados:");
	changedFiles.slice(0, 80).forEach((f) => console.log(`   ${f}`));
	if (changedFiles.length > 80) console.log(`   ... +${changedFiles.length - 80}`);
}

if (unmapped.size) {
	console.log("\n⚠️  Não mapeadas:");
	[...unmapped.entries()].slice(0, 60).forEach(([color, files]) => {
		console.log(`   ${color} (${files.size}) → ${[...files][0]}`);
	});
	if (unmapped.size > 60) console.log(`   ... +${unmapped.size - 60}`);
}

console.log("═══════════════════════════════════════════════");
process.exit(0);
