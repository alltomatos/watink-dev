/* @jsxImportSource react */
import React from "react";
import { i18n } from "../../translate/i18n";

import {
  PageLayout,
  PageHeader,
  PageContent,
} from "../../components/ui/page-layout";
import QuickAnswersModal from "../../components/QuickAnswersModal";
import ConfirmationModal from "../../components/ConfirmationModal";

import { useQuickAnswers } from "./hooks/useQuickAnswers";
import { QuickAnswersToolbar } from "./components/QuickAnswersToolbar";
import { QuickAnswersTable } from "./components/QuickAnswersTable";

const QuickAnswers = () => {
  const {
    quickAnswers,
    loading,
    searchParam,
    selectedQuickAnswer,
    quickAnswerModalOpen,
    confirmModalOpen,
    handleSearch,
    handleOpenQuickAnswerModal,
    handleCloseQuickAnswerModal,
    handleEditQuickAnswer,
    handleDeleteQuickAnswer,
    handleRequestDelete,
    handleCloseConfirmModal,
    handleScroll,
  } = useQuickAnswers();

  return (
    <PageLayout>
      <QuickAnswersModal
        open={quickAnswerModalOpen}
        onClose={handleCloseQuickAnswerModal}
        aria-labelledby="form-dialog-title"
        quickAnswerId={selectedQuickAnswer?.id}
      />
      <ConfirmationModal
        title={
          selectedQuickAnswer
            ? `${i18n.t("quickAnswers.confirmationModal.deleteTitle")} ${selectedQuickAnswer.shortcut}?`
            : ""
        }
        open={confirmModalOpen}
        onClose={handleCloseConfirmModal}
        onConfirm={() =>
          selectedQuickAnswer && handleDeleteQuickAnswer(selectedQuickAnswer.id)
        }
      >
        {i18n.t("quickAnswers.confirmationModal.deleteMessage")}
      </ConfirmationModal>

      <PageHeader
        title={i18n.t("quickAnswers.title") as string}
        description="Gerencie suas respostas rápidas para agilizar o atendimento"
      >
        <QuickAnswersToolbar
          searchParam={searchParam}
          onSearch={handleSearch}
          onAdd={handleOpenQuickAnswerModal}
        />
      </PageHeader>

      <PageContent>
        <QuickAnswersTable
          quickAnswers={quickAnswers}
          loading={loading}
          onEdit={handleEditQuickAnswer}
          onDelete={handleRequestDelete}
          onScroll={handleScroll}
        />
      </PageContent>
    </PageLayout>
  );
};

export default QuickAnswers;
