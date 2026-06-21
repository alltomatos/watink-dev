import { useEffect, useState } from "react";
import api from "../../../services/api";
import pluginApi from "../../../services/pluginApi";

interface MainSidebarState {
  activePlugins: string[];
  systemLogo: string;
  systemTitle: string;
  logoEnabled: boolean;
}

export function useMainSidebar(): MainSidebarState {
  const [activePlugins, setActivePlugins] = useState<string[]>([]);
  const [systemLogo, setSystemLogo] = useState("");
  const [systemTitle, setSystemTitle] = useState("Watink");
  const [logoEnabled, setLogoEnabled] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await api.get("/settings");
        const settings = Array.isArray(data) ? data : [];
        const logo = settings.find((s: { key: string; value: string }) => s.key === "systemLogo");
        const title = settings.find((s: { key: string; value: string }) => s.key === "systemTitle");
        const enabled = settings.find((s: { key: string; value: string }) => s.key === "systemLogoEnabled");

        if (logo?.value) setSystemLogo(logo.value);
        if (title?.value) setSystemTitle(title.value);
        if (enabled) setLogoEnabled(enabled.value === "true");
      } catch {
        // silence — settings fetch is non-critical
      }
    };

    const fetchPlugins = async () => {
      try {
        const { data } = await pluginApi.get("/plugins/installed");
        setActivePlugins(data.active || []);
      } catch {
        // silent error
      }
    };

    fetchSettings();
    fetchPlugins();
  }, []);

  return { activePlugins, systemLogo, systemTitle, logoEnabled };
}
