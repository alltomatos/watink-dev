import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import api from "../../../services/api";
import type { ClientRecord } from "../clientTypes";

// Client mirrors the real backend response (ClientRecord) — kept as a
// separate exported alias so existing imports (`import type { Client } from
// "../hooks/useClients"`) keep working without churn across the module.
export type Client = ClientRecord;

interface UseClientsReturn {
  clients: Client[];
  loading: boolean;
  searchParam: string;
  setSearchParam: (value: string) => void;
  modalOpen: boolean;
  selectedClient: Client | null;
  confirmDeleteOpen: boolean;
  clientToDelete: Client | null;
  handleOpenModal: (client?: Client) => void;
  handleCloseModal: () => void;
  handleDeleteClick: (client: Client) => void;
  handleConfirmDelete: () => Promise<void>;
  setConfirmDeleteOpen: (open: boolean) => void;
}

export function useClients(): UseClientsReturn {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParam, setSearchParam] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);

  const loadClients = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get<{ clients: Client[] }>("/clients", {
        params: { searchParam },
      });
      setClients(data.clients ?? []);
    } catch {
      toast.error("Erro ao carregar clientes");
    } finally {
      setLoading(false);
    }
  }, [searchParam]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const handleOpenModal = (client?: Client) => {
    setSelectedClient(client ?? null);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setSelectedClient(null);
    setModalOpen(false);
    loadClients();
  };

  const handleDeleteClick = (client: Client) => {
    setClientToDelete(client);
    setConfirmDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await api.delete(`/clients/${clientToDelete?.id}`);
      toast.success("Cliente excluído com sucesso");
      loadClients();
    } catch {
      toast.error("Erro ao excluir cliente");
    }
    setConfirmDeleteOpen(false);
    setClientToDelete(null);
  };

  return {
    clients,
    loading,
    searchParam,
    setSearchParam,
    modalOpen,
    selectedClient,
    confirmDeleteOpen,
    clientToDelete,
    handleOpenModal,
    handleCloseModal,
    handleDeleteClick,
    handleConfirmDelete,
    setConfirmDeleteOpen,
  };
}
