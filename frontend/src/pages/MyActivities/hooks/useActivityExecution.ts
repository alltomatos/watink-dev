import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import api from "../../../services/api";
import { timeToMinutes } from "../activityHelpers";
import {
  Activity, ChecklistItem, Material, Occurrence, NewOccurrence,
} from "../activityTypes";

export interface UseActivityExecutionReturn {
  loading: boolean;
  activity: Activity | null;
  items: ChecklistItem[];
  materials: Material[];
  occurrences: Occurrence[];
  materialModalOpen: boolean;
  occurrenceModalOpen: boolean;
  signatureModalOpen: boolean;
  newMaterial: Omit<Material, "id">;
  newOccurrence: NewOccurrence;
  setMaterialModalOpen: (v: boolean) => void;
  setOccurrenceModalOpen: (v: boolean) => void;
  setSignatureModalOpen: (v: boolean) => void;
  setNewMaterial: React.Dispatch<React.SetStateAction<Omit<Material, "id">>>;
  setNewOccurrence: React.Dispatch<React.SetStateAction<NewOccurrence>>;
  handleItemChange: (item: ChecklistItem, field: string, value: unknown) => Promise<void>;
  handleFileUpload: (item: ChecklistItem, file: File) => Promise<void>;
  handleAddMaterial: () => Promise<void>;
  handleDeleteMaterial: (id: string) => Promise<void>;
  handleAddOccurrence: () => Promise<void>;
  handleDeleteOccurrence: (id: string) => Promise<void>;
  handleFinish: (signatureDataUrl: string) => Promise<void>;
}

const DEFAULT_MATERIAL: Omit<Material, "id"> = {
  materialName: "", quantity: 1, unit: "un", isBillable: false, notes: "",
};

const DEFAULT_OCCURRENCE: NewOccurrence = {
  description: "", type: "info", timeImpact: "",
};

export const useActivityExecution = (
  open: boolean,
  activityId: string,
  onClose: () => void,
): UseActivityExecutionReturn => {
  const [loading, setLoading] = useState(false);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
  const [materialModalOpen, setMaterialModalOpen] = useState(false);
  const [occurrenceModalOpen, setOccurrenceModalOpen] = useState(false);
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [newMaterial, setNewMaterial] = useState<Omit<Material, "id">>(DEFAULT_MATERIAL);
  const [newOccurrence, setNewOccurrence] = useState<NewOccurrence>(DEFAULT_OCCURRENCE);

  useEffect(() => {
    if (!open || !activityId) return;
    const load = async () => {
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
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activityId]);

  const handleItemChange = async (item: ChecklistItem, field: string, value: unknown) => {
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, [field]: value } : i)));
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
        formData,
      );
      await handleItemChange(item, "value", data.photoUrl);
    } catch {
      toast.error("Erro ao enviar foto");
    }
  };

  const handleAddMaterial = async () => {
    if (!newMaterial.materialName.trim()) return;
    try {
      const { data } = await api.post<Material>(`/activities/${activityId}/materials`, {
        materialName: newMaterial.materialName.trim(),
        quantity: newMaterial.quantity,
        unit: newMaterial.unit,
        isBillable: newMaterial.isBillable,
        notes: newMaterial.notes,
      });
      setMaterials((prev) => [...prev, data]);
      setMaterialModalOpen(false);
      setNewMaterial(DEFAULT_MATERIAL);
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

  const handleAddOccurrence = async () => {
    if (!newOccurrence.description.trim()) return;
    try {
      const { data } = await api.post<Occurrence>(`/activities/${activityId}/occurrences`, {
        description: newOccurrence.description.trim(),
        type: newOccurrence.type,
        timeImpact: timeToMinutes(newOccurrence.timeImpact),
      });
      setOccurrences((prev) => [...prev, data]);
      setOccurrenceModalOpen(false);
      setNewOccurrence(DEFAULT_OCCURRENCE);
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

  const handleFinish = async (signatureDataUrl: string) => {
    try {
      await api.post(`/activities/${activityId}/finalize`, { clientSignature: signatureDataUrl });
      toast.success("Atividade concluída com sucesso!");
      setSignatureModalOpen(false);
      onClose();
    } catch {
      toast.error("Erro ao finalizar atividade");
    }
  };

  return {
    loading, activity, items, materials, occurrences,
    materialModalOpen, occurrenceModalOpen, signatureModalOpen,
    newMaterial, newOccurrence,
    setMaterialModalOpen, setOccurrenceModalOpen, setSignatureModalOpen,
    setNewMaterial, setNewOccurrence,
    handleItemChange, handleFileUpload,
    handleAddMaterial, handleDeleteMaterial,
    handleAddOccurrence, handleDeleteOccurrence,
    handleFinish,
  };
};
