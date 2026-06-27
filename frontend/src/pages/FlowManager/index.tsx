/* @jsxImportSource react */
import React from "react";
import { PageContainer, PageHeader, PageContent } from "../../components/ui/page-layout";
import ConfirmationModal from "../../components/ConfirmationModal";
import { useFlowManager } from "./hooks/useFlowManager";
import FlowFormDialog from "./components/FlowFormDialog";
import FlowToolbar from "./components/FlowToolbar";
import FlowGrid from "./components/FlowGrid";

const FlowManager: React.FC = () => {
  const {
    whatsapps,
    loading,
    searchParam,
    setSearchParam,
    view,
    setView,
    openModal,
    setOpenModal,
    selectedFlow,
    newFlowName,
    setNewFlowName,
    selectedWhatsapp,
    setSelectedWhatsapp,
    confirmModalOpen,
    setConfirmModalOpen,
    deletingFlow,
    filteredFlows,
    isConnectionUsed,
    handleOpenModal,
    handleCloseModal,
    handleSaveFlow,
    handleDeleteFlow,
    handleRequestDelete,
    handleToggleActive,
  } = useFlowManager();

  return (
    <PageContainer>
      <ConfirmationModal
        title={
          deletingFlow
            ? `Remover Fluxo: ${deletingFlow.name}?`
            : "Remover Fluxo?"
        }
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={handleDeleteFlow}
      >
        Esta ação é irreversível e removerá todos os nós e conexões deste fluxo
        de automação.
      </ConfirmationModal>

      <FlowFormDialog
        open={openModal}
        onOpenChange={setOpenModal}
        selectedFlow={selectedFlow}
        newFlowName={newFlowName}
        onFlowNameChange={setNewFlowName}
        selectedWhatsapp={selectedWhatsapp}
        onWhatsappChange={setSelectedWhatsapp}
        whatsapps={whatsapps}
        isConnectionUsed={isConnectionUsed}
        onSave={handleSaveFlow}
        onClose={handleCloseModal}
      />

      <PageHeader
        title="Gestor de Fluxos"
        description="Crie e gerencie árvores de decisão e automações inteligentes"
      >
        <FlowToolbar
          searchParam={searchParam}
          onSearchChange={setSearchParam}
          view={view}
          onViewChange={setView}
          onCreateNew={() => handleOpenModal()}
        />
      </PageHeader>

      <PageContent>
        <FlowGrid
          loading={loading}
          filteredFlows={filteredFlows}
          onCreateNew={() => handleOpenModal()}
          onEdit={handleOpenModal}
          onDelete={handleRequestDelete}
          onToggleActive={handleToggleActive}
        />
      </PageContent>
    </PageContainer>
  );
};

export default FlowManager;
