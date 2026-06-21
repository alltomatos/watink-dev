import React, { useState } from "react";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import TicketListItem from "../TicketListItem";
import { i18n } from "../../translate/i18n";
import { useNotifications } from "./hooks/useNotifications";

const NotificationsPopOver = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications } = useNotifications();
  const count = notifications.length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open Notifications"
          className="relative"
        >
          <MessageSquare className="w-5 h-5" />
          {count > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
              {count > 99 ? "99+" : count}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-[350px] max-sm:w-[270px] p-0"
      >
        <ul className="max-h-[350px] overflow-y-auto divide-y divide-[var(--border-divider)]">
          {count === 0 ? (
            <li className="px-4 py-3 text-sm text-[var(--text-muted)]">
              {i18n.t("notifications.noTickets")}
            </li>
          ) : (
            notifications.map((ticket) => (
              <li key={ticket.id} onClick={() => setIsOpen(false)}>
                <TicketListItem ticket={ticket} />
              </li>
            ))
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationsPopOver;
