import { useContext, useEffect, useState, useCallback } from "react";

import { AuthContext } from "../../../context/Auth/AuthContext";
import api from "../../../services/api";
import type { SetorListItem } from "../../Acessos/acessosTypes";

const DISMISSED_KEY = "watink_onboarding_checklist_dismissed";

interface AcessosUsersResponse {
  users: unknown[];
}

export interface UseOnboardingChecklistReturn {
  /** Alcance do usuário logado — só "tenant"/"plataforma" veem o checklist. */
  canSeeChecklist: boolean;
  loading: boolean;
  setorDone: boolean;
  userDone: boolean;
  /** true quando ambos os itens já foram concluídos — card deve sumir. */
  allDone: boolean;
  dismissed: boolean;
  dismiss: () => void;
}

/**
 * Estado do card de Onboarding Checklist (GAP-C) — 100% DERIVADO em tempo
 * real via contagem de Setores/Users do tenant. NUNCA persiste uma flag de
 * "onboarding completo" no backend (ver docs/agents/onboarding.md).
 */
export function useOnboardingChecklist(): UseOnboardingChecklistReturn {
  const { user } = useContext(AuthContext);
  const alcance = (user as unknown as { alcance?: string })?.alcance;
  const canSeeChecklist = alcance === "tenant" || alcance === "plataforma";

  const [loading, setLoading] = useState(true);
  const [setorDone, setSetorDone] = useState(false);
  const [userDone, setUserDone] = useState(false);
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(DISMISSED_KEY) === "true";
    } catch {
      return false;
    }
  });

  const fetchCounts = useCallback(async () => {
    if (!canSeeChecklist) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [setoresRes, usersRes] = await Promise.all([
        api.get<SetorListItem[]>("/setores"),
        api.get<AcessosUsersResponse>("/users"),
      ]);
      const setorCount = Array.isArray(setoresRes.data) ? setoresRes.data.length : 0;
      const userCount = Array.isArray(usersRes.data?.users) ? usersRes.data.users.length : 0;
      setSetorDone(setorCount > 1);
      setUserDone(userCount > 1);
    } catch {
      // Falha silenciosa — o checklist é dispensável e não deve travar o
      // Dashboard nem exibir erro. Mantém o estado anterior (assume pendente).
    } finally {
      setLoading(false);
    }
  }, [canSeeChecklist]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISSED_KEY, "true");
    } catch {
      // sessionStorage indisponível (modo privado etc.) — ainda assim
      // escondemos o card nesta sessão via estado local.
    }
    setDismissed(true);
  };

  return {
    canSeeChecklist,
    loading,
    setorDone,
    userDone,
    allDone: setorDone && userDone,
    dismissed,
    dismiss,
  };
}
