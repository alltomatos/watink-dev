import React from "react";
import { User } from "../../types/domain";

const check = (user: User | undefined, action: string, _data?: unknown) => {
  const userPermissions = user?.permissions || [];
  const profile = user?.profile || user?.role;

  if (profile && ["admin", "superadmin"].includes(profile)) return true;
  if (userPermissions.includes(action)) return true;

  return false;
};

interface CanProps {
  user?: User;
  role?: string;
  perform: string;
  data?: unknown;
  yes: () => React.ReactNode;
  no?: () => React.ReactNode;
}


export const Can = ({ user, role, perform, data, yes, no = () => null }: CanProps) => {
  const effectiveUser = user || { profile: role, permissions: [] };
  return check(effectiveUser, perform, data) ? <>{yes()}</> : <>{no()}</>;
};

export default Can;
