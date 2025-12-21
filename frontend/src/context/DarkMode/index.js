import React, { createContext, useState, useContext, useMemo, useEffect } from "react";
import PropTypes from "prop-types";
import { createMuiTheme, ThemeProvider as MUIThemeProvider } from "@material-ui/core/styles";
import { CssBaseline } from "@material-ui/core";
import { zhCN, ptBR, esES } from "@material-ui/core/locale";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
	const [darkMode, setDarkMode] = useState(false);
	const [appTheme, setAppTheme] = useState("whaticket");
	const [locale, setLocale] = useState(ptBR);

	useEffect(() => {
		const storedTheme = localStorage.getItem("appTheme");
		if (storedTheme) {
			setAppTheme(storedTheme);
		}
		const i18nlocale = localStorage.getItem("i18nextLng");
		const browserLocale = i18nlocale?.substring(0, 2) + i18nlocale?.substring(3, 5);

		if (browserLocale === "ptBR") {
			setLocale(ptBR);
		} else if (browserLocale === "esES") {
			setLocale(esES);
		} else if (browserLocale === "zhCN") {
			setLocale(zhCN);
		}
	}, []);

	const toggleTheme = () => {
		setDarkMode(prevMode => !prevMode);
	};

	const handleSetAppTheme = (newTheme) => {
		setAppTheme(newTheme);
		localStorage.setItem("appTheme", newTheme);
	};

	const theme = useMemo(() => {
		if (appTheme === "saas") {
			return createMuiTheme({
				palette: {
					type: darkMode ? "dark" : "light",
					primary: { main: "#6366f1" }, // Vibrant Indigo (Tailwind 500)
					background: {
						default: darkMode ? "#0f172a" : "#f1f5f9", // Slate 900 / Slate 100
						paper: darkMode ? "#1e293b" : "#ffffff", // Slate 800 / White
					},
					text: {
						primary: darkMode ? "#f8fafc" : "#334155", // Slate 50 / Slate 700
						secondary: darkMode ? "#94a3b8" : "#64748b", // Slate 400 / Slate 500
					},
				},
				typography: {
					fontFamily: "'Inter', sans-serif",
					h1: { fontWeight: 700 }, // Bolder headings
					h6: { fontWeight: 600, fontSize: "1.1rem" },
					body1: { fontSize: "0.925rem", lineHeight: 1.5 },
				},
				shape: { borderRadius: 16 }, // Even softer corners
				overrides: {
					MuiButton: {
						root: {
							textTransform: "none",
							fontWeight: 600,
							borderRadius: 12, // Distinct button radius
							boxShadow: "none",
							"&:hover": { boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)" }, // Soft shadow on hover
						},
						containedPrimary: {
							background: "linear-gradient(to right, #6366f1, #4f46e5)", // Gradient Buttons
						},
					},
					MuiPaper: {
						root: { backgroundImage: "none" },
						elevation1: { boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)" },
					},
					MuiDrawer: {
						paper: {
							borderRight: "1px solid rgba(0,0,0,0.05)",
							backgroundColor: darkMode ? "#1e293b" : "#ffffff",
						},
					},
					MuiListItem: {
						root: {
							"&.Mui-selected": {
								background: darkMode
									? "linear-gradient(to right, rgba(99, 102, 241, 0.2), rgba(99, 102, 241, 0.05))"
									: "linear-gradient(to right, #eff6ff, #ffffff)",
								borderLeft: "4px solid #6366f1",
								color: "#6366f1",
								"& .MuiListItemIcon-root": {
									color: "#6366f1",
								},
							},
						},
						button: {
							"&:hover": {
								backgroundColor: darkMode ? "rgba(255,255,255,0.05)" : "#f8fafc",
							},
						},
					},
					MuiListItemIcon: {
						root: {
							color: darkMode ? "#94a3b8" : "#64748b",
							minWidth: "40px", // More compact
						},
					},
					MuiDialog: {
						paper: {
							backgroundColor: darkMode ? "rgba(30, 41, 59, 0.85)" : "rgba(255, 255, 255, 0.85)", // More opaque for better readability
							backdropFilter: "blur(16px)",
							borderRadius: 24,
						},
					},
				},
			}, locale);
		}

		// Corporate Theme
		if (appTheme === "corporate") {
			return createMuiTheme({
				palette: {
					type: darkMode ? "dark" : "light",
					primary: { main: "#1e40af" }, // Corporate Blue
					secondary: { main: "#0f172a" }, // Navy Dark
					success: { main: "#16a34a" },
					warning: { main: "#d97706" },
					error: { main: "#dc2626" },
					background: {
						default: darkMode ? "#0f172a" : "#f1f5f9", // Slate 100
						paper: darkMode ? "#1e293b" : "#ffffff",
					},
					text: {
						primary: darkMode ? "#f8fafc" : "#1e293b", // Slate 800
						secondary: darkMode ? "#94a3b8" : "#64748b", // Slate 500
					},
					divider: darkMode ? "#334155" : "#e2e8f0",
				},
				typography: {
					fontFamily: "'Inter', sans-serif",
					h1: { fontWeight: 700, letterSpacing: "-0.025em" },
					h2: { fontWeight: 700, letterSpacing: "-0.025em" },
					h3: { fontWeight: 600 },
					h4: { fontWeight: 600 },
					h5: { fontWeight: 600 },
					h6: { fontWeight: 600, fontSize: "1.1rem" },
					body1: { fontSize: "0.925rem", lineHeight: 1.6 },
					body2: { fontSize: "0.875rem", lineHeight: 1.5 },
					button: { fontWeight: 600 },
				},
				shape: { borderRadius: 8 },
				overrides: {
					MuiCssBaseline: {
						"@global": {
							body: {
								backgroundColor: darkMode ? "#0f172a" : "#f1f5f9",
							},
						},
					},
					MuiButton: {
						root: {
							textTransform: "none",
							fontWeight: 600,
							borderRadius: 8,
							boxShadow: "none",
							"&:hover": { boxShadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)" },
						},
						containedPrimary: {
							backgroundColor: "#1e40af",
							"&:hover": { backgroundColor: "#1d4ed8" },
						},
					},
					MuiPaper: {
						root: { backgroundImage: "none" },
						elevation1: { boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)" },
						rounded: { borderRadius: 12 },
					},
					MuiCard: {
						root: {
							borderRadius: 12,
							border: darkMode ? "1px solid #334155" : "1px solid #e2e8f0",
							boxShadow: "none",
						},
					},
					MuiDrawer: {
						paper: {
							backgroundColor: "#4f46e5",
							color: "#ffffff",
							borderRight: "none",
						},
					},
					MuiAppBar: {
						colorPrimary: {
							backgroundColor: darkMode ? "#1e293b" : "#ffffff",
							color: darkMode ? "#f8fafc" : "#1e293b",
							boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
						},
					},
					MuiListItem: {
						root: {
							borderRadius: 8,
							marginBottom: 4,
							"&.Mui-selected": {
								backgroundColor: "rgba(255, 255, 255, 0.2)",
								color: "#ffffff",
								"& .MuiListItemIcon-root": { color: "#ffffff" },
								"&:hover": { backgroundColor: "rgba(255, 255, 255, 0.25)" },
							},
						},
						button: {
							color: "#ffffff",
							"&:hover": {
								backgroundColor: "rgba(255, 255, 255, 0.15)",
								color: "#ffffff",
							},
						},
					},
					MuiListItemIcon: {
						root: {
							color: "inherit",
							minWidth: 40,
						},
					},
					MuiListItemText: {
						primary: {
							fontWeight: 500,
						},
					},
					MuiDialog: {
						paper: {
							borderRadius: 16,
							boxShadow: "0 25px 50px -12px rgb(0 0 0 / 0.25)",
						},
					},
					MuiTableHead: {
						root: {
							backgroundColor: darkMode ? "#1e293b" : "#f8fafc",
							"& .MuiTableCell-head": {
								fontWeight: 600,
								color: darkMode ? "#94a3b8" : "#475569",
								textTransform: "uppercase",
								fontSize: "0.75rem",
								letterSpacing: "0.05em",
							},
						},
					},
					MuiTableCell: {
						root: {
							borderBottom: darkMode ? "1px solid #334155" : "1px solid #e2e8f0",
						},
					},
					MuiOutlinedInput: {
						root: {
							borderRadius: 8,
							"&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#1e40af" },
							"&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#1e40af", borderWidth: 2 },
						},
					},
					MuiChip: {
						root: {
							borderRadius: 6,
							fontWeight: 500,
						},
					},
					MuiTooltip: {
						tooltip: {
							backgroundColor: "#1e293b",
							color: "#f8fafc",
							fontSize: "0.75rem",
							borderRadius: 6,
						},
					},
				},
			}, locale);
		}

		return createMuiTheme({
			scrollbarStyles: {
				"&::-webkit-scrollbar": {
					width: "8px",
					height: "8px",
				},
				"&::-webkit-scrollbar-thumb": {
					boxShadow: "inset 0 0 6px rgba(0, 0, 0, 0.3)",
					backgroundColor: "#e8e8e8",
				},
			},
			palette: {
				type: darkMode ? "dark" : "light",
				primary: { main: "#2576d2" },
			},
		}, locale);
	}, [darkMode, appTheme, locale]);

	const contextValue = useMemo(() => ({
		darkMode,
		toggleTheme,
		appTheme,
		setAppTheme: handleSetAppTheme
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

ThemeProvider.propTypes = {
	children: PropTypes.node.isRequired,
};

export const useThemeContext = () => useContext(ThemeContext);
