import React from "react";

import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { i18n } from "../../translate/i18n";
import { getBackendUrl } from "../../helpers/urlUtils";

interface Contact {
  name: string;
  profilePicUrl?: string | null;
  isGroup?: boolean;
}

interface TicketUser {
  name: string;
}

interface Ticket {
  id: number;
  user?: TicketUser | null;
}

interface TicketInfoProps {
  contact: Contact;
  ticket: Ticket;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

const TicketInfo: React.FC<TicketInfoProps> = ({ contact, ticket, onClick }) => {
  const assignedTo =
    ticket.user
      ? `${i18n.t("messagesList.header.assignedTo")} ${ticket.user.name}`
      : null;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && onClick) {
          onClick(e as unknown as React.MouseEvent<HTMLDivElement>);
        }
      }}
      className={cn(
        "flex min-w-0 flex-1 cursor-pointer items-center gap-3 px-3 py-2"
      )}
    >
      <Avatar
        src={contact.profilePicUrl ? getBackendUrl(contact.profilePicUrl) : null}
        name={contact.name}
        size="md"
        isGroup={contact.isGroup}
        aria-label={contact.name}
      />

      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-semibold leading-tight text-foreground">
          {contact.name} #{ticket.id}
        </span>
        {assignedTo && (
          <span className="truncate text-xs text-muted-foreground">
            {assignedTo}
          </span>
        )}
      </div>
    </div>
  );
};

export default TicketInfo;
