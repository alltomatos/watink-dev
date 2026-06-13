/* @jsxImportSource react */
import React, { useEffect, useReducer, useState } from "react";
import openSocket from "../../services/socket-io";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Loader2,
  GitMerge
} from "lucide-react";
import { toast } from "react-toastify";

import api from "../../services/api";
import { i18n } from "../../translate/i18n";
import toastError from "../../errors/toastError";
import QueueModal from "../../components/QueueModal";
import ConfirmationModal from "../../components/ConfirmationModal";

import { 
  PageContainer, 
  PageHeader, 
  PageContent 
} from "../../components/ui/page-layout";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "../../components/ui/table";
import { Button } from "../../components/ui/button";

const reducer = (state, action) => {
  if (action.type === "LOAD_QUEUES") {
    const queues = action.payload;
    return [...queues];
  }

  if (action.type === "UPDATE_QUEUES") {
    const queue = action.payload;
    const queueIndex = state.findIndex((u) => u.id === queue.id);

    if (queueIndex !== -1) {
      state[queueIndex] = queue;
      return [...state];
    } else {
      return [queue, ...state];
    }
  }

  if (action.type === "DELETE_QUEUE") {
    const queueId = action.payload;
    const queueIndex = state.findIndex((q) => q.id === queueId);
    if (queueIndex !== -1) {
      state.splice(queueIndex, 1);
    }
    return [...state];
  }

  return state;
};

const Queues = () => {
  const [loading, setLoading] = useState(false);
  const [queues, dispatch] = useReducer(reducer, []);
  const [queueModalOpen, setQueueModalOpen] = useState(false);
  const [selectedQueue, setSelectedQueue] = useState(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/queue");
        dispatch({ type: "LOAD_QUEUES", payload: data });
        setLoading(false);
      } catch (err) {
        toastError(err);
      }
    })();
  }, []);

  useEffect(() => {
    const socket = openSocket();

    socket.on("queue", (data) => {
      if (data.action === "update" || data.action === "create") {
        dispatch({ type: "UPDATE_QUEUES", payload: data.queue });
      }

      if (data.action === "delete") {
        dispatch({ type: "DELETE_QUEUE", payload: data.queueId });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const handleOpenQueueModal = () => {
    setSelectedQueue(null);
    setQueueModalOpen(true);
  };

  const handleCloseQueueModal = () => {
    setSelectedQueue(null);
    setQueueModalOpen(false);
  };

  const handleEditQueue = (queue) => {
    setSelectedQueue(queue);
    setQueueModalOpen(true);
  };

  const handleDeleteQueue = async (queueId) => {
    try {
      await api.delete(`/queue/${queueId}`);
      toast.success(i18n.t("queues.toasts.deleted"));
    } catch (err) {
      toastError(err);
    }
    setSelectedQueue(null);
  };

  return (
    <PageContainer>
      <ConfirmationModal
        title={
          selectedQueue &&
          `${i18n.t("queues.confirmationModal.deleteTitle")} ${selectedQueue.name}?`
        }
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={() => handleDeleteQueue(selectedQueue.id)}
      >
        {i18n.t("queues.confirmationModal.deleteMessage")}
      </ConfirmationModal>
      
      <QueueModal
        open={queueModalOpen}
        onClose={handleCloseQueueModal}
        queueId={selectedQueue?.id}
      />

      <PageHeader 
        title={i18n.t("queues.title")}
        description="Configure as filas de atendimento e fluxos de triagem automática"
      >
        <Button onClick={handleOpenQueueModal}>
          <Plus className="mr-2 h-4 w-4" />
          {i18n.t("queues.buttons.add")}
        </Button>
      </PageHeader>

      <PageContent>
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{i18n.t("queues.table.name")}</TableHead>
                <TableHead>{i18n.t("queues.table.color")}</TableHead>
                <TableHead>{i18n.t("queues.table.greeting")}</TableHead>
                <TableHead className="text-right w-[100px]">{i18n.t("queues.table.actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queues.map((queue) => (
                <TableRow key={queue.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <GitMerge className="h-4 w-4 text-primary" />
                      <span className="font-semibold">{queue.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div 
                        className="h-4 w-4 rounded-full border border-black/10 shadow-sm"
                        style={{ backgroundColor: queue.color || "#eee" }}
                      />
                      <span className="text-xs font-mono uppercase text-muted-foreground">{queue.color}</span>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-xs">
                    <p className="truncate text-muted-foreground">
                      {queue.greetingMessage || "Sem saudação"}
                    </p>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditQueue(queue)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => {
                          setSelectedQueue(queue);
                          setConfirmModalOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {loading && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  </TableCell>
                </TableRow>
              )}
              {!loading && queues.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    Nenhuma fila encontrada.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </PageContent>
    </PageContainer>
  );
};

export default Queues;
