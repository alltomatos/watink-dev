/* @jsxImportSource react */
import React, { useState, useContext } from "react";
import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import ConfirmationModal from "../ConfirmationModal";
import { ReplyMessageContext } from "../../context/ReplyingMessage/ReplyingMessageContext";
import toastError from "../../errors/toastError";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import { Trash2, Reply } from "lucide-react";

interface Message {
  id: number | string;
  fromMe?: boolean;
  [key: string]: unknown;
}

interface MessageOptionsMenuProps {
  message: Message;
  menuOpen: boolean;
  handleClose: () => void;
  anchorEl: HTMLElement | null;
}

const MessageOptionsMenu: React.FC<MessageOptionsMenuProps> = ({
  message,
  menuOpen,
  handleClose,
  anchorEl,
}) => {
  const { setReplyingMessage } = useContext(ReplyMessageContext);
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  const handleDeleteMessage = async () => {
    try {
      await api.delete(`/messages/${message.id}`);
    } catch (err) {
      toastError(err);
    }
  };

  const handleReplyMessage = () => {
    setReplyingMessage(message);
    handleClose();
  };

  const handleOpenConfirmationModal = () => {
    setConfirmationOpen(true);
    handleClose();
  };

  return (
    <>
      <ConfirmationModal
        title={i18n.t("messageOptionsMenu.confirmationModal.title")}
        open={confirmationOpen}
        onClose={setConfirmationOpen}
        onConfirm={handleDeleteMessage}
      >
        {i18n.t("messageOptionsMenu.confirmationModal.message")}
      </ConfirmationModal>

      <DropdownMenu open={menuOpen} onOpenChange={(open) => !open && handleClose()}>
        {/* The trigger is the anchorEl provided from outside; we use a hidden trigger */}
        <DropdownMenuTrigger asChild>
          {/* Invisible trigger — the parent component renders the actual button */}
          <span style={{ position: "fixed", top: anchorEl?.getBoundingClientRect().bottom ?? 0, left: anchorEl?.getBoundingClientRect().right ?? 0 }} />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[140px]">
          {message.fromMe && (
            <DropdownMenuItem
              className="gap-2 text-destructive focus:text-destructive"
              onClick={handleOpenConfirmationModal}
            >
              <Trash2 className="h-4 w-4" />
              {i18n.t("messageOptionsMenu.delete")}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem className="gap-2" onClick={handleReplyMessage}>
            <Reply className="h-4 w-4" />
            {i18n.t("messageOptionsMenu.reply")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
};

export default MessageOptionsMenu;
