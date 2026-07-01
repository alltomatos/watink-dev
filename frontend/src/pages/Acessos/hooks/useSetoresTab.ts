import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";

import api from "../../../services/api";
import toastError from "../../../errors/toastError";
import type { SetorDetail, SetorListItem } from "../acessosTypes";

interface UseSetoresTabReturn {
  setores: SetorListItem[];
  loading: boolean;
  searchParam: string;
  handleSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
  panelOpen: boolean;
  editingSetor: SetorDetail | null;
  panelLoading: boolean;
  initialName: string;
  openCreate: (initialName?: string) => void;
  openEdit: (setor: SetorListItem) => Promise<void>;
  closePanel: () => void;
  reloadEditingSetor: () => Promise<void>;
  saveSetorName: (id: number | null, name: string) => Promise<boolean>;
  deleteSetor: (setor: SetorListItem) => Promise<void>;
  addMember: (setorId: number, userId: number, ehGestor: boolean) => Promise<void>;
  updateMember: (setorId: number, userId: number, ehGestor: boolean) => Promise<void>;
  removeMember: (setorId: number, userId: number) => Promise<void>;
  setQueues: (setorId: number, queueIds: number[]) => Promise<void>;
}

export function useSetoresTab(): UseSetoresTabReturn {
  const [setores, setSetores] = useState<SetorListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingSetor, setEditingSetor] = useState<SetorDetail | null>(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const [initialName, setInitialName] = useState("");

  const fetchSetores = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<SetorListItem[]>("/setores");
      setSetores(Array.isArray(data) ? data : []);
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSetores();
  }, [fetchSetores]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchParam(e.target.value.toLowerCase());
  };

  const openCreate = (suggestedName = "") => {
    setEditingSetor(null);
    setInitialName(suggestedName);
    setPanelOpen(true);
  };

  const loadSetorDetail = async (setorId: number) => {
    const { data } = await api.get<SetorDetail>(`/setores/${setorId}`);
    setEditingSetor(data);
  };

  const openEdit = async (setor: SetorListItem) => {
    setPanelOpen(true);
    setPanelLoading(true);
    try {
      await loadSetorDetail(setor.id);
    } catch (err) {
      toastError(err);
      setPanelOpen(false);
    } finally {
      setPanelLoading(false);
    }
  };

  const closePanel = () => {
    setPanelOpen(false);
    setEditingSetor(null);
    setInitialName("");
  };

  const reloadEditingSetor = async () => {
    if (!editingSetor) return;
    try {
      await loadSetorDetail(editingSetor.id);
    } catch (err) {
      toastError(err);
    }
  };

  const saveSetorName = async (id: number | null, name: string): Promise<boolean> => {
    try {
      if (id) {
        await api.put(`/setores/${id}`, { name });
        toast.success("Setor atualizado com sucesso");
        await reloadEditingSetor();
      } else {
        await api.post("/setores", { name });
        toast.success("Setor criado com sucesso");
        closePanel();
      }
      await fetchSetores();
      return true;
    } catch (err) {
      toastError(err);
      return false;
    }
  };

  const deleteSetor = async (setor: SetorListItem) => {
    try {
      await api.delete(`/setores/${setor.id}`);
      toast.success("Setor removido com sucesso");
      await fetchSetores();
    } catch (err) {
      // 409 (setor com membros) chega aqui com a mensagem real do backend.
      toastError(err);
    }
  };

  const addMember = async (setorId: number, userId: number, ehGestor: boolean) => {
    try {
      await api.post(`/setores/${setorId}/members`, { userId, ehGestor });
      toast.success("Membro adicionado ao setor");
      await reloadEditingSetor();
      await fetchSetores();
    } catch (err) {
      toastError(err);
    }
  };

  const updateMember = async (setorId: number, userId: number, ehGestor: boolean) => {
    try {
      await api.put(`/setores/${setorId}/members/${userId}`, { ehGestor });
      await reloadEditingSetor();
      await fetchSetores();
    } catch (err) {
      toastError(err);
    }
  };

  const removeMember = async (setorId: number, userId: number) => {
    try {
      await api.delete(`/setores/${setorId}/members/${userId}`);
      toast.success("Membro removido do setor");
      await reloadEditingSetor();
      await fetchSetores();
    } catch (err) {
      toastError(err);
    }
  };

  const setQueues = async (setorId: number, queueIds: number[]) => {
    try {
      await api.put(`/setores/${setorId}/queues`, { queueIds });
      toast.success("Filas do setor atualizadas");
      await reloadEditingSetor();
    } catch (err) {
      toastError(err);
    }
  };

  const filteredSetores = searchParam
    ? setores.filter((s) => s.name.toLowerCase().includes(searchParam))
    : setores;

  return {
    setores: filteredSetores,
    loading,
    searchParam,
    handleSearch,
    panelOpen,
    editingSetor,
    panelLoading,
    initialName,
    openCreate,
    openEdit,
    closePanel,
    reloadEditingSetor,
    saveSetorName,
    deleteSetor,
    addMember,
    updateMember,
    removeMember,
    setQueues,
  };
}
