import React from "react";
import { User } from "../../types/domain";

const check = (user: User | undefined, action: string, _data?: unknown) => {
  const userPermissions = user?.permissions || [];
  const alcance = (user as unknown as { alcance?: string })?.alcance;

  // Bypass total para o topo da hierarquia (ADR 0022) — espelha
  // business/pkg/auth/permission.go: alcance "tenant" (Gerente Geral/
  // Administrador) e "plataforma" (superadmin) veem tudo no seu escopo.
  if (alcance === "tenant" || alcance === "plataforma") return true;

  // Demais (alcance "proprio"/"setor"): decide pelo conjunto de permissões
  // "resource:action" que o backend injeta no user autenticado.
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
