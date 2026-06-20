import React from "react";

import ConfirmationModal from "../../components/ConfirmationModal";
import GroupModal from "./GroupModal";
import { i18n } from "../../translate/i18n";
import {
  PageContainer,
  PageHeader,
  PageContent,
} from "../../components/ui/page-layout";

import { useGroups } from "./hooks/useGroups";
import GroupsToolbar from "./components/GroupsToolbar";
import GroupsTable from "./components/GroupsTable";

const Groups: React.FC = () => {
  const {
    groups,
    loading,
    searchParam,
    selectedGroup,
    groupModalOpen,
    confirmModalOpen,
    handleSearch,
    handleOpenGroupModal,
    handleCloseGroupModal,
    handleEditGroup,
    handleDeleteGroup,
    setSelectedGroup,
    setConfirmModalOpen,
  } = useGroups();

  return (
    <PageContainer>
      <GroupModal
        open={groupModalOpen}
        onClose={handleCloseGroupModal}
        groupId={selectedGroup ? String(selectedGroup.id) : null}
      />
      <ConfirmationModal
        title={
          selectedGroup
            ? `${i18n.t("groups.confirmationModal.deleteTitle")} ${selectedGroup.name}?`
            : ""
        }
        open={confirmModalOpen}
        onClose={() => setConfirmModalOpen(false)}
        onConfirm={() =>
          selectedGroup ? handleDeleteGroup(selectedGroup.id) : Promise.resolve()
        }
      >
        {i18n.t("groups.confirmationModal.deleteMessage")}
      </ConfirmationModal>

      <PageHeader
        title={i18n.t("groups.title") as string}
        description="Gerencie os grupos de atendimento e permissÃµes coletivas"
      >
        <GroupsToolbar
          searchParam={searchParam}
          onSearch={handleSearch}
          onAdd={handleOpenGroupModal}
        />
      </PageHeader>

      <PageContent>
        <GroupsTable
          groups={groups}
          loading={loading}
          onEdit={handleEditGroup}
          onDelete={(group) => {
            setSelectedGroup(group);
            setConfirmModalOpen(true);
          }}
        />
      </PageContent>
    </PageContainer>
  );
};

export default Groups;

