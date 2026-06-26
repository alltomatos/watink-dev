import { useState, useEffect, useReducer, useCallback } from "react";
import { subscribeToSocket } from "../../services/sse-client";
import toastError from "../../errors/toastError";
import api from "../../services/api";

export interface WhatsApp {
  id: number;
  name: string;
  status: string;
  updatedAt?: string;
  qrcode?: string;
  retries?: number;
  [key: string]: unknown;
}

type WhatsAppAction =
  | { type: "LOAD_WHATSAPPS"; payload: WhatsApp[] }
  | { type: "UPDATE_WHATSAPPS"; payload: WhatsApp }
  | { type: "UPDATE_SESSION"; payload: Partial<WhatsApp> & { id: number } }
  | { type: "DELETE_WHATSAPPS"; payload: number }
  | { type: "RESET" };

function reducer(state: WhatsApp[], action: WhatsAppAction): WhatsApp[] {
  switch (action.type) {
    case "LOAD_WHATSAPPS":
      return [...action.payload];

    case "UPDATE_WHATSAPPS": {
      const idx = state.findIndex((s) => s.id === action.payload.id);
      if (idx !== -1) {
        const next = [...state];
        next[idx] = action.payload;
        return next;
      }
      return [action.payload, ...state];
    }

    case "UPDATE_SESSION": {
      const idx = state.findIndex((s) => s.id === action.payload.id);
      if (idx !== -1) {
        const next = [...state];
        next[idx] = { ...next[idx], ...action.payload };
        return next;
      }
      return state;
    }

    case "DELETE_WHATSAPPS": {
      return state.filter((s) => s.id !== action.payload);
    }

    case "RESET":
      return [];

    default:
      return state;
  }
}

interface UseWhatsAppsResult {
  whatsApps: WhatsApp[];
  loading: boolean;
  reloadWhatsApps: () => Promise<void>;
}

const useWhatsApps = (): UseWhatsAppsResult => {
  const [whatsApps, dispatch] = useReducer(reducer, []);
  const [loading, setLoading] = useState(true);

  const reloadWhatsApps = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<WhatsApp[]>("/whatsapp/");
      dispatch({ type: "LOAD_WHATSAPPS", payload: data });
    } catch (err) {
      toastError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reloadWhatsApps();
  }, [reloadWhatsApps]);

  useEffect(() => {
    const handleWhatsapp = (data: { action: string; whatsapp?: WhatsApp; whatsappId?: number }) => {
      if (data.action === "update" && data.whatsapp) {
        dispatch({ type: "UPDATE_WHATSAPPS", payload: data.whatsapp });
      }
      if (data.action === "delete" && data.whatsappId) {
        dispatch({ type: "DELETE_WHATSAPPS", payload: data.whatsappId });
      }
    };

    const handleSession = (data: {
      action: string;
      session?: Partial<WhatsApp> & { id: number };
    }) => {
      if (data.action === "update" && data.session) {
        dispatch({ type: "UPDATE_SESSION", payload: data.session });
      }
    };

    return subscribeToSocket({
      whatsapp: handleWhatsapp,
      whatsappSession: handleSession,
    });
  }, []);

  return { whatsApps, loading, reloadWhatsApps };
};

export default useWhatsApps;
