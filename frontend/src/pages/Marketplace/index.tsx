/* @jsxImportSource react */
import React, { useState, useEffect, useContext } from "react";
import {
  Puzzle,
  Search,
  LayoutGrid,
  List as ListIcon,
  CheckCircle2,
  ExternalLink,
  Copy,
  WifiOff,
  Loader2
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../../components/Can";
import pluginApi from "../../services/pluginApi";
import { getBackendUrl } from "../../helpers/urlUtils";

import { 
  PageContainer, 
  PageHeader, 
  PageContent 
} from "../../components/ui/page-layout";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge } from "../../components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter
} from "../../components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "../../components/ui/table";

const Marketplace = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [plugins, setPlugins] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [view, setView] = useState("grid");
  const [offline, setOffline] = useState(false);
  const [instanceId, setInstanceId] = useState("");
  const [entitlements, setEntitlements] = useState<any>(null);

  useEffect(() => {
    loadPlugins();
    loadInstanceId();
  }, []);

  const loadInstanceId = async () => {
    try {
      const { data } = await pluginApi.get("/plugins/instance");
      setInstanceId(data.instanceId);
    } catch {
      console.error("Erro ao carregar Instance ID");
    }
  };

  const loadPlugins = async () => {
    try {
      setLoading(true);
      const { data: catalogRes } = await pluginApi.get("/plugins/catalog");
      setOffline(Boolean(catalogRes?.offline));
      const { data: installedRes } = await pluginApi.get("/plugins/installed");
      setEntitlements(installedRes?.entitlements || null);
      const activeSlugs = new Set(
        Array.isArray(installedRes?.active) ? installedRes.active : []
      );
      const all = Array.isArray(catalogRes?.plugins) ? catalogRes.plugins : [];
      const normalized = all.map((p: any) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        description: p.description,
        version: p.version,
        type: p.type,
        category: p.category,
        price: p.price,
        iconUrl: `/public/plugins/${p.slug}.png`,
        installed: activeSlugs.has(p.slug),
        active: activeSlugs.has(p.slug),
      }));
      setPlugins(normalized);
    } catch {
      toast.error("Erro ao carregar plugins");
    } finally {
      setLoading(false);
    }
  };

  const handlePluginClick = (plugin: any) => {
    navigate(`/admin/settings/marketplace/${plugin.slug}`);
  };

  const handleCopyInstanceId = () => {
    if (!instanceId) return;
    navigator.clipboard.writeText(instanceId);
    toast.success("ID da instância copiado!");
  };

  const filteredPlugins = plugins.filter(
    (p) =>
      p.name.toLowerCase().includes(searchParam.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchParam.toLowerCase())
  );

  return (
    <Can
      user={user}
      perform="view_marketplace"
      no={() => (
        <PageContainer>
          <PageContent>
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              Você não tem permissão para acessar o Marketplace.
            </div>
          </PageContent>
        </PageContainer>
      )}
      yes={() => (
    <PageContainer>
      <PageHeader 
        title="Marketplace"
        description="Amplie as funcionalidades do Watink com integrações e extensões premium"
      >
        <div className="flex items-center gap-2">
          <div className="relative w-full max-w-sm hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar plugins..."
              value={searchParam}
              onChange={(e) => setSearchParam(e.target.value)}
              className="pl-9 h-10"
            />
          </div>

          <div className="flex items-center border rounded-md p-1 bg-muted/50">
            <Button 
              variant={view === "list" ? "secondary" : "ghost"} 
              size="icon" 
              className="h-8 w-8 rounded-sm"
              onClick={() => setView("list")}
            >
              <ListIcon className="h-4 w-4" />
            </Button>
            <Button 
              variant={view === "grid" ? "secondary" : "ghost"} 
              size="icon" 
              className="h-8 w-8 rounded-sm"
              onClick={() => setView("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </PageHeader>

      <PageContent>
        {offline && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-700">
            <WifiOff size={16} />
            Catálogo carregado em modo offline (cache local). Algumas informações podem estar desatualizadas.
          </div>
        )}
        {instanceId && (
          <div className="mb-4 flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-4 py-3 text-sm">
            <div className="min-w-0">
              <span className="text-muted-foreground">ID da Instância: </span>
              <code className="font-mono">{instanceId}</code>
              {entitlements?.plan_name && (
                <span className="ml-3 text-muted-foreground">
                  Plano: <strong>{entitlements.plan_name}</strong>
                </span>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={handleCopyInstanceId}>
              <Copy size={14} className="mr-1" /> Copiar ID
            </Button>
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredPlugins.map((plugin) => (
              <Card
                key={plugin.id}
                className="group cursor-pointer hover:shadow-lg transition-all duration-300 flex flex-col"
                onClick={() => handlePluginClick(plugin)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      <img
                        src={getBackendUrl(plugin.iconUrl)}
                        alt={plugin.name}
                        className="h-6 w-6 object-contain"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      {plugin.price !== undefined && (
                        <Badge variant="outline" className="text-[10px]">
                          {plugin.price ? `R$ ${plugin.price}` : "Gratuito"}
                        </Badge>
                      )}
                      {plugin.installed && (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100 border-none">
                          <CheckCircle2 size={12} className="mr-1" />
                          Instalado
                        </Badge>
                      )}
                    </div>
                  </div>
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">
                    {plugin.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 pb-4">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {plugin.description || "Nenhuma descrição fornecida para este plugin."}
                  </p>
                </CardContent>
                <CardFooter className="pt-4 border-t border-border/50">
                  <Button variant="ghost" className="w-full text-xs" size="sm">
                    Ver Detalhes
                    <ExternalLink size={14} className="ml-2" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="rounded-md border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plugin</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Versão</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlugins.map((plugin) => (
                  <TableRow key={plugin.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-primary/10 rounded text-primary">
                          <Puzzle size={16} />
                        </div>
                        <span className="font-semibold">{plugin.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{plugin.category || "-"}</TableCell>
                    <TableCell>v{plugin.version || "1.0.0"}</TableCell>
                    <TableCell>
                      {plugin.installed ? (
                        <Badge variant="secondary" className="bg-green-100 text-green-700 border-none">Ativo</Badge>
                      ) : (
                        <Badge variant="outline">Disponível</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => handlePluginClick(plugin)}>
                        Detalhes
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PageContent>
    </PageContainer>
      )}
    />
  );
};

export default Marketplace;
