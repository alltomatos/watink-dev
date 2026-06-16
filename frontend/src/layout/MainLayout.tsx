/* @jsxImportSource react */
import React, { useState, useContext, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { AuthContext } from "../context/Auth/AuthContext";
import api from "../services/api";
import { getBackendUrl } from "../helpers/urlUtils";
import openSocket from "../services/socket-io";

import MainSidebar from "../components/MainSidebar";
import MainTopBar from "../components/MainTopBar";
import UserModal from "../components/UserModal";
import BackdropLoading from "../components/BackdropLoading";
import PageTransition from "../components/PageTransition";
import { TooltipProvider } from "../components/ui/tooltip";

const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(() => window.innerWidth >= 1024);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [_systemLogo, setSystemLogo] = useState("");
  const [systemTitle, setSystemTitle] = useState("Watink");
  const [_logoEnabled, setLogoEnabled] = useState(true);
  const [frontendVersion, setFrontendVersion] = useState("");

  const { user, handleLogout, loading } = useContext(AuthContext);

  // Fecha a barra lateral ao mudar de rota em telas pequenas (mobile/tablet)
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setDrawerOpen(false);
    }
  }, [location]);

  // Adapta o drawer automaticamente com base no redimensionamento da janela
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setDrawerOpen(true);
      } else {
        setDrawerOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // ── Fetch system settings ──
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await api.get("/settings");
        const settings = Array.isArray(data) ? data : [];
        const logo = settings.find((s) => s.key === "systemLogo");
        const title = settings.find((s) => s.key === "systemTitle");
        const enabled = settings.find((s) => s.key === "systemLogoEnabled");
        const favicon = settings.find((s) => s.key === "systemFavicon");

        if (logo?.value) setSystemLogo(logo.value);
        if (title?.value) {
          setSystemTitle(title.value);
          document.title = title.value;
        }
        if (enabled) setLogoEnabled(enabled.value === "true");
        if (favicon?.value) {
          let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
          if (!link) {
            link = document.createElement("link");
            link.rel = "icon";
            document.head.appendChild(link);
          }
          link.href = getBackendUrl(favicon.value);
        }
      } catch {
        // Silent settings fetch
      }
    };
    fetchSettings();
  }, []);

  // ── Frontend version ──
  useEffect(() => {
    const loadVersion = async () => {
      try {
        const res = await fetch("/version.json", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setFrontendVersion(data?.version || "");
        }
      } catch {
        // version.json unavailable
      }
    };
    loadVersion();
  }, []);

  // ── Socket listener ──
  useEffect(() => {
    const socket = openSocket();
    if (!socket) return;
    socket.on("settings", (data: any) => {
      if (data.action === "update") {
        if (data.setting.key === "systemLogo") setSystemLogo(data.setting.value);
        if (data.setting.key === "systemTitle") {
          setSystemTitle(data.setting.value);
          document.title = data.setting.value;
        }
        if (data.setting.key === "systemLogoEnabled") setLogoEnabled(data.setting.value === "true");
        if (data.setting.key === "systemFavicon") {
          let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
          if (!link) {
            link = document.createElement("link");
            link.rel = "icon";
            document.head.appendChild(link);
          }
          link.href = getBackendUrl(data.setting.value);
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const toggleDrawer = useCallback(() => setDrawerOpen((prev) => !prev), []);

  if (loading) return <BackdropLoading />;

  return (
    <TooltipProvider>
      <div className="flex h-screen w-full bg-background overflow-hidden">
        {/* Sidebar */}
        <MainSidebar
          collapsed={!drawerOpen}
          onToggle={toggleDrawer}
        />

        {/* Main Content Area */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative">
          <MainTopBar
            user={user}
            systemTitle={systemTitle}
            frontendVersion={frontendVersion}
            onOpenUserModal={() => setUserModalOpen(true)}
            onLogout={handleLogout}
          />

          <main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-background/50 relative">
            <PageTransition>
              {children}
            </PageTransition>
          </main>
        </div>

        {/* Modals */}
        <UserModal
          open={userModalOpen}
          onClose={() => setUserModalOpen(false)}
          userId={user?.id}
        />
      </div>
    </TooltipProvider>
  );
};

export default MainLayout;
