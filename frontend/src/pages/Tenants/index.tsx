/* @jsxImportSource react */
import React, { useState, useEffect, useReducer } from "react";
import { toast } from "react-toastify";
import { Plus, Edit, Trash2, Loader2, Building2 } from "lucide-react";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import TenantModal from "../../components/TenantModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import { PageContainer, PageHeader, PageContent } from "../../components/ui/page-layout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Tenant {
  id: string | number;
  name: string;
  status: string;
}

type Action =
  | { type: "LOAD_TENANTS"; payload: Tenant[] }
  | { type: "UPDATE_TENANTS"; payload: Tenant }
  | { type: "DELETE_TENANT"; payload: string | number }
  | { type: "RESET" };

// ─── Reducer ─────────────────────────────────────────────────────────────────

const reducer = (state: Tenant[], action: Action): Tenant[] => {
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

// ─── Component ────────────────────────────────────────────────────────────────

const Tenants: React.FC = () => {
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

  const statusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    if (status === "active") return "default";
    if (status === "inactive") return "secondary";
    return "outline";
  };

  return (
    <PageContainer>
      <ConfirmationModal
        title={deletingTenant ? `Excluir "${deletingTenant.name}"?` : "Excluir tenant?"}
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={() => deletingTenant && handleDeleteTenant(deletingTenant.id)}
      >
        Todos os dados relacionados serão perdidos. Esta ação não pode ser desfeita.
      </ConfirmationModal>

      <TenantModal
        open={tenantModalOpen}
        onClose={handleCloseTenantModal}
        tenantId={selectedTenantId}
      />

      <PageHeader title="🏢 Tenants" description="Gerencie os tenants cadastrados na plataforma">
        <Button onClick={handleOpenTenantModal}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Tenant
        </Button>
      </PageHeader>

      <PageContent>
        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  </TableCell>
                </TableRow>
              ) : tenants.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    Nenhum tenant encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                tenants.map((tenant) => (
                  <TableRow key={tenant.id}>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {tenant.id}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-primary" />
                        <span className="font-semibold">{tenant.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(tenant.status)}>
                        {tenant.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleEditTenant(tenant.id)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => {
                            setDeletingTenant(tenant);
                            setConfirmModalOpen(true);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </PageContent>
    </PageContainer>
  );
};

export default Tenants;
