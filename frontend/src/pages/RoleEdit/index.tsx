import React from "react";
import { Formik, Form } from "formik";
import { Loader2 } from "lucide-react";

import { PageLayout } from "../../components/ui/page-layout";
import { RoleSchema } from "./roleEditTypes";
import { useRoleEdit } from "./hooks/useRoleEdit";
import { RoleEditHeader } from "./components/RoleEditHeader";
import { RoleDataCard } from "./components/RoleDataCard";
import { RolePermissionsCard } from "./components/RolePermissionsCard";

const RoleEdit: React.FC = () => {
  const {
    isNew,
    loading,
    saving,
    role,
    allPermissions,
    selectedPermissions,
    setSelectedPermissions,
    handleSave,
    navigate,
  } = useRoleEdit();

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
        initialValues={role}
        enableReinitialize
        validationSchema={RoleSchema}
        onSubmit={handleSave}
      >
        {({ touched, errors }) => (
          <Form className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
            <RoleEditHeader
              isNew={isNew}
              saving={saving}
              roleName={role.name}
              onBack={() => navigate("/roles")}
            />

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <RoleDataCard touched={touched} errors={errors} />
              <RolePermissionsCard
                allPermissions={allPermissions}
                selectedPermissions={selectedPermissions}
                onChange={setSelectedPermissions}
              />
            </div>
          </Form>
        )}
      </Formik>
    </PageLayout>
  );
};

export default RoleEdit;
