import { createTheme } from '@material-ui/core/styles';
import { primitives as p } from './tokens/primitives';
import { typography as t } from './tokens/typography';
import { appleLight, appleDark } from './tokens/semantic';

/**
 * MUI v4 Theme Bridge — Reactive
 *
 * MUI's createTheme() internally calls decomposeColor/augmentColor on palette
 * values, which REQUIRES hex/rgb/hsl literals — CSS variables (var(--x)) are
 * NOT supported in palette props. We feed concrete hex values derived from the
 * same primitives used by semantic tokens, ensuring visual parity.
 *
 * REACTIVITY: The ThemeContext (DarkMode/index.js) calls this factory inside
 * useMemo([darkMode, appTheme, locale]), so the MUI theme object is rebuilt
 * whenever darkMode or appTheme changes. Combined with applyThemeTokens() in
 * useEffect, this guarantees CSS vars AND MUI internals stay in sync.
 *
 * THEME PRESETS:
 *   apple     — SF Pro blue-centric, rounded corners (12px)
 *   google    — Material You, blue primary (#1A73E8), rounded corners (12px)
 *   whatsapp  — WhatsApp teal (#25D366), squared corners (8px)
 *   saas      — Enterprise blue (#2563EB), rounded corners (12px)
 */

// ──────────────────────────────────────────────
// Palette presets — hex literals for MUI internals
// ──────────────────────────────────────────────
const palettePresets = {
  apple: {
    light: {
      primary: { main: appleLight['action-primary'] },
      secondary: { main: appleLight['text-secondary'] },
      background: { default: appleLight['bg-default'], paper: appleLight['bg-surface'] },
      text: { primary: appleLight['text-primary'], secondary: appleLight['text-secondary'] },
    },
    dark: {
      primary: { main: appleDark['action-primary'] },
      secondary: { main: appleDark['text-secondary'] },
      background: { default: appleDark['bg-default'], paper: appleDark['bg-surface'] },
      text: { primary: appleDark['text-primary'], secondary: appleDark['text-secondary'] },
    },
  },
  google: {
    light: {
      primary: { main: '#1A73E8' },
      secondary: { main: '#5F6368' },
      background: { default: '#F8F9FA', paper: '#FFFFFF' },
      text: { primary: '#202124', secondary: '#5F6368' },
    },
    dark: {
      primary: { main: '#8AB4F8' },
      secondary: { main: '#9AA0A6' },
      background: { default: '#202124', paper: '#2D2E30' },
      text: { primary: '#E8EAED', secondary: '#9AA0A6' },
    },
  },
  whatsapp: {
    light: {
      primary: { main: '#25D366' },
      secondary: { main: '#667781' },
      background: { default: '#ECE5DD', paper: '#FFFFFF' },
      text: { primary: '#1B2821', secondary: '#667781' },
    },
    dark: {
      primary: { main: '#25D366' },
      secondary: { main: '#8696A0' },
      background: { default: '#0B141A', paper: '#1F2C34' },
      text: { primary: '#E9EDEF', secondary: '#8696A0' },
    },
  },
  saas: {
    light: {
      primary: { main: p.blue[600] },
      secondary: { main: p.slate[500] },
      background: { default: p.slate[50], paper: p.neutral[0] },
      text: { primary: p.neutral[900], secondary: p.slate[500] },
    },
    dark: {
      primary: { main: p.blue[400] },
      secondary: { main: p.slate[400] },
      background: { default: p.slate[900], paper: p.slate[800] },
      text: { primary: p.slate[100], secondary: p.slate[400] },
    },
  },
};

// ──────────────────────────────────────────────
// Per-theme shape & shadow configuration
// ──────────────────────────────────────────────
const themeShape = {
  apple:    { borderRadius: 12 },
  google:   { borderRadius: 12 },
  whatsapp: { borderRadius: 8 },
  saas:     { borderRadius: 12 },
};

const buttonShadowMap = {
  apple: {
    light: '0 4px 14px 0 rgba(0, 118, 255, 0.39)',
    dark:  '0 4px 14px 0 rgba(66, 165, 245, 0.25)',
  },
  google: {
    light: '0 1px 3px 0 rgba(26, 115, 232, 0.3)',
    dark:  '0 1px 3px 0 rgba(138, 180, 248, 0.2)',
  },
  whatsapp: {
    light: '0 2px 8px rgba(37, 211, 102, 0.25)',
    dark:  '0 2px 8px rgba(37, 211, 102, 0.2)',
  },
  saas: {
    light: '0 4px 14px 0 rgba(37, 99, 235, 0.35)',
    dark:  '0 4px 14px 0 rgba(66, 165, 245, 0.25)',
  },
};

const mapToMuiColor = (value) => {
  if (!value || typeof value !== 'string') return value;
  if (value.startsWith('#') || value.startsWith('rgba') || value.startsWith('rgb')) {
    return value;
  }
  const parts = value.trim().split(/\s+/);
  if (parts.length === 3) {
    return `hsl(${parts[0]}, ${parts[1]}, ${parts[2]})`;
  }
  return value;
};

const resolvePalette = (appTheme, darkMode) => {
  const family = palettePresets[appTheme] || palettePresets.apple;
  return family[darkMode ? 'dark' : 'light'] || family.light;
};

export const createMuiThemeBridge = ({
  darkMode = false,
  appTheme = 'apple',
  locale,
} = {}) => {
  const rawPalette = resolvePalette(appTheme, darkMode);
  const palette = {
    primary: { main: mapToMuiColor(rawPalette.primary?.main) },
    secondary: { main: mapToMuiColor(rawPalette.secondary?.main) },
    background: {
      default: mapToMuiColor(rawPalette.background?.default),
      paper: mapToMuiColor(rawPalette.background?.paper)
    },
    text: {
      primary: mapToMuiColor(rawPalette.text?.primary),
      secondary: mapToMuiColor(rawPalette.text?.secondary)
    }
  };
  const mode = darkMode ? 'dark' : 'light';
  const shape = themeShape[appTheme] || themeShape.apple;
  const buttonShadow = (buttonShadowMap[appTheme] || buttonShadowMap.apple)[mode];

  return createTheme(
    {
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
        type: mode,
        ...palette,
      },
      typography: {
        fontFamily: t.font.primary,
        h1: {
          fontSize: t.size.h1,
          fontWeight: t.weight.bold,
          lineHeight: t.lineHeight.tight,
        },
        h2: {
          fontSize: t.size.h2,
          fontWeight: t.weight.semibold,
          lineHeight: t.lineHeight.tight,
        },
        h3: {
          fontSize: t.size.h3,
          fontWeight: t.weight.semibold,
          lineHeight: t.lineHeight.normal,
        },
        body1: {
          fontSize: t.size.body,
          lineHeight: t.lineHeight.normal,
        },
        body2: {
          fontSize: t.size.bodySmall,
          lineHeight: t.lineHeight.normal,
        },
        caption: {
          fontSize: t.size.caption,
          lineHeight: t.lineHeight.normal,
        },
        button: {
          textTransform: t.mui.button.textTransform,
          fontWeight: t.mui.button.fontWeight,
          fontSize: t.size.button,
        },
      },
      shape,
      overrides: {
        MuiButton: {
          root: {
            borderRadius: 'var(--button-radius)',
            padding: '8px 20px',
          },
          containedPrimary: {
            background: 'var(--button-primary-bg)',
            color: 'var(--button-primary-text)',
            boxShadow: buttonShadow,
            '&:hover': {
              background: 'var(--action-primary-hover)',
            },
          },
          outlined: {
            borderColor: 'var(--button-outline-border)',
            '&:hover': {
              borderColor: 'var(--button-outline-border)',
              backgroundColor: 'var(--bg-surface-alt)',
            },
          },
          containedSecondary: {
            background: 'var(--button-secondary-bg)',
            color: 'var(--text-primary)',
            boxShadow: 'none',
            '&:hover': {
              background: 'var(--border-default)',
            },
          },
        },
        MuiCard: {
          root: {
            borderRadius: 'var(--card-border-radius)',
            padding: 'var(--card-padding)',
            backgroundColor: 'var(--card-bg)',
            boxShadow: 'var(--card-shadow)',
            transition: `transform var(--duration-normal, 200ms) var(--ease-out, cubic-bezier(0.0, 0, 0.2, 1)),
					box-shadow var(--duration-normal, 200ms) var(--ease-out, cubic-bezier(0.0, 0, 0.2, 1))`,
            '&:hover': {
              transform: 'var(--card-hover-transform)',
              boxShadow: 'var(--shadow-lg)',
            },
          },
        },
        MuiTextField: {
          root: {
            '& .MuiOutlinedInput-root': {
              borderRadius: 'var(--input-radius)',
              padding: 'var(--input-padding)',
              '&.Mui-error .MuiOutlinedInput-notchedOutline': {
                borderColor: 'var(--input-error-border)',
              },
            },
          },
        },
        MuiListItem: {
          root: {
            borderRadius: 'var(--nav-item-radius)',
            minHeight: 'var(--nav-item-height)',
            '&:hover': {
              backgroundColor: 'var(--nav-item-hover-bg)',
            },
            '&.Mui-selected': {
              backgroundColor: 'var(--nav-active-bg)',
              '& .MuiListItemText-primary': {
                color: 'var(--nav-active-text)',
                fontWeight: t.weight.semibold,
              },
            },
          },
        },
        MuiPaper: {
          root: { backgroundColor: 'var(--bg-surface)' },
          rounded: { borderRadius: 'var(--card-border-radius)' },
          elevation1: { boxShadow: 'var(--shadow-sm)' },
        },
        MuiTab: {
          root: { textTransform: 'none', fontWeight: t.weight.semibold },
        },
      },
    },
    locale
  );
};

export default createMuiThemeBridge;
