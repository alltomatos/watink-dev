/* @jsxImportSource react */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { LayoutGrid, Table as TableIcon, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { toast } from "react-toastify";

import { PageContainer, PageHeader, PageContent } from "@/components/ui/page-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import api from "../../services/api";

// ─── Types ───────────────────────────────────────────────────────────────────
// "Minhas Atividades" mostra os PROTOCOLOS de Helpdesk atribuídos ao usuário
// logado (não os work-orders de checklist/materiais/ocorrências — esse fluxo
// de execução em campo segue sem backend, ver ActivityExecution.tsx).

interface MyActivityContact {
  name: string;
  client?: { socialName?: string | null } | null;
}

type SlaStatus = "on_time" | "overdue" | "none";

interface MyActivity {
  id: number;
  protocolNumber: string;
  subject: string;
  status: string;
  priority: "low" | "medium" | "high" | "urgent";
  dueDate: string | null;
  createdAt: string;
  slaStatus: SlaStatus;
  contact?: MyActivityContact;
}

// ─── Labels & Cores ──────────────────────────────────────────────────────────

const PRIORITY_LABELS: Record<string, string> = {
  low: "Baixa", medium: "Média", high: "Alta", urgent: "Urgente",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Aberto", in_progress: "Em Andamento", pending: "Pendente",
};

const priorityVariant = (p: string): "default" | "secondary" | "destructive" | "outline" => {
  if (p === "urgent" || p === "high") return "destructive";
  if (p === "medium") return "secondary";
  return "outline";
};

// Cor do card/linha por status de SLA — depende de Configurações > Helpdesk >
// SLA estar habilitado e configurado; sem dueDate o protocolo cai em "none"
// (cor neutra, sem indicar atraso nem prazo).
const SLA_ACCENT: Record<SlaStatus, string> = {
  overdue: "border-l-4 border-l-[hsl(var(--status-error))] bg-[var(--status-error-10)]",
  on_time: "border-l-4 border-l-[hsl(var(--status-success))] bg-[var(--status-success-10)]",
  none: "border-l-4 border-l-border",
};

const SLA_BADGE_CLASS: Record<SlaStatus, string> = {
  overdue: "border-transparent bg-[hsl(var(--status-error-bg))] text-[hsl(var(--status-error-text))]",
  on_time: "border-transparent bg-[hsl(var(--status-success-bg))] text-[hsl(var(--status-success-text))]",
  none: "border-transparent bg-muted text-muted-foreground",
};

const SLA_LABEL: Record<SlaStatus, string> = {
  overdue: "Atrasado", on_time: "Em dia", none: "Sem SLA",
};

const SlaIcon: React.FC<{ status: SlaStatus }> = ({ status }) => {
  if (status === "overdue") return <AlertTriangle className="h-3 w-3" />;
  if (status === "on_time") return <CheckCircle2 className="h-3 w-3" />;
  return <Clock className="h-3 w-3" />;
};

// ─── Component ────────────────────────────────────────────────────────────────

const MyActivities: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<MyActivity[]>([]);
  const [view, setView] = useState<"grid" | "table">("grid");

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true);
        const { data } = await api.get<{ activities?: MyActivity[] }>("/my-activities");
        setActivities(data.activities ?? []);
      } catch (err) {
        console.error(err);
        toast.error("Erro ao carregar atividades");
      } finally {
        setLoading(false);
      }
    };
    fetchActivities();
  }, []);

  const handleOpen = (activity: MyActivity) => navigate(`/helpdesk/${activity.id}`);

  const contactLabel = (activity: MyActivity): string =>
    activity.contact?.client?.socialName || activity.contact?.name || "—";

  return (
    <PageContainer>
      <PageHeader title="Minhas Atividades" description="Protocolos de atendimento atribuídos a você">
        <div className="flex gap-1 rounded-lg border border-border p-0.5">
          <Button
            type="button"
            variant={view === "grid" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs"
            onClick={() => setView("grid")}
          >
            <LayoutGrid className="h-3.5 w-3.5" /> Grid
          </Button>
          <Button
            type="button"
            variant={view === "table" ? "secondary" : "ghost"}
            size="sm"
            className="h-7 gap-1.5 px-2 text-xs"
            onClick={() => setView("table")}
          >
            <TableIcon className="h-3.5 w-3.5" /> Tabela
          </Button>
        </div>
      </PageHeader>
      <PageContent>
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-lg text-muted-foreground">
              Nenhum protocolo atribuído a você no momento.
            </p>
          </div>
        ) : view === "grid" ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activities.map((activity) => (
              <Card
                key={activity.id}
                className={cn(
                  "flex flex-col cursor-pointer transition-shadow hover:shadow-md",
                  SLA_ACCENT[activity.slaStatus]
                )}
                onClick={() => handleOpen(activity)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant={priorityVariant(activity.priority)}>
                      {PRIORITY_LABELS[activity.priority] ?? activity.priority}
                    </Badge>
                    <span className="text-xs text-muted-foreground shrink-0">
                      #{activity.protocolNumber}
                    </span>
                  </div>
                  <CardTitle className="text-base leading-snug break-words">
                    {activity.subject}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground truncate">
                    {contactLabel(activity)}
                  </p>
                </CardHeader>
                <CardContent className="mt-auto flex items-center justify-between gap-2 flex-wrap">
                  <Badge className={cn("gap-1", SLA_BADGE_CLASS[activity.slaStatus])}>
                    <SlaIcon status={activity.slaStatus} />
                    {SLA_LABEL[activity.slaStatus]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {STATUS_LABELS[activity.status] ?? activity.status}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Protocolo</th>
                  <th className="px-3 py-2 text-left font-medium">Assunto</th>
                  <th className="px-3 py-2 text-left font-medium">Contato</th>
                  <th className="px-3 py-2 text-left font-medium">Prioridade</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-left font-medium">SLA</th>
                  <th className="px-3 py-2 text-left font-medium">Criado em</th>
                </tr>
              </thead>
              <tbody>
                {activities.map((activity) => (
                  <tr
                    key={activity.id}
                    className={cn(
                      "cursor-pointer border-t border-border hover:brightness-95 transition-[filter]",
                      SLA_ACCENT[activity.slaStatus]
                    )}
                    onClick={() => handleOpen(activity)}
                  >
                    <td className="px-3 py-2 font-medium whitespace-nowrap">
                      #{activity.protocolNumber}
                    </td>
                    <td className="px-3 py-2 max-w-[280px] truncate">{activity.subject}</td>
                    <td className="px-3 py-2 text-muted-foreground max-w-[200px] truncate">
                      {contactLabel(activity)}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant={priorityVariant(activity.priority)}>
                        {PRIORITY_LABELS[activity.priority] ?? activity.priority}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                      {STATUS_LABELS[activity.status] ?? activity.status}
                    </td>
                    <td className="px-3 py-2">
                      <Badge className={cn("gap-1", SLA_BADGE_CLASS[activity.slaStatus])}>
                        <SlaIcon status={activity.slaStatus} />
                        {SLA_LABEL[activity.slaStatus]}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                      {format(new Date(activity.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PageContent>
    </PageContainer>
  );
};

export default MyActivities;
