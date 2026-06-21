/* @jsxImportSource react */
import React from "react";

import { i18n } from "../../translate/i18n";
import {
  PageLayout,
  PageHeader,
  PageContent,
} from "../../components/ui/page-layout";
import TagModal from "../../components/TagModal";
import ConfirmationModal from "../../components/ConfirmationModal";

import { useTagManager } from "./hooks/useTagManager";
import { TagManagerToolbar } from "./components/TagManagerToolbar";
import { TagTable } from "./components/TagTable";

const TagManager = () => {
  const {
    loading,
    searchParam,
    tags,
    showArchived,
    selectedTag,
    tagModalOpen,
    confirmModalOpen,
    setShowArchived,
    setSelectedTag,
    setConfirmModalOpen,
    handleSearch,
    handleOpenTagModal,
    handleCloseTagModal,
    handleEditTag,
    handleDeleteTag,
    handleToggleArchive,
  } = useTagManager();

  return (
    <PageLayout>
      <TagModal
        open={tagModalOpen}
        onClose={handleCloseTagModal}
        aria-labelledby="form-dialog-title"
        tagId={selectedTag?.id}
      />
      <ConfirmationModal
        title={
          selectedTag
            ? `${i18n.t("tags.confirmationModal.deleteTitle")} ${selectedTag.name}?`
            : ""
        }
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={() => selectedTag && handleDeleteTag(selectedTag.id)}
      >
        {i18n.t("tags.confirmationModal.deleteMessage")}
      </ConfirmationModal>

      <PageHeader
        title={i18n.t("tags.title") as string}
        description="Gerencie as etiquetas para organizar seus atendimentos"
      >
        <TagManagerToolbar
          searchParam={searchParam}
          showArchived={showArchived}
          onSearch={handleSearch}
          onToggleArchived={() => setShowArchived((prev) => !prev)}
          onAdd={handleOpenTagModal}
        />
      </PageHeader>

      <PageContent>
        <TagTable
          tags={tags}
          loading={loading}
          onEdit={handleEditTag}
          onToggleArchive={handleToggleArchive}
          onDelete={(tag) => {
            setSelectedTag(tag);
            setConfirmModalOpen(true);
          }}
        />
      </PageContent>
    </PageLayout>
  );
};

export default TagManager;
