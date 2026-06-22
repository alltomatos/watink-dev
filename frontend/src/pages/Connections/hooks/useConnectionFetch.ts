import { useState, useCallback, useEffect, type Dispatch, type SetStateAction } from "react";

import api from "../../../services/api";
import toastError from "../../../errors/toastError";

import type { WhatsApp, Stats } from "../connectionConfigTypes";

export interface UseConnectionFetchReturn {
  whatsapp: WhatsApp | null;
  setWhatsapp: Dispatch<SetStateAction<WhatsApp | null>>;
  loading: boolean;
  stats: Stats | null;
  fetchWhatsapp: () => Promise<void>;
}

export const useConnectionFetch = (
  whatsappId: string | undefined,
): UseConnectionFetchReturn => {
  const [whatsapp, setWhatsapp] = useState<WhatsApp | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);

  const isConnected = whatsapp?.status === "CONNECTED";

  const fetchWhatsapp = useCallback(async () => {
    try {
      const { data } = await api.get(`/whatsapp/${whatsappId}`);
      setWhatsapp(data as WhatsApp);
      setLoading(false);
    } catch (err: unknown) {
      toastError(err);
    }
  }, [whatsappId]);

  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get(`/whatsapp/${whatsappId}/stats`);
      setStats(data as Stats);
    } catch {
      // stats are best-effort — never block the page
    }
  }, [whatsappId]);

  useEffect(() => {
    fetchWhatsapp();
  }, [fetchWhatsapp]);

  useEffect(() => {
    if (isConnected) fetchStats();
  }, [isConnected, fetchStats]);

  return { whatsapp, setWhatsapp, loading, stats, fetchWhatsapp };
};
