import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { useParams, useNavigate } from "react-router-dom";

import api from "../../../services/api";
import { i18n } from "../../../translate/i18n";
import toastError from "../../../errors/toastError";
import { UserFormValues, Role, Permission } from "../userEditTypes";

const initialState: UserFormValues = {
  name: "",
  email: "",
  password: "",
  profile: "user",
  roleId: "",
};

interface UseUserEditReturn {
  userId: string | undefined;
  isNew: boolean;
  user: UserFormValues;
  selectedQueueIds: string[];
  setSelectedQueueIds: React.Dispatch<React.SetStateAction<string[]>>;
  showPassword: boolean;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
  whatsappId: string;
  setWhatsappId: React.Dispatch<React.SetStateAction<string>>;
  roles: Role[];
  allPermissions: Permission[];
  selectedPermissions: string[];
  loading: boolean;
  handleSaveUser: (values: UserFormValues) => Promise<void>;
  togglePermission: (permissionId: string) => void;
}

export function useUserEdit(): UseUserEditReturn {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const isNew = userId === "new";

  const [user, setUser] = useState<UserFormValues>(initialState);
  const [selectedQueueIds, setSelectedQueueIds] = useState<string[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [whatsappId, setWhatsappId] = useState<string>("");
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const requests: Promise<unknown>[] = [
          api.get("/roles"),
          api.get("/permissions"),
        ];
        if (!isNew) requests.push(api.get(`/users/${userId}`));

        const responses = await Promise.all(requests);
        const [rolesRes, permissionsRes, userRes] = responses as [
          { data: Role[] | { roles: Role[] } },
          { data: Permission[] },
          {
            data: {
              queues?: { id: string }[];
              whatsappId?: string;
              permissions?: { id: string }[];
              name: string;
              email: string;
              profile: string;
              roleId?: string;
            };
          } | undefined,
        ];

        setRoles(
          Array.isArray(rolesRes.data)
            ? rolesRes.data
            : (rolesRes.data as { roles: Role[] }).roles || []
        );
        setAllPermissions(permissionsRes.data);

        if (!isNew && userRes) {
          const data = userRes.data;
          setSelectedQueueIds(data.queues?.map((q) => String(q.id)) || []);
          setWhatsappId(String(data.whatsappId || ""));
          setSelectedPermissions(
            (data.permissions || []).map((p) => String(p.id || p))
          );
          setUser({
            name: data.name || "",
            email: data.email || "",
            password: "",
            profile: data.profile || "user",
            roleId: String(data.roleId || ""),
          });
        }
      } catch (err) {
        toastError(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [userId, isNew]);

  const handleSaveUser = async (values: UserFormValues) => {
    const userData = {
      ...values,
      whatsappId,
      queueIds: selectedQueueIds,
      permissionIds: selectedPermissions,
      permissions: selectedPermissions,
    };
    try {
      if (isNew) {
        await api.post("/users", userData);
      } else {
        await api.put(`/users/${userId}`, userData);
      }
      toast.success(i18n.t("userModal.success"));
      navigate("/users");
    } catch (err) {
      toastError(err);
    }
  };

  const togglePermission = (permissionId: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(permissionId)
        ? prev.filter((id) => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  return {
    userId,
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
  };
}
