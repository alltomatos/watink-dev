import React from "react";

import ConfirmationModal from "../../../components/ConfirmationModal";
import WhatsAppModal from "../../../components/WhatsAppModal";
import PairingCodeModal from "../../../components/PairingCodeModal";
import { i18n } from "../../../translate/i18n";

import PhoneInputDialog from "./PhoneInputDialog";
import type { ConfirmationAction } from "../connectionConfigTypes";

interface ConnectionModalsProps {
  whatsappId: string | undefined;
  confirmationOpen: boolean;
  confirmationAction: ConfirmationAction;
  onCloseConfirmation: () => void;
  onDisconnect: () => Promise<void>;
  onDelete: () => Promise<void>;
  whatsappModalOpen: boolean;
  onCloseWhatsAppModal: () => void;
  pairingModalOpen: boolean;
  onClosePairingModal: () => void;
  inputPairingModalOpen: boolean;
  onOpenChangePairingInput: (v: boolean) => void;
  phoneNumber: string;
  onPhoneNumberChange: (v: string) => void;
  onConfirmPairing: () => Promise<void>;
  pairingLoading: boolean;
}

const ConnectionModals = ({
  whatsappId,
  confirmationOpen,
  confirmationAction,
  onCloseConfirmation,
  onDisconnect,
  onDelete,
  whatsappModalOpen,
  onCloseWhatsAppModal,
  pairingModalOpen,
  onClosePairingModal,
  inputPairingModalOpen,
  onOpenChangePairingInput,
  phoneNumber,
  onPhoneNumberChange,
  onConfirmPairing,
  pairingLoading,
}: ConnectionModalsProps) => (
  <>
    <ConfirmationModal
      title={
        confirmationAction === "disconnect"
          ? i18n.t("connections.confirmationModal.disconnectTitle")
          : i18n.t("connections.confirmationModal.deleteTitle")
      }
      open={confirmationOpen}
      onClose={onCloseConfirmation}
      onConfirm={confirmationAction === "disconnect" ? onDisconnect : onDelete}
    >
      {confirmationAction === "disconnect"
        ? i18n.t("connections.confirmationModal.disconnectMessage")
        : i18n.t("connections.confirmationModal.deleteMessage")}
    </ConfirmationModal>

    <WhatsAppModal
      open={whatsappModalOpen}
      onClose={onCloseWhatsAppModal}
      whatsAppId={whatsappId}
    />

    <PairingCodeModal
      open={pairingModalOpen}
      onClose={onClosePairingModal}
      whatsAppId={parseInt(whatsappId ?? "0")}
    />

    <PhoneInputDialog
      open={inputPairingModalOpen}
      onOpenChange={onOpenChangePairingInput}
      phoneNumber={phoneNumber}
      onPhoneNumberChange={onPhoneNumberChange}
      onConfirm={onConfirmPairing}
      pairingLoading={pairingLoading}
    />
  </>
);

export default ConnectionModals;
