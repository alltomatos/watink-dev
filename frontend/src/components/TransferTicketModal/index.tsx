import React from "react";
import { Loader2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

import { i18n } from "../../translate/i18n";
import { Can } from "../Can";

import { useTransferTicketModal } from "./hooks/useTransferTicketModal";
import { UserSearchField } from "./components/UserSearchField";
import { QueueSelect } from "./components/QueueSelect";
import { WhatsappSelect } from "./components/WhatsappSelect";
import type { TransferTicketModalProps } from "./transferTicketModalTypes";

const TransferTicketModal = ({
  modalOpen,
  onClose,
  ticketid,
  ticketWhatsappId,
}: TransferTicketModalProps) => {
  const {
    options,
    queues,
    loading,
    loadingWhatsapps,
    whatsApps,
    loggedInUser,
    searchParam,
    selectedUser,
    selectedQueue,
    selectedWhatsapp,
    isSubmitDisabled,
    handleClose,
    handleSaveTicket,
    handleSelectUser,
    handleSearchChange,
    setSelectedQueue,
    setSelectedWhatsapp,
  } = useTransferTicketModal({ modalOpen, onClose, ticketid, ticketWhatsappId });

  return (
    <Dialog
      open={modalOpen}
      onOpenChange={(open) => {
        if (!open) handleClose();
      }}
    >
      <DialogContent className="max-w-md">
        <form onSubmit={handleSaveTicket} className="space-y-6">
          <DialogHeader>
            <DialogTitle>{i18n.t("transferTicketModal.title")}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <UserSearchField
              searchParam={searchParam}
              loading={loading}
              options={options}
              selectedUser={selectedUser}
              onSearchChange={handleSearchChange}
              onSelectUser={handleSelectUser}
            />

            <QueueSelect
              queues={queues}
              selectedQueue={selectedQueue}
              onValueChange={setSelectedQueue}
            />

            <Can
              role={loggedInUser.profile}
              perform="ticket-options:transferWhatsapp"
              yes={() =>
                !loadingWhatsapps && (
                  <WhatsappSelect
                    whatsApps={whatsApps}
                    selectedWhatsapp={selectedWhatsapp}
                    onValueChange={setSelectedWhatsapp}
                  />
                )
              }
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              {i18n.t("transferTicketModal.buttons.cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitDisabled}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {i18n.t("transferTicketModal.buttons.ok")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TransferTicketModal;
