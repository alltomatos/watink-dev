import React from "react";

import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { i18n } from "../../translate/i18n";
import ContactDrawerSkeleton from "../ContactDrawerSkeleton";
import ContactAIInsights from "../ContactAIInsights";
import TicketHistory from "../TicketHistory";
import ContactModal from "../ContactModal";
import ClientModal from "../../pages/Clients/ClientModal";
import ProtocolDrawer from "../../pages/Helpdesk/ProtocolDrawer";

import { ContactDrawerProps } from "./contactDrawerTypes";
import { useContactDrawer } from "./hooks/useContactDrawer";
import ContactHeader from "./components/ContactHeader";
import PipelinesSection from "./components/PipelinesSection";
import HelpdeskSection from "./components/HelpdeskSection";
import NewDealDialog from "./components/NewDealDialog";

const ContactDrawer = ({
  open,
  handleDrawerClose,
  contact,
  ticketId,
  loading,
}: ContactDrawerProps) => {
  const {
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
  } = useContactDrawer({ open, ticketId, contact });

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
                  <ContactHeader
                    contact={contact}
                    onEdit={() => setModalOpen(true)}
                    onSync={handleSyncContact}
                    onCreateClient={() => setClientModalOpen(true)}
                  />

                  <PipelinesSection
                    deals={deals}
                    onAddDeal={() => setPipelineModalOpen(true)}
                    onDeleteDeal={handleDeleteDeal}
                  />

                  {activePlugins.includes("helpdesk") && (
                    <HelpdeskSection onOpenProtocol={() => setProtocolDrawerOpen(true)} />
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

      <ContactModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        contactId={contact.id}
        initialValues={undefined}
        onSave={undefined}
      />

      <NewDealDialog
        open={pipelineModalOpen}
        onOpenChange={setPipelineModalOpen}
        pipelines={pipelines}
        stages={stages}
        selectedPipeline={selectedPipeline}
        selectedStage={selectedStage}
        onPipelineChange={handlePipelineChange}
        onStageChange={setSelectedStage}
        onSave={handleSaveDeal}
        onCancel={() => setPipelineModalOpen(false)}
      />

      <ProtocolDrawer
        open={protocolDrawerOpen}
        onClose={() => setProtocolDrawerOpen(false)}
        contactId={contact.id}
        ticketId={ticketId}
        onSuccess={() => {}}
      />

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
