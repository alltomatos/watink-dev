import React from "react";
import { Checkbox } from "../../../components/ui/checkbox";
import ConfirmationModal from "../../../components/ConfirmationModal";
import { i18n } from "../../../translate/i18n";
import { User } from "../usersTypes";

interface UserDeleteModalProps {
  open: boolean;
  deletingUser: User | null;
  confirmDelete: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onConfirmChange: (v: boolean) => void;
}

const UserDeleteModal: React.FC<UserDeleteModalProps> = ({
  open,
  deletingUser,
  confirmDelete,
  onClose,
  onConfirm,
  onConfirmChange,
}) => {
  return (
    <ConfirmationModal
      title={
        deletingUser
          ? `${i18n.t("users.confirmationModal.deleteTitle")} ${deletingUser.name}?`
          : ""
      }
      open={open}
      onClose={onClose}
      onConfirm={onConfirm}
    >
      <div className="space-y-4">
        <p className="text-sm">{i18n.t("users.confirmationModal.deleteMessage")}</p>

        {deletingUser && (
          <div className="rounded-lg border border-border bg-muted/40 p-3 text-sm space-y-1">
            <p>
              <strong>{i18n.t("users.table.name")}:</strong> {deletingUser.name}
            </p>
            <p>
              <strong>{i18n.t("users.table.email")}:</strong> {deletingUser.email}
            </p>
          </div>
        )}

        <p className="text-sm font-bold text-destructive">
          {i18n.t("users.confirmationModal.warning")}
        </p>

        <label className="flex items-center gap-2 cursor-pointer">
          <Checkbox
            checked={confirmDelete}
            onCheckedChange={(v) => onConfirmChange(!!v)}
          />
          <span className="text-sm">{i18n.t("users.confirmationModal.confirmCheckbox")}</span>
        </label>
      </div>
    </ConfirmationModal>
  );
};

export default UserDeleteModal;
