import React, { useEffect, useState } from "react";
import QRCode from "qrcode.react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import openSocket from "../../services/socket-io";
import toastError from "../../errors/toastError";

interface QrcodeModalProps {
  open: boolean;
  onClose: () => void;
  whatsAppId: number | string;
}

const QrcodeModal = ({ open, onClose, whatsAppId }: QrcodeModalProps) => {
  const [qrCode, setQrCode] = useState("");

  useEffect(() => {
    if (!whatsAppId) return;
    const fetchSession = async () => {
      try {
        const { data } = await api.get(`/whatsapp/${whatsAppId}`);
        setQrCode(data.qrcode);
      } catch (err) {
        toastError(err);
      }
    };
    fetchSession();
  }, [whatsAppId]);

  useEffect(() => {
    if (!whatsAppId) return;
    const socket = openSocket();

    socket.on("whatsappSession", (data: any) => {
      if (data.action === "update" && data.session.id === whatsAppId) {
        setQrCode(data.session.qrcode);
      }
      if (data.action === "update" && data.session.qrcode === "") {
        onClose();
      }
    });

    return () => { socket.disconnect(); };
  }, [whatsAppId, onClose]);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{i18n.t("qrCode.message")}</DialogTitle>
        </DialogHeader>
        <div className="flex items-center justify-center py-4">
          {qrCode
            ? <QRCode value={qrCode} size={256} />
            : <span className="text-muted-foreground text-sm">Aguardando QR Code...</span>
          }
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default React.memo(QrcodeModal);
