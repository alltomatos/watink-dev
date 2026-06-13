/* @jsxImportSource react */
import React, { useState, useEffect, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Settings as SettingsIcon,
  Palette,
  CloudUpload,
  Trash2,
  Puzzle,
  Headphones,
  Brain,
  Save,
  Loader2,
  Layout,
  Type,
  ImageIcon,
  Smartphone,
  CheckCircle2,
  XCircle,
  Plus,
  Copy,
  Mail,
  Globe,
  Clock,
  RotateCcw
} from "lucide-react";

import api from "../../services/api";
import pluginApi from "../../services/pluginApi";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import { getBackendUrl } from "../../helpers/urlUtils";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../../components/Can";
import openSocket from "../../services/socket-io";

import {
  PageLayout,
  PageHeader,
  PageContent
} from "../../components/ui/page-layout";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import { Badge } from "../../components/ui/badge";
import { Textarea } from "../../components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "../../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import { Separator } from "../../components/ui/separator";
import AISettings from "./components/AISettings";

interface Setting {
  key: string;
  value: string;
}

const timezones = [
  { value: "America/Sao_Paulo", label: "Brasília (UTC-3)" },
  { value: "America/Manaus", label: "Amazonas (UTC-4)" },
  { value: "America/Noronha", label: "Fernando de Noronha (UTC-2)" },
  { value: "America/Caracas", label: "Caracas (UTC-4)" },
  { value: "America/New_York", label: "Nova York (UTC-5)" },
  { value: "Europe/London", label: "Londres (UTC+0)" },
  { value: "Europe/Paris", label: "Paris (UTC+1)" },
  { value: "UTC", label: "Coordinated Universal Time (UTC)" }
];

const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [activeSection, setActiveSection] = useState("general");
  const [settings, setSettings] = useState<Setting[]>([]);
  const [activePlugins, setActivePlugins] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Hidden File Inputs Refs
  const logoInputRef = useRef<HTMLInputElement>(null);
  const faviconInputRef = useRef<HTMLInputElement>(null);
  const mobileLogoInputRef = useRef<HTMLInputElement>(null);
  const loginBackgroundInputRef = useRef<HTMLInputElement>(null);

  // Helpdesk local states
  const [newCategory, setNewCategory] = useState("");
  const [helpdeskCategories, setHelpdeskCategories] = useState<string[]>([]);
  const [slaConfig, setSlaConfig] = useState({
    low: 480,    // 8h
    medium: 240, // 4h
    high: 120,   // 2h
    urgent: 30   // 30m
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: settingsData } = await api.get("/settings");
        const safeSettings = settingsData || [];
        setSettings(safeSettings);

        // Active plugins
        try {
          const { data: pluginsData } = await pluginApi.get("/plugins/installed");
          setActivePlugins(pluginsData?.active || []);
        } catch (e) {
          setActivePlugins([]);
        }

        // Deserialize category/SLA state
        const savedCategories = safeSettings.find((s) => s.key === "helpdesk_categories")?.value;
        if (savedCategories) {
          try {
            setHelpdeskCategories(JSON.parse(savedCategories));
          } catch (_) {}
        }

        const savedSLA = safeSettings.find((s) => s.key === "helpdesk_sla_config")?.value;
        if (savedSLA) {
          try {
            setSlaConfig(JSON.parse(savedSLA));
          } catch (_) {}
        }

        setLoading(false);
      } catch (err) {
        toastError(err);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Real-time synchronization
  useEffect(() => {
    const socket = openSocket();
    if (!socket) return;

    socket.on("settings", (data: { action: string; setting: Setting }) => {
      if (data.action === "update" && data.setting) {
        setSettings((prev) => {
          const exists = prev.some((s) => s.key === data.setting.key);
          if (exists) {
            return prev.map((s) => s.key === data.setting.key ? data.setting : s);
          }
          return [...prev, data.setting];
        });

        // Sync local states if they are JSON properties
        if (data.setting.key === "helpdesk_categories") {
          try {
            setHelpdeskCategories(JSON.parse(data.setting.value));
          } catch (_) {}
        }
        if (data.setting.key === "helpdesk_sla_config") {
          try {
            setSlaConfig(JSON.parse(data.setting.value));
          } catch (_) {}
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const getSettingValue = (key: string) => {
    const setting = settings.find((s) => s.key === key);
    return setting ? setting.value : "";
  };

  const handleUpdateSetting = async (key: string, value: string) => {
    setSaving(true);
    try {
      await api.put(`/settings/${key}`, { value });
      setSettings((prev) => {
        const hash = prev.map((s) => s.key === key ? { ...s, value } : s);
        if (!prev.some(s => s.key === key)) {
          hash.push({ key, value });
        }
        return hash;
      });
      toast.success("Configuração atualizada!");
    } catch (err) {
      toastError(err);
    } finally {
      setSaving(false);
    }
  };

  // Base64 Reader Helper
  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const handleImageUpload = async (key: string, file: File | undefined) => {
    if (!file) return;
    try {
      setSaving(true);
      const base64String = await convertFileToBase64(file);
      await handleUpdateSetting(key, base64String);

      // Force live DOM update for favicon if changed
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
    } finally {
      setSaving(false);
    }
  };

  // Language changer handler
  const handleLanguageChange = async (lang: string) => {
    await handleUpdateSetting("language", lang);
    i18n.changeLanguage(lang);
    localStorage.setItem("i18nextLng", lang);
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };

  // Helpdesk SLA updates
  const handleUpdateSla = async (priority: string, value: string) => {
    const numeric = parseInt(value, 10) || 0;
    const nextSla = { ...slaConfig, [priority]: numeric };
    setSlaConfig(nextSla);
    await handleUpdateSetting("helpdesk_sla_config", JSON.stringify(nextSla));
  };

  // Helpdesk Categories updates
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

  const renderImagePreview = (key: string, defaultUrl: string) => {
    const value = getSettingValue(key);
    if (!value) {
      return (
        <div className="h-16 w-32 flex items-center justify-center bg-muted/30 rounded border text-muted-foreground text-xs">
          Sem imagem
        </div>
      );
    }
    const isBase64 = value.startsWith("data:");
    const src = isBase64 ? value : getBackendUrl(value);
    return (
      <img
        src={src}
        alt={key}
        className="max-h-16 w-auto object-contain bg-white p-1 rounded border shadow-sm"
        onError={(e) => (e.currentTarget.style.display = 'none')}
      />
    );
  };

  const renderGeneralSection = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <SettingsIcon className="h-5 w-5" />
            Configurações Gerais
          </CardTitle>
          <CardDescription>Gerencie o comportamento global da plataforma</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Assinatura do Usuário</Label>
              <p className="text-sm text-muted-foreground">Adiciona a assinatura do atendente ao final de cada mensagem</p>
            </div>
            <Switch
              checked={getSettingValue("userSignature") === "enabled"}
              onCheckedChange={(checked) => handleUpdateSetting("userSignature", checked ? "enabled" : "disabled")}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Check-in Obrigatório</Label>
              <p className="text-sm text-muted-foreground">Exige que o atendente esteja ativo para receber novos tickets</p>
            </div>
            <Switch
              checked={getSettingValue("forceCheckIn") === "enabled"}
              onCheckedChange={(checked) => handleUpdateSetting("forceCheckIn", checked ? "enabled" : "disabled")}
            />
          </div>

          <Separator />

          <div className="grid gap-2">
            <Label htmlFor="system-lang">Idioma Global</Label>
            <Select
              value={getSettingValue("language") || "pt"}
              onValueChange={handleLanguageChange}
            >
              <SelectTrigger id="system-lang">
                <SelectValue placeholder="Idioma" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pt">Português (Brasil)</SelectItem>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Español</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="grid gap-2">
            <Label htmlFor="system-timezone">Fuso Horário (Timezone)</Label>
            <Select
              value={getSettingValue("timezone") || "America/Sao_Paulo"}
              onValueChange={(v) => handleUpdateSetting("timezone", v)}
            >
              <SelectTrigger id="system-timezone">
                <SelectValue placeholder="Selecione o Timezone" />
              </SelectTrigger>
              <SelectContent>
                {timezones.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>{tz.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          <div className="grid gap-2">
            <Label htmlFor="api-token">Token de API Global</Label>
            <div className="flex gap-2">
              <Input
                id="api-token"
                readOnly
                value={getSettingValue("userApiToken")}
                className="font-mono bg-muted"
              />
              <Button variant="outline" size="icon" onClick={() => {
                navigator.clipboard.writeText(getSettingValue("userApiToken"));
                toast.success("Token copiado!");
              }}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderPersonalizationSection = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Palette className="h-5 w-5" />
            Identidade Visual
          </CardTitle>
          <CardDescription>Personalize o nome e as imagens do seu sistema</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-2">
            <Label>Nome do Sistema (Título)</Label>
            <Input
              placeholder="Ex: Watink Atendimento"
              defaultValue={getSettingValue("systemTitle") || "Watink"}
              onBlur={(e) => handleUpdateSetting("systemTitle", e.target.value)}
            />
          </div>

          <Separator />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Logotipo Principal (Escala Horizontal)</Label>
                <Switch
                  checked={getSettingValue("systemLogoEnabled") !== "false"}
                  onCheckedChange={(checked) => handleUpdateSetting("systemLogoEnabled", checked ? "true" : "false")}
                  title="Habilitar logotipo"
                />
              </div>
              <div className="border border-dashed rounded-lg p-4 flex flex-col items-center justify-center gap-3 bg-muted/10">
                {renderImagePreview("systemLogo", "/logo.png")}
                <input
                  type="file"
                  accept="image/*"
                  ref={logoInputRef}
                  className="hidden"
                  onChange={(e) => handleImageUpload("systemLogo", e.target.files?.[0])}
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => logoInputRef.current?.click()}>
                    <CloudUpload className="mr-2 h-4 w-4" /> Alterar Logo
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => handleUpdateSetting("systemLogo", "")}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Label>Favicon (Ícone do Navegador)</Label>
              <div className="border border-dashed rounded-lg p-4 flex flex-col items-center justify-center gap-3 bg-muted/10">
                {renderImagePreview("systemFavicon", "/favicon.png")}
                <input
                  type="file"
                  accept="image/x-icon,image/png,image/jpeg"
                  ref={faviconInputRef}
                  className="hidden"
                  onChange={(e) => handleImageUpload("systemFavicon", e.target.files?.[0])}
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => faviconInputRef.current?.click()}>
                    <CloudUpload className="mr-2 h-4 w-4" /> Alterar Favicon
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => handleUpdateSetting("systemFavicon", "")}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Label>Logotipo Mobile</Label>
              <div className="border border-dashed rounded-lg p-4 flex flex-col items-center justify-center gap-3 bg-muted/10">
                {renderImagePreview("mobileLogo", "/logo.png")}
                <input
                  type="file"
                  accept="image/*"
                  ref={mobileLogoInputRef}
                  className="hidden"
                  onChange={(e) => handleImageUpload("mobileLogo", e.target.files?.[0])}
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => mobileLogoInputRef.current?.click()}>
                    <CloudUpload className="mr-2 h-4 w-4" /> Alterar Mobile
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => handleUpdateSetting("mobileLogo", "")}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <Label>Tema Visual</Label>
              <Select
                value={getSettingValue("theme") || "whaticket"}
                onValueChange={(v) => handleUpdateSetting("theme", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Tema principal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="whaticket">Padrão Whajet / Whaticket</SelectItem>
                  <SelectItem value="whatsapp">Branding WhatsApp (Green)</SelectItem>
                  <SelectItem value="dark">Escuro Noturno (Dark)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
            </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Layout className="h-5 w-5" />
              Customização da Tela de Login
            </CardTitle>
            <CardDescription>Configure o design e a visualização da tela inicial</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Posição do Formulário</Label>
                <Select
                  value={getSettingValue("login_layout") || "centered"}
                  onValueChange={(v) => handleUpdateSetting("login_layout", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Layout da página" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="split_left">Formulário à Esquerda</SelectItem>
                    <SelectItem value="split_right">Formulário à Direita</SelectItem>
                    <SelectItem value="centered">Centralizado (Background Completo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Imagem de Fundo (Login)</Label>
                <div className="border border-dashed rounded-lg p-4 flex flex-col items-center justify-center gap-3 bg-muted/10">
                  {renderImagePreview("login_backgroundImage", "")}
                  <input
                    type="file"
                    accept="image/*"
                    ref={loginBackgroundInputRef}
                    className="hidden"
                    onChange={(e) => handleImageUpload("login_backgroundImage", e.target.files?.[0])}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => loginBackgroundInputRef.current?.click()}>
                      <CloudUpload className="mr-2 h-4 w-4" /> Alterar Fundo
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10" onClick={() => handleUpdateSetting("login_backgroundImage", "")}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
    </div>
  );

  const renderSMTPSection = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Mail className="h-5 w-5" />
          Servidor SMTP (Envio de E-mail)
        </CardTitle>
        <CardDescription>Configure como a plataforma envia relatórios e alertas aos atendentes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 md:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="smtp-server">Servidor SMTP</Label>
            <Input
              id="smtp-server"
              defaultValue={getSettingValue("smtp_server")}
              placeholder="smtp.exemplo.com"
              onBlur={(e) => handleUpdateSetting("smtp_server", e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="smtp-port">Porta SMTP</Label>
            <Input
              id="smtp-port"
              defaultValue={getSettingValue("smtp_port")}
              placeholder="465 ou 587"
              onBlur={(e) => handleUpdateSetting("smtp_port", e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="smtp-username">Usuário</Label>
            <Input
              id="smtp-username"
              defaultValue={getSettingValue("smtp_username")}
              placeholder="email@exemplo.com"
              onBlur={(e) => handleUpdateSetting("smtp_username", e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="smtp-password">Senha</Label>
            <Input
              id="smtp-password"
              type="password"
              defaultValue={getSettingValue("smtp_password")}
              placeholder="Sua senha SMTP"
              onBlur={(e) => handleUpdateSetting("smtp_password", e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-2 md:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="smtp-sender">E-mail Remetente</Label>
            <Input
              id="smtp-sender"
              defaultValue={getSettingValue("smtp_sender")}
              placeholder="noreply@exemplo.com"
              onBlur={(e) => handleUpdateSetting("smtp_sender", e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Criptografia</Label>
            <Select
              value={getSettingValue("smtp_encryption") || "ssl"}
              onValueChange={(v) => handleUpdateSetting("smtp_encryption", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ssl">SSL (Recomenda-se para porta 465)</SelectItem>
                <SelectItem value="tls">TLS (Recomenda-se para porta 587)</SelectItem>
                <SelectItem value="none">Nenhuma</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderPAPISection = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-primary">
          <Globe className="h-5 w-5" />
          Gateway PAPI (Provedor Avançado)
        </CardTitle>
        <CardDescription>Configure a integração e tokens com APIs externas padrão WABA</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          <Label htmlFor="papi-url">API URL base</Label>
          <Input
            id="papi-url"
            defaultValue={getSettingValue("papi_url")}
            placeholder="https://api.waba.providers.com/v1"
            onBlur={(e) => handleUpdateSetting("papi_url", e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="papi-token">Token do Gateway</Label>
          <Input
            id="papi-token"
            type="password"
            defaultValue={getSettingValue("papi_token")}
            placeholder="Bearer token corporativo"
            onBlur={(e) => handleUpdateSetting("papi_token", e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );

  const renderHelpdeskSection = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Headphones className="h-5 w-5" />
            Configuração de Atendimento (Helpdesk)
          </CardTitle>
          <CardDescription>Configure acordos de nível de serviço (SLA) e triagem de chamados</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Habilitar Helpdesk SLA</Label>
              <p className="text-sm text-muted-foreground">Exige temporizador de SLA ativo nas conversas dos colaboradores</p>
            </div>
            <Switch
              checked={getSettingValue("helpdesk_sla_enabled") === "true"}
              onCheckedChange={(checked) => handleUpdateSetting("helpdesk_sla_enabled", checked ? "true" : "false")}
            />
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold mb-4">Tempos de Resolução do SLA (em minutos)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="grid gap-1.5">
                <Label htmlFor="sla-low">Baixa</Label>
                <Input
                  id="sla-low"
                  type="number"
                  value={slaConfig.low}
                  onChange={(e) => handleUpdateSla("low", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="sla-medium">Média</Label>
                <Input
                  id="sla-medium"
                  type="number"
                  value={slaConfig.medium}
                  onChange={(e) => handleUpdateSla("medium", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="sla-high">Alta</Label>
                <Input
                  id="sla-high"
                  type="number"
                  value={slaConfig.high}
                  onChange={(e) => handleUpdateSla("high", e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="sla-urgent">Urgente</Label>
                <Input
                  id="sla-urgent"
                  type="number"
                  value={slaConfig.urgent}
                  onChange={(e) => handleUpdateSla("urgent", e.target.value)}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div>
            <h3 className="text-sm font-semibold mb-2">Categorias ITIL da Triagem</h3>
            <p className="text-xs text-muted-foreground mb-4">Gerencie as categorias padrão solicitadas aos usuários para abertura de novos incidentes</p>
            <div className="flex gap-2 mb-4">
              <Input
                placeholder="Ex: Falha de Conexão, Redefinição de Senha"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
              />
              <Button type="button" onClick={handleAddCategory}>
                <Plus className="h-4 w-4 mr-1" /> Adicionar
              </Button>
            </div>

            <div className="flex flex-wrap gap-2">
              {helpdeskCategories.map((cat) => (
                <Badge
                  key={cat}
                  variant="secondary"
                  className="pl-3 pr-1 py-1 gap-2 text-sm items-center fill-current"
                >
                  {cat}
                  <button
                    type="button"
                    className="hover:bg-muted-foreground/20 rounded-full p-0.5"
                    onClick={() => handleRemoveCategory(cat)}
                  >
                    <XCircle size={14} className="text-muted-foreground hover:text-destructive" />
                  </button>
                </Badge>
              ))}
              {helpdeskCategories.length === 0 && (
                <div className="text-xs text-muted-foreground italic">
                  Nenhuma categoria definida.
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderAISection = () => (
    <AISettings
      getSettingValue={getSettingValue}
      handleUpdateSetting={handleUpdateSetting}
    />
  );

  return (
    <PageLayout>
      <PageHeader title="Configurações do Sistema">
        <div className="flex gap-2">
          <Can
            user={user}
            perform="marketplace:read"
            yes={() => (
              <Button variant="outline" onClick={() => navigate("/admin/settings/marketplace")}>
                <Puzzle className="mr-2 h-4 w-4" />
                Marketplace de Plugins
              </Button>
            )}
          />
          <Button variant="outline" onClick={() => navigate("/helpdesk")}>
            <Headphones className="mr-2 h-4 w-4" />
            Ajuda
          </Button>
        </div>
      </PageHeader>

      <PageContent className="flex flex-col md:flex-row gap-8 items-start">
        {/* Sidebar Menu */}
        <aside className="w-full md:w-64 space-y-2 border p-3 rounded-lg bg-card">
          <Button
            variant={activeSection === "general" ? "secondary" : "ghost"}
            className="w-full justify-start text-left"
            onClick={() => setActiveSection("general")}
          >
            <SettingsIcon className="mr-2 h-4 w-4" />
            Geral
          </Button>
          <Button
            variant={activeSection === "personalization" ? "secondary" : "ghost"}
            className="w-full justify-start text-left"
            onClick={() => setActiveSection("personalization")}
          >
            <Palette className="mr-2 h-4 w-4" />
            Personalização
          </Button>

          {activePlugins.includes("smtp") && (
            <Button
              variant={activeSection === "smtp" ? "secondary" : "ghost"}
              className="w-full justify-start text-left"
              onClick={() => setActiveSection("smtp")}
            >
              <Mail className="mr-2 h-4 w-4" />
              E-mail SMTP
            </Button>
          )}

          {activePlugins.includes("engine-papi") && (
            <Button
              variant={activeSection === "papi" ? "secondary" : "ghost"}
              className="w-full justify-start text-left"
              onClick={() => setActiveSection("papi")}
            >
              <Globe className="mr-2 h-4 w-4" />
              Gateway PAPI
            </Button>
          )}

          {activePlugins.includes("helpdesk") && (
            <Button
              variant={activeSection === "helpdesk" ? "secondary" : "ghost"}
              className="w-full justify-start text-left"
              onClick={() => setActiveSection("helpdesk")}
            >
              <Headphones className="mr-2 h-4 w-4" />
              Helpdesk Atendimento
            </Button>
          )}

          <Button
            variant={activeSection === "ai" ? "secondary" : "ghost"}
            className="w-full justify-start text-left"
            onClick={() => setActiveSection("ai")}
          >
            <Brain className="mr-2 h-4 w-4" />
            Agente de IA
          </Button>
        </aside>

        {/* Section Content */}
        <div className="flex-1 min-w-0 w-full">
          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {activeSection === "general" && renderGeneralSection()}
              {activeSection === "personalization" && renderPersonalizationSection()}
              {activeSection === "smtp" && activePlugins.includes("smtp") && renderSMTPSection()}
              {activeSection === "papi" && activePlugins.includes("engine-papi") && renderPAPISection()}
              {activeSection === "helpdesk" && activePlugins.includes("helpdesk") && renderHelpdeskSection()}
              {activeSection === "ai" && renderAISection()}
            </>
          )}
        </div>
      </PageContent>
    </PageLayout>
  );
};

export default Settings;
