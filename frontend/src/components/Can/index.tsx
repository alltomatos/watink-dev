import React from "react";

const check = (user: any, action: string, _data?: any) => {
  const userPermissions = user?.permissions || [];
  const profile = user?.profile || user?.role;

  if (["admin", "superadmin"].includes(profile)) return true;
  if (userPermissions.includes(action)) return true;

  return false;
};

interface CanProps {
  user?: any;
  role?: string;
  perform: string;
  data?: any;
  yes: () => React.ReactNode;
  no?: () => React.ReactNode;
}

export const Can = ({ user, role, perform, data, yes, no = () => null }: CanProps) => {
  const effectiveUser = user || { profile: role, permissions: [] };
  return check(effectiveUser, perform, data) ? <>{yes()}</> : <>{no()}</>;
};

export default Can;
