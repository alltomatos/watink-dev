import React from "react";
import { Formik, Form } from "formik";
import { Loader2 } from "lucide-react";

import { PageLayout } from "../../components/ui/page-layout";
import { useGroupEdit, GroupSchema } from "./hooks/useGroupEdit";
import GroupEditHeader from "./components/GroupEditHeader";
import GroupDataCard from "./components/GroupDataCard";
import GroupUsersCard from "./components/GroupUsersCard";
import GroupPermissionsCard from "./components/GroupPermissionsCard";
import AddUserDialog from "./components/AddUserDialog";

const GroupEdit: React.FC = () => {
  const {
    isNew,
    loading,
    saving,
    group,
    allPermissions,
    selectedPermissions,
    setSelectedPermissions,
    groupUsers,
    userSearchTerm,
    setUserSearchTerm,
    addUserDialogOpen,
    setAddUserDialogOpen,
    availableUserSearch,
    setAvailableUserSearch,
    filteredGroupUsers,
    availableUsers,
    handleSave,
    handleRemoveUser,
    handleAddUser,
    navigate,
  } = useGroupEdit();

  if (loading) {
    return (
      <PageLayout>
        <div className="flex min-h-[400px] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <Formik
        initialValues={group}
        enableReinitialize
        validationSchema={GroupSchema}
        onSubmit={handleSave}
      >
        {({ touched, errors }) => (
          <Form className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <GroupEditHeader
              isNew={isNew}
              saving={saving}
              groupName={group.name}
              onBack={() => navigate("/groups")}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <GroupDataCard
                touched={touched}
                errors={errors}
                selectedPermissionsCount={selectedPermissions.length}
                groupUsersCount={groupUsers.length}
              />

              <GroupUsersCard
                filteredGroupUsers={filteredGroupUsers}
                groupUsersCount={groupUsers.length}
                userSearchTerm={userSearchTerm}
                onSearchChange={setUserSearchTerm}
                onRemoveUser={handleRemoveUser}
                onOpenAddDialog={() => setAddUserDialogOpen(true)}
              />

              <GroupPermissionsCard
                allPermissions={allPermissions}
                selectedPermissions={selectedPermissions}
                onChange={setSelectedPermissions}
              />
            </div>
          </Form>
        )}
      </Formik>

      <AddUserDialog
        open={addUserDialogOpen}
        onOpenChange={setAddUserDialogOpen}
        availableUsers={availableUsers}
        searchTerm={availableUserSearch}
        onSearchChange={setAvailableUserSearch}
        onAddUser={handleAddUser}
      />
    </PageLayout>
  );
};

export default GroupEdit;
