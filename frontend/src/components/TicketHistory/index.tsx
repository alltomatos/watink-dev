/* @jsxImportSource react */
import React, { useState, useEffect } from "react";
import {
  History,
  ArrowLeftRight,
  User,
  MessageSquare,
  Circle,
  Loader2,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import api from "../../services/api";
import { Avatar } from "../ui/avatar";

interface TicketLogUser {
  name: string;
}

interface TicketLog {
  id: number;
  type: string;
  payload: string;
  createdAt: string;
  user?: TicketLogUser;
}

interface TicketHistoryProps {
  ticketId: number | string;
}

const getLogIcon = (type: string) => {
  switch (type) {
    case "transfer":
      return <ArrowLeftRight className="h-3.5 w-3.5 text-[var(--status-info)]" />;
    case "status":
      return <Circle className="h-3.5 w-3.5 fill-[var(--status-success)] text-[var(--status-success)]" />;
    case "assign":
      return <User className="h-3.5 w-3.5 text-[var(--status-warning)]" />;
    default:
      return <MessageSquare className="h-3.5 w-3.5 text-muted-foreground" />;
  }
};

const formatLogMessage = (log: TicketLog) => {
  let payload: Record<string, any> = {};
  try {
    payload = JSON.parse(log.payload);
  } catch (e) {
    console.error("Error parsing log payload:", e);
  }

  switch (log.type) {
    case "transfer":
      return `Transferido para a fila #${payload.newQueueId || "desconhecida"}`;
    case "status":
      return `Status alterado de "${payload.old}" para "${payload.new}"`;
    case "assign":
      return `Atribuído ao usuário #${payload.newUserId || "desconhecido"}`;
    default:
      return log.payload || "Ação registrada";
  }
};

const TicketHistory: React.FC<TicketHistoryProps> = ({ ticketId }) => {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<TicketLog[]>([]);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const { data } = await api.get(`/tickets/${ticketId}/logs`);
        setLogs(data);
      } catch (err) {
        console.error("Error fetching ticket logs", err);
      } finally {
        setLoading(false);
      }
    };
    if (ticketId) fetchLogs();
  }, [ticketId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 bg-slate-50 dark:bg-slate-900/50 rounded-xl h-full border border-border">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2 border-b border-border pb-2">
        <History className="h-4 w-4 text-muted-foreground" /> Linha do Tempo
      </h3>

      <div className="relative pl-6 before:absolute before:left-2.5 before:top-1 before:bottom-1 before:w-0.5 before:bg-border select-none">
        {logs.length === 0 ? (
          <p className="text-xs text-muted-foreground py-2">Nenhum evento registrado ainda.</p>
        ) : (
          logs.map((log) => (
            <div key={log.id} className="relative mb-6 last:mb-2 group">
              {/* Timeline dot icon container */}
              <div className="absolute -left-[22px] top-[14px] h-6 w-6 rounded-full bg-background border-2 border-border flex items-center justify-center z-10 transition-colors duration-fast group-hover:border-primary">
                {getLogIcon(log.type)}
              </div>

              {/* Log message balloon */}
              <div className="relative p-3 rounded-xl bg-card border border-border before:absolute before:-left-2 before:top-[18px] before:w-2 before:h-[1px] before:bg-border transition-shadow hover:shadow-sm">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                    {log.type}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {format(parseISO(log.createdAt), "dd/MM HH:mm")}
                  </span>
                </div>
                <p className="text-xs text-foreground leading-relaxed">
                  {formatLogMessage(log)}
                </p>
                {log.user && (
                  <div className="inline-flex items-center gap-1.5 mt-2 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-md text-[10px] font-medium text-foreground">
                    <Avatar size="xs" name={log.user.name} />
                    <span>{log.user.name}</span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TicketHistory;
