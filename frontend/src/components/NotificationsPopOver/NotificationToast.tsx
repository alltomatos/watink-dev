import React from "react";
import { Avatar } from "@/components/ui/avatar";
import { Ticket, Contact } from "../../types/Ticket";
import { Message } from "../../types/Message";

export interface NotificationToastProps {
  ticket: Ticket;
  message: Message;
  contact: Contact;
  onNavigate: (path: string) => void;
}

const NotificationToast = ({
  ticket,
  message,
  contact,
  onNavigate,
}: NotificationToastProps) => {
  const handleToastClick = () => {
    onNavigate(`/tickets/${ticket.id}`);
    window.focus();
  };

  return (
    <div
      onClick={handleToastClick}
      className="cursor-pointer flex items-center gap-3 p-1"
    >
      <Avatar
        className="w-10 h-10 shrink-0"
        src={contact.profilePicUrl}
        name={contact.name || "?"}
        isGroup={ticket.isGroup || contact.isGroup}
      />
      <div className="flex flex-col min-w-0">
        <span className="font-semibold text-sm truncate">
          {contact.name || "Contato"}
        </span>
        <span className="text-xs text-[var(--text-muted)] line-clamp-2 max-w-[220px] leading-tight">
          {message.body}
        </span>
      </div>
    </div>
  );
};

export default NotificationToast;
