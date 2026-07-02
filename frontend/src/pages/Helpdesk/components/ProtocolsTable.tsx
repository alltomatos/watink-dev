import React from "react";
import { Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Can } from "../../../components/Can";
import { User } from "../../../types/domain";
import { getContactDisplayName } from "@/utils/clientDisplayName";
import {
  ProtocolListItem,
  statusLabels,
  priorityLabels,
  getStatusBadgeClass,
  getPriorityBadgeClass,
} from "../helpdeskTypes";

interface ProtocolsTableProps {
  protocols: ProtocolListItem[];
  loading: boolean;
  user?: User;
  onViewProtocol: (id: number) => void;
}

const ProtocolsTable: React.FC<ProtocolsTableProps> = ({
  protocols,
  loading,
  user,
  onViewProtocol,
}) => {
  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Protocolo</TableHead>
          <TableHead>Assunto</TableHead>
          <TableHead>Contato</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Prioridade</TableHead>
          <TableHead>Criado em</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {protocols.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={7}
              className="py-8 text-center text-muted-foreground"
            >
              Nenhum protocolo encontrado
            </TableCell>
          </TableRow>
        ) : (
          protocols.map((protocol) => (
            <TableRow key={protocol.id}>
              <TableCell className="font-semibold">
                #{protocol.protocolNumber}
              </TableCell>
              <TableCell
                className="max-w-[200px] truncate"
                title={protocol.subject}
              >
                {protocol.subject}
              </TableCell>
              <TableCell>{getContactDisplayName(protocol.contact) || "-"}</TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={cn("font-normal", getStatusBadgeClass(protocol.status))}
                >
                  {statusLabels[protocol.status] ?? protocol.status}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={cn(
                    "font-normal",
                    getPriorityBadgeClass(protocol.priority)
                  )}
                >
                  {priorityLabels[protocol.priority] ?? protocol.priority}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {format(new Date(protocol.createdAt), "dd/MM/yyyy HH:mm", {
                  locale: ptBR,
                })}
              </TableCell>
              <TableCell className="text-right">
                <Can
                  user={user}
                  perform="tickets:read"
                  yes={() => (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onViewProtocol(protocol.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                />
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
};

export default ProtocolsTable;
