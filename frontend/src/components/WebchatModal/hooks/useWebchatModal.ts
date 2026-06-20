import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import api from "../../../services/api";
import toastError from "../../../errors/toastError";
import { i18n } from "../../../translate/i18n";
import { WhatsAppData } from "../webchatModalTypes";

export const DEFAULT_WEBCHAT_BUTTON_COLOR = "var(--whatsapp-brand, var(--status-success))";

const buildInitialState = (): WhatsAppData => ({
  name: "",
  isDefault: false,
  type: "webchat",
  chatConfig: {
    buttonColor: DEFAULT_WEBCHAT_BUTTON_COLOR,
    icon: "chat",
    position: "right",
    title: "Suporte Online",
    subtitle: "Fale conosco agora",
    fields: {
      name: true,
      email: true,
      phone: false,
    },
  },
});

interface UseWebchatModalReturn {
  whatsApp: WhatsAppData;
  selectedQueueIds: number[];
  setSelectedQueueIds: (ids: number[]) => void;
  handleSaveWhatsApp: (values: WhatsAppData) => Promise<void>;
  handleClose: () => void;
}

export function useWebchatModal(
  open: boolean,
  whatsAppId: number | undefined,
  onClose: () => void,
  onSaved?: () => Promise<void>
): UseWebchatModalReturn {
  const [whatsApp, setWhatsApp] = useState<WhatsAppData>(buildInitialState());
  const [selectedQueueIds, setSelectedQueueIds] = useState<number[]>([]);

  useEffect(() => {
    const fetchSession = async () => {
      if (!whatsAppId) {
        setWhatsApp(buildInitialState());
        setSelectedQueueIds([]);
        return;
      }

      try {
        const { data } = await api.get(`whatsapp/${whatsAppId}`);
        if (!data.chatConfig) {
          data.chatConfig = buildInitialState().chatConfig;
        }
        setWhatsApp(data);

        const whatsQueueIds = data.queues?.map((queue: { id: number }) => queue.id) || [];
        setSelectedQueueIds(whatsQueueIds);
      } catch (err) {
        toastError(err);
      }
    };

    if (open) {
      fetchSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [whatsAppId, open]);

  const handleSaveWhatsApp = async (values: WhatsAppData) => {
    const whatsappData = { ...values, queueIds: selectedQueueIds, type: "webchat" };

    try {
      if (whatsAppId) {
        await api.put(`/whatsapp/${whatsAppId}`, whatsappData);
      } else {
        await api.post("/whatsapp", whatsappData);
      }
      toast.success(i18n.t("whatsappModal.success"));
      if (onSaved) {
        await onSaved();
      }
      onClose();
    } catch (err) {
      toastError(err);
    }
  };

  const handleClose = () => {
    onClose();
    setWhatsApp(buildInitialState());
    setSelectedQueueIds([]);
  };

  return {
    whatsApp,
    selectedQueueIds,
    setSelectedQueueIds,
    handleSaveWhatsApp,
    handleClose,
  };
}
