#!/usr/bin/env node
/**
 * no-hardcoded-colors — Custom ESLint rule for Watink Design System
 *
 * Detects hardcoded color values in JSX and makeStyles/style objects.
 * Enforces usage of CSS variables (var(--token)) or useThemeTokens hook.
 *
 * WHY: 55+ files were migrated from hex/rgba to tokens. Without this guard,
 * developers will inadvertently re-introduce hardcoded colors during feature work.
 *
 * Allowed patterns:
 * - var(--token-name)               → CSS variable (reactive, correct)
 * - primitives reference (p.xxx)    → only inside theme/tokens/ directory
 * - Comments                        → ignored
 * - Data format strings (ColorPicker) → exempted via color-data-exempt marker comment.
 *
 * Blocked patterns:
 * - #fff, #007AFF, #333333          → hex literals
 * - rgba(0,0,0,0.1)                 → rgba literals (except dynamic template literals with intentional comment)
 * - rgb(255,255,255)                → rgb literals
 * - hsl(210, 10%, 30%)              → hsl literals
 */

"use strict";

const COLOR_HEX_REGEX = /(?<=[="'`\s(,])#([0-9a-fA-F]{3,8})\b/g;
const COLOR_RGBA_REGEX = /\brgba?\s*\(/g;
const COLOR_HSL_REGEX = /\bhsla?\s*\(/g;

/** Files/patterns that are exempt from this rule */
const EXEMPT_PATTERNS = [
	/theme\/tokens\//,           // Token definitions themselves
	/theme\/bridge\.js/,         // Bridge needs hex for MUI palette
	/theme\/loader\.js/,         // Loader applies token values
	/scripts\//,                 // Build/migration scripts
	/ColorPicker/,               // ColorPicker hex is data format
	/node_modules\//,            // Dependencies
	/\.test\./,                  // Test files
	/\.spec\./,                  // Spec files
	/helpers\/tagColors\.js/,   // Hex is data format (tag color map)
	/layout\/MainListItems\.js/, // Hex is data format (nav icon tint map)
	/pages\/FlowBuilder\//,     // Deferred to Phase 2
	/legacy\//,                  // Frozen legacy code
	/TicketsList\/index\.js/,    // Dynamic template literals
	/WebchatModal\/index\.js/,  // WhatsApp brand branding
	/HelpdeskReports\.js/,       // Chart data colors
	/PipelineKPIs\.js/,          // Chart data colors
];

const RULE_META = {
	type: "suggestion",
	docs: {
		description: "Disallow hardcoded color values; use Design System tokens instead",
		category: "Best Practices",
		recommended: true,
	},
	fixable: null,
	schema: [
		{
			type: "object",
			properties: {
				exemptPatterns: { type: "array", items: { type: "string" } },
			},
			additionalProperties: false,
		},
	],
	messages: {
		hexColor: "Hardcoded hex color `{{color}}` — use `var(--token)` or `useThemeTokens` instead. See semantic.js for available tokens.",
		rgbaColor: "Hardcoded rgba/rgb color — use `var(--token)` or `useThemeTokens` instead. See semantic.js for overlay/status tokens.",
		hslColor: "Hardcoded hsl/hsla color — use `var(--token)` or `useThemeTokens` instead.",
	},
};

function isExempted(filePath, options = {}) {
	const builtIn = EXEMPT_PATTERNS; // already RegExp
	const userDefined = (options.exemptPatterns || []).map((p) => new RegExp(p));
	const patterns = [...builtIn, ...userDefined];
	return patterns.some((p) => p.test(filePath));
}

function isInsideComment(node, sourceCode) {
	if (!node || !sourceCode) return false;
	const comments = sourceCode.getAllComments();
	const nodeStart = node.range ? node.range[0] : node.start;
	const nodeEnd = node.range ? node.range[1] : node.end;
	return comments.some(
		(c) => nodeStart >= c.range[0] && nodeEnd <= c.range[1]
	);
}

function createRule(context) {
	const filePath = context.getFilename();
	const options = context.options[0] || {};

	if (isExempted(filePath, options)) return {};

	const sourceCode = context.getSourceCode();

	return {
		Literal(node) {
			if (typeof node.value !== "string") return;
			if (isInsideComment(node, sourceCode)) return;

			const raw = node.raw;

			// Check for hex colors
			let match;
			const hexRegex = new RegExp(COLOR_HEX_REGEX.source, COLOR_HEX_REGEX.flags);
			while ((match = hexRegex.exec(raw)) !== null) {
				context.report({
					node,
					messageId: "hexColor",
					data: { color: match[0] },
				});
			}

			// Check for rgba/rgb
			if (COLOR_RGBA_REGEX.test(raw)) {
				context.report({
					node,
					messageId: "rgbaColor",
				});
			}

			// Check for hsl/hsla — skip hsl(var(--token)) which is a valid token reference
			if (COLOR_HSL_REGEX.test(raw) && !/\bhsla?\s*\(\s*var\s*\(/.test(raw)) {
				context.report({
					node,
					messageId: "hslColor",
				});
			}
		},

		TemplateElement(node) {
			if (!node.value || !node.value.cooked) return;
			const raw = node.value.raw;

			// Only flag in static parts of template literals
			const hexRegex = new RegExp(COLOR_HEX_REGEX.source, COLOR_HEX_REGEX.flags);
			if (hexRegex.test(raw)) {
				context.report({
					node,
					messageId: "hexColor",
					data: { color: "hex in template" },
				});
			}
		},
	};
}

module.exports = {
	meta: RULE_META,
	create: createRule,
};
