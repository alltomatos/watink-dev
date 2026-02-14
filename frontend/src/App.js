import React, { useState, useEffect } from "react";
import Routes from "./routes";
import api from "./services/api";
import SplashScreen from "./components/SplashScreen";

import { createTheme, ThemeProvider } from "@material-ui/core/styles";
import { ptBR } from "@material-ui/core/locale";

const App = () => {
  const [locale, setLocale] = useState();
  const [isBackendReady, setIsBackendReady] = useState(false);

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
    const browserLocale =
      i18nlocale.substring(0, 2) + i18nlocale.substring(3, 5);

    if (browserLocale === "ptBR") {
      setLocale(ptBR);
    }
  }, []);

  useEffect(() => {
    const checkBackend = async () => {
      try {
        // Agora aguardamos as configurações públicas.
        // Só liberamos a tela quando recebermos um 200 OK do backend.
        await api.get("/public-settings");
        setIsBackendReady(true);
      } catch (err) {
        // Se não houver resposta (erro de rede) ou erro do servidor (500, etc),
        // continuamos tentando até que o backend esteja estável.
        console.log("Backend not stable or reachable, retrying in 2s...");
        setTimeout(checkBackend, 2000);
      }
    };

    checkBackend();
  }, []);

  return (
    <ThemeProvider theme={theme}>
      {isBackendReady ? <Routes /> : <SplashScreen />}
    </ThemeProvider>
  );
};

export default App;
