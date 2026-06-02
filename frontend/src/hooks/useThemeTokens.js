/**
 * useThemeTokens — Single source of truth para acessar CSS variables do Design System.
 *
 * REGRAS DE USO (Mentor):
 * 1. NUNCA use `var(--token-name)` diretamente no JSX. Use `tokens.colors.bg.default`.
 * 2. Para tokens dinâmicos (ex: status variant), use `tokens.getVar('status-success-bg')`.
 * 3. Para valores computados em makeStyles, prefira `tokens.getRaw('bg-surface')` → retorna `'var(--bg-surface)'`.
 *
 * PORQUE ISSO EXISTE:
 * - Elimina strings soltas (typo silencioso: `var(--bg-surfce)` → falha sem erro).
 * - Centraliza a mudança: se o nome do token mudar, altera aqui, não em 55 arquivos.
 * - Permite futura migração para TypeScript com autocompletar real.
 */

import { useMemo } from "react";

/**
 * Mapa canônico de tokens — espelha semantic.js + components.js
 * Cada chave retorna a string CSS `var(--token)` pronta para uso em style/makeStyles.
 */
const TOKEN_MAP = {
	// ── Backgrounds ──
	"bg-default": "var(--bg-default)",
	"bg-surface": "var(--bg-surface)",
	"bg-surface-alt": "var(--bg-surface-alt)",
	"bg-sidebar": "var(--bg-sidebar)",
	"bg-appbar": "var(--bg-appbar)",
	"bg-content": "var(--bg-content)",

	// ── Text ──
	"text-primary": "var(--text-primary)",
	"text-secondary": "var(--text-secondary)",
	"text-muted": "var(--text-muted)",
	"text-inverse": "var(--text-inverse)",
	"text-sidebar": "var(--text-sidebar)",
	"text-appbar": "var(--text-appbar)",

	// ── Action ──
	"action-primary": "var(--action-primary)",
	"action-primary-hover": "var(--action-primary-hover)",
	"action-primary-bg": "var(--action-primary-bg)",

	// ── Status ──
	"status-success": "var(--status-success)",
	"status-success-bg": "var(--status-success-bg)",
	"status-success-text": "var(--status-success-text)",
	"status-error": "var(--status-error)",
	"status-error-bg": "var(--status-error-bg)",
	"status-error-text": "var(--status-error-text)",
	"status-warning": "var(--status-warning)",
	"status-warning-bg": "var(--status-warning-bg)",
	"status-warning-text": "var(--status-warning-text)",
	"status-info": "var(--status-info)",
	"status-info-bg": "var(--status-info-bg)",
	"status-info-text": "var(--status-info-text)",
	"status-default-bg": "var(--status-default-bg)",
	"status-default-text": "var(--status-default-text)",

	// ── Border ──
	"border-default": "var(--border-default)",
	"border-sidebar": "var(--border-sidebar)",
	"border-appbar": "var(--border-appbar)",
	"border-logo-divider": "var(--border-logo-divider)",
	"border-divider": "var(--border-divider)",
	"border-subtle": "var(--border-subtle)",
	"border-weak": "var(--border-weak)",

	// ── Overlay patterns ──
	"overlay-light": "var(--overlay-light)",
	"overlay-medium": "var(--overlay-medium)",
	"overlay-strong": "var(--overlay-strong)",
	"overlay-dark": "var(--overlay-dark)",
	"overlay-dark-medium": "var(--overlay-dark-medium)",
	"overlay-dark-strong": "var(--overlay-dark-strong)",
	"overlay-weak": "var(--overlay-weak)",

	// ── Status opaques ──
	"status-success-10": "var(--status-success-10)",
	"status-error-10": "var(--status-error-10)",
	"status-info-4": "var(--status-info-4)",
	"status-info-8": "var(--status-info-8)",
	"status-info-15": "var(--status-info-15)",
	"status-info-30": "var(--status-info-30)",
	"status-info-40": "var(--status-info-40)",

	// ── Shadow patterns ──
	"shadow-sm": "var(--shadow-sm)",
	"shadow-md": "var(--shadow-md)",
	"shadow-lg": "var(--shadow-lg)",
	"shadow-xl": "var(--shadow-xl)",
	"shadow-sidebar-glow": "var(--shadow-sidebar-glow)",
	"shadow-appbar": "var(--shadow-appbar)",
	"shadow-light": "var(--shadow-light)",
	"shadow-medium": "var(--shadow-medium)",
	"shadow-strong": "var(--shadow-strong)",

	// ── Component ──
	"card-bg": "var(--card-bg)",
	"card-border-radius": "var(--card-border-radius)",
	"card-shadow": "var(--card-shadow)",
	"sidebar-width": "var(--sidebar-width)",
	"appbar-height": "var(--appbar-height)",
	"button-primary-bg": "var(--button-primary-bg)",
	"button-primary-text": "var(--button-primary-text)",

	// ── Motion ──
	"ease-out": "var(--ease-out)",
	"duration-normal": "var(--duration-normal)",

	// ── Message Bubbles ──
	"message-left-bg": "var(--message-left-bg)",
	"message-right-bg": "var(--message-right-bg)",
	"message-left-text": "var(--message-left-text)",
	"message-right-text": "var(--message-right-text)",
	"message-quote-bg": "var(--message-quote-bg)",
	"message-quote-text": "var(--message-quote-text)",
	"message-quote-border": "var(--message-quote-border)",
	"message-quote-side-left": "var(--message-quote-side-left)",
	"message-quote-side-right": "var(--message-quote-side-right)",
	"message-timestamp-text": "var(--message-timestamp-text)",
	"message-daily-bg": "var(--message-daily-bg)",
	"message-daily-text": "var(--message-daily-text)",
	"message-reaction-bg": "var(--message-reaction-bg)",
	"message-reaction-border": "var(--message-reaction-border)",
	"message-error-text": "var(--message-error-text)",
	"message-ack-text": "var(--message-ack-text)",

	// ── SaaS mode ──
	"message-saas-bg": "var(--message-saas-bg)",
	"message-saas-text": "var(--message-saas-text)",
	"message-saas-bg-alt": "var(--message-saas-bg-alt)",
};

/**
 * Agrupamento semântico para autocompletar em JS.
 * Uso: tokens.colors.bg.default, tokens.action.primary, etc.
 */
const groupedTokens = {
	colors: {
		bg: {
			default: TOKEN_MAP["bg-default"],
			surface: TOKEN_MAP["bg-surface"],
			surfaceAlt: TOKEN_MAP["bg-surface-alt"],
			sidebar: TOKEN_MAP["bg-sidebar"],
			appbar: TOKEN_MAP["bg-appbar"],
			content: TOKEN_MAP["bg-content"],
		},
		text: {
			primary: TOKEN_MAP["text-primary"],
			secondary: TOKEN_MAP["text-secondary"],
			muted: TOKEN_MAP["text-muted"],
			inverse: TOKEN_MAP["text-inverse"],
			sidebar: TOKEN_MAP["text-sidebar"],
			appbar: TOKEN_MAP["text-appbar"],
		},
		action: {
			primary: TOKEN_MAP["action-primary"],
			primaryHover: TOKEN_MAP["action-primary-hover"],
			primaryBg: TOKEN_MAP["action-primary-bg"],
		},
		status: {
			success: TOKEN_MAP["status-success"],
			successBg: TOKEN_MAP["status-success-bg"],
			successText: TOKEN_MAP["status-success-text"],
			error: TOKEN_MAP["status-error"],
			errorBg: TOKEN_MAP["status-error-bg"],
			errorText: TOKEN_MAP["status-error-text"],
			warning: TOKEN_MAP["status-warning"],
			warningBg: TOKEN_MAP["status-warning-bg"],
			warningText: TOKEN_MAP["status-warning-text"],
			info: TOKEN_MAP["status-info"],
			infoBg: TOKEN_MAP["status-info-bg"],
			infoText: TOKEN_MAP["status-info-text"],
			defaultBg: TOKEN_MAP["status-default-bg"],
			defaultText: TOKEN_MAP["status-default-text"],
		},
		border: {
			default: TOKEN_MAP["border-default"],
			sidebar: TOKEN_MAP["border-sidebar"],
			appbar: TOKEN_MAP["border-appbar"],
			logoDivider: TOKEN_MAP["border-logo-divider"],
			divider: TOKEN_MAP["border-divider"],
			subtle: TOKEN_MAP["border-subtle"],
			weak: TOKEN_MAP["border-weak"],
		},
		shadow: {
			sm: TOKEN_MAP["shadow-sm"],
			md: TOKEN_MAP["shadow-md"],
			lg: TOKEN_MAP["shadow-lg"],
			xl: TOKEN_MAP["shadow-xl"],
			sidebarGlow: TOKEN_MAP["shadow-sidebar-glow"],
			appbar: TOKEN_MAP["shadow-appbar"],
			light: TOKEN_MAP["shadow-light"],
			medium: TOKEN_MAP["shadow-medium"],
			strong: TOKEN_MAP["shadow-strong"],
		},
		overlay: {
			light: TOKEN_MAP["overlay-light"],
			medium: TOKEN_MAP["overlay-medium"],
			strong: TOKEN_MAP["overlay-strong"],
			dark: TOKEN_MAP["overlay-dark"],
			darkMedium: TOKEN_MAP["overlay-dark-medium"],
			darkStrong: TOKEN_MAP["overlay-dark-strong"],
			weak: TOKEN_MAP["overlay-weak"],
		},
		statusOpaque: {
			success10: TOKEN_MAP["status-success-10"],
			error10: TOKEN_MAP["status-error-10"],
			info4: TOKEN_MAP["status-info-4"],
			info8: TOKEN_MAP["status-info-8"],
			info15: TOKEN_MAP["status-info-15"],
			info30: TOKEN_MAP["status-info-30"],
			info40: TOKEN_MAP["status-info-40"],
		},
		message: {
			leftBg: TOKEN_MAP["message-left-bg"],
			rightBg: TOKEN_MAP["message-right-bg"],
			leftText: TOKEN_MAP["message-left-text"],
			rightText: TOKEN_MAP["message-right-text"],
			quoteBg: TOKEN_MAP["message-quote-bg"],
			quoteText: TOKEN_MAP["message-quote-text"],
			quoteBorder: TOKEN_MAP["message-quote-border"],
			quoteSideLeft: TOKEN_MAP["message-quote-side-left"],
			quoteSideRight: TOKEN_MAP["message-quote-side-right"],
			timestampText: TOKEN_MAP["message-timestamp-text"],
			dailyBg: TOKEN_MAP["message-daily-bg"],
			dailyText: TOKEN_MAP["message-daily-text"],
			reactionBg: TOKEN_MAP["message-reaction-bg"],
			reactionBorder: TOKEN_MAP["message-reaction-border"],
			errorText: TOKEN_MAP["message-error-text"],
			ackText: TOKEN_MAP["message-ack-text"],
			saasBg: TOKEN_MAP["message-saas-bg"],
			saasText: TOKEN_MAP["message-saas-text"],
			saasBgAlt: TOKEN_MAP["message-saas-bg-alt"],
		},
	},
	layout: {
		cardBg: TOKEN_MAP["card-bg"],
		cardBorderRadius: TOKEN_MAP["card-border-radius"],
		cardShadow: TOKEN_MAP["card-shadow"],
		sidebarWidth: TOKEN_MAP["sidebar-width"],
		appbarHeight: TOKEN_MAP["appbar-height"],
	},
	button: {
		primaryBg: TOKEN_MAP["button-primary-bg"],
		primaryText: TOKEN_MAP["button-primary-text"],
	},
	motion: {
		easeOut: TOKEN_MAP["ease-out"],
		durationNormal: TOKEN_MAP["duration-normal"],
	},
};

export const useThemeTokens = () => {
	return useMemo(
		() => ({
			...groupedTokens,

			/**
			 * Acesso direto por nome de token.
			 * Uso: tokens.getRaw('bg-default') → 'var(--bg-default)'
			 * Retorna null se o token não existir — falha explícita, não silenciosa.
			 */
			getRaw: (name) => TOKEN_MAP[name] ?? null,

			/**
			 * Acesso dinâmico para tokens compostos (ex: status variants).
			 * Uso: tokens.getVar('status-success-bg') → 'var(--status-success-bg)'
			 * Se o token não estiver no mapa, constrói a string anyway (para tokens de brand override).
			 */
			getVar: (name) => TOKEN_MAP[name] ?? `var(--${name})`,

			/**
			 * Verifica se um token existe no mapa canônico.
			 */
			has: (name) => name in TOKEN_MAP,
		}),
		[]
	);
};

export default useThemeTokens;
