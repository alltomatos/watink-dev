/* @jsxImportSource react */
import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRight, Clock } from "lucide-react";
import { toast } from "react-toastify";

import { PageContainer, PageHeader, PageContent } from "@/components/ui/page-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

import api from "../../services/api";
import ActivityExecution from "./ActivityExecution";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Activity {
  id: string;
  title: string;
  description?: string;
  status: "pending" | "in_progress" | "done" | "cancelled";
  createdAt: string;
}

// ─── Status Helpers ──────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  pending:       { label: "Pendente",   variant: "outline" },
  in_progress:   { label: "Em Progresso", variant: "secondary" },
  done:          { label: "Concluído", variant: "default" },
  cancelled:     { label: "Cancelado", variant: "destructive" },
};

// ─── Component ────────────────────────────────────────────────────────────────

const MyActivities: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [executionOpen, setExecutionOpen] = useState(false);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const { data } = await api.get<{ activities?: Activity[] }>("/my-activities");
      setActivities(data.activities ?? []);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao carregar atividades");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenExecution = (activity: Activity) => {
    setSelectedActivity(activity);
    setExecutionOpen(true);
  };

  const handleCloseExecution = () => {
    setExecutionOpen(false);
    setSelectedActivity(null);
    fetchActivities();
  };

  return (
    <PageContainer>
      <PageHeader title="Minhas Atividades" />
      <PageContent>
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        ) : activities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-lg text-muted-foreground">
              Nenhuma atividade atribuída no momento.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activities.map((activity) => {
              const cfg = STATUS_CONFIG[activity.status] ?? STATUS_CONFIG.pending;
              return (
                <Card key={activity.id} className="flex flex-col">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <Badge variant={cfg.variant}>{cfg.label}</Badge>
                      <span className="text-xs text-muted-foreground">
                        #{activity.id}
                      </span>
                    </div>
                    <CardTitle className="text-base leading-snug">
                      {activity.title}
                    </CardTitle>
                    <CardDescription className="line-clamp-2">
                      {activity.description || "Sem descrição"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="mt-auto flex flex-col gap-4">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {format(new Date(activity.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => handleOpenExecution(activity)}
                    >
                      Executar
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </PageContent>

      {selectedActivity && (
        <ActivityExecution
          open={executionOpen}
          activityId={selectedActivity.id}
          onClose={handleCloseExecution}
        />
      )}
    </PageContainer>
  );
};

export default MyActivities;