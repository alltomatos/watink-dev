import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Maximize, RefreshCw, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";
import api from "../../services/api";
import openSocket from "../../services/socket-io";
import ProtocolCard from "./ProtocolCard";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface Protocol {
  id: number;
  protocolNumber: string;
  subject: string;
  status: string;
  priority: "low" | "medium" | "high" | "urgent";
  contact?: { name?: string; profilePicUrl?: string };
}

interface KanbanColumn {
  status: string;
  label: string;
  color: string;
  bgColor: string;
  protocols: Protocol[];
}

interface SocketEventData {
  action: "create" | "update";
  protocol: Protocol;
  previousStatus?: string;
  newStatus?: string;
}

interface HelpdeskKanbanProps {
  tvMode?: boolean;
}

const HelpdeskKanban: React.FC<HelpdeskKanbanProps> = ({ tvMode = false }) => {
  const navigate = useNavigate();
  const [columns, setColumns] = useState<KanbanColumn[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentlyAdded, setRecentlyAdded] = useState<Set<number>>(new Set());

  const loadKanbanData = useCallback(async () => {
    try {
      const { data } = await api.get("/protocols/kanban");
      setColumns(data.columns);
    } catch {
      toast.error("Erro ao carregar Kanban");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadKanbanData();

    const socket = openSocket();
    if (socket) {
      socket.emit("joinHelpdeskKanban");
      socket.on("protocol", (data: SocketEventData) => {
        handleProtocolEvent(data);
      });
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [loadKanbanData]);

  const handleProtocolEvent = (data: SocketEventData) => {
    const { action, protocol, previousStatus, newStatus } = data;

    if (action === "create") {
      setColumns((prev) =>
        prev.map((col) => {
          if (col.status === protocol.status) {
            return {
              ...col,
              protocols: [protocol, ...col.protocols],
            };
          }
          return col;
        })
      );
      setRecentlyAdded((prev) => new Set(prev).add(protocol.id));
      setTimeout(() => {
        setRecentlyAdded((prev) => {
          const next = new Set(prev);
          next.delete(protocol.id);
          return next;
        });
      }, 2000);
    } else if (action === "update") {
      if (previousStatus !== newStatus) {
        setColumns((prev) =>
          prev.map((col) => {
            if (col.status === previousStatus) {
              return {
                ...col,
                protocols: col.protocols.filter((p) => p.id !== protocol.id),
              };
            }
            if (col.status === newStatus) {
              return {
                ...col,
                protocols: [protocol, ...col.protocols],
              };
            }
            return col;
          })
        );
      } else {
        setColumns((prev) =>
          prev.map((col) => ({
            ...col,
            protocols: col.protocols.map((p) =>
              p.id === protocol.id ? protocol : p
            ),
          }))
        );
      }
    }
  };

  const handleCardClick = (protocol: Protocol) => {
    if (!tvMode) {
      navigate(`/helpdesk/${protocol.id}`);
    }
  };

  const handleTvMode = () => {
    navigate("/helpdesk/tv");
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="flex h-full flex-col bg-[var(--bg-surface-alt)] p-4">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between rounded-lg bg-[var(--bg-surface)] p-3 shadow-sm">
          <div className="flex items-center gap-2">
            {!tvMode && (
              <button
                type="button"
                onClick={() => navigate("/helpdesk")}
                className="rounded p-1.5 hover:bg-black/5"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <h1 className="text-xl font-semibold">🎫 Helpdesk Kanban</h1>
          </div>
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={loadKanbanData}
                  className="rounded p-2 hover:bg-black/5"
                >
                  <RefreshCw className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent>Atualizar</TooltipContent>
            </Tooltip>

            {!tvMode && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={handleTvMode}
                    className="rounded p-2 hover:bg-black/5"
                  >
                    <Maximize className="h-5 w-5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>Modo TV (Tela Cheia)</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Board */}
        <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
          {columns.map((col) => (
            <div
              key={col.status}
              className="flex w-[280px] min-w-[280px] flex-col overflow-hidden rounded-xl shadow-md"
              style={{ backgroundColor: col.bgColor }}
            >
              <div
                className="flex items-center justify-between p-3 font-semibold text-[var(--bg-surface)]"
                style={{ backgroundColor: col.color }}
              >
                <span>{col.label}</span>
                <span className="rounded-full bg-[var(--overlay-light)] px-2.5 py-0.5 text-xs font-bold text-[var(--bg-surface)]">
                  {col.protocols.length}
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-2 max-h-[calc(100vh-200px)] custom-scrollbar">
                <AnimatePresence>
                  {col.protocols.length === 0 ? (
                    <div className="p-6 text-center text-muted-foreground">
                      Nenhum protocolo
                    </div>
                  ) : (
                    col.protocols.map((protocol) => (
                      <motion.div
                        key={protocol.id}
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: 100 }}
                        transition={{ duration: 0.3 }}
                        layout
                      >
                        <ProtocolCard
                          protocol={protocol}
                          isNew={recentlyAdded.has(protocol.id)}
                          onClick={handleCardClick}
                        />
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default HelpdeskKanban;
