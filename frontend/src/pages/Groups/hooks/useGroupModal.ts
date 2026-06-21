import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import api from "../../../services/api";
import toastError from "../../../errors/toastError";
import { i18n } from "../../../translate/i18n";
import { Permission, GroupFormValues, groupPermissions } from "../groupsTypes";

interface UseGroupModalReturn {
  allPermissions: Permission[];
  selectedPermissions: string[];
  groupName: string;
  groupedPermissions: Record<string, Permission[]>;
  handlePermissionToggle: (id: string) => void;
  handleSubmit: (values: GroupFormValues) => Promise<void>;
}

export const useGroupModal = (
  open: boolean,
  groupId?: string | null,
  onClose?: () => void
): UseGroupModalReturn => {
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");

  useEffect(() => {
    if (!open) return;
    const fetchPermissions = async () => {
      try {
        const { data } = await api.get<Permission[]>("/permissions");
        setAllPermissions(Array.isArray(data) ? data : []);
      } catch (err) {
        toastError(err);
      }
    };
    fetchPermissions();
  }, [open]);

  useEffect(() => {
    if (!open || !groupId) {
      setSelectedPermissions([]);
      setGroupName("");
      return;
    }
    const fetchGroup = async () => {
      try {
        const { data } = await api.get<{
          name?: string;
          permissions?: Permission[];
        }>(`/groups/${groupId}`);
        setGroupName(data?.name ?? "");
        setSelectedPermissions(
          Array.isArray(data?.permissions)
            ? data.permissions.map((p) => p.id)
            : []
        );
      } catch (err) {
        toastError(err);
      }
    };
    fetchGroup();
  }, [open, groupId]);

  const handlePermissionToggle = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handleSubmit = async (values: GroupFormValues) => {
    const payload = { ...values, permissions: selectedPermissions };
    try {
      if (groupId) {
        await api.put(`/groups/${groupId}`, payload);
      } else {
        await api.post("/groups", payload);
      }
      toast.success(i18n.t("groupModal.success"));
      onClose?.();
    } catch (err) {
      toastError(err);
    }
  };

  const groupedPermissions = groupPermissions(allPermissions);

  return {
    allPermissions,
    selectedPermissions,
    groupName,
    groupedPermissions,
    handlePermissionToggle,
    handleSubmit,
  };
};
