/**
 * ThemeContext — orchestrator for CSS design tokens
 *
 * - applyThemeTokens() sets CSS variables on :root consumed by var(--token) in components
 * - System preference detection on init (prefers-color-scheme: dark)
 * - brand overrides enable white-labeling per tenant
 */

import React, {
  createContext,
  useState,
  useContext,
  useMemo,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { applyThemeTokens } from "../../theme/loader";

interface BrandOverrides {
  primary?: string;
  secondary?: string;
  [key: string]: string | undefined;
}

interface ThemeContextValue {
  darkMode: boolean;
  toggleTheme: () => void;
  setDarkMode: (v: boolean) => void;
  appTheme: string;
  setAppTheme: (v: string) => void;
  setBrand: (b: BrandOverrides) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const getInitialDarkMode = (): boolean => {
  const stored = localStorage.getItem("darkMode");
  if (stored !== null) return stored === "true";
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ?? false;
};

const VALID_THEMES = ["apple", "google", "whatsapp", "saas"];

const getInitialAppTheme = (): string => {
  const stored = localStorage.getItem("appTheme");
  // Migra temas legados (valores inválidos) para o padrão google
  if (!stored || !VALID_THEMES.includes(stored)) {
    localStorage.setItem("appTheme", "google");
    return "google";
  }
  return stored;
};

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [darkMode, setDarkMode] = useState<boolean>(getInitialDarkMode);
  const [appTheme, setAppThemeState] = useState<string>(getInitialAppTheme);
  const [brand, setBrand] = useState<BrandOverrides>({});

  const toggleTheme = useCallback(() => {
    setDarkMode((prev) => {
      const next = !prev;
      localStorage.setItem("darkMode", String(next));
      return next;
    });
  }, []);

  const setDarkModeValue = useCallback((v: boolean) => {
    setDarkMode(v);
    localStorage.setItem("darkMode", String(v));
  }, []);

  const setAppTheme = useCallback((v: string) => {
    setAppThemeState(v);
    localStorage.setItem("appTheme", v);
  }, []);

  useEffect(() => {
    applyThemeTokens({
      mode: darkMode ? "dark" : "light",
      appTheme,
      brand,
    });
  }, [darkMode, appTheme, brand]);

  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      darkMode,
      toggleTheme,
      setDarkMode: setDarkModeValue,
      appTheme,
      setAppTheme,
      setBrand,
    }),
    [darkMode, toggleTheme, setDarkModeValue, appTheme, setAppTheme, setBrand]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;

export const useThemeContext = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeContext must be used inside ThemeProvider");
  return ctx;
};
