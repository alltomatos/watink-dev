import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import api from "../../../services/api";
import toastError from "../../../errors/toastError";
import { i18n } from "../../../translate/i18n";
import { Permission, RoleFormValues } from "../roleEditTypes";

interface UseRoleEditReturn {
  roleId: string | undefined;
  isNew: boolean;
  loading: boolean;
  saving: boolean;
  role: RoleFormValues;
  allPermissions: Permission[];
  selectedPermissions: string[];
  setSelectedPermissions: (ids: string[]) => void;
  handleSave: (values: RoleFormValues) => Promise<void>;
  navigate: ReturnType<typeof useNavigate>;
}

export function useRoleEdit(): UseRoleEditReturn {
  const { roleId } = useParams<{ roleId: string }>();
  const navigate = useNavigate();
  const isNew = roleId === "new";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<RoleFormValues>({ name: "", description: "", permissions: [] });
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const requests: Promise<unknown>[] = [api.get("/permissions")];
        if (!isNew) requests.push(api.get(`/roles/${roleId}`));

        const responses = await Promise.all(requests);
        const [permissionsRes, roleRes] = responses as [
          { data: Permission[] },
          { data: RoleFormValues } | undefined,
        ];

        setAllPermissions(permissionsRes.data);

        if (!isNew && roleRes) {
          setRole(roleRes.data);
          const perms = roleRes.data.permissions || roleRes.data.RolePermissions || [];
          setSelectedPermissions(perms.map((p) => String(p.permissionId || p.id)));
        }
      } catch (err) {
        toastError(err);
        navigate("/roles");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [roleId, isNew, navigate]);

  const handleSave = async (values: RoleFormValues) => {
    setSaving(true);
    try {
      const roleData = {
        name: values.name,
        description: values.description,
        permissionIds: selectedPermissions,
        permissions: selectedPermissions,
      };
      if (isNew) {
        await api.post("/roles", roleData);
      } else {
        await api.put(`/roles/${roleId}`, roleData);
      }
      toast.success(i18n.t("role.success"));
      navigate("/roles");
    } catch (err) {
      toastError(err);
    } finally {
      setSaving(false);
    }
  };

  return {
    roleId,
    isNew,
    loading,
    saving,
    role,
    allPermissions,
    selectedPermissions,
    setSelectedPermissions,
    handleSave,
    navigate,
  };
}
