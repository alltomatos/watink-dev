import { useState, useEffect, useCallback } from "react";
import api from "../services/api";

export interface DealStage {
  id: number;
  name: string;
}

export interface DealPipeline {
  id: number;
  name: string;
}

export interface Deal {
  id: number;
  name: string;
  value: number;
  status: string;
  stageId: number;
  contactId: number;
  ticketId?: number;
  stage?: DealStage & { pipeline?: DealPipeline };
  pipeline?: DealPipeline;
}

interface UseDealsParams {
  ticketId?: number;
  pipelineId?: number;
}

export function useDeals({ ticketId, pipelineId }: UseDealsParams) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!ticketId && !pipelineId) return;
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (ticketId) params.ticketId = String(ticketId);
      else if (pipelineId) params.pipelineId = String(pipelineId);
      const { data } = await api.get<{ deals: Deal[] }>("/deals", { params });
      setDeals(data.deals ?? []);
    } catch {
      setDeals([]);
    } finally {
      setLoading(false);
    }
  }, [ticketId, pipelineId]);

  useEffect(() => { fetch(); }, [fetch]);

  return { deals, loading, refetch: fetch };
}
