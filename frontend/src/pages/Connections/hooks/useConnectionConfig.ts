import { useState, useCallback, useContext, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import api from "../../../services/api";
import toastError from "../../../errors/toastError";
import { i18n } from "../../../translate/i18n";
import openSocket from "../../../services/socket-io";
import { WhatsAppsContext } from "../../../context/WhatsApp/WhatsAppsContext";

import type { Stats, WhatsApp, ConfirmationAction } from "../connectionConfigTypes";

export interface UseConnectionConfigReturn {
  whatsappId: string | undefined;
  whatsapp: WhatsApp | null;
  loading: boolean;
  stats: Stats | null;
  keepAliveSaving: boolean;
  status: string;
  isConnected: boolean;
  isBusy: boolean;
  connecting: boolean;
  restarting: boolean;
  pairingModalOpen: boolean;
  setPairingModalOpen: (v: boolean) => void;
  whatsappModalOpen: boolean;
  setWhatsAppModalOpen: (v: boolean) => void;
  confirmationOpen: boolean;
  setConfirmationOpen: (v: boolean) => void;
  confirmationAction: ConfirmationAction;
  setConfirmationAction: (v: ConfirmationAction) => void;
  phoneNumber: string;
  setPhoneNumber: (v: string) => void;
  pairingCode: string;
  pairingLoading: boolean;
  showPairingInput: boolean;
  setShowPairingInput: (v: boolean) => void;
  showQrCode: boolean;
  inputPairingModalOpen: boolean;
  setInputPairingModalOpen: (v: boolean) => void;
  fetchWhatsapp: () => Promise<void>;
  handleStartSessionQr: () => Promise<void>;
  handleRestart: () => Promise<void>;
  handleRequestPairingCode: () => Promise<void>;
  handleDisconnect: () => Promise<void>;
  handleDelete: () => Promise<void>;
  handleToggleKeepAlive: (next: boolean) => Promise<void>;
  handleCancelPairing: () => void;
}

export const useConnectionConfig = (): UseConnectionConfigReturn => {
  const navigate = useNavigate();
  const { whatsappId } = useParams<{ whatsappId: string }>();
  const { reloadWhatsApps } = useContext(WhatsAppsContext);

  const [whatsapp, setWhatsapp] = useState<WhatsApp | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<Stats | null>(null);
  const [keepAliveSaving, setKeepAliveSaving] = useState(false);

  const [pairingModalOpen, setPairingModalOpen] = useState(false);
  const [whatsappModalOpen, setWhatsAppModalOpen] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [confirmationAction, setConfirmationAction] = useState<ConfirmationAction>(null);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [pairingCode, setPairingCode] = useState("");
  const [pairingLoading, setPairingLoading] = useState(false);
  const [showPairingInput, setShowPairingInput] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [inputPairingModalOpen, setInputPairingModalOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [restarting, setRestarting] = useState(false);

  const status: string = whatsapp?.status ?? "DISCONNECTED";
  const isConnected = status === "CONNECTED";
  const isBusy = status === "OPENING" || status === "PAIRING";

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

  useEffect(() => {
    const socket = openSocket();
    if (!socket) return;

    socket.on("whatsappSession", (data: { action: string; session: WhatsApp & { id: number } }) => {
      if (data.action === "update" && data.session.id === parseInt(whatsappId ?? "0")) {
        setWhatsapp((prev) => prev ? { ...prev, ...data.session } : (data.session as WhatsApp));

        if (data.session.status === "QRCODE") {
          setShowQrCode(true);
          setShowPairingInput(false);
          setConnecting(false);
          if (!data.session.qrcode) void fetchWhatsapp();
        }

        if (data.session.pairingCode) {
          setPairingCode(data.session.pairingCode);
          setPairingLoading(false);
        }

        if (["CONNECTED", "QRCODE", "PAIRING", "DISCONNECTED", "TIMEOUT"].includes(data.session.status)) {
          setConnecting(false);
          setRestarting(false);
        }

        if (data.session.status === "CONNECTED") {
          setShowPairingInput(false);
          setShowQrCode(false);
          setPairingCode("");
          setPhoneNumber("");
          setPairingLoading(false);
          void fetchWhatsapp();
        }

        if (data.session.status === "DISCONNECTED" || data.session.status === "TIMEOUT") {
          setShowQrCode(false);
          setShowPairingInput(false);
          setPairingLoading(false);
        }
      }
    });

    socket.on("whatsapp", (data: { action: string; whatsapp: WhatsApp & { id: number } }) => {
      if (data.action === "update" && data.whatsapp.id === parseInt(whatsappId ?? "0")) {
        setWhatsapp((prev) => prev ? { ...prev, ...data.whatsapp } : (data.whatsapp as WhatsApp));
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [whatsappId, fetchWhatsapp]);

  const handleStartSessionQr = async () => {
    if (isConnected || isBusy || connecting) return;
    try {
      setConnecting(true);
      setShowPairingInput(false);
      setShowQrCode(true);
      await api.post(`/whatsappsession/${whatsappId}`, { usePairingCode: false });
      await fetchWhatsapp();
    } catch (err: unknown) {
      toastError(err);
      setConnecting(false);
    }
  };

  const handleRestart = async () => {
    if (restarting) return;
    try {
      setRestarting(true);
      await api.put(`/whatsappsession/${whatsappId}`);
    } catch (err: unknown) {
      toastError(err);
      setRestarting(false);
    }
  };

  const handleRequestPairingCode = async () => {
    if (!phoneNumber || phoneNumber.length < 10) {
      toastError({ response: { data: { message: "Número de telefone inválido" } } } as never);
      return;
    }
    setPairingLoading(true);
    setPairingCode("");
    setShowPairingInput(true);
    setInputPairingModalOpen(false);
    try {
      await api.post(`/whatsappsession/${whatsappId}`, {
        usePairingCode: true,
        phoneNumber: phoneNumber.replace(/\D/g, ""),
      });
    } catch (err: unknown) {
      toastError(err);
      setPairingLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await api.delete(`/whatsappsession/${whatsappId}`);
      await fetchWhatsapp();
    } catch (err: unknown) {
      toastError(err);
    }
    setConfirmationOpen(false);
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/whatsapp/${whatsappId}`);
      await reloadWhatsApps();
      navigate("/connections");
    } catch (err: unknown) {
      toastError(err);
    }
    setConfirmationOpen(false);
  };

  const handleToggleKeepAlive = async (next: boolean) => {
    setKeepAliveSaving(true);
    setWhatsapp((prev) => prev ? { ...prev, keepAlive: next } : prev);
    try {
      await api.put(`/whatsapp/${whatsappId}/keepalive`, { keepAlive: next });
      toast.success(i18n.t("connections.toasts.keepAliveUpdated") as string);
    } catch (err: unknown) {
      setWhatsapp((prev) => prev ? { ...prev, keepAlive: !next } : prev);
      toastError(err);
    } finally {
      setKeepAliveSaving(false);
    }
  };

  const handleCancelPairing = () => {
    setShowPairingInput(false);
    setPairingCode("");
    setPhoneNumber("");
    setPairingLoading(false);
  };

  return {
    whatsappId,
    whatsapp,
    loading,
    stats,
    keepAliveSaving,
    status,
    isConnected,
    isBusy,
    connecting,
    restarting,
    pairingModalOpen,
    setPairingModalOpen,
    whatsappModalOpen,
    setWhatsAppModalOpen,
    confirmationOpen,
    setConfirmationOpen,
    confirmationAction,
    setConfirmationAction,
    phoneNumber,
    setPhoneNumber,
    pairingCode,
    pairingLoading,
    showPairingInput,
    setShowPairingInput,
    showQrCode,
    inputPairingModalOpen,
    setInputPairingModalOpen,
    fetchWhatsapp,
    handleStartSessionQr,
    handleRestart,
    handleRequestPairingCode,
    handleDisconnect,
    handleDelete,
    handleToggleKeepAlive,
    handleCancelPairing,
  };
};
