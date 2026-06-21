import React from "react";
import { Formik, Form } from "formik";
import { Loader2 } from "lucide-react";

import { i18n } from "../../translate/i18n";
import QueueSelect from "../QueueSelect";
import { Can } from "../Can";
import { UserSchema } from "../../utils/userValidation";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import type { UserModalProps } from "./userModalTypes";
import { useUserModal } from "./hooks/useUserModal";
import UserFormFields from "./components/UserFormFields";
import RolesDropdown from "./components/RolesDropdown";
import GroupsDropdown from "./components/GroupsDropdown";
import WhatsAppSelect from "./components/WhatsAppSelect";

const UserModal: React.FC<UserModalProps> = ({ open, onClose, userId }) => {
  const {
    user,
    selectedQueueIds,
    setSelectedQueueIds,
    showPassword,
    setShowPassword,
    whatsappId,
    setWhatsappId,
    groups,
    roles,
    selectedRoleIds,
    setSelectedRoleIds,
    whatsApps,
    whatsAppsLoading,
    handleClose,
    handleSaveUser,
  } = useUserModal(userId, open, onClose);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-[450px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {userId
              ? i18n.t("userModal.title.edit")
              : i18n.t("userModal.title.add")}
          </DialogTitle>
        </DialogHeader>

        <Formik
          initialValues={user}
          enableReinitialize={true}
          validationSchema={UserSchema}
          onSubmit={async (values, actions) => {
            await handleSaveUser(values);
            actions.setSubmitting(false);
          }}
        >
          {({ touched, errors, isSubmitting, values, setFieldValue }) => (
            <Form className="space-y-4">
              <UserFormFields
                touched={touched as Partial<Record<"name" | "email" | "password", string>>}
                errors={errors}
                showPassword={showPassword}
                onTogglePassword={() => setShowPassword((p) => !p)}
              />

              <RolesDropdown
                roles={roles}
                selectedRoleIds={selectedRoleIds}
                onToggle={(roleId, checked) =>
                  setSelectedRoleIds((prev) =>
                    checked ? [...prev, roleId] : prev.filter((id) => id !== roleId)
                  )
                }
              />

              <GroupsDropdown
                groups={groups}
                selectedGroupIds={values.groupIds ?? []}
                onToggle={(groupId, checked) => {
                  const current = values.groupIds ?? [];
                  setFieldValue(
                    "groupIds",
                    checked ? [...current, groupId] : current.filter((id) => id !== groupId)
                  );
                }}
              />

              <Can
                perform="user-modal:editQueues"
                yes={() => (
                  <QueueSelect
                    selectedQueueIds={selectedQueueIds}
                    onChange={(vals) => setSelectedQueueIds(vals)}
                  />
                )}
              />

              <Can
                perform="user-modal:editQueues"
                yes={() =>
                  !whatsAppsLoading && (
                    <WhatsAppSelect
                      whatsApps={whatsApps}
                      whatsappId={whatsappId}
                      onChange={setWhatsappId}
                    />
                  )
                }
              />

              <DialogFooter className="pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  {i18n.t("userModal.buttons.cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {userId
                    ? i18n.t("userModal.buttons.okEdit")
                    : i18n.t("userModal.buttons.okAdd")}
                </Button>
              </DialogFooter>
            </Form>
          )}
        </Formik>
      </DialogContent>
    </Dialog>
  );
};

export default UserModal;
