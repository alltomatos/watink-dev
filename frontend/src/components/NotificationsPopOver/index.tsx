import React, { useState, useRef, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "react-toastify";
import openSocket from "../../services/socket-io";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Avatar } from "@/components/ui/avatar";

import TicketListItem from "../TicketListItem";
import { i18n } from "../../translate/i18n";
import { useTickets } from "../../hooks/useTickets";
import alertSound from "../../assets/sound.mp3";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Ticket, Contact } from "../../types/Ticket";
import { Message } from "../../types/Message";

/* ─── Notification Toast ───────────────────────────────────────────── */
interface NotificationToastProps {
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
      <Avatar className="w-10 h-10 shrink-0" src={contact.profilePicUrl} name={contact.name || "?"} />
      <div className="flex flex-col min-w-0">
        <span className="font-semibold text-sm truncate">
          {contact.name || "Contato"}
        </span>
        <span
          className="text-xs text-[var(--text-muted)] line-clamp-2 max-w-[220px] leading-tight"
        >
          {message.body}
        </span>
      </div>
    </div>
  );
};

/* ─── NotificationsPopOver ─────────────────────────────────────────── */
const NotificationsPopOver = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const ticketIdUrl = +window.location.pathname.split("/")[2];
  const ticketIdRef = useRef(ticketIdUrl);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Ticket[]>([]);
  const [, setDesktopNotifications] = useState<Notification[]>([]);

  const { data: ticketsData } = useTickets({ withUnreadMessages: "true" });
  const tickets = ticketsData?.tickets;
  const soundAlertRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const audio = new Audio(alertSound);
    audio.preload = "auto";
    soundAlertRef.current = () => {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    };

    if (!("Notification" in window)) {
      console.log("This browser doesn't support notifications");
    } else {
      Notification.requestPermission();
    }

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  useEffect(() => {
    setNotifications(tickets ?? []);
  }, [tickets]);

  useEffect(() => {
    ticketIdRef.current = ticketIdUrl;
  }, [ticketIdUrl]);

  useEffect(() => {
    const socket = openSocket();
    if (!socket) return;

    socket.on("connect", () => socket.emit("joinNotification"));

    socket.on("ticket", (data: { action: string; ticketId: number }) => {
      if (data.action === "updateUnread" || data.action === "delete") {
        setNotifications((prevState) => {
          const ticketIndex = prevState.findIndex((t) => t.id === data.ticketId);
          if (ticketIndex !== -1) {
            prevState.splice(ticketIndex, 1);
            return [...prevState];
          }
          return prevState;
        });

        setDesktopNotifications((prevState) => {
          const notfIndex = prevState.findIndex(
            (n) => n.tag === String(data.ticketId)
          );
          if (notfIndex !== -1) {
            prevState[notfIndex].close();
            prevState.splice(notfIndex, 1);
            return [...prevState];
          }
          return prevState;
        });
      }
    });

    socket.on("appMessage", (data: { action: string; message: Message; ticket: Ticket; contact: Contact }) => {
      if (
        data.action === "create" &&
        !data.message.read &&
        (data.ticket.userId === user?.id || !data.ticket.userId)
      ) {
        setNotifications((prevState) => {
          const ticketIndex = prevState.findIndex((t) => t.id === data.ticket.id);
          if (ticketIndex !== -1) {
            prevState[ticketIndex] = data.ticket;
            return [...prevState];
          }
          return [data.ticket, ...prevState];
        });

        const shouldNotNotificate =
          (data.message.ticketId === ticketIdRef.current &&
            document.visibilityState === "visible") ||
          (data.ticket.userId && data.ticket.userId !== user?.id) ||
          data.ticket.isGroup;

        if (shouldNotNotificate) return;

        handleNotifications(data);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [user]);

  const handleNotifications = (data: { message: Message; ticket: Ticket; contact: Contact }) => {
    const { message, contact, ticket } = data;

    const options: NotificationOptions & { renotify?: boolean } = {
      body: `${message.body} - ${format(new Date(), "HH:mm")}`,
      icon: contact.profilePicUrl,
      tag: String(ticket.id),
      renotify: true,
    };

    const notification = new Notification(
      `${i18n.t("tickets.notification.message")} ${contact.name}`,
      options
    );

    notification.onclick = (e) => {
      e.preventDefault();
      window.focus();
      navigate(`/tickets/${ticket.id}`);
    };

    setDesktopNotifications((prevState) => {
      const notfIndex = prevState.findIndex((n) => n.tag === notification.tag);
      if (notfIndex !== -1) {
        prevState[notfIndex] = notification;
        return [...prevState];
      }
      return [notification, ...prevState];
    });

    soundAlertRef.current?.();

    toast(
      <NotificationToast
        ticket={ticket}
        message={message}
        contact={contact}
        onNavigate={navigate}
      />,
      {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      }
    );
  };

  const count = notifications?.length ?? 0;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open Notifications" className="relative">
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
