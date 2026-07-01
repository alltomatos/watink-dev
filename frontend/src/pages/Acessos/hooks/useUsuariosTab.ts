import { useState, useEffect, useCallback } from "react";
import { toast } from "react-toastify";

import api from "../../../services/api";
import toastError from "../../../errors/toastError";
import type {
  AcessosUserDetail,
  AcessosUserListItem,
  CargoListItem,
  SetorDetail,
  SetorListItem,
  UserSavePayload,
  UserSetorVinculo,
} from "../acessosTypes";

interface UseUsuariosTabReturn {
  users: AcessosUserListItem[];
  loading: boolean;
  searchParam: string;
  handleSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
  cargos: CargoListItem[];
  setores: SetorListItem[];
  panelOpen: boolean;
  editingUser: AcessosUserDetail | null;
  editingUserSetores: UserSetorVinculo[];
  panelLoading: boolean;
  openCreate: () => void;
  openEdit: (user: AcessosUserListItem) => Promise<void>;
  closePanel: () => void;
  saveUser: (id: number | null, payload: UserSavePayload) => Promise<boolean>;
  deleteUser: (user: AcessosUserListItem) => Promise<void>;
  cargoNameById: (cargoId: number | null) => string;
}

export function useUsuariosTab(): UseUsuariosTabReturn {
  const [users, setUsers] = useState<AcessosUserListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchParam, setSearchParam] = useState("");
  const [cargos, setCargos] = useState<CargoListItem[]>([]);
  const [setores, setSetores] = useState<SetorListItem[]>([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AcessosUserDetail | null>(null);
  const [editingUserSetores, setEditingUserSetores] = useState<UserSetorVinculo[]>([]);
  const [panelLoading, setPanelLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<{ users: AcessosUserListItem[] }>("/users");
      setUsers(data.users || []);
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    const fetchAux = async () => {
      try {
        const [cargosRes, setoresRes] = await Promise.all([
          api.get<CargoListItem[]>("/cargos"),
          api.get<SetorListItem[]>("/setores"),
        ]);
        setCargos(Array.isArray(cargosRes.data) ? cargosRes.data : []);
        setSetores(Array.isArray(setoresRes.data) ? setoresRes.data : []);
      } catch (err) {
        toastError(err);
      }
    };
    fetchAux();
  }, []);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchParam(e.target.value.toLowerCase());
  };

  const openCreate = () => {
    setEditingUser(null);
    setEditingUserSetores([]);
    setPanelOpen(true);
  };

  // GET /users/:userId (ShowUser) não devolve os vínculos de Setor do usuário
  // (só queues/cargo/permissions — confirmado lendo o handler Go). Não há
  // rota própria para "setores de um usuário", então derivamos cruzando
  // GET /setores/:id de cada setor do tenant e coletando onde este userId
  // aparece em members — aceitável para o volume típico (dezenas de setores
  // por tenant), sem tocar em business/*.
  const resolveUserSetores = async (userId: number): Promise<UserSetorVinculo[]> => {
    try {
      const { data: setorList } = await api.get<SetorListItem[]>("/setores");
      const details = await Promise.all(
        (setorList || []).map((s) => api.get<SetorDetail>(`/setores/${s.id}`))
      );
      const vinculos: UserSetorVinculo[] = [];
      details.forEach(({ data }) => {
        const membership = data.members.find((m) => m.userId === userId);
        if (membership) {
          vinculos.push({ setorId: data.id, ehGestor: membership.ehGestor });
        }
      });
      return vinculos;
    } catch (err) {
      toastError(err);
      return [];
    }
  };

  const openEdit = async (user: AcessosUserListItem) => {
    setPanelOpen(true);
    setPanelLoading(true);
    try {
      const [{ data }, vinculos] = await Promise.all([
        api.get<AcessosUserDetail>(`/users/${user.id}`),
        resolveUserSetores(user.id),
      ]);
      setEditingUser(data);
      setEditingUserSetores(vinculos);
    } catch (err) {
      toastError(err);
      setPanelOpen(false);
    } finally {
      setPanelLoading(false);
    }
  };

  const closePanel = () => {
    setPanelOpen(false);
    setEditingUser(null);
    setEditingUserSetores([]);
  };

  const saveUser = async (id: number | null, payload: UserSavePayload): Promise<boolean> => {
    try {
      if (id) {
        await api.put(`/users/${id}`, payload);
        toast.success("Usuário atualizado com sucesso");
      } else {
        await api.post("/users", payload);
        toast.success("Usuário criado com sucesso");
      }
      closePanel();
      await fetchUsers();
      return true;
    } catch (err) {
      // 409 (troca de cargo do dono/último Administrador) chega aqui com a
      // mensagem real do backend — nunca fechamos o painel nem otimista.
      toastError(err);
      return false;
    }
  };

  const deleteUser = async (user: AcessosUserListItem) => {
    try {
      await api.delete(`/users/${user.id}`);
      toast.success("Usuário removido com sucesso");
      // Só recarrega a lista (nunca remove a linha otimisticamente) — se o
      // backend bloqueou com 409 (dono/último Administrador), o catch abaixo
      // impede qualquer mutação de estado local.
      await fetchUsers();
    } catch (err) {
      toastError(err);
    }
  };

  const cargoNameById = (cargoId: number | null): string => {
    if (!cargoId) return "—";
    return cargos.find((c) => c.id === cargoId)?.name ?? "—";
  };

  const filteredUsers = searchParam
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(searchParam) ||
          u.email.toLowerCase().includes(searchParam)
      )
    : users;

  return {
    users: filteredUsers,
    loading,
    searchParam,
    handleSearch,
    cargos,
    setores,
    panelOpen,
    editingUser,
    editingUserSetores,
    panelLoading,
    openCreate,
    openEdit,
    closePanel,
    saveUser,
    deleteUser,
    cargoNameById,
  };
}
