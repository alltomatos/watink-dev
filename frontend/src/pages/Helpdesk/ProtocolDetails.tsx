import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Save,
  Upload,
  Paperclip,
  Link,
  Plus,
  Edit,
  RefreshCw,
  MessageSquare,
  CheckCircle,
} from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import FileUploader from "../../components/FileUploader";
import AttachmentsList from "../../components/AttachmentsList";
import PaperCard from "../../components/PaperCard";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "react-toastify";
import api from "../../services/api";

interface HistoryItem {
  action: string;
  previousValue?: string;
  newValue?: string;
  comment?: string;
  createdAt: string;
  user?: { name: string };
}

interface Protocol {
  id: number;
  protocolNumber: string;
  subject: string;
  description: string;
  category?: string;
  status: string;
  priority: string;
  token: string;
  contact?: { name: string };
  history?: HistoryItem[];
}

interface Attachment {
  id: number;
  [key: string]: unknown;
}

interface UpdateFormData {
  status: string;
  priority: string;
  comment: string;
}

const getActionIcon = (action: string): React.ReactNode => {
  const map: Record<string, React.ReactNode> = {
    created: <Plus className="h-4 w-4" />,
    status_changed: <RefreshCw className="h-4 w-4" />,
    priority_changed: <Edit className="h-4 w-4" />,
    commented: <MessageSquare className="h-4 w-4" />,
    resolved: <CheckCircle className="h-4 w-4" />,
    attachment: <Paperclip className="h-4 w-4" />,
  };
  return map[action] ?? <RefreshCw className="h-4 w-4" />;
};

const getActionLabel = (action: string): string => {
  const labelMap: Record<string, string> = {
    created: "Criado",
    status_changed: "Status alterado",
    priority_changed: "Prioridade alterada",
    commented: "Comentário",
    resolved: "Resolvido",
    closed: "Fechado",
    attachment: "Anexo",
  };
  return labelMap[action] ?? action;
};

const ProtocolDetails: React.FC = () => {
  const { protocolId } = useParams<{ protocolId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [formData, setFormData] = useState<UpdateFormData>({
    status: "",
    priority: "",
    comment: "",
  });
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [updateFiles, setUpdateFiles] = useState<File[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const loadProtocol = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/protocols/${protocolId}`);
      setProtocol(data);
      setHistory(data.history || []);
      setFormData({
        status: data.status,
        priority: data.priority,
        comment: "",
      });
      const attachmentsRes = await api.get(`/protocols/${protocolId}/attachments`);
      setAttachments(attachmentsRes.data || []);
    } catch {
      toast.error("Erro ao carregar protocolo");
      navigate("/helpdesk");
    } finally {
      setLoading(false);
    }
  }, [protocolId, navigate]);

  useEffect(() => {
    loadProtocol();
  }, [loadProtocol]);

  const handleUploadFiles = async () => {
    if (newFiles.length === 0) return;

    setUploadingFiles(true);
    try {
      const fd = new FormData();
      newFiles.forEach((file) => fd.append("files", file));

      const { data } = await api.post(
        `/protocols/${protocolId}/attachments`,
        fd,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setAttachments((prev) => [...data, ...prev]);
      setNewFiles([]);
      toast.success("Arquivos enviados com sucesso!");
      loadProtocol();
    } catch {
      toast.error("Erro ao enviar arquivos");
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleDeleteAttachment = async (attachmentId: number) => {
    try {
      await api.delete(`/protocols/${protocolId}/attachments/${attachmentId}`);
      setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
      toast.success("Anexo removido");
    } catch {
      toast.error("Erro ao remover anexo");
    }
  };

  const handleSubmit = async () => {
    if (!protocol) return;
    try {
      setSaving(true);
      const fd = new FormData();
      fd.append("status", formData.status);
      fd.append("priority", formData.priority);
      if (formData.comment) fd.append("comment", formData.comment);
      fd.append("subject", protocol.subject);
      fd.append("description", protocol.description);
      if (protocol.category) fd.append("category", protocol.category);
      updateFiles.forEach((file) => fd.append("files", file));

      await api.put(`/protocols/${protocolId}`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Protocolo atualizado com sucesso");
      setFormData((prev) => ({ ...prev, comment: "" }));
      setUpdateFiles([]);
      loadProtocol();
    } catch {
      toast.error("Erro ao atualizar protocolo");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: keyof UpdateFormData) => (value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleCopyExternalLink = () => {
    if (!protocol) return;
    const externalUrl = `${window.location.origin}/public/protocols/${protocol.token}`;
    navigator.clipboard
      .writeText(externalUrl)
      .then(() => toast.success("Link copiado para a área de transferência!"))
      .catch(() => toast.error("Erro ao copiar link"));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!protocol) return null;

  return (
    <TooltipProvider>
      <div className="max-w-6xl mx-auto p-6">
        {/* Page header */}
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/helpdesk")}
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Voltar
            </Button>
            <h1 className="text-2xl font-bold">
              Protocolo #{protocol.protocolNumber}
            </h1>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopyExternalLink}
                  aria-label="Copiar link externo"
                >
                  <Link className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                Copiar link externo (para enviar ao cliente)
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Left column — details + attachments + update */}
          <div className="md:col-span-2 flex flex-col gap-6">
            {/* Detalhes */}
            <PaperCard>
              <h2 className="mb-4 text-base font-semibold">Detalhes</h2>
              <dl className="flex flex-col gap-3">
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Assunto</dt>
                  <dd className="mt-0.5 text-sm">{protocol.subject}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Descrição</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-sm">{protocol.description}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Categoria</dt>
                  <dd className="mt-0.5 text-sm">{protocol.category || "-"}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium text-muted-foreground">Contato</dt>
                  <dd className="mt-0.5 text-sm">
                    {protocol.contact ? protocol.contact.name : "-"}
                  </dd>
                </div>
              </dl>
            </PaperCard>

            {/* Anexos */}
            <PaperCard>
              <div className="mb-4 flex items-center gap-2">
                <Paperclip className="h-4 w-4" />
                <h2 className="text-base font-semibold">
                  Anexos ({attachments.length})
                </h2>
              </div>

              <AttachmentsList
                attachments={attachments}
                onDelete={handleDeleteAttachment}
                canDelete={true}
                showEmpty={false}
              />

              <div className="mt-4">
                <p className="mb-2 text-xs font-medium text-muted-foreground">
                  Adicionar novos anexos
                </p>
                <FileUploader
                  files={newFiles}
                  onFilesChange={setNewFiles}
                  maxFiles={10}
                  disabled={uploadingFiles}
                />
                {newFiles.length > 0 && (
                  <div className="mt-3 flex justify-end">
                    <Button
                      onClick={handleUploadFiles}
                      disabled={uploadingFiles}
                      size="sm"
                    >
                      {uploadingFiles ? (
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      {uploadingFiles ? "Enviando..." : "Enviar Arquivos"}
                    </Button>
                  </div>
                )}
              </div>
            </PaperCard>

            {/* Atualizar */}
            <PaperCard>
              <h2 className="mb-4 text-base font-semibold">Atualizar</h2>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label>Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={handleSelectChange("status")}
                  >
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
                  <Select
                    value={formData.priority}
                    onValueChange={handleSelectChange("priority")}
                  >
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
                    onChange={handleChange}
                    rows={3}
                    placeholder="Descreva a ação realizada ou adicione uma nota..."
                  />
                </div>
                <div className="col-span-full flex flex-col gap-1.5">
                  <Label>Anexar Arquivos (Opcional)</Label>
                  <FileUploader
                    files={updateFiles}
                    onFilesChange={setUpdateFiles}
                    maxFiles={5}
                    disabled={saving}
                  />
                </div>
                <div className="col-span-full">
                  <Button onClick={handleSubmit} disabled={saving}>
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
          </div>

          {/* Right column — histórico */}
          <div>
            <PaperCard>
              <h2 className="mb-4 text-base font-semibold">Histórico</h2>
              {history.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground">
                  Sem histórico registrado.
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {history.map((item, index) => (
                    <li
                      key={index}
                      className="ml-4 border-l-2 border-[var(--primary-main)] pl-3"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground">
                          {getActionIcon(item.action)}
                        </span>
                        <span className="text-sm font-semibold">
                          {getActionLabel(item.action)}
                        </span>
                      </div>
                      {item.previousValue && item.newValue && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {item.previousValue} → {item.newValue}
                        </p>
                      )}
                      {item.comment && (
                        <p className="mt-1 text-xs italic">
                          "{item.comment}"
                        </p>
                      )}
                      <div className="mt-1">
                        <p className="text-xs text-muted-foreground">
                          {item.user?.name || "Sistema"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(item.createdAt), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </PaperCard>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};

export default ProtocolDetails;
