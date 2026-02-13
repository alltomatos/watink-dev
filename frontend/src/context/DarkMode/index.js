import React, { createContext, useState, useContext, useMemo, useEffect } from "react";
import PropTypes from "prop-types";
import { createTheme, ThemeProvider as MUIThemeProvider } from "@material-ui/core/styles";
import { CssBaseline } from "@material-ui/core";
import { zhCN, ptBR, esES } from "@material-ui/core/locale";

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
	const [darkMode, setDarkMode] = useState(false);
	const [appTheme, setAppTheme] = useState("apple"); // Apple First by default
	const [locale, setLocale] = useState(ptBR);

	useEffect(() => {
		const storedTheme = localStorage.getItem("appTheme");
		if (storedTheme && ["whaticket", "whatsapp", "google", "apple"].includes(storedTheme)) {
			setAppTheme(storedTheme);
		} else {
			localStorage.setItem("appTheme", "apple");
			setAppTheme("apple");
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
		// Premium Shared Typography & Shape
		const premiumTypography = {
			fontFamily: "'Inter', 'Segoe UI', Roboto, sans-serif",
			h1: { fontWeight: 700 },
			h2: { fontWeight: 700 },
			h3: { fontWeight: 600 },
			h4: { fontWeight: 600 },
			h5: { fontWeight: 600 },
			h6: { fontWeight: 600, fontSize: "1.1rem" },
			body1: { fontSize: "0.925rem", lineHeight: 1.5 },
			body2: { fontSize: "0.875rem", lineHeight: 1.43 },
			button: { fontWeight: 600, textTransform: "none" },
		};

		const premiumOverrides = (palette, darkMode) => ({
			MuiCssBaseline: {
				"@global": {
					body: {
						backgroundColor: palette.background.default,
						transition: "background-color 0.3s ease",
						"&::-webkit-scrollbar": { width: "8px", height: "8px" },
						"&::-webkit-scrollbar-thumb": {
							backgroundColor: darkMode ? "#475569" : "#cbd5e1",
							borderRadius: "10px",
						},
					},
				},
			},
			MuiButton: {
				root: {
					borderRadius: 12,
					padding: "8px 20px",
					transition: "all 0.2s ease-in-out",
				},
				containedPrimary: {
					boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
					"&:hover": { boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)" },
				},
			},
			MuiPaper: {
				rounded: { borderRadius: 16 },
				elevation1: { boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)" },
			},
			MuiCard: {
				root: {
					borderRadius: 16,
					boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
					border: darkMode ? "1px solid #334155" : "1px solid #e2e8f0",
				}
			},
			MuiDialog: {
				paper: {
					borderRadius: 24,
					backdropFilter: "blur(16px)",
					backgroundColor: darkMode ? "rgba(30, 41, 59, 0.9)" : "rgba(255, 255, 255, 0.9)",
				}
			},
			MuiOutlinedInput: {
				root: { borderRadius: 12 },
			},
		});

		if (appTheme === "whatsapp") {
			const palette = {
				type: darkMode ? "dark" : "light",
				primary: { main: darkMode ? "#25D366" : "#00A884", contrastText: "#FFFFFF" },
				secondary: { main: darkMode ? "#0B806A" : "#128C7E" },
				success: { main: "#25D366" },
				background: {
					default: darkMode ? "#0B141A" : "#EEF3F7",
					paper: darkMode ? "#111B21" : "#FFFFFF",
				},
				text: {
					primary: darkMode ? "#E9EDEF" : "#111B21",
					secondary: darkMode ? "#8696A0" : "#54656F",
				},
				action: {
					hover: darkMode ? "rgba(233, 237, 239, 0.08)" : "rgba(17, 27, 33, 0.06)",
					selected: darkMode ? "rgba(37, 211, 102, 0.16)" : "rgba(0, 168, 132, 0.14)",
					focus: darkMode ? "rgba(37, 211, 102, 0.3)" : "rgba(0, 168, 132, 0.28)",
				},
				divider: darkMode ? "#22303A" : "#D8E1E8",
			};

			return createTheme({
				palette,
				typography: {
					fontFamily: "'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
					h1: { fontWeight: 700 },
					h2: { fontWeight: 700 },
					h3: { fontWeight: 600 },
					h4: { fontWeight: 600 },
					h5: { fontWeight: 600 },
					h6: { fontWeight: 600, fontSize: "1.05rem" },
					body1: { fontSize: "0.9375rem", lineHeight: 1.55 },
					body2: { fontSize: "0.875rem", lineHeight: 1.5 },
					button: { fontWeight: 600, textTransform: "none" },
				},
				shape: { borderRadius: 12 },
				overrides: {
					...premiumOverrides(palette, darkMode),
					MuiCssBaseline: {
						"@global": {
							body: {
								backgroundColor: palette.background.default,
								backgroundImage: darkMode
									? "linear-gradient(180deg, #0B141A 0%, #111B21 100%)"
									: "linear-gradient(180deg, #EEF3F7 0%, #E6EDF2 100%)",
								backgroundAttachment: "fixed",
								backgroundSize: "cover",
								"&::-webkit-scrollbar": { width: "8px", height: "8px" },
								"&::-webkit-scrollbar-thumb": {
									backgroundColor: darkMode ? "#2A3942" : "#C9D5DD",
									borderRadius: 8,
								},
							},
							"*:focus-visible": {
								outline: `2px solid ${palette.primary.main}`,
								outlineOffset: 2,
							},
							".wa-bubble-left": {
								position: "relative",
								backgroundColor: (darkMode ? "#202C33" : "#FFFFFF") + " !important",
								color: (darkMode ? "#E9EDEF" : "#111B21") + " !important",
								borderRadius: "8px !important",
								padding: "6px 7px 8px 9px !important",
								boxShadow: "0 1px 0.5px rgba(11, 20, 26, 0.13) !important",
								margin: "0 !important",
							},
							".wa-bubble-left-tail": {
								borderRadius: "0 8px 8px 8px !important",
								"&::before": {
									content: '""',
									position: "absolute",
									top: 0,
									left: -8,
									width: 8,
									height: 13,
									backgroundColor: darkMode ? "#202C33" : "#FFFFFF",
									clipPath: "polygon(100% 0, 0 0, 100% 100%)",
								}
							},
							".wa-bubble-right": {
								position: "relative",
								backgroundColor: (darkMode ? "#005C4B" : "#D9FDD3") + " !important",
								color: (darkMode ? "#E9EDEF" : "#111B21") + " !important",
								borderRadius: "8px !important",
								padding: "6px 9px 8px 7px !important",
								boxShadow: "0 1px 0.5px rgba(11, 20, 26, 0.13) !important",
								margin: "0 !important",
							},
							".wa-bubble-right-tail": {
								borderRadius: "8px 0 8px 8px !important",
								"&::before": {
									content: '""',
									position: "absolute",
									top: 0,
									right: -8,
									width: 8,
									height: 13,
									backgroundColor: darkMode ? "#005C4B" : "#D9FDD3",
									clipPath: "polygon(0 0, 100% 0, 0 100%)",
								}
							}
						},
					},
					MuiAppBar: {
						colorPrimary: {
							backgroundColor: darkMode ? "rgba(17, 27, 33, 0.92)" : "rgba(255, 255, 255, 0.94)",
							color: palette.text.primary,
							boxShadow: darkMode ? "0 1px 0 rgba(255,255,255,0.04)" : "0 1px 0 rgba(0,0,0,0.05)",
							backdropFilter: "blur(14px)",
							borderBottom: `1px solid ${palette.divider}`,
						},
					},
					MuiDrawer: {
						paper: {
							backgroundColor: darkMode ? "#111B21" : "#F8FBFD",
							color: palette.text.primary,
							borderRight: `1px solid ${palette.divider}`,
						},
					},
					MuiListItem: {
						root: {
							borderRadius: 10,
							margin: "4px 8px",
							padding: "10px 12px",
							color: palette.text.secondary,
							transition: "background-color 0.2s ease, color 0.2s ease, box-shadow 0.2s ease",
							"& .MuiListItemIcon-root": { color: "inherit" },
							"&.Mui-selected": {
								backgroundColor: palette.action.selected,
								color: palette.text.primary,
								"& .MuiListItemIcon-root": { color: palette.primary.main },
								"&:hover": { backgroundColor: palette.action.selected },
							},
							"&:hover": { backgroundColor: palette.action.hover, color: palette.text.primary },
							"&.Mui-focusVisible": {
								boxShadow: `0 0 0 2px ${palette.action.focus}`,
							},
						},
					},
					MuiListItemIcon: { root: { minWidth: 38 } },
					MuiButton: {
						root: {
							borderRadius: 10,
							textTransform: "none",
							fontWeight: 600,
							"&.Mui-focusVisible": { boxShadow: `0 0 0 3px ${palette.action.focus}` },
						},
						containedPrimary: {
							backgroundColor: palette.primary.main,
							color: palette.primary.contrastText,
							boxShadow: darkMode ? "0 8px 18px rgba(37, 211, 102, 0.22)" : "0 8px 16px rgba(0, 168, 132, 0.2)",
							"&:hover": { backgroundColor: darkMode ? "#20BD5B" : "#018A6D" },
						},
					},
					MuiPaper: {
						rounded: { borderRadius: 14 },
						elevation1: {
							boxShadow: darkMode ? "0 2px 14px rgba(0, 0, 0, 0.2)" : "0 2px 12px rgba(15, 37, 53, 0.08)",
							border: `1px solid ${palette.divider}`,
						},
					},
					MuiCard: {
						root: {
							borderRadius: 14,
							border: `1px solid ${palette.divider}`,
							boxShadow: darkMode ? "0 4px 18px rgba(0,0,0,0.18)" : "0 6px 20px rgba(15, 37, 53, 0.08)",
						}
					},
					MuiOutlinedInput: {
						root: {
							borderRadius: 10,
							backgroundColor: darkMode ? "#1B2A33" : "#FFFFFF",
							"& fieldset": { borderColor: palette.divider },
							"&:hover fieldset": { borderColor: palette.text.secondary },
							"&.Mui-focused fieldset": { borderColor: palette.primary.main, borderWidth: 2 },
						},
					},
					MuiSwitch: {
						colorPrimary: {
							"&.Mui-checked": { color: palette.primary.main },
							"&.Mui-checked + .MuiSwitch-track": { backgroundColor: palette.primary.main, opacity: 0.5 },
						}
					},
					MuiDivider: {
						root: { backgroundColor: palette.divider }
					}
				},
			}, locale);
		}

		if (appTheme === "google") {
			const palette = {
				type: darkMode ? "dark" : "light",
				primary: { main: darkMode ? "#8AB4F8" : "#1A73E8" },
				secondary: { main: "#5F6368" },
				background: {
					default: darkMode ? "#202124" : "#ffffff",
					paper: darkMode ? "#2d2e31" : "#f1f3f4",
				},
				divider: darkMode ? "#3c4043" : "#dadce0",
			};
			return createTheme({
				palette,
				typography: premiumTypography,
				shape: { borderRadius: 16 },
				overrides: {
					...premiumOverrides(palette, darkMode),
					MuiButton: {
						root: { borderRadius: 24 },
					},
					MuiListItem: {
						root: {
							borderRadius: "0 24px 24px 0",
							margin: "4px 8px 4px 0",
							"&.Mui-selected": {
								backgroundColor: darkMode ? "rgba(138, 180, 248, 0.12)" : "#e8f0fe",
								color: darkMode ? "#8ab4f8" : "#1967d2",
							},
						},
					},
				},
			}, locale);
		}

		if (appTheme === "apple") {
			const palette = {
				type: darkMode ? "dark" : "light",
				primary: { main: "#007AFF" },
				secondary: { main: darkMode ? "#98989D" : "#8E8E93" },
				background: {
					default: darkMode ? "#000000" : "#F2F2F7",
					paper: darkMode ? "rgba(28, 28, 30, 0.72)" : "rgba(255, 255, 255, 0.72)",
				},
				divider: darkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.04)",
				text: {
					primary: darkMode ? "#FFFFFF" : "#1D1D1F",
					secondary: darkMode ? "#A1A1A6" : "#86868B",
				}
			};
			return createTheme({
				palette,
				typography: {
					...premiumTypography,
					fontFamily: "'Inter', '-apple-system', 'BlinkMacSystemFont', 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif",
				},
				shape: { borderRadius: 12 },
				overrides: {
					...premiumOverrides(palette, darkMode),
					MuiCssBaseline: {
						"@global": {
							body: {
								backgroundColor: palette.background.default,
								backgroundImage: darkMode 
									? "linear-gradient(180deg, #1A1625 0%, #0F0C16 100%)"
									: "linear-gradient(180deg, #F8F7FF 0%, #EFE9FF 100%)",
								backgroundAttachment: "fixed",
								backgroundSize: "cover",
								"&::-webkit-scrollbar": { width: "10px", height: "10px" },
								"&::-webkit-scrollbar-track": {
									backgroundColor: "rgba(0, 0, 0, 0)",
								},
								"&::-webkit-scrollbar-thumb": {
									backgroundColor: darkMode ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.1)",
									borderRadius: "10px",
									border: "3px solid transparent",
									backgroundClip: "content-box",
									"&:hover": {
										backgroundColor: darkMode ? "rgba(255, 255, 255, 0.25)" : "rgba(0, 0, 0, 0.2)",
									}
								},
							},
						},
					},
					MuiAppBar: {
						colorPrimary: {
							backgroundColor: "rgba(0, 0, 0, 0)",
							backdropFilter: "none",
							color: darkMode ? "#FFFFFF" : "#000000",
							boxShadow: "none",
							borderBottom: "none",
						},
					},
					MuiDrawer: {
						paper: {
							backgroundColor: "rgba(0, 0, 0, 0)",
							backdropFilter: "none",
							borderRight: "none",
						},
					},
					MuiPaper: {
						root: {
							backgroundColor: darkMode ? "rgba(28, 28, 30, 0.72)" : "rgba(255, 255, 255, 0.72)",
							backdropFilter: "blur(32px) saturate(200%)",
							WebkitBackdropFilter: "blur(32px) saturate(200%)",
						},
						rounded: { borderRadius: 20 },
						elevation1: { boxShadow: "0 4px 12px rgba(0,0,0,0.03)" },
						elevation8: { boxShadow: "0 10px 40px rgba(0,0,0,0.12)" },
					},
					MuiButton: {
						root: {
							borderRadius: 12,
							fontWeight: 600,
							textTransform: "none",
							transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
							padding: "10px 24px",
						},
						containedPrimary: {
							boxShadow: "0 4px 14px 0 rgba(0,118,255,0.39)",
							backgroundImage: "linear-gradient(180deg, #007AFF 0%, #0063E6 100%)",
							"&:hover": {
								boxShadow: "0 6px 20px rgba(0,118,255,0.23)",
								backgroundImage: "linear-gradient(180deg, #007AFF 0%, #0056CC 100%)",
							},
							"&:active": {
								transform: "scale(0.97)",
							},
						},
						outlined: {
							border: darkMode ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.1)",
							backgroundColor: "rgba(0, 0, 0, 0)",
							"&:hover": {
								backgroundColor: darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.02)",
								border: darkMode ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(0,0,0,0.2)",
							}
						}
					},
					MuiListItem: {
						root: {
							borderRadius: 12,
							margin: "4px 12px",
							padding: "12px 18px",
							transition: "all 0.2s ease",
							"&.Mui-selected": {
								backgroundColor: "#007AFF",
								color: "#FFFFFF",
								boxShadow: "inset 0 1px 1px rgba(255,255,255,0.2), 0 4px 12px rgba(0, 122, 255, 0.3)",
								"& .MuiListItemIcon-root": {
									color: "#FFFFFF",
								},
								"&:hover": {
									backgroundColor: "#0071EB",
								}
							},
							"&:hover": {
								backgroundColor: darkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.03)",
							}
						},
					},
					MuiListItemIcon: {
						root: {
							minWidth: 38,
						}
					},
					MuiDialog: {
						paper: {
							borderRadius: 28,
							backgroundColor: darkMode ? "rgba(44, 44, 46, 0.82)" : "rgba(255, 255, 255, 0.82)",
							backdropFilter: "blur(50px) saturate(210%)",
							border: darkMode ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(255,255,255,0.45)",
							boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
						},
					},
					MuiCard: {
						root: {
							borderRadius: 24,
							border: "none",
							backgroundColor: darkMode ? "rgba(28, 28, 30, 0.6)" : "rgba(255, 255, 255, 0.6)",
							boxShadow: "0 10px 30px 0 rgba(0, 0, 0, 0.06)",
							backdropFilter: "blur(20px) saturate(180%)",
						}
					},
					MuiTable: {
						root: {
							backgroundColor: "rgba(0, 0, 0, 0)",
							borderCollapse: "separate",
							borderSpacing: "0 10px",
							padding: "0 10px",
						}
					},
					MuiTableCell: {
						root: {
							padding: "16px 24px",
							borderBottom: "none",
							"&:first-child": {
								borderRadius: "16px 0 0 16px",
							},
							"&:last-child": {
								borderRadius: "0 16px 16px 0",
							},
						},
						head: {
							fontWeight: 700,
							fontSize: "0.75rem",
							color: palette.text.secondary,
							textTransform: "uppercase",
							letterSpacing: "0.1em",
							borderBottom: "none",
							padding: "4px 24px 12px 24px",
						},
						body: {
							fontSize: "0.9rem",
						}
					},
					MuiTableRow: {
						root: {
							backgroundColor: darkMode ? "rgba(255, 255, 255, 0.04)" : "rgba(255, 255, 255, 0.6)",
							backdropFilter: "blur(10px)",
							transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
							"&.MuiTableRow-hover:hover": {
								backgroundColor: darkMode ? "rgba(255, 255, 255, 0.08)" : "rgba(255, 255, 255, 0.9)",
								transform: "translateY(-2px)",
								boxShadow: "0 8px 20px rgba(0,0,0,0.05)",
							},
						}
					},
					MuiTextField: {
						root: {
							"& .MuiOutlinedInput-root": {
								borderRadius: 12,
								backgroundColor: darkMode ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.02)",
								transition: "all 0.2s ease",
								"& fieldset": {
									borderColor: "rgba(0, 0, 0, 0)",
								},
								"&:hover fieldset": {
									borderColor: darkMode ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)",
								},
								"&.Mui-focused": {
									backgroundColor: darkMode ? "rgba(255, 255, 255, 0.06)" : "#FFFFFF",
									boxShadow: "0 0 0 4px rgba(0, 122, 255, 0.1)",
									"& fieldset": {
										borderColor: palette.primary.main,
										borderWidth: 1.5,
									},
								},
							},
						},
					},
					MuiTab: {
						root: {
							textTransform: "none",
							fontWeight: 600,
							fontSize: "0.95rem",
						}
					},
				},
			}, locale);
		}

		// Fallback (whaticket)
		const fallbackPalette = {
			type: darkMode ? "dark" : "light",
			primary: { main: "#2576d2" },
			background: {
				default: darkMode ? "#1a202c" : "#f7fafc",
				paper: darkMode ? "#2d3748" : "#ffffff",
			},
		};
		return createTheme({
			palette: fallbackPalette,
			typography: premiumTypography,
			shape: { borderRadius: 16 },
			overrides: premiumOverrides(fallbackPalette, darkMode),
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
