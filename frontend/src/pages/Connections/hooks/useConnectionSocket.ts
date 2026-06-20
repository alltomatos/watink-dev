import { useEffect } from "react";
import openSocket from "../../../services/socket-io";
import type { WhatsApp } from "../connectionConfigTypes";

interface UseConnectionSocketParams {
  whatsappId: string | undefined;
  fetchWhatsapp: () => Promise<void>;
  setWhatsapp: React.Dispatch<React.SetStateAction<WhatsApp | null>>;
  setShowQrCode: (v: boolean) => void;
  setShowPairingInput: (v: boolean) => void;
  setConnecting: (v: boolean) => void;
  setRestarting: (v: boolean) => void;
  setPairingCode: (v: string) => void;
  setPairingLoading: (v: boolean) => void;
  setPhoneNumber: (v: string) => void;
}

export const useConnectionSocket = ({
  whatsappId,
  fetchWhatsapp,
  setWhatsapp,
  setShowQrCode,
  setShowPairingInput,
  setConnecting,
  setRestarting,
  setPairingCode,
  setPairingLoading,
  setPhoneNumber,
}: UseConnectionSocketParams): void => {
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
  }, [
    whatsappId,
    fetchWhatsapp,
    setWhatsapp,
    setShowQrCode,
    setShowPairingInput,
    setConnecting,
    setRestarting,
    setPairingCode,
    setPairingLoading,
    setPhoneNumber,
  ]);
};
