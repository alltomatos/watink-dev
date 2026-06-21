/* @jsxImportSource react */
import React from "react";
import { Plus } from "lucide-react";

import { i18n } from "../../translate/i18n";
import QueueModal from "../../components/QueueModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import { PageContainer, PageHeader, PageContent } from "../../components/ui/page-layout";
import { Button } from "../../components/ui/button";
import { useQueues } from "./hooks/useQueues";
import { QueuesTable } from "./components/QueuesTable";

const Queues = () => {
  const {
    queues,
    loading,
    queueModalOpen,
    selectedQueue,
    confirmModalOpen,
    handleOpenQueueModal,
    handleCloseQueueModal,
    handleEditQueue,
    handleDeleteQueue,
    setSelectedQueue,
    setConfirmModalOpen,
  } = useQueues();

  return (
    <PageContainer>
      <ConfirmationModal
        title={
          selectedQueue
            ? `${i18n.t("queues.confirmationModal.deleteTitle")} ${selectedQueue.name}?`
            : ""
        }
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={() => selectedQueue && handleDeleteQueue(selectedQueue.id)}
      >
        {i18n.t("queues.confirmationModal.deleteMessage")}
      </ConfirmationModal>

      <QueueModal
        open={queueModalOpen}
        onClose={handleCloseQueueModal}
        queueId={selectedQueue?.id}
      />

      <PageHeader
        title={i18n.t("queues.title") as string}
        description="Configure as filas de atendimento e fluxos de triagem automática"
      >
        <Button onClick={handleOpenQueueModal}>
          <Plus className="mr-2 h-4 w-4" />
          {i18n.t("queues.buttons.add")}
        </Button>
      </PageHeader>

      <PageContent>
        <QueuesTable
          queues={queues}
          loading={loading}
          onEdit={handleEditQueue}
          onDelete={(queue) => {
            setSelectedQueue(queue);
            setConfirmModalOpen(true);
          }}
        />
      </PageContent>
    </PageContainer>
  );
};

export default Queues;
