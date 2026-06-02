import { createTheme } from '@material-ui/core/styles';
import { primitives as p } from './tokens/primitives';

/**
 * MUI v4 Theme Bridge — Reactive
 *
 * MUI's createTheme() internally calls decomposeColor/augmentColor on palette
 * values, which REQUIRES hex/rgb/hsl literals — CSS variables (var(--x)) are
 * NOT supported in palette props. We feed concrete hex values derived from the
 * same primitives used by semantic tokens, ensuring visual parity.
 *
 * REACTIVITY: The ThemeContext (DarkMode/index.js) calls this factory inside
 * useMemo([darkMode, locale]), so the MUI theme object is rebuilt whenever
 * darkMode changes. Combined with applyThemeTokens() in useEffect, this
 * guarantees CSS vars AND MUI internals stay in sync.
 *
 * For makeStyles overrides and component-level styling, CSS variables are safe
 * because they are never passed through MUI's color manipulation pipeline.
 */

export const createMuiThemeBridge = ({ darkMode = false, locale } = {}) => {
	const palette = darkMode
		? {
				primary: { main: p.blue[400] },      // #42A5F5 — matches --action-primary dark
				secondary: { main: p.slate[400] },    // #94A3B8 — matches --text-secondary dark
				background: {
					default: p.neutral[950],           // #030712 — matches --bg-default dark
					paper: p.slate[800],               // #1E293B — matches --bg-surface dark
				},
				text: {
					primary: p.slate[100],             // #F1F5F9 — matches --text-primary dark
					secondary: p.slate[400],           // #94A3B8 — matches --text-secondary dark
				},
			}
		: {
				primary: { main: p.blue[500] },       // matches --action-primary light
				secondary: { main: p.slate[500] },    // #64748B — matches --text-secondary light
				background: {
					default: p.slate[50],              // #F8FAFC — matches --bg-default light
					paper: p.neutral[0],               // matches --bg-surface light
				},
				text: {
					primary: p.neutral[900],           // #111827 — matches --text-primary light
					secondary: p.slate[500],           // #64748B — matches --text-secondary light
				},
			};

	return createTheme({
		/**
		 * Custom scrollbar styles — consumed by 20+ components via theme.scrollbarStyles.
		 * Uses CSS vars for colors (reactive to dark mode), hex for box-shadow
		 * (MUI's augmentColor doesn't touch boxShadow values).
		 */
		scrollbarStyles: {
			'&::-webkit-scrollbar': {
				width: '8px',
				height: '8px',
			},
			'&::-webkit-scrollbar-thumb': {
				boxShadow: darkMode
					? 'inset 0 0 6px rgba(255, 255, 255, 0.2)'
					: 'inset 0 0 6px rgba(0, 0, 0, 0.3)',
				backgroundColor: 'var(--border-default)',
			},
		},
		palette: {
			type: darkMode ? 'dark' : 'light',
			...palette,
		},
		typography: {
			fontFamily: "'Inter', '-apple-system', BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
			button: { textTransform: 'none', fontWeight: 600 },
		},
		shape: { borderRadius: 12 },
		overrides: {
			MuiButton: {
				root: { borderRadius: 12, padding: '8px 20px' },
				containedPrimary: {
					background: 'var(--button-primary-bg)',
					color: 'var(--button-primary-text)',
					boxShadow: darkMode
						? '0 4px 14px 0 rgba(66, 165, 245, 0.25)'
						: '0 4px 14px 0 rgba(0, 118, 255, 0.39)',
					'&:hover': {
						background: 'var(--action-primary-hover)',
					},
				},
			},
			MuiPaper: {
				root: { backgroundColor: 'var(--bg-surface)' },
				rounded: { borderRadius: 'var(--card-border-radius)' },
				elevation1: { boxShadow: 'var(--shadow-sm)' },
			},
			MuiTab: {
				root: { textTransform: 'none', fontWeight: 600 },
			},
		},
	}, locale);
};

export default createMuiThemeBridge;
