import {
  appleLight,
  appleDark,
  whatsappLight,
  whatsappDark,
  googleLight,
  googleDark,
  saasLight,
  saasDark,
} from './tokens/semantic';
import { componentTokens } from './tokens/components';

// ──────────────────────────────────────────────
// Theme preset registry
// ──────────────────────────────────────────────
const presets = {
  apple:     { light: appleLight,     dark: appleDark },
  google:    { light: googleLight,    dark: googleDark },
  whatsapp:  { light: whatsappLight, dark: whatsappDark },
  saas:      { light: saasLight,      dark: saasDark },
};

const resolvePreset = (appTheme = 'apple', mode = 'light') => {
  const family = presets[appTheme] || presets.apple;
  return family[mode] || family.light;
};

// ──────────────────────────────────────────────
// CSS Variable injection
// ──────────────────────────────────────────────
const setCssVars = (tokens) => {
  const root = document.documentElement;
  Object.entries(tokens).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value);
  });
};

// ──────────────────────────────────────────────
// Public API
// ──────────────────────────────────────────────
/**
 * Apply design tokens to the document root.
 *
 * @param {Object}  opts
 * @param {'light'|'dark'}  opts.mode      — Dark mode toggle
 * @param {'apple'|'whatsapp'|'saas'|'google'} opts.appTheme — Visual family
 * @param {Object}  opts.brand             — Runtime brand overrides (legacy compat)
 * @param {string}  opts.brand.primary
 * @param {string}  opts.brand.primaryHover
 * @param {string}  opts.brand.sidebarBg
 */
export const applyThemeTokens = ({
  mode = 'light',
  appTheme = 'apple',
  brand = {},
} = {}) => {
  // 1. Semantic tokens from preset
  const semanticTokens = resolvePreset(appTheme, mode);
  setCssVars(semanticTokens);

  // 2. Component tokens (always the same — they reference semantic vars)
  setCssVars(componentTokens);

  // 3. Brand overrides (runtime white-label, takes precedence)
  if (brand.primary) {
    document.documentElement.style.setProperty('--action-primary', brand.primary);
  }
  if (brand.primaryHover) {
    document.documentElement.style.setProperty('--action-primary-hover', brand.primaryHover);
  }
  if (brand.sidebarBg) {
    document.documentElement.style.setProperty('--bg-sidebar', brand.sidebarBg);
  }

  // 4. Data attributes for CSS selectors
  document.documentElement.dataset.theme = mode;
  document.documentElement.dataset.appTheme = appTheme;
};

export default applyThemeTokens;
