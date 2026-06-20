import { useState, useEffect, useReducer } from "react";
import { toast } from "react-toastify";

import api from "../../../services/api";
import toastError from "../../../errors/toastError";
import { Tenant, TenantsAction } from "../tenantsTypes";

// ─── Reducer ─────────────────────────────────────────────────────────────────

const reducer = (state: Tenant[], action: TenantsAction): Tenant[] => {
  if (action.type === "LOAD_TENANTS") {
    const newTenants: Tenant[] = [];
    action.payload.forEach((tenant) => {
      const idx = state.findIndex((t) => t.id === tenant.id);
      if (idx !== -1) {
        state[idx] = tenant;
      } else {
        newTenants.push(tenant);
      }
    });
    return [...state, ...newTenants];
  }

  if (action.type === "UPDATE_TENANTS") {
    const idx = state.findIndex((t) => t.id === action.payload.id);
    if (idx !== -1) {
      const next = [...state];
      next[idx] = action.payload;
      return next;
    }
    return [action.payload, ...state];
  }

  if (action.type === "DELETE_TENANT") {
    return state.filter((t) => t.id !== action.payload);
  }

  if (action.type === "RESET") {
    return [];
  }

  return state;
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseTenants {
  tenants: Tenant[];
  loading: boolean;
  tenantModalOpen: boolean;
  selectedTenantId: string | number | null;
  confirmModalOpen: boolean;
  deletingTenant: Tenant | null;
  handleOpenTenantModal: () => void;
  handleCloseTenantModal: () => void;
  handleEditTenant: (tenantId: string | number) => void;
  handleDeleteTenant: (tenantId: string | number) => Promise<void>;
  setConfirmModalOpen: (open: boolean) => void;
  setDeletingTenant: (tenant: Tenant | null) => void;
}

export function useTenants(): UseTenants {
  const [tenants, dispatch] = useReducer(reducer, []);
  const [loading, setLoading] = useState(false);
  const [tenantModalOpen, setTenantModalOpen] = useState(false);
  const [selectedTenantId, setSelectedTenantId] = useState<string | number | null>(null);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [deletingTenant, setDeletingTenant] = useState<Tenant | null>(null);

  useEffect(() => {
    setLoading(true);
    const fetchTenants = async () => {
      try {
        const { data } = await api.get<Tenant[]>("/tenants");
        dispatch({ type: "LOAD_TENANTS", payload: data });
      } catch (err) {
        toastError(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTenants();
  }, []);

  const handleOpenTenantModal = () => {
    setSelectedTenantId(null);
    setTenantModalOpen(true);
  };

  const handleCloseTenantModal = () => {
    setSelectedTenantId(null);
    setTenantModalOpen(false);
  };

  const handleEditTenant = (tenantId: string | number) => {
    setSelectedTenantId(tenantId);
    setTenantModalOpen(true);
  };

  const handleDeleteTenant = async (tenantId: string | number) => {
    try {
      await api.delete(`/tenants/${tenantId}`);
      dispatch({ type: "DELETE_TENANT", payload: tenantId });
      toast.success("Tenant excluído com sucesso!");
    } catch (err) {
      toastError(err);
    }
    setDeletingTenant(null);
  };

  return {
    tenants,
    loading,
    tenantModalOpen,
    selectedTenantId,
    confirmModalOpen,
    deletingTenant,
    handleOpenTenantModal,
    handleCloseTenantModal,
    handleEditTenant,
    handleDeleteTenant,
    setConfirmModalOpen,
    setDeletingTenant,
  };
}
