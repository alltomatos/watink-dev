import React from "react";
import { Edit, Trash2, RefreshCw, QrCode, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import type { ConnectionSession } from "../connectionsTypes";

interface ConnectionActionButtonsProps {
  whatsApp: ConnectionSession;
  onConnect: (id: number) => void;
  onDisconnect: (id: number) => void;
  onRequestQrCode: (id: number) => void;
  onEdit: (whatsApp: ConnectionSession) => void;
  onDelete: (whatsApp: ConnectionSession) => void;
  onConfigure: (id: number) => void;
}

export const ConnectionActionButtons: React.FC<ConnectionActionButtonsProps> = ({
  whatsApp,
  onConnect,
  onDisconnect,
  onRequestQrCode,
  onEdit,
  onDelete,
  onConfigure,
}) => {
  return (
    <div className="flex gap-2">
      {(whatsApp.status === "DISCONNECTED" || whatsApp.status === "TIMEOUT") && (
        <Button size="sm" variant="default" onClick={() => onConnect(whatsApp.id)}>
          Conectar
        </Button>
      )}
      {whatsApp.status === "QRCODE" && (
        <Button size="sm" variant="outline" onClick={() => onConfigure(whatsApp.id)}>
          <QrCode size={14} className="mr-1" /> Ver QR Code
        </Button>
      )}
      {whatsApp.status === "CONNECTED" && (
        <Button
          size="sm"
          variant="outline"
          className="text-destructive hover:bg-destructive/10"
          onClick={() => onDisconnect(whatsApp.id)}
        >
          Desconectar
        </Button>
      )}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreVertical size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onConfigure(whatsApp.id)}>
            <QrCode className="mr-2 h-4 w-4" /> Configurar
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onRequestQrCode(whatsApp.id)}>
            <RefreshCw className="mr-2 h-4 w-4" /> Reiniciar Sessão
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onEdit(whatsApp)}>
            <Edit className="mr-2 h-4 w-4" /> Editar
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => onDelete(whatsApp)}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
