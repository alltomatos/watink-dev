import React from "react";
import { Formik } from "formik";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "../../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { PageLayout, PageHeader, PageContent } from "../../components/ui/page-layout";

import { UserSchema } from "../../utils/userValidation";
import { i18n } from "../../translate/i18n";

import { useUserEdit } from "./hooks/useUserEdit";
import UserDataForm from "./components/UserDataForm";
import UserPermissionsTab from "./components/UserPermissionsTab";

const UserEdit: React.FC = () => {
  const navigate = useNavigate();
  const {
    isNew,
    user,
    selectedQueueIds,
    setSelectedQueueIds,
    showPassword,
    setShowPassword,
    whatsappId,
    setWhatsappId,
    roles,
    allPermissions,
    selectedPermissions,
    loading,
    handleSaveUser,
    togglePermission,
  } = useUserEdit();

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
      <PageHeader
        title={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/users")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <span>{isNew ? i18n.t("userModal.title.add") : user.name}</span>
          </div>
        }
      />

      <PageContent>
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <Tabs defaultValue="data">
            <TabsList>
              <TabsTrigger value="data">Dados do Usuário</TabsTrigger>
              <TabsTrigger value="advanced">Avançado (Exceções)</TabsTrigger>
            </TabsList>

            <TabsContent value="data" className="pt-4">
              <Formik
                initialValues={user}
                enableReinitialize
                validationSchema={UserSchema}
                onSubmit={(values, actions) => {
                  handleSaveUser(values);
                  actions.setSubmitting(false);
                }}
              >
                {({ touched, errors, isSubmitting, setFieldValue, values }) => (
                  <UserDataForm
                    touched={touched as Record<string, boolean>}
                    errors={errors as Record<string, string>}
                    isSubmitting={isSubmitting}
                    values={values}
                    setFieldValue={setFieldValue}
                    showPassword={showPassword}
                    onTogglePassword={() => setShowPassword((p) => !p)}
                    selectedQueueIds={selectedQueueIds}
                    onQueuesChange={setSelectedQueueIds}
                    whatsappId={whatsappId}
                    onWhatsappChange={setWhatsappId}
                    roles={roles}
                  />
                )}
              </Formik>
            </TabsContent>

            <TabsContent value="advanced" className="pt-4">
              <UserPermissionsTab
                allPermissions={allPermissions}
                selectedPermissions={selectedPermissions}
                onTogglePermission={togglePermission}
                onSave={handleSaveUser}
                currentValues={user}
              />
            </TabsContent>
          </Tabs>
        </div>
      </PageContent>
    </PageLayout>
  );
};

export default UserEdit;
