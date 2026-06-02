/**
 * eslint-plugin-watink-design-system — Local ESLint plugin for Watink Design System governance.
 *
 * Regras:
 *   - no-hardcoded-colors: bloqueia hex/rgba/hsl literais fora dos diretórios isentos.
 *
 * Instalação: apontar .eslintrc.js → plugins: ["watink-design-system"]
 * (resolve via eslint-plugin-* convention com plugin local file:)
 */
"use strict";

const noHardcodedColors = require("./no-hardcoded-colors");

module.exports = {
	rules: {
		"no-hardcoded-colors": noHardcodedColors,
	},
	configs: {
		recommended: {
			plugins: ["watink-design-system"],
			rules: {
				"watink-design-system/no-hardcoded-colors": "warn",
			},
		},
	},
};
