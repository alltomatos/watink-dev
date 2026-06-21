import { useState, useEffect } from "react";
import { toast } from "react-toastify";

import api from "../../../services/api";
import { SettingPayload, PluginsPayload } from "../../../types/api";
import { Deal, Pipeline, Stage, Contact } from "../contactDrawerTypes";

interface UseContactDrawerParams {
  open: boolean;
  ticketId: number;
  contact: Contact;
}

export function useContactDrawer({ open, ticketId, contact }: UseContactDrawerParams) {
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

  useEffect(() => {
    if (open && ticketId) {
      fetchDeals();
      fetchPipelines();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ticketId]);

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

  const handleSyncContact = async () => {
    try {
      await api.post(`/contacts/${contact.id}/sync`);
      toast.success("Sincronização solicitada!");
    } catch (e) {
      console.error(e);
    }
  };

  const showAITab = aiEnabled && aiAssistantEnabled && !contact.isGroup;

  return {
    modalOpen,
    setModalOpen,
    deals,
    pipelines,
    pipelineModalOpen,
    setPipelineModalOpen,
    selectedPipeline,
    selectedStage,
    setSelectedStage,
    stages,
    protocolDrawerOpen,
    setProtocolDrawerOpen,
    clientModalOpen,
    setClientModalOpen,
    activeTab,
    setActiveTab,
    activePlugins,
    showAITab,
    handlePipelineChange,
    handleSaveDeal,
    handleDeleteDeal,
    handleSyncContact,
  };
}
