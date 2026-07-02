import React, { useContext, useEffect, useRef, useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import ConfirmationModal from "../ConfirmationModal";
import TransferTicketModal from "../TransferTicketModal";
import toastError from "../../errors/toastError";
import { Can } from "../Can";
import { AuthContext } from "../../context/Auth/AuthContext";

interface Ticket {
  id: number;
  whatsappId?: number;
  contact: {
    name: string;
  };
}

interface TicketOptionsMenuProps {
  ticket: Ticket;
  /** Controls the open state of the dropdown from the parent trigger. */
  menuOpen: boolean;
  handleClose: () => void;
}

const TicketOptionsMenu: React.FC<TicketOptionsMenuProps> = ({
  ticket,
  menuOpen,
  handleClose,
}) => {
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [transferTicketModalOpen, setTransferTicketModalOpen] = useState(false);
  const isMounted = useRef(true);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);

  const handleDeleteTicket = async () => {
    try {
      await api.delete(`/tickets/${ticket.id}`);
    } catch (err) {
      toastError(err);
    }
  };

  const handleOpenConfirmationModal = () => {
    setConfirmationOpen(true);
    handleClose();
  };

  const handleOpenTransferModal = () => {
    setTransferTicketModalOpen(true);
    handleClose();
  };

  const handleCloseTransferTicketModal = () => {
    if (isMounted.current) {
      setTransferTicketModalOpen(false);
    }
  };

  return (
    <>
      {/*
        DropdownMenu is opened programmatically via `open` + `onOpenChange`.
        The trigger is the MoreVertical button rendered in TicketActionButtons,
        so we use `modal={false}` to avoid Radix trying to manage focus of
        a trigger it does not own, and keep the menu anchored to the viewport.
      */}
      <DropdownMenu open={menuOpen} onOpenChange={(open) => !open && handleClose()} modal={false}>
        {/* No <DropdownMenuTrigger> here — parent controls open state */}
        <DropdownMenuContent align="end" side="bottom">
          <DropdownMenuItem onClick={handleOpenTransferModal}>
            {i18n.t("ticketOptionsMenu.transfer")}
          </DropdownMenuItem>

          <Can
            user={user}
            perform="tickets:delete"
            yes={() => (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={handleOpenConfirmationModal}
              >
                {i18n.t("ticketOptionsMenu.delete")}
              </DropdownMenuItem>
            )}
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <ConfirmationModal
        title={`${i18n.t("ticketOptionsMenu.confirmationModal.title")}${ticket.id} ${i18n.t(
          "ticketOptionsMenu.confirmationModal.titleFrom"
        )} ${ticket.contact?.name ?? ""}?`}
        open={confirmationOpen}
        onClose={setConfirmationOpen}
        onConfirm={handleDeleteTicket}
      >
        {i18n.t("ticketOptionsMenu.confirmationModal.message")}
      </ConfirmationModal>

      <TransferTicketModal
        modalOpen={transferTicketModalOpen}
        onClose={handleCloseTransferTicketModal}
        ticketid={ticket.id}
        ticketWhatsappId={ticket.whatsappId}
      />
    </>
  );
};

export default TicketOptionsMenu;
