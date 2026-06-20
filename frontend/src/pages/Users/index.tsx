/* @jsxImportSource react */
import React from "react";
import { PageContainer, PageContent } from "../../components/ui/page-layout";
import UserModal from "../../components/UserModal";
import useUsers from "./hooks/useUsers";
import UsersToolbar from "./components/UsersToolbar";
import UsersTable from "./components/UsersTable";
import UserDeleteModal from "./components/UserDeleteModal";

const Users: React.FC = () => {
  const {
    users,
    loading,
    searchParam,
    userModalOpen,
    selectedUser,
    confirmModalOpen,
    deletingUser,
    confirmDelete,
    smtpPluginActive,
    handleSearch,
    handleOpenUserModal,
    handleCloseUserModal,
    handleEditUser,
    handleDeleteUser,
    handleScroll,
    setConfirmModalOpen,
    setDeletingUser,
    setConfirmDelete,
  } = useUsers();

  return (
    <PageContainer>
      <UserDeleteModal
        open={confirmModalOpen}
        deletingUser={deletingUser}
        confirmDelete={confirmDelete}
        onClose={() => {
          setConfirmModalOpen(false);
          setConfirmDelete(false);
        }}
        onConfirm={() => deletingUser && handleDeleteUser(deletingUser.id)}
        onConfirmChange={setConfirmDelete}
      />

      <UserModal
        open={userModalOpen}
        onClose={handleCloseUserModal}
        userId={selectedUser?.id}
      />

      <UsersToolbar
        searchParam={searchParam}
        onSearch={handleSearch}
        onAddUser={handleOpenUserModal}
      />

      <PageContent onScroll={handleScroll}>
        <UsersTable
          users={users}
          loading={loading}
          smtpPluginActive={smtpPluginActive}
          onEdit={handleEditUser}
          onDelete={(user) => {
            setConfirmModalOpen(true);
            setDeletingUser(user);
          }}
        />
      </PageContent>
    </PageContainer>
  );
};

export default Users;
