import React from "react";
import { Edit, Trash2, Loader2, Building2, User as UserIcon } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Can } from "../../../components/Can";
import type { User } from "../../../types/domain";
import type { Client } from "../hooks/useClients";

interface ClientsTableProps {
  clients: Client[];
  loading: boolean;
  user: User | undefined;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
}

function ClientTypeBadge({ type }: { type: Client["type"] }) {
  const isPf = type === "pf";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        isPf
          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
          : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
      }`}
    >
      {isPf ? <UserIcon className="h-3 w-3" /> : <Building2 className="h-3 w-3" />}
      {isPf ? "PF" : "PJ"}
    </span>
  );
}

export function ClientsTable({ clients, loading, user, onEdit, onDelete }: ClientsTableProps) {
  return (
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
                  <ClientTypeBadge type={client.type} />
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
                          onClick={() => onEdit(client)}
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
                          onClick={() => onDelete(client)}
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
  );
}
