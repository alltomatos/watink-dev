import { useEffect, useState } from "react";
import api from "../../../services/api";
import type { Protocol } from "../publicProtocolTypes";

interface UsePublicProtocolResult {
  protocol: Protocol | null;
  loading: boolean;
}

export function usePublicProtocol(token: string | undefined): UsePublicProtocolResult {
  const [protocol, setProtocol] = useState<Protocol | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProtocol = async () => {
      try {
        const { data } = await api.get<Protocol>(`/public/protocols/${token}`);
        setProtocol(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProtocol();
  }, [token]);

  return { protocol, loading };
}
