/**
 * ESLint configuration — Watink Frontend
 *
 * Stack: React 17 + Vite + MUI v4 (em migracao para shadcn/ui + Tailwind)
 * Plugin local: watink-design-system (Design System governance)
 */
"use strict";

const path = require("path");

module.exports = {
	env: {
		browser: true,
		es2021: true,
		node: true,
	},
	extends: ["eslint:recommended", "plugin:react/recommended", "plugin:react-hooks/recommended"],
	parserOptions: {
		ecmaVersion: "latest",
		sourceType: "module",
		ecmaFeatures: {
			jsx: true,
		},
	},
	plugins: [
		"react",
		"react-hooks",
		// Local plugin — resolves via file: link in package.json
		"watink-design-system",
	],
	settings: {
		react: {
			version: "detect",
		},
	},
	rules: {
		// ── Design System Governance ──
		"watink-design-system/no-hardcoded-colors": [
			"error",
			{
				exemptPatterns: ["ColorPicker", "FlowBuilder", "tagColors", "MainListItems"],
			},
		],

		// ── Migration Guard (ADR-001) ──
		"watink-design-system/no-make-styles": "error",

		// ── React ──
		"react/prop-types": "off",
		"react/react-in-jsx-scope": "off",
		"react/no-unescaped-entities": "off",

		// ── Code Quality ──
		"no-console": ["warn", { allow: ["warn", "error"] }],
		"no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
		"prefer-const": "warn",
		"no-var": "error",
	},
	overrides: [
		{
			// Legacy MUI v4 components — exempt from migration guard
			files: ["src/components/legacy/**/*", "src/theme/bridge.js"],
			rules: {
				"watink-design-system/no-make-styles": "off",
			},
		},
		{
			// Config files & scripts exempt from DS rule
			files: ["vite.config.*", "copy-assets.*", "sync-embed-go.*", "*.config.js"],
			rules: {
				"watink-design-system/no-hardcoded-colors": "off",
			},
		},
	],
	ignorePatterns: [
		"build/",
		"node_modules/",
		"dist/",
		"public/",
		"*.min.js",
	],
};
