import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { useThemeContext } from "../../../context/DarkMode";
import api from "../../../services/api";
import pluginApi from "../../../services/pluginApi";
import { i18n } from "../../../translate/i18n";
import toastError from "../../../errors/toastError";
import { subscribeToSocket } from "../../../services/sse-client";

const DB_THEME_MAP: Record<string, { appTheme: string; darkMode?: boolean }> = {
  whaticket: { appTheme: "google" },
  whatsapp:  { appTheme: "whatsapp" },
  dark:      { appTheme: "apple", darkMode: true },
};

export interface Setting {
  key: string;
  value: string;
}

export interface SlaConfig {
  low: number;
  medium: number;
  high: number;
  urgent: number;
}

export interface UseSettingsReturn {
  settings: Setting[];
  activePlugins: string[];
  loading: boolean;
  slaConfig: SlaConfig;
  newCategory: string;
  helpdeskCategories: string[];
  setNewCategory: (v: string) => void;
  getSettingValue: (key: string) => string;
  handleUpdateSetting: (key: string, value: string) => Promise<void>;
  handleImageUpload: (key: string, file: File | undefined) => Promise<void>;
  handleLanguageChange: (lang: string) => Promise<void>;
  handleUpdateSla: (priority: string, value: string) => Promise<void>;
  handleAddCategory: () => Promise<void>;
  handleRemoveCategory: (cat: string) => Promise<void>;
}

export const useSettings = (): UseSettingsReturn => {
  const { setAppTheme, setDarkMode } = useThemeContext();

  const [settings, setSettings] = useState<Setting[]>([]);
  const [activePlugins, setActivePlugins] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [newCategory, setNewCategory] = useState("");
  const [helpdeskCategories, setHelpdeskCategories] = useState<string[]>([]);
  const [slaConfig, setSlaConfig] = useState<SlaConfig>({
    low: 480, medium: 240, high: 120, urgent: 30,
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: settingsData } = await api.get("/settings");
        const safeSettings = settingsData || [];
        setSettings(safeSettings);

        try {
          const { data: pluginsData } = await pluginApi.get("/plugins/installed");
          setActivePlugins(pluginsData?.active || []);
        } catch {
          setActivePlugins([]);
        }

        const savedCategories = safeSettings.find((s: Setting) => s.key === "helpdesk_categories")?.value;
        if (savedCategories) {
          try { setHelpdeskCategories(JSON.parse(savedCategories)); } catch { /* silence */ }
        }

        const savedSLA = safeSettings.find((s: Setting) => s.key === "helpdesk_sla_config")?.value;
        if (savedSLA) {
          try { setSlaConfig(JSON.parse(savedSLA)); } catch { /* silence */ }
        }
      } catch (err) {
        toastError(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const handleSettings = (data: { action: string; setting: Setting }) => {
      if (data.action === "update" && data.setting) {
        setSettings((prev) => {
          const exists = prev.some((s) => s.key === data.setting.key);
          return exists
            ? prev.map((s) => (s.key === data.setting.key ? data.setting : s))
            : [...prev, data.setting];
        });
        if (data.setting.key === "helpdesk_categories") {
          try { setHelpdeskCategories(JSON.parse(data.setting.value)); } catch { /* silence */ }
        }
        if (data.setting.key === "helpdesk_sla_config") {
          try { setSlaConfig(JSON.parse(data.setting.value)); } catch { /* silence */ }
        }
      }
    };

    return subscribeToSocket({ settings: handleSettings });
  }, []);

  const getSettingValue = (key: string) =>
    settings.find((s) => s.key === key)?.value ?? "";

  const handleUpdateSetting = async (key: string, value: string) => {
    try {
      await api.put(`/settings/${key}`, { value });
      setSettings((prev) => {
        const updated = prev.map((s) => (s.key === key ? { ...s, value } : s));
        if (!prev.some((s) => s.key === key)) updated.push({ key, value });
        return updated;
      });
      if (key === "theme") {
        const mapped = DB_THEME_MAP[value] ?? { appTheme: "google" };
        setAppTheme(mapped.appTheme);
        setDarkMode(mapped.darkMode ?? false);
      }
      toast.success("Configuração atualizada!");
    } catch (err) {
      toastError(err);
    }
  };

  const handleImageUpload = async (key: string, file: File | undefined) => {
    if (!file) return;
    try {
      const base64String = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
      });
      await handleUpdateSetting(key, base64String);
      if (key === "systemFavicon") {
        let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
        if (!link) {
          link = document.createElement("link");
          link.rel = "icon";
          document.head.appendChild(link);
        }
        link.href = base64String;
      }
    } catch (err) {
      toastError(err);
    }
  };

  const handleLanguageChange = async (lang: string) => {
    await handleUpdateSetting("language", lang);
    i18n.changeLanguage(lang);
    localStorage.setItem("i18nextLng", lang);
    setTimeout(() => { window.location.reload(); }, 500);
  };

  const handleUpdateSla = async (priority: string, value: string) => {
    const numeric = parseInt(value, 10) || 0;
    const nextSla = { ...slaConfig, [priority]: numeric };
    setSlaConfig(nextSla);
    await handleUpdateSetting("helpdesk_sla_config", JSON.stringify(nextSla));
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    if (helpdeskCategories.includes(newCategory.trim())) {
      toast.warning("Categoria já existe");
      return;
    }
    const nextCategories = [...helpdeskCategories, newCategory.trim()];
    setHelpdeskCategories(nextCategories);
    setNewCategory("");
    await handleUpdateSetting("helpdesk_categories", JSON.stringify(nextCategories));
  };

  const handleRemoveCategory = async (cat: string) => {
    const nextCategories = helpdeskCategories.filter((c) => c !== cat);
    setHelpdeskCategories(nextCategories);
    await handleUpdateSetting("helpdesk_categories", JSON.stringify(nextCategories));
  };

  return {
    settings,
    activePlugins,
    loading,
    slaConfig,
    newCategory,
    helpdeskCategories,
    setNewCategory,
    getSettingValue,
    handleUpdateSetting,
    handleImageUpload,
    handleLanguageChange,
    handleUpdateSla,
    handleAddCategory,
    handleRemoveCategory,
  };
};
