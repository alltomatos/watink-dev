/* @jsxImportSource react */
import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Loader2,
  Building2,
  User as UserIcon,
} from "lucide-react";
import api from "../../services/api";
import ClientModal from "./ClientModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import { Can } from "../../components/Can";
import useAuth from "../../hooks/useAuth";
import { PageContainer, PageHeader, PageContent } from "@/components/ui/page-layout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Client {
  id: string;
  type: "pf" | "pj";
  name: string;
  document?: string;
  email?: string;
  phone?: string;
  contacts?: unknown[];
}

const Clients: React.FC = () => {
  const { user } = useAuth();
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

  return (
    <Can
      user={user}
      perform="view_clients"
      yes={() => (
        <PageContainer>
          <PageHeader
            title="👥 Clientes"
          >
            <div className="flex items-center gap-2">
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, documento ou email..."
                  value={searchParam}
                  onChange={(e) => setSearchParam(e.target.value)}
                  className="pl-9 h-10 w-64"
                />
              </div>
              <Can
                user={user}
                perform="edit_clients"
                yes={() => (
                  <Button onClick={() => handleOpenModal()}>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Cliente
                  </Button>
                )}
              />
            </div>
          </PageHeader>

          <PageContent className="p-0">
            <div className="p-6">
              <div className="rounded-md border bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Nome</TableHead>
                      <TableHead>Documento</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Telefone</TableHead>
                      <TableHead className="text-center">Contatos</TableHead>
                      <TableHead className="text-right w-[100px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center">
                          <div className="flex justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : clients.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                          Nenhum cliente encontrado
                        </TableCell>
                      </TableRow>
                    ) : (
                      clients.map((client) => (
                        <TableRow key={client.id}>
                          <TableCell>
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                client.type === "pf"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                  : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                              }`}
                            >
                              {client.type === "pf" ? (
                                <UserIcon className="h-3 w-3" />
                              ) : (
                                <Building2 className="h-3 w-3" />
                              )}
                              {client.type === "pf" ? "PF" : "PJ"}
                            </span>
                          </TableCell>
                          <TableCell className="font-medium">{client.name}</TableCell>
                          <TableCell className="text-muted-foreground">{client.document ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{client.email ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground">{client.phone ?? "—"}</TableCell>
                          <TableCell className="text-center text-muted-foreground">
                            {client.contacts?.length ?? 0}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Can
                                user={user}
                                perform="edit_clients"
                                yes={() => (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleOpenModal(client)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                )}
                              />
                              <Can
                                user={user}
                                perform="delete_clients"
                                yes={() => (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-destructive"
                                    onClick={() => handleDeleteClick(client)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              />
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </PageContent>

          <ClientModal
            open={modalOpen}
            onClose={handleCloseModal}
            client={selectedClient as any}
          />

          <ConfirmationModal
            title="Excluir Cliente"
            open={confirmDeleteOpen}
            onClose={() => setConfirmDeleteOpen(false)}
            onConfirm={handleConfirmDelete}
          >
            {clientToDelete
              ? `Deseja realmente excluir o cliente "${clientToDelete.name}"?`
              : ""}
          </ConfirmationModal>
        </PageContainer>
      )}
      no={() => (
        <PageContainer>
          <PageContent>
            <p className="text-center text-muted-foreground py-16">
              Você não tem permissão para visualizar esta página.
            </p>
          </PageContent>
        </PageContainer>
      )}
    />
  );
};

export default Clients;