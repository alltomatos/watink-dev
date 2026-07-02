// ---------------------------------------------------------------------------
// Tipos da Central de Acessos (ADR 0022) — Usuários · Setores · Cargos.
// Espelham os contratos reais do backend (business/internal/controllers/
// setor.go, cargo.go, user.go, user_mutation.go) — NÃO adivinhados.
// ---------------------------------------------------------------------------

export const ACESSOS_TABS = ["usuarios", "setores", "cargos"] as const;
export type AcessosTab = (typeof ACESSOS_TABS)[number];

export const ALCANCE_OPTIONS = [
  { value: "proprio", label: "Próprio", description: "Só o que o usuário mesmo faz/atende" },
  { value: "setor", label: "Setor", description: "Tudo dos Setores em que é marcado Gestor" },
  { value: "tenant", label: "Tenant", description: "Todos os Setores do tenant (Gerente Geral/Administrador)" },
  { value: "plataforma", label: "Plataforma", description: "Superadmin — fora do RBAC do tenant" },
] as const;
export type Alcance = (typeof ALCANCE_OPTIONS)[number]["value"];

// ─── Cargo ──────────────────────────────────────────────────────────────────

export interface Permission {
  id: number;
  resource: string;
  action: string;
  description: string;
}

/** GET /cargos/catalog/permissions — agrupado por resource pelo backend. */
export type PermissionsCatalog = Record<string, Permission[]>;

/** GET /cargos → item de listagem (sem permissions). */
export interface CargoListItem {
  id: number;
  name: string;
  description: string;
  isSystem: boolean;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  /** Não vem da API de listagem — calculado no frontend após Show, se necessário. */
  permissionCount?: number;
}

/** GET /cargos/:cargoId → detalhe com permissions populado. */
export interface CargoDetail extends CargoListItem {
  permissions: Permission[];
}

export interface CargoSavePayload {
  name: string;
  description: string;
  /** Se ausente, backend não mexe nas permissions (PATCH parcial real). */
  permissionIds?: number[];
}

// ─── Setor ──────────────────────────────────────────────────────────────────

/** GET /setores → item de listagem. */
export interface SetorListItem {
  id: number;
  name: string;
  tenantId: string;
  memberCount: number;
  gestorCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface SetorMember {
  userId: number;
  name: string;
  email: string;
  ehGestor: boolean;
}

export interface SetorQueueLink {
  queueId: number;
  name: string;
}

/** GET /setores/:setorId → detalhe com members e queues populados. */
export interface SetorDetail {
  id: number;
  name: string;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
  members: SetorMember[];
  queues: SetorQueueLink[];
}

// ─── User ───────────────────────────────────────────────────────────────────

/** Item de GET /users → { users: [...] } (domain.User serializado). */
export interface AcessosUserListItem {
  id: number;
  name: string;
  email: string;
  whatsappId: number | null;
  tenantId: string;
  cargoId: number | null;
  alcance: Alcance | string;
  configs: string;
  createdAt: string;
  updatedAt: string;
  permissions: string[];
}

/** GET /users/:userId → detalhe enriquecido (ShowUser). */
export interface AcessosUserDetail {
  id: number;
  name: string;
  email: string;
  alcance: Alcance | string;
  whatsappId: number | null;
  tenantId: string;
  cargoId: number | null;
  configs: string;
  createdAt: string;
  updatedAt: string;
  queues?: { id: number; name: string }[];
  cargo?: { id: number; name: string };
  permissions?: {
    id: number;
    name: string;
    resource: string;
    action: string;
    description: string;
  }[];
  /** Vínculos de Setor do usuário — ShowUser já devolve (evita N+1 no client). */
  setores?: UserSetorVinculo[];
}

export interface UserSetorVinculo {
  setorId: number;
  ehGestor: boolean;
}

/** Payload de POST /users e PUT /users/:userId (parcial no PUT). */
export interface UserSavePayload {
  name?: string;
  email?: string;
  password?: string;
  alcance?: Alcance | string;
  whatsappId?: number | null;
  cargoId?: number | null;
  configs?: string;
  setores?: UserSetorVinculo[];
}
