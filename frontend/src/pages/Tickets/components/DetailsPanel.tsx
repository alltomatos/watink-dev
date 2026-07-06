import React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import TicketHistory from "@/components/TicketHistory";
import DadosTab from "./DadosTab";
import { TicketInfo } from "../ticketsTypes";

interface DetailsPanelProps {
  ticket: TicketInfo | null;
  loading: boolean;
  onClose: () => void;
}

const DetailsPanel: React.FC<DetailsPanelProps> = ({ ticket, loading, onClose }) => {
  const isGroup = ticket?.contact?.isGroup || ticket?.isGroup;

  return (
    <div className="relative flex flex-col w-full h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-[57px] border-b border-border shrink-0">
        <span className="text-sm font-semibold text-foreground">
          {isGroup ? "Detalhes do Grupo" : "Detalhes do Contato"}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onClose}
          aria-label="Fechar painel"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Abas */}
      <Tabs defaultValue="dados" className="flex flex-col flex-1 overflow-hidden">
        <TabsList className="w-full rounded-none h-9 gap-0 shrink-0 border-b border-border bg-muted/40">
          <TabsTrigger value="dados" className="flex-1 rounded-none text-xs h-full">
            Dados
          </TabsTrigger>
          <TabsTrigger value="historico" className="flex-1 rounded-none text-xs h-full">
            Histórico
          </TabsTrigger>
        </TabsList>

        <TabsContent value="dados" className="flex-1 min-h-0 overflow-y-auto mt-0">
          <DadosTab ticket={ticket} loading={loading} />
        </TabsContent>

        <TabsContent value="historico" className="flex-1 min-h-0 overflow-y-auto mt-0">
          {ticket?.id ? (
            <TicketHistory ticketId={ticket.id} />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground text-sm p-4 text-center">
              Selecione um ticket para ver o histórico
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DetailsPanel;
