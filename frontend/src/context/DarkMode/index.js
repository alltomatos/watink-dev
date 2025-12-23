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
					primary: { main: "#6366f1" }, // Vibrant Indigo
					secondary: { main: "#8b5cf6" }, // Violet
					success: { main: "#22c55e" },
					warning: { main: "#f59e0b" },
					error: { main: "#ef4444" },
					background: {
						default: darkMode ? "#0f172a" : "#f1f5f9", // Slate 900 / Slate 100
						paper: darkMode ? "#1e293b" : "#ffffff", // Slate 800 / White
					},
					text: {
						primary: darkMode ? "#f8fafc" : "#334155", // Slate 50 / Slate 700
						secondary: darkMode ? "#94a3b8" : "#64748b", // Slate 400 / Slate 500
					},
					divider: darkMode ? "#334155" : "#e2e8f0",
				},
				typography: {
					fontFamily: "'Inter', sans-serif",
					h1: { fontWeight: 700 },
					h2: { fontWeight: 700 },
					h3: { fontWeight: 600 },
					h4: { fontWeight: 600 },
					h5: { fontWeight: 600 },
					h6: { fontWeight: 600, fontSize: "1.1rem" },
					body1: { fontSize: "0.925rem", lineHeight: 1.5 },
					body2: { fontSize: "0.875rem", lineHeight: 1.43 },
					button: { fontWeight: 600, textTransform: "none" },
				},
				shape: { borderRadius: 16 },
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
							borderRadius: 12,
							boxShadow: "none",
							"&:hover": { boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)" },
						},
						containedPrimary: {
							background: "linear-gradient(to right, #6366f1, #4f46e5)",
							"&:hover": { background: "linear-gradient(to right, #4f46e5, #4338ca)" },
						},
					},
					MuiPaper: {
						root: { backgroundImage: "none" },
						elevation1: { boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)" },
						rounded: { borderRadius: 16 },
					},
					MuiCard: {
						root: {
							borderRadius: 16,
							border: darkMode ? "1px solid #334155" : "1px solid #e2e8f0",
							boxShadow: "none",
						},
					},
					MuiDrawer: {
						paper: {
							backgroundColor: darkMode ? "#1e293b" : "#ffffff",
							color: darkMode ? "#f8fafc" : "#334155",
							borderRight: darkMode ? "1px solid #334155" : "1px solid rgba(0,0,0,0.05)",
						},
					},
					MuiAppBar: {
						colorPrimary: {
							backgroundColor: darkMode ? "#1e293b" : "#ffffff",
							color: darkMode ? "#f8fafc" : "#334155",
							boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1)",
						},
					},
					MuiListItem: {
						root: {
							borderRadius: 8,
							"&.Mui-selected": {
								background: darkMode
									? "linear-gradient(to right, rgba(99, 102, 241, 0.2), rgba(99, 102, 241, 0.05))"
									: "linear-gradient(to right, #eff6ff, #ffffff)",
								borderLeft: "4px solid #6366f1",
								color: "#6366f1",
								"& .MuiListItemIcon-root": { color: "#6366f1" },
								"&:hover": { backgroundColor: darkMode ? "rgba(99, 102, 241, 0.25)" : "#e0e7ff" },
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
							minWidth: 40,
						},
					},
					MuiListItemText: {
						primary: {
							fontWeight: 500,
							color: darkMode ? "#f8fafc" : "#334155",
						},
						secondary: {
							color: darkMode ? "#94a3b8" : "#64748b",
						},
					},
					MuiDialog: {
						paper: {
							backgroundColor: darkMode ? "rgba(30, 41, 59, 0.95)" : "rgba(255, 255, 255, 0.95)",
							backdropFilter: "blur(16px)",
							borderRadius: 24,
						},
					},
					MuiTableHead: {
						root: {
							backgroundColor: darkMode ? "#1e293b" : "#f8fafc",
							"& .MuiTableCell-head": {
								fontWeight: 600,
								color: darkMode ? "#94a3b8" : "#64748b",
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
							borderRadius: 12,
							backgroundColor: darkMode ? "#0f172a" : "#f8fafc",
							"&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#6366f1" },
							"&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#6366f1", borderWidth: 2 },
						},
						notchedOutline: {
							borderColor: darkMode ? "#334155" : "#e2e8f0",
						},
					},
					MuiChip: {
						root: {
							borderRadius: 8,
							fontWeight: 500,
						},
						colorPrimary: {
							background: "linear-gradient(to right, #6366f1, #4f46e5)",
							color: "#ffffff",
						},
					},
					MuiTooltip: {
						tooltip: {
							backgroundColor: "#1e293b",
							color: "#f8fafc",
							fontSize: "0.75rem",
							borderRadius: 8,
						},
					},
					MuiFab: {
						primary: {
							background: "linear-gradient(to right, #6366f1, #4f46e5)",
							"&:hover": { background: "linear-gradient(to right, #4f46e5, #4338ca)" },
						},
					},
					MuiAvatar: {
						colorDefault: {
							backgroundColor: darkMode ? "#334155" : "#e2e8f0",
							color: darkMode ? "#94a3b8" : "#64748b",
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
					MuiFab: {
						primary: {
							backgroundColor: "#1e40af",
							"&:hover": { backgroundColor: "#1d4ed8" },
						},
					},
					MuiAvatar: {
						colorDefault: {
							backgroundColor: darkMode ? "#334155" : "#e2e8f0",
							color: darkMode ? "#94a3b8" : "#64748b",
						},
					},
				},
			}, locale);
		}

		// WhatsApp Theme
		if (appTheme === "whatsapp") {
			return createMuiTheme({
				palette: {
					type: darkMode ? "dark" : "light",
					primary: { main: "#25D366" },  // Verde WhatsApp
					secondary: { main: "#128C7E" }, // Teal secundário
					success: { main: "#25D366" },
					warning: { main: "#FFB300" },
					error: { main: "#F15C6D" },
					background: {
						default: darkMode ? "#0B141A" : "#ECE5DD",  // Fundo bege clássico
						paper: darkMode ? "#1F2C34" : "#FFFFFF",
					},
					text: {
						primary: darkMode ? "#E9EDEF" : "#303030",
						secondary: darkMode ? "#8696A0" : "#667781",
					},
					divider: darkMode ? "#2A3942" : "#E9EDEF",
				},
				typography: {
					fontFamily: "'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif",
					h1: { fontWeight: 600 },
					h2: { fontWeight: 600 },
					h3: { fontWeight: 600 },
					h4: { fontWeight: 600 },
					h5: { fontWeight: 600 },
					h6: { fontWeight: 600, fontSize: "1.1rem" },
					body1: { fontSize: "0.9375rem", lineHeight: 1.5 },
					body2: { fontSize: "0.875rem", lineHeight: 1.43 },
					button: { fontWeight: 500, textTransform: "none" },
				},
				shape: { borderRadius: 8 },
				overrides: {
					MuiCssBaseline: {
						"@global": {
							body: {
								backgroundColor: darkMode ? "#0B141A" : "#ECE5DD",
							},
						},
					},
					MuiButton: {
						root: {
							textTransform: "none",
							fontWeight: 500,
							borderRadius: 8,
							boxShadow: "none",
							"&:hover": { boxShadow: "none" },
						},
						containedPrimary: {
							backgroundColor: "#25D366",
							"&:hover": { backgroundColor: "#1DA851" },
						},
					},
					MuiPaper: {
						root: { backgroundImage: "none" },
						elevation1: { boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1)" },
						rounded: { borderRadius: 8 },
					},
					MuiCard: {
						root: {
							borderRadius: 8,
							border: darkMode ? "1px solid #2A3942" : "1px solid #E9EDEF",
							boxShadow: "none",
						},
					},
					MuiDrawer: {
						paper: {
							backgroundColor: darkMode ? "#111B21" : "#FFFFFF",
							color: darkMode ? "#E9EDEF" : "#303030",
							borderRight: darkMode ? "1px solid #2A3942" : "1px solid #E9EDEF",
						},
					},
					MuiAppBar: {
						colorPrimary: {
							backgroundColor: darkMode ? "#1F2C34" : "#075E54",
							color: "#FFFFFF",
							boxShadow: "none",
						},
					},
					MuiListItem: {
						root: {
							borderRadius: 0,
							"&.Mui-selected": {
								backgroundColor: darkMode ? "#2A3942" : "#F0F2F5",
								borderLeft: "4px solid #25D366",
								"& .MuiListItemIcon-root": { color: "#25D366" },
								"&:hover": { backgroundColor: darkMode ? "#3B4A54" : "#E9EDEF" },
							},
						},
						button: {
							"&:hover": {
								backgroundColor: darkMode ? "#202C33" : "#F5F6F6",
							},
						},
					},
					MuiListItemIcon: {
						root: {
							color: darkMode ? "#8696A0" : "#54656F",
							minWidth: 40,
						},
					},
					MuiListItemText: {
						primary: {
							fontWeight: 500,
							color: darkMode ? "#E9EDEF" : "#303030",
						},
						secondary: {
							color: darkMode ? "#8696A0" : "#667781",
						},
					},
					MuiDialog: {
						paper: {
							borderRadius: 12,
							backgroundColor: darkMode ? "#1F2C34" : "#FFFFFF",
						},
					},
					MuiTableHead: {
						root: {
							backgroundColor: darkMode ? "#1F2C34" : "#F0F2F5",
							"& .MuiTableCell-head": {
								fontWeight: 600,
								color: darkMode ? "#8696A0" : "#54656F",
								textTransform: "uppercase",
								fontSize: "0.75rem",
								letterSpacing: "0.05em",
							},
						},
					},
					MuiTableCell: {
						root: {
							borderBottom: darkMode ? "1px solid #2A3942" : "1px solid #E9EDEF",
						},
					},
					MuiOutlinedInput: {
						root: {
							borderRadius: 8,
							backgroundColor: darkMode ? "#2A3942" : "#F0F2F5",
							"&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#25D366" },
							"&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#25D366", borderWidth: 2 },
						},
						notchedOutline: {
							borderColor: darkMode ? "#3B4A54" : "#E9EDEF",
						},
					},
					MuiChip: {
						root: {
							borderRadius: 16,
							fontWeight: 500,
						},
						colorPrimary: {
							backgroundColor: "#25D366",
							color: "#FFFFFF",
						},
					},
					MuiTooltip: {
						tooltip: {
							backgroundColor: "#1F2C34",
							color: "#E9EDEF",
							fontSize: "0.8125rem",
							borderRadius: 6,
						},
					},
					MuiFab: {
						primary: {
							backgroundColor: "#25D366",
							"&:hover": { backgroundColor: "#1DA851" },
						},
					},
					MuiAvatar: {
						colorDefault: {
							backgroundColor: darkMode ? "#2A3942" : "#DFE5E7",
							color: darkMode ? "#8696A0" : "#54656F",
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
					backgroundColor: darkMode ? "#4a5568" : "#e8e8e8",
				},
			},
			palette: {
				type: darkMode ? "dark" : "light",
				primary: { main: "#2576d2" },
				secondary: { main: "#7c3aed" },
				success: { main: "#22c55e" },
				warning: { main: "#f59e0b" },
				error: { main: "#ef4444" },
				background: {
					default: darkMode ? "#1a202c" : "#f7fafc",
					paper: darkMode ? "#2d3748" : "#ffffff",
				},
				text: {
					primary: darkMode ? "#f7fafc" : "#2d3748",
					secondary: darkMode ? "#a0aec0" : "#718096",
				},
				divider: darkMode ? "#4a5568" : "#e2e8f0",
			},
			typography: {
				fontFamily: "'Roboto', 'Helvetica', 'Arial', sans-serif",
				h1: { fontWeight: 600 },
				h2: { fontWeight: 600 },
				h3: { fontWeight: 600 },
				h4: { fontWeight: 600 },
				h5: { fontWeight: 600 },
				h6: { fontWeight: 600, fontSize: "1.1rem" },
				body1: { fontSize: "0.9375rem", lineHeight: 1.5 },
				body2: { fontSize: "0.875rem", lineHeight: 1.43 },
				button: { fontWeight: 500, textTransform: "none" },
			},
			shape: { borderRadius: 8 },
			overrides: {
				MuiCssBaseline: {
					"@global": {
						body: {
							backgroundColor: darkMode ? "#1a202c" : "#f7fafc",
						},
					},
				},
				MuiButton: {
					root: {
						textTransform: "none",
						fontWeight: 500,
						borderRadius: 8,
						boxShadow: "none",
						"&:hover": { boxShadow: "0 2px 4px 0 rgba(0,0,0,0.1)" },
					},
					containedPrimary: {
						backgroundColor: "#2576d2",
						"&:hover": { backgroundColor: "#1e63b5" },
					},
				},
				MuiPaper: {
					root: { backgroundImage: "none" },
					elevation1: { boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1)" },
					rounded: { borderRadius: 8 },
				},
				MuiCard: {
					root: {
						borderRadius: 8,
						border: darkMode ? "1px solid #4a5568" : "1px solid #e2e8f0",
						boxShadow: "none",
					},
				},
				MuiDrawer: {
					paper: {
						backgroundColor: darkMode ? "#2d3748" : "#ffffff",
						color: darkMode ? "#f7fafc" : "#2d3748",
						borderRight: darkMode ? "1px solid #4a5568" : "1px solid #e2e8f0",
					},
				},
				MuiAppBar: {
					colorPrimary: {
						backgroundColor: darkMode ? "#2d3748" : "#2576d2",
						color: "#ffffff",
						boxShadow: "0 1px 3px 0 rgba(0,0,0,0.1)",
					},
				},
				MuiListItem: {
					root: {
						borderRadius: 4,
						"&.Mui-selected": {
							backgroundColor: darkMode ? "#4a5568" : "#e3f2fd",
							borderLeft: "4px solid #2576d2",
							"& .MuiListItemIcon-root": { color: "#2576d2" },
							"&:hover": { backgroundColor: darkMode ? "#4a5568" : "#bbdefb" },
						},
					},
					button: {
						"&:hover": {
							backgroundColor: darkMode ? "#4a5568" : "#f0f4f8",
						},
					},
				},
				MuiListItemIcon: {
					root: {
						color: darkMode ? "#a0aec0" : "#718096",
						minWidth: 40,
					},
				},
				MuiListItemText: {
					primary: {
						fontWeight: 500,
						color: darkMode ? "#f7fafc" : "#2d3748",
					},
					secondary: {
						color: darkMode ? "#a0aec0" : "#718096",
					},
				},
				MuiDialog: {
					paper: {
						borderRadius: 12,
						backgroundColor: darkMode ? "#2d3748" : "#ffffff",
					},
				},
				MuiTableHead: {
					root: {
						backgroundColor: darkMode ? "#2d3748" : "#f7fafc",
						"& .MuiTableCell-head": {
							fontWeight: 600,
							color: darkMode ? "#a0aec0" : "#718096",
							textTransform: "uppercase",
							fontSize: "0.75rem",
							letterSpacing: "0.05em",
						},
					},
				},
				MuiTableCell: {
					root: {
						borderBottom: darkMode ? "1px solid #4a5568" : "1px solid #e2e8f0",
					},
				},
				MuiOutlinedInput: {
					root: {
						borderRadius: 8,
						backgroundColor: darkMode ? "#1a202c" : "#ffffff",
						"&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#2576d2" },
						"&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#2576d2", borderWidth: 2 },
					},
					notchedOutline: {
						borderColor: darkMode ? "#4a5568" : "#e2e8f0",
					},
				},
				MuiChip: {
					root: {
						borderRadius: 8,
						fontWeight: 500,
					},
					colorPrimary: {
						backgroundColor: "#2576d2",
						color: "#ffffff",
					},
				},
				MuiTooltip: {
					tooltip: {
						backgroundColor: "#2d3748",
						color: "#f7fafc",
						fontSize: "0.8125rem",
						borderRadius: 6,
					},
				},
				MuiFab: {
					primary: {
						backgroundColor: "#2576d2",
						"&:hover": { backgroundColor: "#1e63b5" },
					},
				},
				MuiAvatar: {
					colorDefault: {
						backgroundColor: darkMode ? "#4a5568" : "#e2e8f0",
						color: darkMode ? "#a0aec0" : "#718096",
					},
				},
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
