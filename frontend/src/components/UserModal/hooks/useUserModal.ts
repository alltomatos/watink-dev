import { useState, useEffect } from "react";
import { toast } from "react-toastify";

import { i18n } from "../../../translate/i18n";
import api from "../../../services/api";
import toastError from "../../../errors/toastError";
import useWhatsApps from "../../../hooks/useWhatsApps";
import type { Group, Role, UserFormValues, UserSavePayload, UserDetail, UserQueue } from "../userModalTypes";

const INITIAL_STATE: UserFormValues = {
  name: "",
  email: "",
  password: "",
  groupIds: [],
};

interface UseUserModalReturn {
  user: UserFormValues;
  selectedQueueIds: number[];
  setSelectedQueueIds: React.Dispatch<React.SetStateAction<number[]>>;
  showPassword: boolean;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
  whatsappId: number | string;
  setWhatsappId: React.Dispatch<React.SetStateAction<number | string>>;
  groups: Group[];
  roles: Role[];
  selectedRoleIds: number[];
  setSelectedRoleIds: React.Dispatch<React.SetStateAction<number[]>>;
  whatsApps: ReturnType<typeof useWhatsApps>["whatsApps"];
  whatsAppsLoading: boolean;
  handleClose: () => void;
  handleSaveUser: (values: UserFormValues) => Promise<void>;
}

export function useUserModal(
  userId: number | string | undefined,
  open: boolean,
  onClose: () => void
): UseUserModalReturn {
  const [user, setUser] = useState<UserFormValues>(INITIAL_STATE);
  const [selectedQueueIds, setSelectedQueueIds] = useState<number[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [whatsappId, setWhatsappId] = useState<number | string>("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [selectedRoleIds, setSelectedRoleIds] = useState<number[]>([]);
  const { loading: whatsAppsLoading, whatsApps } = useWhatsApps();

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const { data } = await api.get<Group[]>("/groups");
        setGroups(data);
      } catch (err) {
        toastError(err);
      }
    };
    const fetchRoles = async () => {
      try {
        const { data } = await api.get<Role[]>("/roles");
        setRoles(data);
      } catch (err) {
        toastError(err);
      }
    };
    fetchGroups();
    fetchRoles();
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      if (!userId || !open) return;
      try {
        const { data } = await api.get<UserDetail>(`/users/${userId}`);
        const userGroupIds = data.groups?.map((group: Group) => group.id) ?? [];
        const userRoleIds = data.roles?.map((role: Role) => role.id) ?? [];
        setUser((prev) => ({
          ...prev,
          name: data.name,
          email: data.email,
          groupIds: userGroupIds,
        }));
        const userQueueIds = data.queues?.map((queue: UserQueue) => queue.id) ?? [];
        setSelectedQueueIds(userQueueIds);
        setSelectedRoleIds(userRoleIds);
        setWhatsappId(data.whatsappId ? data.whatsappId : "");
      } catch (err) {
        toastError(err);
      }
    };
    fetchUser();
  }, [userId, open]);

  const handleClose = () => {
    onClose();
    setUser(INITIAL_STATE);
    setSelectedRoleIds([]);
    setSelectedQueueIds([]);
    setWhatsappId("");
  };

  const handleSaveUser = async (values: UserFormValues) => {
    const userData: UserSavePayload = {
      name: values.name,
      email: values.email,
      password: values.password,
      whatsappId: whatsappId === "" ? null : Number(whatsappId),
      queueIds: selectedQueueIds,
      roleIds: selectedRoleIds,
      groupIds: values.groupIds ?? [],
    };
    try {
      if (userId) {
        await api.put(`/users/${userId}`, userData);
      } else {
        await api.post("/users", userData);
      }
      toast.success(i18n.t("userModal.success"));
      handleClose();
    } catch (err) {
      toastError(err);
    }
  };

  return {
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
  };
}
