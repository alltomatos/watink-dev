/**
 * Migration Script: rgba() hardcoded → CSS var() tokens
 * 
 * Execute: node scripts/migrate-rgba-to-tokens.js
 * 
 * REGRA DO MENTOR:
 * - Só substitui padrões que existem em AMBOS light/dark do semantic.js
 * - Padrões não mapeados são logados como WARNING para revisão manual
 * - Gera relatório final com contagem de acertos vs pendências
 */

const fs = require("fs");
const path = require("path");

// ── Mapa de substituição: padrão regex → token CSS ──
// IMPORTANTE: cada token aqui DEVE existir em semantic.js (light + dark)
const REPLACEMENTS = [
	// ── Border patterns ──
	{
		regex: /rgba\(0,\s*0,\s*0,\s*0\.12\)/g,
		token: "var(--border-divider)",
		label: "border-divider",
	},
	{
		regex: /rgba\(0,\s*0,\s*0,\s*0\.05\)/g,
		token: "var(--border-subtle)",
		label: "border-subtle",
	},
	{
		regex: /rgba\(0,\s*0,\s*0,\s*0\.03\)/g,
		token: "var(--border-weak)",
		label: "border-weak",
	},

	// ── Overlay patterns ──
	{
		regex: /rgba\(255,\s*255,\s*255,\s*0\.3\)/g,
		token: "var(--overlay-light)",
		label: "overlay-light",
	},
	{
		regex: /rgba\(255,\s*255,\s*255,\s*0\.7\)/g,
		token: "var(--overlay-medium)",
		label: "overlay-medium",
	},
	{
		regex: /rgba\(255,\s*255,\s*255,\s*0\.9\)/g,
		token: "var(--overlay-medium)",
		label: "overlay-medium",
	},
	{
		regex: /rgba\(255,\s*255,\s*255,\s*0\.95\)/g,
		token: "var(--overlay-strong)",
		label: "overlay-strong",
	},
	{
		regex: /rgba\(0,\s*0,\s*0,\s*0\.2\)/g,
		token: "var(--overlay-dark)",
		label: "overlay-dark",
	},
	{
		regex: /rgba\(0,\s*0,\s*0,\s*0\.25\)/g,
		token: "var(--overlay-dark)",
		label: "overlay-dark",
	},
	{
		regex: /rgba\(0,\s*0,\s*0,\s*0\.5\)/g,
		token: "var(--overlay-dark-medium)",
		label: "overlay-dark-medium",
	},
	{
		regex: /rgba\(0,\s*0,\s*0,\s*0\.7\)/g,
		token: "var(--overlay-dark-strong)",
		label: "overlay-dark-strong",
	},
	{
		regex: /rgba\(255,\s*255,\s*255,\s*0\.1\)/g,
		token: "var(--overlay-dark)",
		label: "overlay-dark",
	},

	// ── Status opacity patterns ──
	{
		regex: /rgba\(16,\s*185,\s*129,\s*0\.1\)/g,
		token: "var(--status-success-10)",
		label: "status-success-10",
	},
	{
		regex: /rgba\(239,\s*68,\s*68,\s*0\.1\)/g,
		token: "var(--status-error-10)",
		label: "status-error-10",
	},
	{
		regex: /rgba\(33,\s*150,\s*243,\s*0\.04\)/g,
		token: "var(--status-info-4)",
		label: "status-info-4",
	},
	{
		regex: /rgba\(33,\s*150,\s*243,\s*0\.08\)/g,
		token: "var(--status-info-8)",
		label: "status-info-8",
	},
	{
		regex: /rgba\(33,\s*150,\s*243,\s*0\.15\)/g,
		token: "var(--status-info-15)",
		label: "status-info-15",
	},
	{
		regex: /rgba\(33,\s*150,\s*243,\s*0\.3\)/g,
		token: "var(--status-info-30)",
		label: "status-info-30",
	},
	{
		regex: /rgba\(33,\s*150,\s*243,\s*0\.4\)/g,
		token: "var(--status-info-40)",
		label: "status-info-40",
	},
	{
		regex: /rgba\(0,122,255,0\.2\)/g,
		token: "var(--action-primary-bg)",
		label: "action-primary-bg",
	},
	{
		regex: /rgba\(59,\s*130,\s*246,\s*0\.02\)/g,
		token: "var(--action-primary-bg)",
		label: "action-primary-bg",
	},
	{
		regex: /rgba\(244,\s*67,\s*54,\s*0\.7\)/g,
		token: "var(--status-error)",
		label: "status-error",
	},
	{
		regex: /rgba\(244,\s*67,\s*54,\s*0\)/g,
		token: "transparent",
		label: "transparent",
	},

	// ── Shadow patterns (single-value) ──
	{
		regex: /rgba\(0,\s*0,\s*0,\s*0\.08\)/g,
		token: "var(--shadow-medium)",
		label: "shadow-medium",
	},
	{
		regex: /rgba\(0,\s*0,\s*0,\s*0\.1\)/g,
		token: "var(--shadow-appbar)",
		label: "shadow-appbar",
	},
	{
		regex: /rgba\(0,\s*0,\s*0,\s*0\.15\)/g,
		token: "var(--shadow-strong)",
		label: "shadow-strong",
	},

	// ── Specific compound shadows (exact match) ──
	{
		regex: /0 1px 3px rgba\(0,\s*0,\s*0,\s*0\.12\),\s*0 1px 2px rgba\(0,\s*0,\s*0,\s*0\.24\)/g,
		token: "var(--shadow-md)",
		label: "shadow-md compound",
	},
	{
		regex: /0 4px 6px -1px rgba\(0,\s*0,\s*0,\s*0\.05\),\s*0 2px 4px -1px rgba\(0,\s*0,\s*0,\s*0\.03\)/g,
		token: "var(--shadow-sm)",
		label: "shadow-sm compound",
	},
	{
		regex: /0 20px 25px -5px rgba\(0,\s*0,\s*0,\s*0\.1\),\s*0 10px 10px -5px rgba\(0,\s*0,\s*0,\s*0\.04\)/g,
		token: "var(--shadow-xl)",
		label: "shadow-xl compound",
	},
	{
		regex: /0px 4px 20px rgba\(0,\s*0,\s*0,\s*0\.08\)/g,
		token: "var(--shadow-medium)",
		label: "shadow-medium (BaseCard)",
	},
	{
		regex: /0 4px 12px rgba\(0,\s*0,\s*0,\s*0\.05\)/g,
		token: "var(--shadow-light)",
		label: "shadow-light",
	},
	{
		regex: /0 8px 32px rgba\(0,\s*0,\s*0,\s*0\.12\)/g,
		token: "var(--shadow-strong)",
		label: "shadow-strong (QueueModal)",
	},
	{
		regex: /0 8px 32px 0 rgba\(31,\s*38,\s*135,\s*0\.37\)/g,
		token: "var(--shadow-strong)",
		label: "shadow-strong (Login glass)",
	},
	{
		regex: /0 10px 25px rgba\(0,\s*0,\s*0,\s*0\.1\)/g,
		token: "var(--shadow-lg)",
		label: "shadow-lg",
	},
	{
		regex: /0 4px 20px 0 rgba\(0,\s*0,\s*0,\s*0\.12\)/g,
		token: "var(--shadow-strong)",
		label: "shadow-strong (FlowManager)",
	},
	{
		regex: /0 4px 20px 0 rgba\(0,\s*0,\s*0,\s*0\.05\)/g,
		token: "var(--shadow-light)",
		label: "shadow-light (PublicProtocol)",
	},
	{
		regex: /0 20px 40px rgba\(0,\s*0,\s*0,\s*0\.15\)/g,
		token: "var(--shadow-xl)",
		label: "shadow-xl (Dashboard)",
	},
];

// ── SKIP: arquivos que definem os próprios tokens (não migrar) ──
const SKIP_PATHS = [
	"theme/tokens/semantic.js",
	"theme/tokens/primitives.js",
	"theme/tokens/components.js",
	"theme/bridge.js",
	"theme/loader.js",
	"hooks/useThemeTokens.js",
	"scripts/migrate-rgba-to-tokens.js",
];

function walkDir(dir) {
	let results = [];
	const entries = fs.readdirSync(dir, { withFileTypes: true });
	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			results = results.concat(walkDir(fullPath));
		} else if (entry.name.endsWith(".js")) {
			results.push(fullPath);
		}
	}
	return results;
}

function shouldSkip(filePath) {
	return SKIP_PATHS.some((skip) => filePath.includes(skip));
}

// ── Main ──
const SRC_DIR = path.join(__dirname, "..", "frontend", "src");
const allFiles = walkDir(SRC_DIR);

let totalReplacements = 0;
let totalFilesChanged = 0;
const warnings = [];
const changedFiles = [];

for (const filePath of allFiles) {
	if (shouldSkip(filePath)) continue;

	let content = fs.readFileSync(filePath, "utf-8");
	const original = content;
	let fileReplacements = 0;

	for (const rule of REPLACEMENTS) {
		const matches = content.match(rule.regex);
		if (matches) {
			fileReplacements += matches.length;
			content = content.replace(rule.regex, rule.token);
		}
	}

	if (content !== original) {
		fs.writeFileSync(filePath, content, "utf-8");
		totalFilesChanged++;
		totalReplacements += fileReplacements;
		changedFiles.push(path.relative(SRC_DIR, filePath));
	}

	// ── Detect remaining rgba() that were NOT replaced ──
	const remainingRgba = content.match(/rgba\([^)]+\)/g);
	if (remainingRgba) {
		const unique = [...new Set(remainingRgba)];
		for (const rgba of unique) {
			warnings.push({
				file: path.relative(SRC_DIR, filePath),
				unmapped: rgba,
			});
		}
	}
}

// ── Report ──
console.log("═══════════════════════════════════════════════");
console.log("  MIGRAÇÃO rgba() → var(--token) — RELATÓRIO");
console.log("═══════════════════════════════════════════════");
console.log(`  Arquivos analisados:  ${allFiles.length}`);
console.log(`  Arquivos modificados: ${totalFilesChanged}`);
console.log(`  Substituições feitas: ${totalReplacements}`);
console.log(`  Pendências (manual):  ${warnings.length}`);
console.log("═══════════════════════════════════════════════");

if (changedFiles.length > 0) {
	console.log("\n✅ Arquivos atualizados:");
	changedFiles.forEach((f) => console.log(`   ${f}`));
}

if (warnings.length > 0) {
	console.log("\n⚠️  rgba() NÃO mapeados — revisão manual necessária:");
	const grouped = {};
	warnings.forEach((w) => {
		if (!grouped[w.unmapped]) grouped[w.unmapped] = [];
		grouped[w.unmapped].push(w.file);
	});
	for (const [rgba, files] of Object.entries(grouped)) {
		console.log(`\n   ${rgba} (${files.length} ocorrências)`);
		files.slice(0, 5).forEach((f) => console.log(`     → ${f}`));
		if (files.length > 5) console.log(`     ... e mais ${files.length - 5} arquivos`);
	}
}

console.log("\n═══════════════════════════════════════════════");
console.log("  FIM DO RELATÓRIO");
console.log("═══════════════════════════════════════════════");
