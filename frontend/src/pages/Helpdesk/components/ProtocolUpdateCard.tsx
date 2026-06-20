import React from "react";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PaperCard from "../../../components/PaperCard";
import FileUploader from "../../../components/FileUploader";
import type { UpdateFormData } from "../protocolTypes";

interface ProtocolUpdateCardProps {
  formData: UpdateFormData;
  updateFiles: File[];
  saving: boolean;
  onSelectChange: (name: keyof UpdateFormData) => (value: string) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  onFilesChange: (files: File[]) => void;
  onSubmit: () => void;
}

const ProtocolUpdateCard: React.FC<ProtocolUpdateCardProps> = ({
  formData,
  updateFiles,
  saving,
  onSelectChange,
  onChange,
  onFilesChange,
  onSubmit,
}) => (
  <PaperCard>
    <h2 className="mb-4 text-base font-semibold">Atualizar</h2>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-1.5">
        <Label>Status</Label>
        <Select value={formData.status} onValueChange={onSelectChange("status")}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Aberto</SelectItem>
            <SelectItem value="in_progress">Em Andamento</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="resolved">Resolvido</SelectItem>
            <SelectItem value="closed">Fechado</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Prioridade</Label>
        <Select value={formData.priority} onValueChange={onSelectChange("priority")}>
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
      <div className="col-span-full flex flex-col gap-1.5">
        <Label htmlFor="update-comment">Adicionar Comentário</Label>
        <Textarea
          id="update-comment"
          name="comment"
          value={formData.comment}
          onChange={onChange}
          rows={3}
          placeholder="Descreva a ação realizada ou adicione uma nota..."
        />
      </div>
      <div className="col-span-full flex flex-col gap-1.5">
        <Label>Anexar Arquivos (Opcional)</Label>
        <FileUploader
          files={updateFiles}
          onFilesChange={onFilesChange}
          maxFiles={5}
          disabled={saving}
        />
      </div>
      <div className="col-span-full">
        <Button onClick={onSubmit} disabled={saving}>
          {saving ? (
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Atualizar Protocolo
        </Button>
      </div>
    </div>
  </PaperCard>
);

export default ProtocolUpdateCard;
