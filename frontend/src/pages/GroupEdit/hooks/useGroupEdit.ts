import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import * as Yup from "yup";

import api from "../../../services/api";
import toastError from "../../../errors/toastError";
import { i18n } from "../../../translate/i18n";
import type { Permission, GroupUser, GroupFormValues } from "../groupEditTypes";

export const GroupSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, "Nome muito curto!")
    .max(50, "Nome muito longo!")
    .required("Nome é obrigatório"),
});

export interface UseGroupEditReturn {
  isNew: boolean;
  loading: boolean;
  saving: boolean;
  group: GroupFormValues;
  allPermissions: Permission[];
  allUsers: GroupUser[];
  selectedPermissions: string[];
  setSelectedPermissions: (ids: string[]) => void;
  groupUsers: GroupUser[];
  userSearchTerm: string;
  setUserSearchTerm: (v: string) => void;
  addUserDialogOpen: boolean;
  setAddUserDialogOpen: (v: boolean) => void;
  availableUserSearch: string;
  setAvailableUserSearch: (v: string) => void;
  filteredGroupUsers: GroupUser[];
  availableUsers: GroupUser[];
  handleSave: (values: GroupFormValues) => Promise<void>;
  handleRemoveUser: (userId: string) => void;
  handleAddUser: (user: GroupUser) => void;
  navigate: ReturnType<typeof useNavigate>;
}

export function useGroupEdit(): UseGroupEditReturn {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const isNew = groupId === "new";

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [group, setGroup] = useState<GroupFormValues>({ name: "", permissions: [], users: [] });
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [allUsers, setAllUsers] = useState<GroupUser[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [groupUsers, setGroupUsers] = useState<GroupUser[]>([]);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [addUserDialogOpen, setAddUserDialogOpen] = useState(false);
  const [availableUserSearch, setAvailableUserSearch] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const requests: Promise<unknown>[] = [
          api.get("/permissions"),
          api.get("/users"),
        ];
        if (!isNew) requests.unshift(api.get(`/groups/${groupId}`));

        const responses = await Promise.all(requests);

        if (isNew) {
          const [permissionsRes, usersRes] = responses as [
            { data: Permission[] },
            { data: GroupUser[] | { users: GroupUser[] } },
          ];
          setAllPermissions(permissionsRes.data);
          setAllUsers(
            Array.isArray(usersRes.data)
              ? usersRes.data
              : (usersRes.data as { users: GroupUser[] }).users || []
          );
        } else {
          const [groupRes, permissionsRes, usersRes] = responses as [
            { data: GroupFormValues & { users?: GroupUser[]; permissions?: Permission[] } },
            { data: Permission[] },
            { data: GroupUser[] | { users: GroupUser[] } },
          ];
          setGroup(groupRes.data);
          setSelectedPermissions(groupRes.data.permissions?.map((p) => p.id) || []);
          setGroupUsers(groupRes.data.users || []);
          setAllPermissions(permissionsRes.data);
          setAllUsers(
            Array.isArray(usersRes.data)
              ? usersRes.data
              : (usersRes.data as { users: GroupUser[] }).users || []
          );
        }
      } catch (err) {
        toastError(err);
        navigate("/groups");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [groupId, isNew, navigate]);

  const handleSave = async (values: GroupFormValues) => {
    setSaving(true);
    try {
      const groupData = {
        name: values.name,
        permissions: selectedPermissions,
        userIds: groupUsers.map((u) => u.id),
      };
      if (isNew) {
        await api.post("/groups", groupData);
        toast.success(i18n.t("groupModal.success"));
        navigate("/groups");
      } else {
        await api.put(`/groups/${groupId}`, groupData);
        toast.success(i18n.t("groupModal.success"));
      }
    } catch (err) {
      toastError(err);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveUser = (userId: string) => {
    setGroupUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleAddUser = (user: GroupUser) => {
    if (!groupUsers.find((u) => u.id === user.id)) {
      setGroupUsers((prev) => [...prev, user]);
    }
    setAddUserDialogOpen(false);
    setAvailableUserSearch("");
  };

  const filteredGroupUsers = groupUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(userSearchTerm.toLowerCase())
  );

  const availableUsers = allUsers.filter(
    (u) =>
      !groupUsers.find((gu) => gu.id === u.id) &&
      (u.name.toLowerCase().includes(availableUserSearch.toLowerCase()) ||
        u.email?.toLowerCase().includes(availableUserSearch.toLowerCase()))
  );

  return {
    isNew,
    loading,
    saving,
    group,
    allPermissions,
    allUsers,
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
  };
}
