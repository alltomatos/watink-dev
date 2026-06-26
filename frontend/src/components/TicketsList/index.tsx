import React, { useEffect, useContext, useMemo } from "react";
import { subscribeToSocket } from "../../services/sse-client";
import { useQueryClient } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import TicketListItem from "../TicketListItem";
import TicketsListSkeleton from "../TicketsListSkeleton";
import { useTicketsInfinite } from "../../hooks/useTicketsInfinite";
import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";
import type { Ticket } from "../../types/Ticket";

interface TicketsListProps {
  status?: string;
  searchParam?: string;
  showAll?: boolean;
  selectedQueueIds?: number[];
  updateCount?: (count: number) => void;
  style?: React.CSSProperties;
  isGroup?: string;
  withUnreadMessages?: string;
  tags?: number[];
}

interface TicketShape {
  id: number;
  userId?: number;
  queueId?: number;
  isGroup?: boolean;
  contact?: {
    id?: number;
    name?: string;
    number?: string;
    profilePicUrl?: string;
    isGroup?: boolean;
  };
}

const TicketsList: React.FC<TicketsListProps> = (props) => {
  const {
    status,
    searchParam,
    showAll,
    selectedQueueIds = [],
    updateCount,
    style,
    isGroup,
    withUnreadMessages,
  } = props;

  const { user } = useContext(AuthContext);
  const queryClient = useQueryClient();

  const params = useMemo(
    () => ({
      searchParam,
      status,
      showAll,
      queueIds: JSON.stringify(selectedQueueIds),
      isGroup,
      withUnreadMessages,
    }),
    [searchParam, status, showAll, selectedQueueIds, isGroup, withUnreadMessages]
  );

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useTicketsInfinite(params);

  const tickets = useMemo<TicketShape[]>(
    () => data?.pages.flatMap((page: { tickets: TicketShape[] }) => page.tickets) ?? [],
    [data]
  );

  useEffect(() => {
    if (typeof updateCount === "function") {
      updateCount(tickets.length);
    }
  }, [tickets.length, updateCount]);

  useEffect(() => {
    const queryKey = ["tickets", params];

    const shouldUpdateTicket = (ticket: TicketShape) => {
      const ticketIsGroup =
        ticket.contact?.isGroup ||
        ticket.contact?.number?.includes("g.us") ||
        ticket.isGroup;
      // isGroup undefined → no group filter (mostra ambos); "true"/"false" filtram.
      const groupMatch =
        isGroup === undefined || isGroup === ""
          ? true
          : isGroup === "true"
          ? ticketIsGroup
          : !ticketIsGroup;
      return (
        !searchParam &&
        (!ticket.userId || ticket.userId === user?.id || showAll) &&
        (!ticket.queueId || selectedQueueIds.indexOf(ticket.queueId) > -1) &&
        groupMatch
      );
    };

    const handleAppMessage = (data: { action: string; ticket?: TicketShape & { status?: string }; contact?: TicketShape["contact"] }) => {
      if (data.action !== "create" || !data.ticket) return;
      const ticket = data.contact ? { ...data.ticket, contact: data.contact } : data.ticket;
      // Só insere/sobe se o status do ticket bate com o filtro desta lista
      if (status && ticket.status && ticket.status !== status) return;
      if (!shouldUpdateTicket(ticket)) return;
      queryClient.setQueryData(queryKey, (oldData: { pages: { tickets: TicketShape[] }[] } | undefined) => {
        if (!oldData || oldData.pages.length === 0) return oldData;
        const pages = oldData.pages.map((page) => ({
          ...page,
          tickets: page.tickets.filter((t) => t.id !== ticket.id),
        }));
        pages[0] = { ...pages[0], tickets: [ticket, ...pages[0].tickets] };
        return { ...oldData, pages };
      });
    };

    const handleTicket = (data: { action: string; ticket?: TicketShape & { status?: string }; contact?: TicketShape["contact"]; ticketId?: number }) => {
      if (data.action === "update" && data.ticket) {
        const ticket = data.contact ? { ...data.ticket, contact: data.contact } : data.ticket;
        // Se esta lista filtra por status e o ticket mudou para outro status, remove-o da lista
        if (status && ticket.status && ticket.status !== status) {
          queryClient.setQueryData(queryKey, (oldData: { pages: { tickets: TicketShape[] }[] } | undefined) => {
            if (!oldData) return oldData;
            return { ...oldData, pages: oldData.pages.map((page) => ({ ...page, tickets: page.tickets.filter((t) => t.id !== ticket.id) })) };
          });
          return;
        }
        if (shouldUpdateTicket(ticket)) {
          queryClient.setQueryData(queryKey, (oldData: { pages: { tickets: TicketShape[] }[] } | undefined) => {
            if (!oldData || oldData.pages.length === 0) return oldData;
            // Faz merge com dados existentes para não perder contact/foto quando o
            // payload é parcial (ex: message_send envia só {id, lastMessage, updatedAt}).
            let existing: TicketShape | undefined;
            const pages = oldData.pages.map((page) => ({
              ...page,
              tickets: page.tickets.filter((t) => {
                if (t.id === ticket.id) { existing = t; return false; }
                return true;
              }),
            }));
            const merged = existing ? { ...existing, ...ticket } : ticket;
            pages[0] = { ...pages[0], tickets: [merged, ...pages[0].tickets] };
            return { ...oldData, pages };
          });
        }
      } else if (data.action === "delete") {
        queryClient.setQueryData(queryKey, (oldData: { pages: { tickets: TicketShape[] }[] } | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              tickets: page.tickets.filter((t) => t.id !== data.ticketId),
            })),
          };
        });
      }
    };

    return subscribeToSocket({ ticket: handleTicket, appMessage: handleAppMessage }, (socket) => {
      if (status) socket.emit("joinTickets", status);
      else socket.emit("joinNotification");
    });
  }, [params, user, queryClient, status, searchParam, showAll, selectedQueueIds, isGroup]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!hasNextPage || isFetchingNextPage || isLoading) return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - (scrollTop + 100) < clientHeight) {
      fetchNextPage();
    }
  };

  return (
    /* Outer wrapper — full height, column flex, clips overflow */
    <div
      className={cn(
        "relative flex h-full flex-col overflow-hidden",
        "bg-transparent"
      )}
      style={style}
    >
      {/* Scrollable ticket list */}
      <div
        className={cn(
          "flex-1 overflow-y-auto py-4",
          "scrollbar-thin scrollbar-thumb-[var(--border-subtle)] scrollbar-track-transparent",
          "bg-transparent"
        )}
        onScroll={handleScroll}
      >
        {tickets.length === 0 && !isLoading ? (
          <div className="mx-10 flex h-[100px] flex-col items-center justify-center gap-1">
            <p className="m-0 text-center text-base font-semibold text-foreground">
              {i18n.t("ticketsList.noTicketsTitle")}
            </p>
            <p className="text-center text-sm leading-snug text-[var(--muted-foreground)]">
              {i18n.t("ticketsList.noTicketsMessage")}
            </p>
          </div>
        ) : (
          <>
            {tickets.map((ticket) => (
              // TicketListItem already typed – cast required because tickets
              // here is the minimal TicketShape, the full Ticket shape is
              // enforced inside TicketListItem itself.
              <TicketListItem ticket={ticket as unknown as Ticket} key={ticket.id} />
            ))}
            {isFetchingNextPage && <TicketsListSkeleton />}
          </>
        )}
        {isLoading && <TicketsListSkeleton />}
      </div>
    </div>
  );
};

export default TicketsList;
