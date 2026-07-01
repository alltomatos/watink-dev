import { useState, useEffect } from "react";
import { toast } from "react-toastify";

import { i18n } from "../../../translate/i18n";
import api from "../../../services/api";
import toastError from "../../../errors/toastError";
import useWhatsApps from "../../../hooks/useWhatsApps";
import type { UserFormValues, UserSavePayload, UserDetail, UserQueue } from "../userModalTypes";

const INITIAL_STATE: UserFormValues = {
  name: "",
  email: "",
  password: "",
};

interface UseUserModalReturn {
  user: UserFormValues;
  selectedQueueIds: number[];
  setSelectedQueueIds: React.Dispatch<React.SetStateAction<number[]>>;
  showPassword: boolean;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
  whatsappId: number | string;
  setWhatsappId: React.Dispatch<React.SetStateAction<number | string>>;
  whatsApps: ReturnType<typeof useWhatsApps>["whatsApps"];
  whatsAppsLoading: boolean;
  handleClose: () => void;
  handleSaveUser: (values: UserFormValues) => Promise<void>;
}

/**
 * Modal usado hoje só para o usuário logado editar o PRÓPRIO perfil (avatar
 * do topo → "Meu perfil", ver layout/MainLayout.tsx), sempre com userId
 * definido — nunca criação solta. A gestão de Cargo/Setor/Alcance de
 * terceiros vive na Central de Acessos (pages/Acessos), não aqui.
 *
 * Não busca /groups nem /roles: essas rotas foram removidas do backend no
 * ADR 0022 (RBAC Cargo/Setor/Alcance) — o dropdown de Cargo teria que ir por
 * /cargos, mas trocar o próprio cargo é ação de risco de lockout que já tem
 * um fluxo dedicado (Central de Acessos → aba Usuários), então este modal
 * fica só com os campos de perfil básico (nome/email/senha/fila/whatsapp).
 */
export function useUserModal(
  userId: number | string | undefined,
  open: boolean,
  onClose: () => void
): UseUserModalReturn {
  const [user, setUser] = useState<UserFormValues>(INITIAL_STATE);
  const [selectedQueueIds, setSelectedQueueIds] = useState<number[]>([]);
  const [showPassword, setShowPassword] = useState(false);
  const [whatsappId, setWhatsappId] = useState<number | string>("");
  const { loading: whatsAppsLoading, whatsApps } = useWhatsApps();

  useEffect(() => {
    const fetchUser = async () => {
      if (!userId || !open) return;
      try {
        const { data } = await api.get<UserDetail>(`/users/${userId}`);
        setUser((prev) => ({
          ...prev,
          name: data.name,
          email: data.email,
        }));
        const userQueueIds = data.queues?.map((queue: UserQueue) => queue.id) ?? [];
        setSelectedQueueIds(userQueueIds);
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
    setSelectedQueueIds([]);
    setWhatsappId("");
  };

  const handleSaveUser = async (values: UserFormValues) => {
    const userData: UserSavePayload = {
      name: values.name,
      email: values.email,
      whatsappId: whatsappId === "" ? null : Number(whatsappId),
    };
    if (values.password) userData.password = values.password;
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
    whatsApps,
    whatsAppsLoading,
    handleClose,
    handleSaveUser,
  };
}
