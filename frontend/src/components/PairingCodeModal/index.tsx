import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import api from "../../services/api";
import openSocket from "../../services/socket-io";
import toastError from "../../errors/toastError";
import { i18n } from "../../translate/i18n";

import { WhatsAppSessionSocketEvent } from "../../types/api";

interface PairingCodeModalProps {
  open: boolean;
  onClose: () => void;
  whatsAppId: number | string;
}

const PairingCodeModal = ({ open, onClose, whatsAppId }: PairingCodeModalProps) => {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [pairingCode, setPairingCode] = useState("");

  useEffect(() => {
    if (!whatsAppId || !open) return;
    const socket = openSocket();
    if (!socket) return;

    socket.on("whatsappSession", (data: WhatsAppSessionSocketEvent) => {
      if (data.action === "update" && data.session.id === whatsAppId) {
        if (data.session.pairingCode) {
          setPairingCode(data.session.pairingCode);
          setLoading(false);
        }
        if (data.session.status === "CONNECTED") onClose();
      }
    });

    return () => { socket.disconnect(); };
  }, [whatsAppId, open, onClose]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      await api.post(`/whatsappsession/${whatsAppId}`, {
        usePairingCode: true,
        phoneNumber: phoneNumber.replace(/\D/g, ""),
      });
    } catch (err) {
      toastError(err);
      setLoading(false);
    }
  };

  const handleClose = () => {
    setPairingCode("");
    setPhoneNumber("");
    setLoading(false);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) handleClose(); }}>
      <DialogContent className="max-w-xs">
        <DialogHeader>
          <DialogTitle>{i18n.t("connections.pairingCodeModal.title")}</DialogTitle>
        </DialogHeader>

        {!pairingCode ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {i18n.t("connections.pairingCodeModal.instruction")}
            </p>
            <div className="space-y-1">
              <Label htmlFor="pairing-phone">{i18n.t("connections.pairingCodeModal.phoneNumber")}</Label>
              <Input
                id="pairing-phone"
                placeholder="5511999999999"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={loading}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleGenerate}
              disabled={loading || !phoneNumber}
            >
              {loading
                ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando...</>
                : i18n.t("connections.pairingCodeModal.generate")
              }
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-4">
            <p className="text-4xl font-bold tracking-[0.15em] text-[var(--primary)]">
              {pairingCode}
            </p>
            <p className="text-sm text-muted-foreground text-center">
              {i18n.t("connections.pairingCodeModal.instructions")}
            </p>
            <Button variant="outline" onClick={handleClose}>Fechar</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default PairingCodeModal;
