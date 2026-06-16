import React, { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "react-toastify";
import api from "../../services/api";

interface ProtocolDrawerProps {
  open: boolean;
  onClose: () => void;
  contactId: number | string | null;
  ticketId?: number | string | null;
  onSuccess?: () => void;
}

const ProtocolDrawer: React.FC<ProtocolDrawerProps> = ({
  open,
  onClose,
  contactId,
  ticketId,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    subject: "",
    description: "",
    priority: "medium",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handlePriorityChange = (value: string) => {
    setFormData({ ...formData, priority: value });
  };

  const handleSubmit = async () => {
    if (!formData.subject.trim()) {
      toast.error("Assunto é obrigatório");
      return;
    }

    if (!contactId) {
      toast.error("Contato não identificado");
      return;
    }

    try {
      setLoading(true);
      await api.post(`/contacts/${contactId}/protocols`, {
        ...formData,
        ticketId,
      });
      toast.success("Protocolo criado com sucesso!");
      setFormData({ subject: "", description: "", priority: "medium" });
      if (onSuccess) onSuccess();
      onClose();
    } catch {
      toast.error("Erro ao criar protocolo");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    /* Overlay posicionado de forma absoluta dentro do #drawer-container */
    <div
      className="absolute inset-0 z-50 flex justify-end"
      style={{ position: "absolute" }}
    >
      {/* Backdrop translúcido */}
      <div
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Painel */}
      <div
        className="relative z-10 flex w-80 flex-col border border-[var(--border-divider)] border-l-0 rounded-r bg-[var(--bg-surface)] shadow-lg"
        style={{ borderTopRightRadius: 4, borderBottomRightRadius: 4 }}
      >
        {/* Header */}
        <div className="flex min-h-[73px] items-center justify-between border-b border-[var(--border-divider)] bg-[var(--border-default)] px-3">
          <span className="text-base font-semibold">Novo Protocolo</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 hover:bg-black/10 transition-colors"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="drawer-subject">Assunto</Label>
            <Input
              id="drawer-subject"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              autoFocus
              placeholder="Assunto do protocolo"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Prioridade</Label>
            <Select value={formData.priority} onValueChange={handlePriorityChange}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
                <SelectItem value="urgent">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="drawer-description">Descrição</Label>
            <Textarea
              id="drawer-description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={4}
              placeholder="Descreva o problema ou solicitação..."
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 border-t border-[var(--border-divider)] p-4">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading || !formData.subject.trim()}
          >
            {loading ? "Criando..." : "Criar Protocolo"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ProtocolDrawer;
