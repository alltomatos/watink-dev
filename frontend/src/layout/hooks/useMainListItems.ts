import { useContext, useEffect, useState } from "react";
import { WhatsAppsContext } from "../../context/WhatsApp/WhatsAppsContext";
import pluginApi from "../../services/pluginApi";

interface UseMainListItemsResult {
  connectionWarning: boolean;
  activePlugins: string[];
}

export function useMainListItems(): UseMainListItemsResult {
  const { whatsApps } = useContext(WhatsAppsContext);
  const [connectionWarning, setConnectionWarning] = useState(false);
  const [activePlugins, setActivePlugins] = useState<string[]>([]);

  useEffect(() => {
    const fetchPlugins = async () => {
      try {
        const { data } = await pluginApi.get("/plugins/installed");
        setActivePlugins(data.active || []);
      } catch {
        // Silent — offline/502/CORS
      }
    };
    fetchPlugins();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (whatsApps && whatsApps.length > 0) {
        const offline = whatsApps.filter((w) =>
          ["qrcode", "PAIRING", "DISCONNECTED", "TIMEOUT", "OPENING"].includes(
            w.status
          )
        );
        setConnectionWarning(offline.length > 0);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [whatsApps]);

  return { connectionWarning, activePlugins };
}
