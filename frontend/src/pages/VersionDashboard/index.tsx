import React, { useEffect, useState, useCallback, useContext, useRef } from "react";
import { Link as RouterLink } from "react-router-dom";
import { UploadCloud, BookOpen, Loader2 } from "lucide-react";

import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
import { Progress } from "../../components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../../components/ui/dialog";

import api from "../../services/api";
import { toast } from "react-toastify";
import { AuthContext } from "../../context/Auth/AuthContext";

// ── Helpers ──────────────────────────────────────────────────────────────────

const formatBytes = (bytes: number, decimals = 2): string => {
  if (!bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

const formatUptime = (seconds: number): string => {
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
};

const normalizeVersion = (v: string) =>
  String(v || "")
    .replace(/^v/i, "")
    .trim();

const compareVersions = (a: string, b: string): number => {
  const aa = normalizeVersion(a)
    .split(".")
    .map((n) => parseInt(n || "0", 10));
  const bb = normalizeVersion(b)
    .split(".")
    .map((n) => parseInt(n || "0", 10));
  const len = Math.max(aa.length, bb.length, 3);
  for (let i = 0; i < len; i++) {
    const av = Number.isFinite(aa[i]) ? aa[i] : 0;
    const bv = Number.isFinite(bb[i]) ? bb[i] : 0;
    if (av > bv) return 1;
    if (av < bv) return -1;
  }
  return 0;
};

interface QueueItem {
  name: string;
  messages?: number;
  consumers?: number;
  error?: string;
}

interface QueueAlert {
  level: "ok" | "warning" | "error";
  label: string;
}

function queueAlert(queue: QueueItem, prevMessages: number): QueueAlert {
  if (queue?.error) return { level: "error", label: "Erro" };
  if ((queue?.consumers || 0) === 0 && (queue?.messages || 0) > 0)
    return { level: "error", label: "Sem consumidor" };
  if ((queue?.messages || 0) >= 50) return { level: "error", label: "Fila alta" };
  if ((queue?.messages || 0) >= 20) return { level: "warning", label: "Atenção" };
  if (
    (queue?.messages || 0) > (prevMessages || 0) &&
    (queue?.messages || 0) >= 10
  )
    return { level: "warning", label: "Subindo" };
  return { level: "ok", label: "OK" };
}

// ── Stat card component ───────────────────────────────────────────────────────

const StatCard: React.FC<{
  title: string;
  value: React.ReactNode;
  progress?: number;
  progressColor?: "primary" | "destructive";
  caption?: string;
}> = ({ title, value, progress, progressColor = "primary", caption }) => (
  <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-sm">
    <p className="mb-1 text-sm text-muted-foreground">{title}</p>
    <p className="text-xl font-bold">{value}</p>
    {progress !== undefined && (
      <div className="mt-2">
        <Progress
          value={progress}
          className={
            progressColor === "destructive"
              ? "[&>div]:bg-destructive"
              : undefined
          }
        />
      </div>
    )}
    {caption && (
      <p className="mt-auto pt-2 text-xs text-muted-foreground">{caption}</p>
    )}
  </div>
);

// ── Main ─────────────────────────────────────────────────────────────────────

interface SystemStats {
  cpuUsage?: number;
  memoryUsed?: number;
  memoryTotal?: number;
  uptime?: number;
  timestamp?: number;
  process?: {
    cpuUsage?: number;
    memoryUsed?: number;
    numGoroutine?: number;
  };
  rabbitmq?: {
    connected?: boolean;
    queues?: QueueItem[];
  };
  tenantConsumption?: {
    tenantId: string;
    tenantName: string;
    users: number;
    contacts: number;
    tickets: number;
    openTickets: number;
    whatsapps: number;
  }[];
}

interface ReleaseMeta {
  breaking: boolean;
  minCompatibleFrom: string;
  migrationNotes: string;
}

export default function VersionDashboard() {
  const { user } = useContext(AuthContext);
  const isSuperAdmin =
    (user?.profile || "").toLowerCase() === "superadmin";

  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [openUpdateModal, setOpenUpdateModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [queueAlerts, setQueueAlerts] = useState<Record<string, QueueAlert>>({});
  const [frontendVersion, setFrontendVersion] = useState("-");
  const [frontendUpdatedAt, setFrontendUpdatedAt] = useState<string | null>(null);
  const [availableVersion, setAvailableVersion] = useState("-");
  const [changelog, setChangelog] = useState<string[]>([]);
  const [releaseMeta, setReleaseMeta] = useState<ReleaseMeta>({
    breaking: false,
    minCompatibleFrom: "",
    migrationNotes: "",
  });
  const [updateStatus, setUpdateStatus] = useState<"idle" | "updating" | "ok">(
    () =>
      localStorage.getItem("watink_update_ok") === "1" ? "ok" : "idle"
  );
  const prevQueueMessagesRef = useRef<Record<string, number>>({});

  const hasUpdateAvailable =
    availableVersion !== "-" &&
    compareVersions(availableVersion, frontendVersion) > 0;
  const blockedByCompatibility =
    !!releaseMeta?.breaking &&
    !!releaseMeta?.minCompatibleFrom &&
    compareVersions(frontendVersion, releaseMeta.minCompatibleFrom) < 0;

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get<SystemStats>("/system/stats");
      const nextAlerts: Record<string, QueueAlert> = {};
      (data?.rabbitmq?.queues || []).forEach((q) => {
        const prev = prevQueueMessagesRef.current[q.name] || 0;
        nextAlerts[q.name] = queueAlert(q, prev);
        prevQueueMessagesRef.current[q.name] = q.messages || 0;
      });
      setQueueAlerts(nextAlerts);

      const pending =
        localStorage.getItem("watink_update_pending") === "1";
      if (pending && (data?.uptime || 999999) < 180) {
        setUpdateStatus("ok");
        localStorage.removeItem("watink_update_pending");
        localStorage.setItem("watink_update_ok", "1");
        toast.success("✅ Atualização concluída com sucesso");
      }

      setStats(data);
      setError(null);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { error?: string } }; message?: string };
      setError(
        err?.response?.data?.error || err?.message || "Falha ao carregar estatísticas"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const handleUpdate = async () => {
    setUpdating(true);
    setUpdateStatus("updating");
    localStorage.setItem("watink_update_pending", "1");
    localStorage.setItem("watink_update_ok", "0");
    setOpenUpdateModal(false);
    try {
      await api.post("/system/update", {
        version: availableVersion !== "-" ? availableVersion : "latest",
      });
      toast.info("Processo de atualização iniciado. O sistema entrará em manutenção.");
      const checkInterval = setInterval(async () => {
        try {
          const { data } = await api.get<{ enabled: boolean }>("/system/maintenance");
          if (data.enabled) {
            clearInterval(checkInterval);
            window.location.reload();
          }
        } catch {
          // servidor reiniciando
        }
      }, 2000);
    } catch {
      toast.error("Erro ao iniciar atualização");
      setUpdating(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const id = setInterval(fetchStats, 5000);

    fetch(`/version.json?ts=${Date.now()}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((v: { version?: string; lastUpdated?: string }) => {
        if (v?.version) setFrontendVersion(v.version);
        if (v?.lastUpdated) setFrontendUpdatedAt(v.lastUpdated);
      })
      .catch(() => {});

    api
      .get<{
        version?: string;
        breaking?: boolean;
        min_compatible_from?: string;
        migration_notes?: string;
        changelog?: string[];
      }>("/system/latest-release")
      .then(({ data }) => {
        const version = String(data?.version || "")
          .trim()
          .replace(/^v/i, "");
        if (version) setAvailableVersion(version);
        setReleaseMeta({
          breaking: !!data?.breaking,
          minCompatibleFrom: String(data?.min_compatible_from || ""),
          migrationNotes: String(data?.migration_notes || ""),
        });
        setChangelog(
          Array.isArray(data?.changelog)
            ? data.changelog.filter(Boolean)
            : []
        );
      })
      .catch(() => {
        setAvailableVersion("-");
        setReleaseMeta({ breaking: false, minCompatibleFrom: "", migrationNotes: "" });
      });

    return () => clearInterval(id);
  }, [fetchStats]);

  if (!isSuperAdmin) {
    return (
      <div className="container mt-6">
        <p className="text-destructive">Acesso restrito ao superadmin.</p>
      </div>
    );
  }

  if (loading && !stats) {
    return (
      <div className="container mt-6 flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const memPct = stats?.memoryTotal
    ? ((stats.memoryUsed || 0) / stats.memoryTotal) * 100
    : 0;

  return (
    <div className="container mt-6 space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Monitor do Sistema (Business)</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <RouterLink to="/swagger">
              <BookOpen className="mr-2 h-4 w-4" />
              Swagger
            </RouterLink>
          </Button>
          {hasUpdateAvailable && (
            <Badge variant="destructive">Nova versão v{availableVersion}</Badge>
          )}
          <Button
            size="sm"
            variant={updateStatus === "ok" ? "secondary" : "default"}
            disabled={updating || updateStatus === "ok"}
            onClick={() => setOpenUpdateModal(true)}
            style={
              updateStatus === "ok"
                ? {
                    backgroundColor: "var(--status-success)",
                    color: "var(--bg-surface)",
                  }
                : undefined
            }
          >
            {updating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <UploadCloud className="mr-2 h-4 w-4" />
            )}
            {updateStatus === "ok"
              ? "Atualização OK"
              : updating
              ? "Atualizando..."
              : "Verificar Atualização"}
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">Erro: {error}</p>}

      {/* System stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          title="CPU do Sistema"
          value={`${stats?.cpuUsage?.toFixed(1)}%`}
          progress={stats?.cpuUsage || 0}
          progressColor={
            (stats?.cpuUsage || 0) > 80 ? "destructive" : "primary"
          }
        />
        <StatCard
          title="Memória RAM"
          value={`${formatBytes(stats?.memoryUsed || 0)} / ${formatBytes(stats?.memoryTotal || 0)}`}
          progress={memPct}
          progressColor={memPct > 80 ? "destructive" : "primary"}
          caption={`${memPct.toFixed(1)}% em uso`}
        />
        <StatCard
          title="Uptime do Backend"
          value={formatUptime(stats?.uptime || 0)}
          caption={`Desde: ${new Date(
            ((stats?.timestamp || 0) - (stats?.uptime || 0)) * 1000
          ).toLocaleString()}`}
        />
      </div>

      {/* Process + RabbitMQ */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 font-semibold">Processo Backend (Go)</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                label: "Uso de CPU (Proc)",
                value: `${stats?.process?.cpuUsage?.toFixed(2)}%`,
              },
              {
                label: "Memória (Heap)",
                value: formatBytes(stats?.process?.memoryUsed || 0),
              },
              {
                label: "Goroutines",
                value: String(stats?.process?.numGoroutine ?? "-"),
              },
              { label: "Threads do SO", value: "-" },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-xs text-muted-foreground">{item.label}</p>
                <p className="text-base font-bold">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Fila de Mensagens (RabbitMQ)</h2>
            <Button variant="ghost" size="sm" asChild>
              <RouterLink to="/monitor/queues">Ver filas</RouterLink>
            </Button>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Status:{" "}
            {stats?.rabbitmq?.connected ? (
              <span className="text-green-600">Online</span>
            ) : (
              <span className="text-destructive">Offline</span>
            )}{" "}
            • exibindo{" "}
            {Math.min((stats?.rabbitmq?.queues || []).length, 8)} de{" "}
            {(stats?.rabbitmq?.queues || []).length}
          </p>
          <div className="space-y-3">
            {(stats?.rabbitmq?.queues || []).slice(0, 8).map((q) => {
              const alert = queueAlerts[q.name] || { level: "ok", label: "OK" };
              return (
                <div key={q.name} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs">{q.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        msgs: {q.messages || 0} • consumers: {q.consumers || 0}
                      </span>
                      <Badge
                        variant={
                          alert.level === "error"
                            ? "destructive"
                            : alert.level === "warning"
                            ? "secondary"
                            : "outline"
                        }
                        className="text-xs"
                      >
                        {alert.label}
                      </Badge>
                    </div>
                  </div>
                  <Progress
                    value={Math.min(100, (q.messages || 0) * 5)}
                    className={
                      alert.level !== "ok"
                        ? "[&>div]:bg-destructive"
                        : undefined
                    }
                  />
                  {q.error && (
                    <p className="text-xs text-destructive">{q.error}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tenant consumption */}
      <div className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-4 py-3">
          <h2 className="font-semibold">Consumo por Tenant</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                {["Tenant", "Usuários", "Contatos", "Tickets", "Abertos", "WhatsApps"].map(
                  (h) => (
                    <th
                      key={h}
                      className="px-4 py-2 text-left font-medium text-muted-foreground last:text-right [&:not(:first-child)]:text-right"
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {(stats?.tenantConsumption || []).slice(0, 20).map((t) => (
                <tr key={t.tenantId} className="border-t border-border hover:bg-accent/50">
                  <td className="px-4 py-2">{t.tenantName}</td>
                  <td className="px-4 py-2 text-right">{t.users}</td>
                  <td className="px-4 py-2 text-right">{t.contacts}</td>
                  <td className="px-4 py-2 text-right">{t.tickets}</td>
                  <td className="px-4 py-2 text-right">{t.openTickets}</td>
                  <td className="px-4 py-2 text-right">{t.whatsapps}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {updateStatus === "ok" && (
        <p className="font-semibold" style={{ color: "var(--status-success)" }}>
          ✅ Atualização concluída com sucesso. Sistema 100% atualizado.
        </p>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Watink Business v{frontendVersion} • Build ID: {stats?.timestamp}
        {frontendUpdatedAt
          ? ` • Updated: ${new Date(frontendUpdatedAt).toLocaleString()}`
          : ""}
      </p>

      {/* Update Dialog */}
      <Dialog open={openUpdateModal} onOpenChange={setOpenUpdateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>🚀 Verificar Atualização</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p>
              Versão disponível:{" "}
              <strong>v{availableVersion !== "-" ? availableVersion : "latest"}</strong>
            </p>
            <p className="text-muted-foreground">Versão atual: v{frontendVersion}</p>

            {releaseMeta?.breaking && (
              <div className="mt-2 space-y-1">
                <Badge variant="destructive">Release com quebra de compatibilidade</Badge>
                {releaseMeta?.minCompatibleFrom && (
                  <p className="text-xs text-destructive">
                    Compatível apenas a partir de v{releaseMeta.minCompatibleFrom}.
                  </p>
                )}
                {releaseMeta?.migrationNotes && (
                  <p className="text-xs text-muted-foreground">
                    Migração necessária: {releaseMeta.migrationNotes}
                  </p>
                )}
              </div>
            )}

            {changelog.length > 0 ? (
              <>
                <p className="pt-2">Changelog desta versão:</p>
                <ul className="list-disc pl-5 space-y-1">
                  {changelog.map((item, idx) => (
                    <li key={`${idx}-${item}`}>{item}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="text-muted-foreground">
                Changelog não informado para esta versão.
              </p>
            )}

            <p className="pt-2">
              Ao atualizar, o sistema irá entrar em manutenção e reiniciar os serviços.
            </p>
            <p>Deseja prosseguir agora?</p>

            {blockedByCompatibility && (
              <p className="text-destructive">
                Atualização bloqueada por compatibilidade. Atualize para uma versão intermediária
                compatível ou execute a migração indicada antes de prosseguir.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenUpdateModal(false)}>
              Agora não
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={blockedByCompatibility}
            >
              {blockedByCompatibility
                ? "Release incompatível"
                : "Sim, Atualizar Agora"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
