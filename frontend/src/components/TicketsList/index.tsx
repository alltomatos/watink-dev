import React, { useEffect, useContext, useMemo } from "react";
import openSocket from "../../services/socket-io";
import { useQueryClient } from "@tanstack/react-query";

import { cn } from "@/lib/utils";
import TicketListItem from "../TicketListItem";
import TicketsListSkeleton from "../TicketsListSkeleton";
import { useTicketsInfinite } from "../../hooks/useTicketsInfinite";
import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";

interface TicketsListProps {
  status?: string;
  searchParam?: string;
  showAll?: boolean;
  selectedQueueIds?: number[];
  updateCount?: (count: number) => void;
  style?: React.CSSProperties;
  isGroup?: string;
  tags?: any[];
}

interface TicketShape {
  id: number;
  userId?: number;
  queueId?: number;
  isGroup?: boolean;
  contact?: {
    isGroup?: boolean;
    number?: string;
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
    }),
    [searchParam, status, showAll, selectedQueueIds, isGroup]
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
    const socket = openSocket();
    if (!socket) return;
    const queryKey = ["tickets", params];

    const shouldUpdateTicket = (ticket: TicketShape) => {
      const ticketIsGroup =
        ticket.contact?.isGroup ||
        ticket.contact?.number?.includes("g.us") ||
        ticket.isGroup;
      const groupMatch = isGroup === "true" ? ticketIsGroup : !ticketIsGroup;
      return (
        !searchParam &&
        (!ticket.userId || ticket.userId === user?.id || showAll) &&
        (!ticket.queueId || selectedQueueIds.indexOf(ticket.queueId) > -1) &&
        groupMatch
      );
    };

    socket.on("connect", () => {
      if (status) socket.emit("joinTickets", status);
      else socket.emit("joinNotification");
    });

    socket.on("ticket", (data: { action: string; ticket?: TicketShape; ticketId?: number }) => {
      if (data.action === "update" && data.ticket && shouldUpdateTicket(data.ticket)) {
        queryClient.setQueryData(queryKey, (oldData: { pages: { tickets: TicketShape[] }[] } | undefined) => {
          if (!oldData) return oldData;
          return {
            ...oldData,
            pages: oldData.pages.map((page) => ({
              ...page,
              tickets: page.tickets.map((t) =>
                t.id === data.ticket!.id ? data.ticket! : t
              ),
            })),
          };
        });
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
    });

    return () => {
      socket.disconnect();
    };
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
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              <TicketListItem ticket={ticket as any} key={ticket.id} />
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
