/* @jsxImportSource react */
import React, { useState, useEffect } from "react";
import Routes from "./routes";

import { createTheme, ThemeProvider } from "@material-ui/core/styles";
import { ptBR } from "@material-ui/core/locale";

import StatusCheck from "./components/StatusCheck";

const App = () => {
	const [locale, setLocale] = useState();

	const theme = createTheme(
		{
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
				primary: { main: "#2576d2" },
			},
		},
		locale
	);

	useEffect(() => {
		const i18nlocale = localStorage.getItem("i18nextLng") || "pt-BR";
		const normalized = String(i18nlocale);

		// Evita crash quando i18nextLng estiver ausente/corrompido
		const browserLocale = normalized.includes("-")
			? normalized.substring(0, 2) + normalized.substring(3, 5)
			: normalized;

		if (browserLocale === "ptBR") {
			setLocale(ptBR);
		}
	}, []);

	return (
		<ThemeProvider theme={theme}>
			<Routes />
		</ThemeProvider>
	);
};

export default App;