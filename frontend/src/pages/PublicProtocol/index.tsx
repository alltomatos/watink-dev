/* @jsxImportSource react */
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { format } from "date-fns";
import {
  Loader2,
  ClipboardList,
  User,
  Calendar,
  Paperclip,
  AlertCircle,
} from "lucide-react";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import AttachmentsList from "../../components/AttachmentsList";

import { Badge } from "../../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Separator } from "../../components/ui/separator";

// ─── Types ───────────────────────────────────────────────────────────────────

interface HistoryEntry {
  id: string;
  action: string;
  comment?: string;
  changes?: string;
  createdAt: string;
  user?: { name: string };
}

interface Protocol {
  protocolNumber: string;
  status: string;
  priority: string;
  subject: string;
  description?: string;
  category?: string;
  createdAt: string;
  tenant?: { name: string };
  history: HistoryEntry[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const statusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  if (status === "open") return "default";
  if (status === "in_progress") return "secondary";
  if (status === "resolved") return "outline";
  return "outline";
};

const priorityVariant = (priority: string): "default" | "secondary" | "destructive" | "outline" => {
  if (priority === "high" || priority === "urgent") return "destructive";
  if (priority === "medium") return "secondary";
  return "outline";
};

const historyIcon = (action: string) => {
  switch (action) {
    case "created":      return <ClipboardList className="h-4 w-4" />;
    case "attachment":   return <Paperclip className="h-4 w-4" />;
    case "comment_added": return <User className="h-4 w-4" />;
    default:             return <Calendar className="h-4 w-4" />;
  }
};

// ─── Component ────────────────────────────────────────────────────────────────

const PublicProtocol: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProtocol = async () => {
      try {
        const { data } = await api.get<Protocol>(`/public/protocols/${token}`);
        setProtocol(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchProtocol();
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/10">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!protocol) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/10 p-4">
        <Card className="w-full max-w-sm text-center shadow-md">
          <CardContent className="pt-8 space-y-3">
            <AlertCircle className="mx-auto h-10 w-10 text-destructive" />
            <p className="text-lg font-bold">
              {i18n.t("publicProtocol.notFound.title")}
            </p>
            <p className="text-sm text-muted-foreground">
              {i18n.t("publicProtocol.notFound.message")}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/10 py-8">
      <div className="container mx-auto max-w-5xl px-4 space-y-6">

        {/* Tenant / Título */}
        <div className="text-center">
          <p className="text-2xl font-bold text-primary">
            {protocol.tenant?.name || i18n.t("publicProtocol.defaultTenant")}
          </p>
        </div>

        {/* Header do Protocolo */}
        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <ClipboardList className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">
                    {i18n.t("publicProtocol.header.number", {
                      number: protocol.protocolNumber,
                    })}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {i18n.t("publicProtocol.header.createdAt", {
                      date: format(new Date(protocol.createdAt), "dd/MM/yyyy 'às' HH:mm"),
                    })}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge variant={statusVariant(protocol.status)}>
                  {i18n.t(`publicProtocol.status.${protocol.status}`)}
                </Badge>
                <Badge variant={priorityVariant(protocol.priority)}>
                  <AlertCircle className="mr-1 h-3 w-3" />
                  {i18n.t(`publicProtocol.priority.${protocol.priority}`)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Grid: Detalhes + Timeline */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">

          {/* Detalhes */}
          <Card className="md:col-span-2 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {i18n.t("publicProtocol.details.title")}
              </CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4 space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {i18n.t("publicProtocol.details.subject")}
                </p>
                <p className="text-sm font-medium">{protocol.subject}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {i18n.t("publicProtocol.details.description")}
                </p>
                <p className="text-sm whitespace-pre-wrap">
                  {protocol.description ||
                    i18n.t("publicProtocol.details.noDescription")}
                </p>
              </div>
              {protocol.category && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {i18n.t("publicProtocol.details.category")}
                  </p>
                  <Badge variant="outline" className="text-xs">
                    {protocol.category}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Timeline de Histórico */}
          <Card className="md:col-span-3 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {i18n.t("publicProtocol.history.title")}
              </CardTitle>
            </CardHeader>
            <Separator />
            <CardContent className="pt-4">
              <ol className="relative border-l border-border space-y-6 pl-6">
                {protocol.history.map((hist) => (
                  <li key={hist.id} className="relative">
                    {/* Dot */}
                    <span className="absolute -left-[29px] flex h-5 w-5 items-center justify-center rounded-full border-2 border-primary bg-background text-primary">
                      {historyIcon(hist.action)}
                    </span>

                    <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold">
                          {i18n.t(
                            `publicProtocol.history.actions.${hist.action}`
                          ) || hist.action}
                        </p>
                        <time className="text-xs text-muted-foreground shrink-0">
                          {format(new Date(hist.createdAt), "dd/MM HH:mm")}
                        </time>
                      </div>

                      {hist.comment && (
                        <p className="text-sm text-muted-foreground">
                          {hist.comment}
                        </p>
                      )}

                      {hist.action === "attachment" && hist.changes && (
                        <AttachmentsList
                          attachments={(() => {
                            try {
                              const parsed = JSON.parse(hist.changes);
                              return parsed.files || [];
                            } catch {
                              return [];
                            }
                          })()}
                          canDelete={false}
                          showEmpty={false}
                        />
                      )}

                      <div className="flex items-center gap-1 pt-1">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {hist.user ? hist.user.name : "Sistema"}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
};

export default PublicProtocol;
