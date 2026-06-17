/* @jsxImportSource react */
import React, { useState, useEffect } from "react";
import {
  Camera,
  Plus,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import SignatureModal from "./SignatureModal";

import api from "../../services/api";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChecklistItem {
  id: string;
  label: string;
  isRequired: boolean;
  isDone: boolean;
  inputType: "text" | "number" | "photo";
  value?: string;
}

interface Material {
  id: string;
  materialName: string;
  quantity: number | string;
  unit: string;
  isBillable: boolean;
  notes?: string;
}

interface Occurrence {
  id: string;
  description: string;
  type: "info" | "impediment" | "delay";
  timeImpact?: number;
}

interface Activity {
  id: string;
  title: string;
  description?: string;
  protocolId?: string;
  items?: ChecklistItem[];
  materials?: Material[];
  occurrences?: Occurrence[];
  protocol?: { client?: { name?: string } };
}

interface NewOccurrence {
  description: string;
  type: "info" | "impediment" | "delay";
  timeImpact: string;
}

// ─── Time helpers ─────────────────────────────────────────────────────────────

const timeToMinutes = (timeStr: string): number | null => {
  if (!timeStr) return null;
  if (!/^\d+:[0-5]\d$/.test(timeStr)) return null;
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
};

const minutesToTime = (mins: number | null | undefined): string => {
  if (mins == null) return "";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

// ─── Component ────────────────────────────────────────────────────────────────

const ActivityExecution: React.FC<{
  open: boolean;
  activityId: string;
  onClose: () => void;
}> = ({ open, activityId, onClose }) => {
  const [tab, setTab] = useState("checklist");
  const [loading, setLoading] = useState(false);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);

  // Material modal
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [newMaterial, setNewMaterial] = useState<Omit<Material, "id">>({
    materialName: "",
    quantity: 1,
    unit: "un",
    isBillable: false,
    notes: "",
  });

  // Occurrence modal
  const [occurrenceModalOpen, setOccurrenceModalOpen] = useState(false);
  const [newOccurrence, setNewOccurrence] = useState<NewOccurrence>({
    description: "",
    type: "info",
    timeImpact: "",
  });

  // Signature modal
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);

  useEffect(() => {
    if (open && activityId) loadActivity();
  }, [open, activityId]);

  const loadActivity = async () => {
    try {
      setLoading(true);
      const { data } = await api.get<Activity>(`/activities/${activityId}`);
      setActivity(data);
      setItems(data.items ?? []);
      setMaterials(data.materials ?? []);
      setOccurrences(data.occurrences ?? []);
    } catch {
      toast.error("Erro ao carregar detalhes da atividade");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  // ─── Checklist handlers ───────────────────────────────────────────────────

  const handleItemChange = async (item: ChecklistItem, field: string, value: unknown) => {
    const updated = items.map((i) => (i.id === item.id ? { ...i, [field]: value } : i));
    setItems(updated);
    if (field === "isDone" || field === "value") {
      try {
        await api.put(`/activities/${activityId}/items/${item.id}`, { [field]: value });
      } catch {
        toast.error("Erro ao salvar item");
      }
    }
  };

  const handleFileUpload = async (item: ChecklistItem, file: File) => {
    const formData = new FormData();
    formData.append("photo", file);
    try {
      const { data } = await api.post<{ photoUrl: string }>(
        `/activities/${activityId}/items/${item.id}/photo`,
        formData
      );
      await handleItemChange(item, "value", data.photoUrl);
    } catch {
      toast.error("Erro ao enviar foto");
    }
  };

  // ─── Material handlers ────────────────────────────────────────────────────

  const handleAddMaterial = async () => {
    if (!newMaterial.materialName.trim()) return;
    try {
      const { data } = await api.post<Material>(
        `/activities/${activityId}/materials`,
        {
          materialName: newMaterial.materialName.trim(),
          quantity: newMaterial.quantity,
          unit: newMaterial.unit,
          isBillable: newMaterial.isBillable,
          notes: newMaterial.notes,
        }
      );
      setMaterials((prev) => [...prev, data]);
      setMaterialModalOpen(false);
      setNewMaterial({ materialName: "", quantity: 1, unit: "un", isBillable: false, notes: "" });
      toast.success("Material adicionado");
    } catch {
      toast.error("Erro ao adicionar material");
    }
  };

  const handleDeleteMaterial = async (id: string) => {
    try {
      await api.delete(`/activities/${activityId}/materials/${id}`);
      setMaterials((prev) => prev.filter((m) => m.id !== id));
    } catch {
      toast.error("Erro ao remover material");
    }
  };

  // ─── Occurrence handlers ──────────────────────────────────────────────────

  const handleAddOccurrence = async () => {
    if (!newOccurrence.description.trim()) return;
    try {
      const { data } = await api.post<Occurrence>(
        `/activities/${activityId}/occurrences`,
        {
          description: newOccurrence.description.trim(),
          type: newOccurrence.type,
          timeImpact: timeToMinutes(newOccurrence.timeImpact),
        }
      );
      setOccurrences((prev) => [...prev, data]);
      setOccurrenceModalOpen(false);
      setNewOccurrence({ description: "", type: "info", timeImpact: "" });
      toast.success("Ocorrência registrada");
    } catch {
      toast.error("Erro ao adicionar ocorrência");
    }
  };

  const handleDeleteOccurrence = async (id: string) => {
    try {
      await api.delete(`/activities/${activityId}/occurrences/${id}`);
      setOccurrences((prev) => prev.filter((o) => o.id !== id));
    } catch {
      toast.error("Erro ao remover ocorrência");
    }
  };

  // ─── Finish ───────────────────────────────────────────────────────────────

  const handleFinish = async (signatureDataUrl: string) => {
    try {
      await api.post(`/activities/${activityId}/finalize`, {
        clientSignature: signatureDataUrl,
      });
      toast.success("Atividade concluída com sucesso!");
      setSignatureModalOpen(false);
      onClose();
    } catch {
      toast.error("Erro ao finalizar atividade");
    }
  };

  if (!activity) return null;

  const OCCURRENCE_TYPE_LABELS: Record<string, string> = {
    info: "Informativo",
    impediment: "Impedimento",
    delay: "Atraso",
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="flex flex-col !p-0 max-w-none w-screen h-screen m-0 rounded-none">
        {/* Header */}
        <div className="flex items-center gap-4 border-b border-border px-6 py-4">
          <span className="text-lg font-semibold">Execução: {activity.title}</span>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="default" size="sm" onClick={() => setSignatureModalOpen(true)}>
              Finalizar
            </Button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="checklist">Checklist</TabsTrigger>
                <TabsTrigger value="materials">Materiais (RDO)</TabsTrigger>
                <TabsTrigger value="occurrences">Ocorrências</TabsTrigger>
                <TabsTrigger value="details">Detalhes</TabsTrigger>
              </TabsList>

              {/* ── Checklist ── */}
              <TabsContent value="checklist" className="space-y-3">
                {items.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhum item no checklist.</p>
                ) : (
                  items.map((item) => (
                    <div
                      key={item.id}
                      className="space-y-2 rounded-lg border border-border p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className={`text-sm font-medium ${item.isRequired ? "font-semibold" : ""}`}>
                          {item.label}
                          {item.isRequired && <span className="ml-1 text-destructive">*</span>}
                        </span>
                        <Checkbox
                          checked={item.isDone}
                          onCheckedChange={(v) => handleItemChange(item, "isDone", v)}
                        />
                      </div>

                      {item.inputType === "text" && (
                        <Input
                          size="sm"
                          value={item.value ?? ""}
                          onChange={(e) => handleItemChange(item, "value", e.target.value)}
                          placeholder="Digite a resposta..."
                        />
                      )}

                      {item.inputType === "number" && (
                        <Input
                          type="number"
                          size="sm"
                          value={item.value ?? ""}
                          onChange={(e) => handleItemChange(item, "value", e.target.value)}
                          placeholder="0"
                        />
                      )}

                      {item.inputType === "photo" && (
                        <div className="space-y-2">
                          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted transition-colors">
                            <Camera className="h-4 w-4" />
                            Tirar Foto
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileUpload(item, file);
                              }}
                            />
                          </label>
                          {item.value && (
                            <img
                              src={item.value}
                              alt="Preview"
                              className="h-24 w-24 rounded-md border object-cover"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </TabsContent>

              {/* ── Materials ── */}
              <TabsContent value="materials" className="space-y-3">
                {materials.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhum material utilizado.</p>
                ) : (
                  <div className="space-y-2">
                    {materials.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-start justify-between rounded-lg border border-border p-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{m.materialName}</p>
                          <p className="text-xs text-muted-foreground">
                            {m.quantity} {m.unit}
                            {m.isBillable && (
                              <span className="ml-2 font-semibold text-green-600">$ Faturável</span>
                            )}
                          </p>
                          {m.notes && (
                            <p className="text-xs text-muted-foreground mt-1">{m.notes}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteMaterial(m.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-end">
                  <Button size="sm" onClick={() => setMaterialModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Adicionar Material
                  </Button>
                </div>
              </TabsContent>

              {/* ── Occurrences ── */}
              <TabsContent value="occurrences" className="space-y-3">
                {occurrences.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">Nenhuma ocorrência registrada.</p>
                ) : (
                  <div className="space-y-2">
                    {occurrences.map((o) => (
                      <div
                        key={o.id}
                        className="flex items-start justify-between rounded-lg border border-border p-3"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{o.description}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span
                              className={`inline-block rounded px-1.5 py-0.5 text-xs font-medium ${
                                o.type === "impediment"
                                  ? "bg-red-100 text-red-700"
                                  : o.type === "delay"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {OCCURRENCE_TYPE_LABELS[o.type]}
                            </span>
                            {o.timeImpact != null && (
                              <span className="text-xs text-muted-foreground">
                                Impacto: {minutesToTime(o.timeImpact)}
                              </span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteOccurrence(o.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex justify-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setOccurrenceModalOpen(true)}
                  >
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Registrar Ocorrência
                  </Button>
                </div>
              </TabsContent>

              {/* ── Details ── */}
              <TabsContent value="details" className="space-y-3">
                <div className="rounded-lg border border-border p-4 space-y-3">
                  <h3 className="text-base font-semibold">Detalhes da Atividade</h3>
                  {activity.description && (
                    <p className="text-sm text-muted-foreground">{activity.description}</p>
                  )}
                  <hr className="border-border" />
                  <div className="space-y-1 text-sm">
                    <p className="text-muted-foreground">Protocolo: #{activity.protocolId ?? "—"}</p>
                    <p className="text-muted-foreground">
                      Cliente: {activity.protocol?.client?.name ?? "N/A"}
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>

        {/* ── Material Modal ── */}
        <Dialog open={materialModalOpen} onOpenChange={setMaterialModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Material</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nome do Material</label>
                <Input
                  value={newMaterial.materialName}
                  onChange={(e) =>
                    setNewMaterial((prev) => ({ ...prev, materialName: e.target.value }))
                  }
                  placeholder="Ex: Cabo HDMI 2m"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Quantidade</label>
                  <Input
                    type="number"
                    min={1}
                    value={newMaterial.quantity}
                    onChange={(e) =>
                      setNewMaterial((prev) => ({
                        ...prev,
                        quantity: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Unidade</label>
                  <Input
                    value={newMaterial.unit}
                    onChange={(e) =>
                      setNewMaterial((prev) => ({ ...prev, unit: e.target.value }))
                    }
                    placeholder="un, m, kg"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Observações</label>
                <Textarea
                  value={newMaterial.notes}
                  onChange={(e) =>
                    setNewMaterial((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  rows={2}
                  placeholder="Opcional..."
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="billable"
                  checked={newMaterial.isBillable}
                  onCheckedChange={(v) =>
                    setNewMaterial((prev) => ({ ...prev, isBillable: v }))
                  }
                />
                <label htmlFor="billable" className="text-sm cursor-pointer">
                  Item Faturável (cobrar do cliente)
                </label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setMaterialModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddMaterial} disabled={!newMaterial.materialName.trim()}>
                Adicionar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Occurrence Modal ── */}
        <Dialog open={occurrenceModalOpen} onOpenChange={setOccurrenceModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Registrar Ocorrência</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Tipo</label>
                <Select
                  value={newOccurrence.type}
                  onValueChange={(v) =>
                    setNewOccurrence((prev) => ({ ...prev, type: v as NewOccurrence["type"] }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Informativo</SelectItem>
                    <SelectItem value="impediment">Impedimento (Parou o serviço)</SelectItem>
                    <SelectItem value="delay">Atraso (Reduziu ritmo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Descrição do Fato</label>
                <Textarea
                  value={newOccurrence.description}
                  onChange={(e) =>
                    setNewOccurrence((prev) => ({ ...prev, description: e.target.value }))
                  }
                  rows={3}
                  placeholder="Descreva o que ocorreu..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Tempo de Impacto (ex: 01:30)</label>
                <Input
                  value={newOccurrence.timeImpact}
                  onChange={(e) =>
                    setNewOccurrence((prev) => ({ ...prev, timeImpact: e.target.value }))
                  }
                  placeholder="01:30"
                />
                <p className="text-xs text-muted-foreground">
                  Opcional. Formato HH:MM (ex: 01:30 ou 26:00)
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOccurrenceModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddOccurrence} disabled={!newOccurrence.description.trim()}>
                Registrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Signature Modal ── */}
        <SignatureModal
          open={signatureModalOpen}
          onClose={() => setSignatureModalOpen(false)}
          onConfirm={handleFinish}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ActivityExecution;