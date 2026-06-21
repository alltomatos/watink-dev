import React, { useState, useEffect, useContext, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import useQueues from "../../hooks/useQueues";
import useWhatsApps from "../../hooks/useWhatsApps";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../Can";

interface UserOption {
  id: number;
  name: string;
  queues?: { id: number; name: string }[];
}

interface QueueOption {
  id: number;
  name: string;
}

interface TransferTicketModalProps {
  modalOpen: boolean;
  onClose: () => void;
  ticketid: number | string;
  ticketWhatsappId?: number | string;
}

const TransferTicketModal = ({ modalOpen, onClose, ticketid, ticketWhatsappId }: TransferTicketModalProps) => {
  const navigate = useNavigate();
  const [options, setOptions] = useState<UserOption[]>([]);
  const [queues, setQueues] = useState<QueueOption[]>([]);
  const [allQueues, setAllQueues] = useState<QueueOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserOption | null>(null);
  const [selectedQueue, setSelectedQueue] = useState("");
  const [selectedWhatsapp, setSelectedWhatsapp] = useState(ticketWhatsappId ? String(ticketWhatsappId) : "");

  const { data: queuesData } = useQueues();
  const { loading: loadingWhatsapps, whatsApps } = useWhatsApps();
  const { user: loggedInUser } = useContext(AuthContext);

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (queuesData) {
      setAllQueues(queuesData);
      setQueues(queuesData);
    }
  }, [queuesData]);

  useEffect(() => {
    if (!modalOpen || searchParam.length < 3) {
      setOptions([]);
      return;
    }

    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    searchTimeoutRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { data } = await api.get("/users/", { params: { searchParam } });
        setOptions(data.users);
      } catch (err) {
        toastError(err);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchParam, modalOpen]);

  const handleClose = () => {
    onClose();
    setSearchParam("");
    setSelectedUser(null);
    setOptions([]);
  };

  const handleSaveTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketid) return;
    setLoading(true);
    try {
      const data: Record<string, unknown> = {};

      if (selectedUser) data.userId = selectedUser.id;

      if (selectedQueue && selectedQueue !== "none") {
        data.queueId = selectedQueue;
        if (!selectedUser) {
          data.status = "pending";
          data.userId = null;
        }
      }

      if (selectedWhatsapp && selectedWhatsapp !== "none") {
        data.whatsappId = selectedWhatsapp;
      }

      await api.put(`/tickets/${ticketid}`, data);
      navigate(`/tickets`);
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
      handleClose();
    }
  };

  return (
    <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSaveTicket} className="space-y-6">
          <DialogHeader>
            <DialogTitle>{i18n.t("transferTicketModal.title")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Custom Autocomplete via Native Input + Datalist/Dropdown (simplified for Shadcn) */}
            <div className="space-y-1">
              <Label>{i18n.t("transferTicketModal.fieldLabel")}</Label>
              <div className="relative">
                <Input
                  autoFocus
                  placeholder="Buscar usuário..."
                  value={searchParam}
                  onChange={(e) => {
                    setSearchParam(e.target.value);
                    if (selectedUser && e.target.value !== selectedUser.name) {
                      setSelectedUser(null);
                    }
                  }}
                  className="w-full"
                  required
                />
                {loading && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />}
              </div>

              {options.length > 0 && !selectedUser && (
                <div className="absolute z-50 w-full max-w-[calc(100%-3rem)] mt-1 max-h-48 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
                  {options.map((opt) => (
                    <div
                      key={opt.id}
                      className="px-3 py-2 text-sm cursor-pointer hover:bg-accent"
                      onClick={() => {
                        setSelectedUser(opt);
                        setSearchParam(opt.name);
                        setOptions([]);
                        if (opt.queues && Array.isArray(opt.queues) && opt.queues.length > 0) {
                          setQueues(opt.queues);
                        } else {
                          setQueues(allQueues);
                        }
                      }}
                    >
                      {opt.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-1">
              <Label>{i18n.t("transferTicketModal.fieldQueueLabel")}</Label>
              <Select value={selectedQueue} onValueChange={setSelectedQueue}>
                <SelectTrigger>
                  <SelectValue placeholder={i18n.t("transferTicketModal.fieldQueuePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma fila</SelectItem>
                  {queues.map((queue) => (
                    <SelectItem key={queue.id} value={String(queue.id)}>
                      {queue.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Can
              role={loggedInUser.profile}
              perform="ticket-options:transferWhatsapp"
              yes={() => !loadingWhatsapps && (
                <div className="space-y-1">
                  <Label>{i18n.t("transferTicketModal.fieldConnectionLabel")}</Label>
                  <Select value={selectedWhatsapp} onValueChange={setSelectedWhatsapp}>
                    <SelectTrigger>
                      <SelectValue placeholder={i18n.t("transferTicketModal.fieldConnectionPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Selecione uma conexão</SelectItem>
                      {whatsApps.map((wa) => (
                        <SelectItem key={wa.id} value={String(wa.id)}>
                          {wa.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              {i18n.t("transferTicketModal.buttons.cancel")}
            </Button>
            <Button type="submit" disabled={loading || (!selectedUser && !selectedQueue && !selectedWhatsapp)}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {i18n.t("transferTicketModal.buttons.ok")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TransferTicketModal;
