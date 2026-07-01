import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";

import api from "../../../services/api";
import toastError from "../../../errors/toastError";
import type {
  CargoDetail,
  CargoListItem,
  CargoSavePayload,
  PermissionsCatalog,
} from "../acessosTypes";

interface UseCargosTabReturn {
  cargos: CargoListItem[];
  loading: boolean;
  searchParam: string;
  handleSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
  panelOpen: boolean;
  editingCargo: CargoDetail | null;
  panelLoading: boolean;
  catalog: PermissionsCatalog;
  openCreate: () => void;
  openEdit: (cargo: CargoListItem) => Promise<void>;
  closePanel: () => void;
  saveCargo: (id: number | null, payload: CargoSavePayload) => Promise<boolean>;
  deleteCargo: (cargo: CargoListItem) => Promise<void>;
}

export function useCargosTab(): UseCargosTabReturn {
  const [cargos, setCargos] = useState<CargoListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingCargo, setEditingCargo] = useState<CargoDetail | null>(null);
  const [panelLoading, setPanelLoading] = useState(false);
  const [catalog, setCatalog] = useState<PermissionsCatalog>({});

  const fetchCargos = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<CargoListItem[]>("/cargos");
      setCargos(Array.isArray(data) ? data : []);
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCargos();
  }, [fetchCargos]);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const { data } = await api.get<PermissionsCatalog>("/cargos/catalog/permissions");
        setCatalog(data || {});
      } catch (err) {
        toastError(err);
      }
    };
    fetchCatalog();
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchParam(e.target.value.toLowerCase());
  };

  const openCreate = () => {
    setEditingCargo(null);
    setPanelOpen(true);
  };

  const openEdit = async (cargo: CargoListItem) => {
    setPanelOpen(true);
    setPanelLoading(true);
    try {
      const { data } = await api.get<CargoDetail>(`/cargos/${cargo.id}`);
      setEditingCargo(data);
    } catch (err) {
      toastError(err);
      setPanelOpen(false);
    } finally {
      setPanelLoading(false);
    }
  };

  const closePanel = () => {
    setPanelOpen(false);
    setEditingCargo(null);
  };

  const saveCargo = async (id: number | null, payload: CargoSavePayload): Promise<boolean> => {
    try {
      if (id) {
        await api.put(`/cargos/${id}`, payload);
      } else {
        await api.post("/cargos", payload);
      }
      toast.success(id ? "Cargo atualizado com sucesso" : "Cargo criado com sucesso");
      closePanel();
      await fetchCargos();
      return true;
    } catch (err) {
      toastError(err);
      return false;
    }
  };

  const deleteCargo = async (cargo: CargoListItem) => {
    try {
      await api.delete(`/cargos/${cargo.id}`);
      toast.success("Cargo removido com sucesso");
      await fetchCargos();
    } catch (err) {
      // 409 (Administrador único / cargo em uso) chega aqui com a mensagem
      // real do backend — toastError já extrai err.response.data.error.
      toastError(err);
    }
  };

  const filteredCargos = searchParam
    ? cargos.filter((c) => c.name.toLowerCase().includes(searchParam))
    : cargos;

  return {
    cargos: filteredCargos,
    loading,
    searchParam,
    handleSearch,
    panelOpen,
    editingCargo,
    panelLoading,
    catalog,
    openCreate,
    openEdit,
    closePanel,
    saveCargo,
    deleteCargo,
  };
}
