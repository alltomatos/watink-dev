/**
 * ThemeContext — Single orchestrator for CSS tokens + MUI v4 bridge
 *
 * MENTOR NOTES:
 * - applyThemeTokens() sets CSS variables on :root — consumed by var(--token) in components
 * - createMuiThemeBridge() feeds concrete hex to MUI's createTheme() (MUI can't parse var())
 * - Both must fire on EVERY mode/appTheme change. The useMemo + useEffect cascade guarantees this.
 * - System preference detection on init (prefers-color-scheme: dark)
 * - brand overrides enable white-labeling per tenant
 */

import React, { createContext, useState, useContext, useMemo, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { ThemeProvider as MUIThemeProvider } from "@material-ui/core/styles";
import { CssBaseline } from "@material-ui/core";
import { ptBR, zhCN, esES } from "@material-ui/core/locale";
import { applyThemeTokens } from "../../theme/loader";
import { createMuiThemeBridge } from "../../theme/bridge";

const ThemeContext = createContext();

const LOCALE_MAP = {
	"pt-BR": ptBR,
	"zh-CN": zhCN,
	"es-ES": esES,
};

/**
 * Resolve initial dark mode:
 * 1. localStorage override (user choice)
 * 2. System preference (prefers-color-scheme)
 * 3. Default: light
 */
const getInitialDarkMode = () => {
	const stored = localStorage.getItem("darkMode");
	if (stored !== null) return stored === "true";
	if (window.matchMedia?.("(prefers-color-scheme: dark)")?.matches) return true;
	return false;
};

/**
 * Resolve initial app theme:
 * 1. localStorage override
 * 2. Default: "apple"
 */
const getInitialAppTheme = () => {
	return localStorage.getItem("appTheme") || "apple";
};

export const ThemeProvider = ({ children }) => {
	const [darkMode, setDarkMode] = useState(getInitialDarkMode);
	const [appTheme, setAppThemeState] = useState(getInitialAppTheme);
	const [locale, setLocale] = useState(ptBR);
	const [brand, setBrand] = useState({});

	// ── Persist state changes ──
	const toggleTheme = useCallback(() => {
		setDarkMode((prev) => {
			const next = !prev;
			localStorage.setItem("darkMode", String(next));
			return next;
		});
	}, []);

	const setAppTheme = useCallback((v) => {
		setAppThemeState(v);
		localStorage.setItem("appTheme", v);
	}, []);

	const setLocaleByKey = useCallback((key) => {
		setLocale(LOCALE_MAP[key] || ptBR);
	}, []);

	// ── Apply CSS tokens whenever mode or brand changes ──
	useEffect(() => {
		applyThemeTokens({
			mode: darkMode ? "dark" : "light",
			brand,
		});
	}, [darkMode, brand]);

	// ── Build MUI theme (memoized) — concrete hex for MUI internals ──
	const theme = useMemo(() => {
		return createMuiThemeBridge({ darkMode, locale });
	}, [darkMode, locale]);

	// ── Context value ──
	const contextValue = useMemo(
		() => ({
			darkMode,
			toggleTheme,
			appTheme,
			setAppTheme,
			setLocaleByKey,
			setBrand,
		}),
		[darkMode, toggleTheme, appTheme, setAppTheme, setLocaleByKey, setBrand]
	);

	return (
		<ThemeContext.Provider value={contextValue}>
			<MUIThemeProvider theme={theme}>
				<CssBaseline />
				{children}
			</MUIThemeProvider>
		</ThemeContext.Provider>
	);
};

ThemeProvider.propTypes = {
	children: PropTypes.node.isRequired,
};

export default ThemeProvider;
export const useThemeContext = () => useContext(ThemeContext);
