import React, { useState, useEffect } from "react";
import { Edit2, RefreshCw, PersonStanding, UserPlus, Trash2, Ticket } from "lucide-react";
import { toast } from "react-toastify";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import ContactModal from "../ContactModal";
import ClientModal from "../../pages/Clients/ClientModal";
import ContactDrawerSkeleton from "../ContactDrawerSkeleton";
import ContactAIInsights from "../ContactAIInsights";
import TicketHistory from "../TicketHistory";
import ProtocolDrawer from "../../pages/Helpdesk/ProtocolDrawer";
import { getBackendUrl } from "../../helpers/urlUtils";

import { SettingPayload, PluginsPayload } from "../../types/api";

/* ─── Stage color tokens (same palette as PipelineBoard) ───────────── */
const stageColors = [
  { bg: "var(--status-info-bg)", header: "var(--status-info)" },
  { bg: "var(--status-warning-bg)", header: "var(--status-warning)" },
  { bg: "var(--status-success-bg)", header: "var(--status-success)" },
  { bg: "var(--status-error-bg)", header: "var(--status-error)" },
  { bg: "var(--status-default-bg)", header: "var(--status-default-text)" },
];

const getStageColor = (index: number) => stageColors[index % stageColors.length];

/* ─── Types ─────────────────────────────────────────────────────────── */
interface Stage {
  id: number;
  name: string;
}

interface Pipeline {
  id: number;
  name: string;
  stages: Stage[];
}

interface Deal {
  id: number;
  title: string;
  pipeline?: { name: string };
  stage?: { id: number; name: string };
}

interface Contact {
  id: number;
  name: string;
  number?: string;
  email?: string;
  lid?: string;
  profilePicUrl?: string;
  isGroup?: boolean;
  clients?: unknown[];
}

interface ContactDrawerProps {
  open: boolean;
  handleDrawerClose: () => void;
  contact: Contact;
  ticketId: number;
  loading: boolean;
}

/* ─── ContactDrawer ─────────────────────────────────────────────────── */
const ContactDrawer = ({
  open,
  handleDrawerClose,
  contact,
  ticketId,
  loading,
}: ContactDrawerProps) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [pipelineModalOpen, setPipelineModalOpen] = useState(false);
  const [selectedPipeline, setSelectedPipeline] = useState("");
  const [selectedStage, setSelectedStage] = useState("");
  const [stages, setStages] = useState<Stage[]>([]);

  const [protocolDrawerOpen, setProtocolDrawerOpen] = useState(false);
  const [clientModalOpen, setClientModalOpen] = useState(false);

  const [activeTab, setActiveTab] = useState("data");
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiAssistantEnabled, setAiAssistantEnabled] = useState(false);
  const [activePlugins, setActivePlugins] = useState<string[]>([]);

  useEffect(() => {
    const fetchAISettings = async () => {
      try {
        const { data } = await api.get<SettingPayload[]>("/settings");
        setAiEnabled(data.find((s) => s.key === "aiEnabled")?.value === "true");
        setAiAssistantEnabled(
          data.find((s) => s.key === "aiAssistantEnabled")?.value === "true"
        );
      } catch (err) {
        console.error("Erro ao carregar configurações de IA:", err);
      }
    };
    fetchAISettings();
  }, []);

  useEffect(() => {
    const fetchPlugins = async () => {
      try {
        const { data } = await api.get<PluginsPayload>("/v1/plugins/installed");
        setActivePlugins(data.active || []);
      } catch (err) {
        console.error("Erro ao carregar plugins:", err);
      }
    };
    fetchPlugins();
  }, []);

  useEffect(() => {
    if (open && ticketId) {
      fetchDeals();
      fetchPipelines();
    }
  }, [open, ticketId]);

  const fetchDeals = async () => {
    try {
      const { data } = await api.get("/deals", { params: { ticketId } });
      setDeals(data.deals);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchPipelines = async () => {
    try {
      const { data } = await api.get("/pipelines");
      setPipelines(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePipelineChange = (pipelineId: string) => {
    setSelectedPipeline(pipelineId);
    const pipeline = pipelines.find((p) => String(p.id) === pipelineId);
    if (pipeline) {
      setStages(pipeline.stages);
      if (pipeline.stages.length > 0) {
        setSelectedStage(String(pipeline.stages[0].id));
      }
    }
  };

  const handleSaveDeal = async () => {
    if (!selectedPipeline || !selectedStage) return;
    try {
      await api.post("/deals", {
        title: `Ticket #${ticketId} - ${contact.name}`,
        value: 0,
        pipelineId: selectedPipeline,
        stageId: selectedStage,
        contactId: contact.id,
        ticketId,
      });
      toast.success("Deal criado com sucesso!");
      setPipelineModalOpen(false);
      fetchDeals();
    } catch {
      toast.error("Erro ao criar deal");
    }
  };

  const handleDeleteDeal = async (dealId: number) => {
    try {
      await api.delete(`/deals/${dealId}`);
      toast.success("Deal removido do fluxo");
      fetchDeals();
    } catch {
      toast.error("Erro ao remover deal");
    }
  };

  const showAITab = aiEnabled && aiAssistantEnabled && !contact.isGroup;

  return (
    <>
      <Sheet open={open} onOpenChange={(v: boolean) => !v && handleDrawerClose()}>
        <SheetContent
          side="right"
          className="w-[320px] p-0 flex flex-col border-l border-[var(--border-divider)] rounded-tr-md rounded-br-md"
        >
          {/* Header */}
          <div className="flex items-center gap-2 px-3 min-h-[73px] border-b border-[var(--border-divider)] bg-[var(--border-default)]">
            <span className="text-sm font-medium">{i18n.t("contactDrawer.header")}</span>
          </div>

          {loading ? (
            <ContactDrawerSkeleton />
          ) : (
            <div className="flex flex-col flex-1 overflow-hidden">
              {/* Tabs */}
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="flex flex-col flex-1 overflow-hidden"
              >
                <TabsList className="w-full rounded-none h-10 gap-0 bg-[var(--border-default)] border-b border-[var(--border-divider)]">
                  <TabsTrigger value="data" className="flex-1 rounded-none text-xs">
                    📋 Dados
                  </TabsTrigger>
                  <TabsTrigger value="history" className="flex-1 rounded-none text-xs">
                    🕒 Histórico
                  </TabsTrigger>
                  {showAITab && (
                    <TabsTrigger value="ai" className="flex-1 rounded-none text-xs">
                      🤖 IA
                    </TabsTrigger>
                  )}
                </TabsList>

                {/* Tab: Dados */}
                <TabsContent
                  value="data"
                  className="flex-1 overflow-y-auto mt-0 px-2 py-2 bg-[var(--border-default)] space-y-2"
                >
                  {/* Contact header card */}
                  <div className="border border-[var(--border-divider)] rounded flex flex-col items-center p-3 gap-2 bg-[var(--bg-surface)]">
                    <Avatar
                      className="w-[160px] h-[160px] mt-2"
                      src={getBackendUrl(contact.profilePicUrl ?? "")}
                      name={contact.name || "?"}
                    />
                    <p className="font-medium text-sm">{contact.name}</p>
                    {contact.number ? (
                      <a
                        href={`tel:${contact.number}`}
                        className="text-sm text-primary hover:underline"
                      >
                        {contact.number}
                      </a>
                    ) : (
                      <p className="text-xs text-[var(--text-muted)]">{contact.lid}</p>
                    )}

                    <div className="flex items-center justify-center gap-1 mt-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() => setModalOpen(true)}
                            className="p-1.5 rounded hover:bg-[var(--bg-surface-alt)] transition-colors"
                          >
                            <Edit2 className="w-4 h-4 text-primary" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>{i18n.t("contactDrawer.buttons.edit")}</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={async () => {
                              try {
                                await api.post(`/contacts/${contact.id}/sync`);
                                toast.success("Sincronização solicitada!");
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            className="p-1.5 rounded hover:bg-[var(--bg-surface-alt)] transition-colors"
                          >
                            <RefreshCw className="w-4 h-4 text-primary" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent>Atualizar</TooltipContent>
                      </Tooltip>

                      {(!contact.clients || contact.clients.length === 0) ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => setClientModalOpen(true)}
                              className="p-1.5 rounded hover:bg-[var(--bg-surface-alt)] transition-colors"
                            >
                              <UserPlus className="w-4 h-4 text-primary" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Criar Cliente</TooltipContent>
                        </Tooltip>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              disabled
                              className="p-1.5 rounded opacity-50 cursor-not-allowed"
                            >
                              <PersonStanding className="w-4 h-4 text-primary" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Cliente Vinculado</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>

                  {/* Pipelines */}
                  <div className="border border-[var(--border-divider)] rounded p-3 bg-[var(--bg-surface)]">
                    <p className="text-sm font-medium mb-2">Fluxos (Pipelines)</p>
                    {deals.map((deal) => {
                      const color = deal.stage
                        ? getStageColor(deal.stage.id)
                        : { bg: "var(--bg-surface-alt)", header: "var(--border-default)" };
                      return (
                        <div
                          key={deal.id}
                          className="relative mt-2 p-2 rounded border border-[var(--border-divider)] bg-[var(--bg-surface)]"
                          style={{ borderLeft: `4px solid ${color.header}` }}
                        >
                          <p className="text-xs font-bold">{deal.pipeline?.name}</p>
                          <div className="flex items-center justify-between mt-1">
                            <span
                              className="text-xs px-2 py-0.5 rounded text-[var(--text-primary)]"
                              style={{ backgroundColor: color.bg }}
                            >
                              {deal.stage?.name}
                            </span>
                            <button
                              onClick={() => handleDeleteDeal(deal.id)}
                              className="p-1 rounded hover:bg-[var(--bg-surface-alt)] transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => setPipelineModalOpen(true)}
                    >
                      Adicionar ao Fluxo
                    </Button>
                  </div>

                  {/* Helpdesk */}
                  {activePlugins.includes("helpdesk") && (
                    <div className="border border-[var(--border-divider)] rounded p-3 bg-[var(--bg-surface)]">
                      <p className="text-sm font-medium mb-2">🎫 Helpdesk - Protocolos</p>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => setProtocolDrawerOpen(true)}
                      >
                        <Ticket className="w-4 h-4 mr-2" />
                        Abrir Protocolo
                      </Button>
                    </div>
                  )}
                </TabsContent>

                {/* Tab: Histórico */}
                <TabsContent
                  value="history"
                  className="flex-1 overflow-y-auto mt-0 bg-[var(--border-default)]"
                >
                  <TicketHistory ticketId={ticketId} />
                </TabsContent>

                {/* Tab: IA */}
                {showAITab && (
                  <TabsContent
                    value="ai"
                    className="flex-1 overflow-hidden mt-0 flex flex-col"
                  >
                    <ContactAIInsights contactId={contact.id} ticketId={ticketId} />
                  </TabsContent>
                )}
              </Tabs>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* ContactModal */}
      <ContactModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        contactId={contact.id}
        initialValues={undefined}
        onSave={undefined}
      />

      {/* Pipeline Modal */}
      <Dialog open={pipelineModalOpen} onOpenChange={setPipelineModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Deal</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">Pipeline</label>
              <Select value={selectedPipeline} onValueChange={handlePipelineChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Selecione um pipeline" />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedPipeline && (
              <div className="space-y-1">
                <label className="text-sm font-medium">Etapa</label>
                <Select value={selectedStage} onValueChange={setSelectedStage}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione uma etapa" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPipelineModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSaveDeal}
              disabled={!selectedPipeline || !selectedStage}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Protocol Drawer */}
      <ProtocolDrawer
        open={protocolDrawerOpen}
        onClose={() => setProtocolDrawerOpen(false)}
        contactId={contact.id}
        ticketId={ticketId}
        onSuccess={() => {}}
      />

      {/* Client Modal */}
      <ClientModal
        open={clientModalOpen}
        onClose={() => setClientModalOpen(false)}
        client={null}
        initialContact={{
          id: contact.id != null ? String(contact.id) : undefined,
          name: contact.name,
          number: contact.number,
          email: contact.email,
        }}
      />
    </>
  );
};

export default ContactDrawer;
