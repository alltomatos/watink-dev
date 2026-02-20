/* @jsxImportSource react */
import React, { createContext, useState, useContext, useMemo, useEffect } from "react";
import PropTypes from "prop-types";
import { createTheme, ThemeProvider as MUIThemeProvider } from "@material-ui/core/styles";
import { CssBaseline } from "@material-ui/core";
import { zhCN, ptBR, esES } from "@material-ui/core/locale";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
	const [darkMode, setDarkMode] = useState(false);
	const [appTheme, setAppTheme] = useState("apple");
	const [locale, setLocale] = useState(ptBR);

	useEffect(() => {
		const storedTheme = localStorage.getItem("appTheme");
		if (storedTheme) {
			setAppTheme(storedTheme);
		} else {
            setAppTheme("apple");
            localStorage.setItem("appTheme", "apple");
        }
	}, []);

	const toggleTheme = () => {
		setDarkMode(prevMode => !prevMode);
	};

	const theme = useMemo(() => {
		return createTheme({
			palette: {
				type: darkMode ? "dark" : "light",
				primary: { main: "#007AFF" },
				secondary: { main: "#8E8E93" },
				background: {
					default: darkMode ? "#000000" : "#F2F2F7",
					paper: darkMode ? "#1C1C1E" : "#FFFFFF",
				},
				text: {
					primary: darkMode ? "#FFFFFF" : "#1D1D1F",
					secondary: darkMode ? "#A1A1A6" : "#86868B",
				}
			},
			typography: {
				fontFamily: "'Inter', '-apple-system', sans-serif",
                button: { textTransform: "none", fontWeight: 600 },
			},
			shape: { borderRadius: 12 },
            overrides: {
                MuiButton: {
                    root: { borderRadius: 12, padding: "8px 20px" },
                    containedPrimary: {
                        background: "linear-gradient(180deg, #007AFF 0%, #0063E6 100%)",
                        boxShadow: "0 4px 14px 0 rgba(0,118,255,0.39)",
                    }
                },
                MuiPaper: {
                    rounded: { borderRadius: 20 },
                    elevation1: { boxShadow: "0 4px 12px rgba(0,0,0,0.03)" },
                },
                MuiTab: {
                    root: { textTransform: "none", fontWeight: 600 },
                }
            }
		}, locale);
	}, [darkMode, locale]);

	const contextValue = useMemo(() => ({
		darkMode,
		toggleTheme,
		appTheme,
		setAppTheme: (v) => { setAppTheme(v); localStorage.setItem("appTheme", v); }
	}), [darkMode, appTheme]);

	return (
		<ThemeContext.Provider value={contextValue}>
			<MUIThemeProvider theme={theme}>
				<CssBaseline />
				{children}
			</MUIThemeProvider>
		</ThemeContext.Provider>
	);
};

export default ThemeProvider;
export const useThemeContext = () => useContext(ThemeContext);
