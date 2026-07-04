/* @jsxImportSource react */
import React, { useState, useEffect, useContext, useCallback, useRef } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import type { AxiosError } from "axios";
import { ArrowLeft, CheckCircle, Loader2, Puzzle } from "lucide-react";
import { toast } from "react-toastify";

import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../../components/Can";
import pluginApi from "../../services/pluginApi";
import { getBackendUrl } from "../../helpers/urlUtils";
import type {
  CatalogPlugin,
  PluginCatalogResponse,
  PluginInstalledResponse,
  PluginActivateUnlicensedResponse,
} from "../../types/api";

import { PageContainer, PageHeader, PageContent } from "../../components/ui/page-layout";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent } from "../../components/ui/card";

// ─── Types ───────────────────────────────────────────────────────────────────

/** View-model: CatalogPlugin augmented with local state fields */
interface PluginViewModel extends CatalogPlugin {
  longDescription: string;
  active: boolean;
  installed: boolean;
}

// ─── Constants ───────────────────────────────────────────────────────────────

// Best-effort poll after a checkout request: the Hub creates the license
// record synchronously, but the signed token only reaches the local
// plugin-manager on the next heartbeat (up to heartbeatIntervalMin minutes,
// default 15min). Polling every 15min for that long would be a poor UX for
// an active tab, so this only tries a handful of times over a couple of
// minutes -- if the token hasn't arrived by then, the user is expected to
// simply come back and click "Ativar Plugin" again later. Not a guarantee.
const CHECKOUT_POLL_INTERVAL_MS = 25_000;
const CHECKOUT_POLL_MAX_ATTEMPTS = 6;

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getLongDescription = (slug: string): string => {
  const descriptions: Record<string, string> = {
    clientes: "O Plugin de Clientes adiciona ao Watink uma gestão completa de clientes, permitindo:\n\n• Cadastro detalhado de clientes (pessoa física e jurídica)\n• Múltiplos contatos vinculados ao mesmo cliente\n• Múltiplos endereços por cliente\n• Integração automática com API ViaCEP para autocompletar endereços\n• Vinculação de contatos do WhatsApp a clientes cadastrados\n• Histórico de interações por cliente",
    helpdesk: "O Plugin de Helpdesk transforma seu atendimento em um sistema de suporte profissional:\n\n• Criação de protocolos de atendimento\n• Vinculação de protocolos a tickets\n• Gestão de status, prioridade e SLA\n• Histórico completo de interações no protocolo\n• Relatórios de atendimento"
  };
  return descriptions[slug] || "Plugin profissional para expandir recursos do Watink no seu ambiente.";
};

// ─── Component ────────────────────────────────────────────────────────────────

const PluginDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useContext(AuthContext);

  const [plugin, setPlugin] = useState<PluginViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clears any in-flight checkout poll on unmount/slug change so it never
  // fires against a stale/unmounted view.
  useEffect(() => {
    return () => {
      if (pollTimeoutRef.current) clearTimeout(pollTimeoutRef.current);
    };
  }, [slug]);

  const loadPlugin = useCallback(async () => {
    if (!slug) return;
    try {
      setLoading(true);
      const [{ data: catalog }, { data: installed }] = await Promise.all([
        pluginApi.get<PluginCatalogResponse>("/plugins/catalog"),
        pluginApi.get<PluginInstalledResponse>("/plugins/installed"),
      ]);

      const all: CatalogPlugin[] = Array.isArray(catalog?.plugins) ? catalog.plugins : [];
      const active = new Set<string>(Array.isArray(installed?.active) ? installed.active : []);
      const p = all.find((x) => x.slug === slug);

      if (!p) {
        setPlugin(null);
        return;
      }

      setPlugin({
        ...p,
        installed: active.has(p.slug),
        active: active.has(p.slug),
        iconUrl: p.iconUrl ?? `/public/plugins/${p.slug}.png`,
        longDescription: getLongDescription(p.slug),
      });
    } catch {
      toast.error("Erro ao carregar plugin");
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => { loadPlugin(); }, [loadPlugin]);

  // Handle URL payment status
  useEffect(() => {
    const search = new URLSearchParams(location.search);
    const status = search.get("checkout") || search.get("status");
    if (status === "approved" || status === "success") {
      toast.success("Pagamento aprovado.");
      loadPlugin();
    }
  }, [location.search, loadPlugin]);

  // Polls GET /plugins/installed a handful of times (best-effort, see
  // CHECKOUT_POLL_INTERVAL_MS/CHECKOUT_POLL_MAX_ATTEMPTS above) after a
  // successful checkout request, looking for `slug` to show up as active.
  // Never loops forever -- gives up silently after the last attempt and
  // leaves the "Ativar Plugin" button for the user to retry manually.
  const pollForActivation = useCallback(
    (slugToPoll: string, attempt: number) => {
      if (attempt >= CHECKOUT_POLL_MAX_ATTEMPTS) return;

      pollTimeoutRef.current = setTimeout(async () => {
        try {
          const { data: installed } = await pluginApi.get<PluginInstalledResponse>("/plugins/installed");
          const active = Array.isArray(installed?.active) ? installed.active : [];
          if (active.includes(slugToPoll)) {
            toast.success("Licença confirmada — plugin ativado!");
            window.location.reload();
            return;
          }
        } catch {
          // Transient poll failure -- ignore and try again on the next tick.
        }
        pollForActivation(slugToPoll, attempt + 1);
      }, CHECKOUT_POLL_INTERVAL_MS);
    },
    [],
  );

  const handleActivate = async () => {
    if (!plugin) return;
    setActivating(true);
    try {
      await pluginApi.post(`/plugins/${plugin.slug}/activate`);
      toast.success(`Plugin ${plugin.name} ativado!`);
      window.location.reload();
    } catch (err) {
      const axiosErr = err as AxiosError<PluginActivateUnlicensedResponse>;
      const body = axiosErr.response?.data;
      if (axiosErr.response?.status === 402 && body?.checkoutRequested) {
        toast.info(body.message || "Licença solicitada — aguardando confirmação, tentando novamente...");
        pollForActivation(plugin.slug, 0);
      } else {
        toast.error(body?.message || "Erro na ativação");
      }
    } finally {
      setActivating(false);
    }
  };

  const handleDeactivate = async () => {
    if (!plugin) return;
    setActivating(true);
    try {
      await pluginApi.post(`/plugins/${plugin.slug}/deactivate`);
      toast.success("Plugin desativado.");
      window.location.reload();
    } catch {
      toast.error("Erro na desativação");
    } finally {
      setActivating(false);
    }
  };

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin" /></div>;
  if (!plugin) return <div className="p-8">Plugin não encontrado</div>;

  return (
    <Can user={user} perform="view_marketplace" yes={() => (
      <PageContainer>
        <PageHeader title={plugin.name}>
          <Button variant="outline" onClick={() => navigate("/admin/settings/marketplace")}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
          </Button>
        </PageHeader>

        <PageContent className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-start gap-6">
                <div className="p-4 bg-muted rounded-xl">
                  {plugin.iconUrl ? (
                    <img src={getBackendUrl(plugin.iconUrl)} alt={plugin.name} className="w-20 h-20" />
                  ) : <Puzzle className="w-20 h-20 text-primary" />}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold">{plugin.name}</h2>
                    {plugin.active && <Badge variant="secondary" className="bg-green-100"><CheckCircle className="mr-1 h-3 w-3" /> Ativo</Badge>}
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">{plugin.type === "free" ? "Gratuito" : `R$ ${plugin.price}`}</Badge>
                    <Badge variant="outline">v{plugin.version}</Badge>
                    <Badge variant="outline">{plugin.category}</Badge>
                  </div>
                  <p className="text-muted-foreground">{plugin.description}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <h3 className="font-semibold text-lg">Sobre este plugin</h3>
              <p className="text-muted-foreground whitespace-pre-line">{plugin.longDescription}</p>

              <div className="pt-4 flex gap-2">
                {plugin.active ? (
                  <Button variant="destructive" onClick={handleDeactivate} disabled={activating}>
                    Desativar
                  </Button>
                ) : (
                  <Button onClick={handleActivate} disabled={activating}>
                    Ativar Plugin
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </PageContent>
      </PageContainer>
    )} />
  );
};

export default PluginDetail;
