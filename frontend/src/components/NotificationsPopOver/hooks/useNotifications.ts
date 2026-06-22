import { useState, useRef, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "react-toastify";
import React from "react";

import openSocket from "../../../services/socket-io";
import { i18n } from "../../../translate/i18n";
import alertSound from "../../../assets/sound.mp3";
import { AuthContext } from "../../../context/Auth/AuthContext";
import { useTickets } from "../../../hooks/useTickets";
import { Ticket, Contact } from "../../../types/Ticket";
import { Message } from "../../../types/Message";
import NotificationToast from "../NotificationToast";

export interface UseNotificationsReturn {
  notifications: Ticket[];
}

export function useNotifications(): UseNotificationsReturn {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const ticketIdUrl = +window.location.pathname.split("/")[2];
  const ticketIdRef = useRef(ticketIdUrl);

  const [notifications, setNotifications] = useState<Ticket[]>([]);
  const [, setDesktopNotifications] = useState<Notification[]>([]);

  const { data: ticketsData } = useTickets({ withUnreadMessages: "true" });
  const tickets = ticketsData?.tickets;

  const soundAlertRef = useRef<(() => void) | null>(null);

  // Inicializa áudio e permissão de notificação desktop
  useEffect(() => {
    const audio = new Audio(alertSound);
    audio.preload = "auto";
    soundAlertRef.current = () => {
      audio.currentTime = 0;
      audio.play().catch(() => {});
    };

    if ("Notification" in window) {
      Notification.requestPermission();
    }

    return () => {
      audio.pause();
      audio.src = "";
    };
  }, []);

  // Sincroniza tickets com mensagens não lidas como notificações iniciais
  useEffect(() => {
    setNotifications(tickets ?? []);
  }, [tickets]);

  // Mantém ref atualizada com o ticketId atual da URL
  useEffect(() => {
    ticketIdRef.current = ticketIdUrl;
  }, [ticketIdUrl]);

  const handleNotifications = (data: {
    message: Message;
    ticket: Ticket;
    contact: Contact;
  }) => {
    const { message, contact, ticket } = data;

    const options: NotificationOptions & { renotify?: boolean } = {
      body: `${message.body} - ${format(new Date(), "HH:mm")}`,
      icon: contact.profilePicUrl,
      tag: String(ticket.id),
      renotify: true,
    };

    soundAlertRef.current?.();

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

    toast(
      React.createElement(NotificationToast, {
        ticket,
        message,
        contact,
        onNavigate: navigate,
      }),
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

  // Conexão socket: sala "notification", handlers de ticket e appMessage
  useEffect(() => {
    const socket = openSocket();
    if (!socket) return;

    const onTicket = (data: { action: string; ticketId: number }) => {
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
    };

    const onAppMessage = (data: {
        action: string;
        message: Message;
        ticket: Ticket;
        contact: Contact;
      }) => {
        if (!data.ticket || !data.message || !data.contact) return;
        const notifyGroups = localStorage.getItem("notifyGroups") !== "false";

        if (
          data.action === "create" &&
          !data.message.read &&
          (data.ticket.userId === user?.id || !data.ticket.userId)
        ) {
          setNotifications((prevState) => {
            const ticketIndex = prevState.findIndex(
              (t) => t.id === data.ticket.id
            );
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
            (data.ticket.isGroup && !notifyGroups);

          if (shouldNotNotificate) return;

          handleNotifications(data);
        }
    };

    socket.on("ticket", onTicket);
    socket.on("appMessage", onAppMessage);

    return () => {
      socket.off("ticket", onTicket);
      socket.off("appMessage", onAppMessage);
    };
    // handleNotifications é definida acima e recriada a cada render; user é o gatilho real
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return { notifications };
}
