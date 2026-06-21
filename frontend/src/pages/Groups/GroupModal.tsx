/* @jsxImportSource react */
import React from "react";
import * as Yup from "yup";
import { Formik, Form } from "formik";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { i18n } from "../../translate/i18n";
import { useGroupModal } from "./hooks/useGroupModal";
import GroupNameField from "./components/GroupNameField";
import GroupPermissionCategory from "./components/GroupPermissionCategory";

interface GroupModalProps {
  open: boolean;
  onClose: () => void;
  groupId?: string | null;
}

const schema = Yup.object().shape({
  name: Yup.string()
    .min(2, "Muito curto!")
    .max(50, "Muito longo!")
    .required("Obrigatório"),
});

const GroupModal: React.FC<GroupModalProps> = ({ open, onClose, groupId }) => {
  const {
    selectedPermissions,
    groupName,
    groupedPermissions,
    handlePermissionToggle,
    handleSubmit,
  } = useGroupModal(open, groupId, onClose);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {groupId
              ? i18n.t("groupModal.title.edit")
              : i18n.t("groupModal.title.add")}
          </DialogTitle>
        </DialogHeader>

        <Formik
          initialValues={{ name: groupName }}
          enableReinitialize
          validationSchema={schema}
          onSubmit={(values, { setSubmitting }) => {
            setTimeout(() => {
              handleSubmit(values);
              setSubmitting(false);
            }, 300);
          }}
        >
          {({ touched, errors, isSubmitting }) => (
            <Form>
              <div className="space-y-6">
                <GroupNameField
                  touched={touched.name}
                  error={errors.name}
                />

                {Object.entries(groupedPermissions).map(([category, perms]) => (
                  <GroupPermissionCategory
                    key={category}
                    category={category}
                    permissions={perms}
                    selectedPermissions={selectedPermissions}
                    onToggle={handlePermissionToggle}
                  />
                ))}
              </div>

              <DialogFooter className="mt-6 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isSubmitting}
                >
                  {i18n.t("groupModal.buttons.cancel")}
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {groupId
                    ? i18n.t("groupModal.buttons.okEdit")
                    : i18n.t("groupModal.buttons.okAdd")}
                </Button>
              </DialogFooter>
            </Form>
          )}
        </Formik>
      </DialogContent>
    </Dialog>
  );
};

export default GroupModal;
