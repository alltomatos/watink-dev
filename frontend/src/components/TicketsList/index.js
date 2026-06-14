import React, { useEffect, useContext, useMemo } from "react";
import openSocket from "../../services/socket-io";
import { makeStyles } from "@material-ui/core/styles";
import List from "@material-ui/core/List";
import PaperCard from "../PaperCard";
import TicketListItem from "../TicketListItem";
import TicketsListSkeleton from "../TicketsListSkeleton";
import { useTicketsInfinite } from "../../hooks/useTicketsInfinite";
import { i18n } from "../../translate/i18n";
import { AuthContext } from "../../context/Auth/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

const useStyles = makeStyles(theme => ({
	ticketsListWrapper: {
		position: "relative",
		display: "flex",
		height: "100%",
		flexDirection: "column",
		overflow: "hidden",
		borderTopRightRadius: 0,
		borderBottomRightRadius: 0,
		backgroundColor: "transparent",
	},
	ticketsList: {
		flex: 1,
		overflowY: "scroll",
		...theme.scrollbarStyles,
		padding: "16px 0",
		background: "transparent",
	},
	noTicketsText: {
		textAlign: "center",
		color: "rgb(104, 121, 146)",
		fontSize: "14px",
		lineHeight: "1.4",
	},
	noTicketsTitle: {
		textAlign: "center",
		fontSize: "16px",
		fontWeight: "600",
		margin: "0px",
	},
	noTicketsDiv: {
		display: "flex",
		height: "100px",
		margin: 40,
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
	},
}));

const TicketsList = (props) => {
	const { status, searchParam, showAll, selectedQueueIds, updateCount, style, isGroup } = props;
	const classes = useStyles();
	const { user } = useContext(AuthContext);
	const queryClient = useQueryClient();

	const params = useMemo(() => ({
		searchParam,
		status,
		showAll,
		queueIds: JSON.stringify(selectedQueueIds),
		isGroup
	}), [searchParam, status, showAll, selectedQueueIds, isGroup]);

	const { data, fetchNextPage, hasNextPage, isFetchingNextPage, status: queryStatus, isLoading } = useTicketsInfinite(params);

	const tickets = useMemo(() => {
		return data?.pages.flatMap(page => page.tickets) || [];
	}, [data]);

	useEffect(() => {
		if (typeof updateCount === "function") {
			const count = tickets.length;
			updateCount(count);
		}
	}, [tickets.length, updateCount]);

	useEffect(() => {
		const socket = openSocket();
		const queryKey = ["tickets", params];

		const shouldUpdateTicket = ticket => {
			const ticketIsGroup = ticket.contact?.isGroup || ticket.contact?.number?.includes("g.us") || ticket.isGroup;
			const groupMatch = isGroup === "true" ? ticketIsGroup : !ticketIsGroup;
			return !searchParam &&
				(!ticket.userId || ticket.userId === user?.id || showAll) &&
				(!ticket.queueId || selectedQueueIds.indexOf(ticket.queueId) > -1) &&
				groupMatch;
		};

		socket.on("connect", () => {
			if (status) socket.emit("joinTickets", status);
			else socket.emit("joinNotification");
		});

		socket.on("ticket", data => {
			if (data.action === "update" && shouldUpdateTicket(data.ticket)) {
				queryClient.setQueryData(queryKey, (oldData) => {
					if (!oldData) return oldData;
					return {
						...oldData,
						pages: oldData.pages.map(page => ({
							...page,
							tickets: page.tickets.map(t => t.id === data.ticket.id ? data.ticket : t)
						}))
					};
				});
			} else if (data.action === "delete") {
				queryClient.setQueryData(queryKey, (oldData) => {
					if (!oldData) return oldData;
					return {
						...oldData,
						pages: oldData.pages.map(page => ({
							...page,
							tickets: page.tickets.filter(t => t.id !== data.ticketId)
						}))
					};
				});
			}
		});

		return () => {
			socket.disconnect();
		};
	}, [params, user, queryClient, status, searchParam, showAll, selectedQueueIds, isGroup]);

	const handleScroll = e => {
		if (!hasNextPage || isFetchingNextPage || isLoading) return;
		const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
		if (scrollHeight - (scrollTop + 100) < clientHeight) {
			fetchNextPage();
		}
	};

	return (
		<PaperCard variant="flush" padding="none" className={classes.ticketsListWrapper} style={style}>
			<PaperCard
				variant="flush"
				padding="none"
				name="closed"
				className={classes.ticketsList}
				onScroll={handleScroll}
			>
				<List style={{ paddingTop: 0 }}>
					{tickets.length === 0 && !isLoading ? (
						<div className={classes.noTicketsDiv}>
							<span className={classes.noTicketsTitle}>{i18n.t("ticketsList.noTicketsTitle")}</span>
							<p className={classes.noTicketsText}>{i18n.t("ticketsList.noTicketsMessage")}</p>
						</div>
					) : (
						<>
							{tickets.map(ticket => (
								<TicketListItem ticket={ticket} key={ticket.id} />
							))}
							{isFetchingNextPage && <TicketsListSkeleton />}
						</>
					)}
					{isLoading && <TicketsListSkeleton />}
				</List>
			</PaperCard>
		</PaperCard>
	);
};

export default TicketsList;
