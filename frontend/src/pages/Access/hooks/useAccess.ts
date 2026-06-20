import { useState, useEffect } from "react";
import api from "../../../services/api";
import toastError from "../../../errors/toastError";
import type { AccessStats } from "../accessTypes";

interface UseAccessReturn {
  stats: AccessStats;
  loading: boolean;
}

export function useAccess(): UseAccessReturn {
  const [stats, setStats] = useState<AccessStats>({
    totalRoles: 0,
    totalUsers: 0,
    usersWithoutRole: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [rolesRes, usersRes] = await Promise.all([
          api.get("/roles"),
          api.get("/users?limit=1"),
        ]);
        const roles = Array.isArray(rolesRes.data)
          ? rolesRes.data
          : rolesRes.data?.roles || [];
        const users = Array.isArray(usersRes.data)
          ? usersRes.data
          : usersRes.data?.users || [];

        setStats({
          totalRoles: roles.length,
          totalUsers: users.length,
          usersWithoutRole: users.filter(
            (u: { roleId?: string }) => !u.roleId
          ).length,
        });
      } catch (err) {
        toastError(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  return { stats, loading };
}
