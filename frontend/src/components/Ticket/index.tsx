import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

import { cn } from "@/lib/utils";
import openSocket from "../../services/socket-io";
import ContactDrawer from "../ContactDrawer";
import MessageInput from "../MessageInput/";
import TicketHeader from "../TicketHeader";
import TicketInfo from "../TicketInfo";
import TicketActionButtons from "../TicketActionButtons";
import MessagesList from "../MessagesList";
import api from "../../services/api";
import { ReplyMessageProvider } from "../../context/ReplyingMessage/ReplyingMessageContext";
import toastError from "../../errors/toastError";

interface Contact {
  id?: number;
  name: string;
  profilePicUrl?: string | null;
  isGroup?: boolean;
  number?: string;
}

interface WhatsApp {
  name?: string;
  status?: string;
}

interface TicketUser {
  id: number;
  name: string;
}

interface TicketData {
  id: number;
  status: "open" | "closed" | "pending";
  isGroup?: boolean;
  whatsappId?: number;
  contact: Contact;
  user?: TicketUser | null;
  whatsapp?: WhatsApp;
}

const DRAWER_WIDTH = 320;

const Ticket: React.FC = () => {
  const { ticketId } = useParams<{ ticketId: string }>();
  const navigate = useNavigate();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contact, setContact] = useState<Contact>({} as Contact);
  const [ticket, setTicket] = useState<TicketData>({} as TicketData);

  useEffect(() => {
    setLoading(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const { data } = await api.get(`/tickets/${ticketId}`);
        setContact(data.contact);
        setTicket(data);
      } catch (err) {
        toastError(err);
      } finally {
        setLoading(false);
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [ticketId]);

  useEffect(() => {
    const socket = openSocket();
    if (!socket) return;

    socket.on("connect", () => socket.emit("joinChatBox", ticketId));

    socket.on("ticket", (data: { action: string; ticket?: TicketData }) => {
      if (data.action === "update" && data.ticket) {
        setTicket(data.ticket);
      }
      if (data.action === "delete") {
        toast.success("Ticket deleted sucessfully.");
        navigate("/tickets");
      }
    });

    socket.on("contact", (data: { action: string; contact?: Contact }) => {
      if (data.action === "update" && data.contact) {
        setContact((prev) => {
          if (prev.id === data.contact!.id) {
            return { ...prev, ...data.contact };
          }
          return prev;
        });
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [ticketId, navigate]);

  const handleDrawerOpen = () => setDrawerOpen(true);
  const handleDrawerClose = () => setDrawerOpen(false);

  return (
    <div className="relative flex h-full overflow-hidden" id="drawer-container">
      {/* Main panel — shifts left when the contact drawer is open */}
      <div
        className={cn(
          "flex flex-1 flex-col overflow-hidden",
          "border-l-0 rounded-tl-none rounded-bl-none",
          "transition-[margin] duration-[225ms] ease-in-out",
          drawerOpen
            ? "mr-0 transition-[margin] duration-[195ms] ease-out"
            : `mr-[-${DRAWER_WIDTH}px]`
        )}
        style={{
          marginRight: drawerOpen ? 0 : -DRAWER_WIDTH,
        }}
      >
        <TicketHeader loading={loading}>
          {/* Left: contact info (up to 50% width, 80% on mobile) */}
          <div className="max-w-[80%] basis-[80%] md:max-w-[50%] md:basis-[50%]">
            <TicketInfo
              contact={contact}
              ticket={ticket}
              onClick={handleDrawerOpen}
            />
          </div>

          {/* Right: action buttons (up to 50% width, 100% on mobile) */}
          <div className="flex max-w-full basis-full mb-[5px] md:max-w-[50%] md:basis-[50%] md:mb-0">
            <TicketActionButtons ticket={ticket} />
          </div>
        </TicketHeader>

        <ReplyMessageProvider>
          <MessagesList ticketId={ticketId} isGroup={ticket.isGroup} />
          <MessageInput
            ticketStatus={ticket.status}
            whatsappStatus={ticket.whatsapp?.status}
          />
        </ReplyMessageProvider>
      </div>

      <ContactDrawer
        open={drawerOpen}
        handleDrawerClose={handleDrawerClose}
        contact={contact}
        ticketId={ticketId}
        loading={loading}
      />
    </div>
  );
};

export default Ticket;
