import React from "react";
import { i18n } from "../../../translate/i18n";
import ConfirmationModal from "../../../components/ConfirmationModal";
import WhatsAppModal from "../../../components/WhatsAppModal";
import PairingCodeModal from "../../../components/PairingCodeModal";
import PhoneInputDialog from "./PhoneInputDialog";
import type { ConfirmationAction } from "../connectionConfigTypes";

interface ConnectionModalsProps {
  whatsappId: string | undefined;
  confirmationOpen: boolean;
  confirmationAction: ConfirmationAction;
  setConfirmationOpen: (v: boolean) => void;
  whatsappModalOpen: boolean;
  setWhatsAppModalOpen: (v: boolean) => void;
  pairingModalOpen: boolean;
  setPairingModalOpen: (v: boolean) => void;
  inputPairingModalOpen: boolean;
  setInputPairingModalOpen: (v: boolean) => void;
  phoneNumber: string;
  setPhoneNumber: (v: string) => void;
  pairingLoading: boolean;
  fetchWhatsapp: () => Promise<void>;
  handleDisconnect: () => Promise<void>;
  handleDelete: () => Promise<void>;
  handleRequestPairingCode: () => Promise<void>;
}

const ConnectionModals = ({
  whatsappId,
  confirmationOpen,
  confirmationAction,
  setConfirmationOpen,
  whatsappModalOpen,
  setWhatsAppModalOpen,
  pairingModalOpen,
  setPairingModalOpen,
  inputPairingModalOpen,
  setInputPairingModalOpen,
  phoneNumber,
  setPhoneNumber,
  pairingLoading,
  fetchWhatsapp,
  handleDisconnect,
  handleDelete,
  handleRequestPairingCode,
}: ConnectionModalsProps) => {
  return (
    <>
      <ConfirmationModal
        title={
          confirmationAction === "disconnect"
            ? i18n.t("connections.confirmationModal.disconnectTitle")
            : i18n.t("connections.confirmationModal.deleteTitle")
        }
        open={confirmationOpen}
        onClose={() => setConfirmationOpen(false)}
        onConfirm={confirmationAction === "disconnect" ? handleDisconnect : handleDelete}
      >
        {confirmationAction === "disconnect"
          ? i18n.t("connections.confirmationModal.disconnectMessage")
          : i18n.t("connections.confirmationModal.deleteMessage")}
      </ConfirmationModal>

      <WhatsAppModal
        open={whatsappModalOpen}
        onClose={() => {
          setWhatsAppModalOpen(false);
          void fetchWhatsapp();
        }}
        whatsAppId={whatsappId}
      />

      <PairingCodeModal
        open={pairingModalOpen}
        onClose={() => setPairingModalOpen(false)}
        whatsAppId={parseInt(whatsappId ?? "0")}
      />

      <PhoneInputDialog
        open={inputPairingModalOpen}
        onOpenChange={setInputPairingModalOpen}
        phoneNumber={phoneNumber}
        onPhoneNumberChange={setPhoneNumber}
        onConfirm={handleRequestPairingCode}
        pairingLoading={pairingLoading}
      />
    </>
  );
};

export default ConnectionModals;
