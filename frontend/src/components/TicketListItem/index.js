/* @jsxImportSource react */
import React, { useState, useEffect, useRef, useContext } from "react";

import { useHistory, useParams } from "react-router-dom";
import { parseISO, format, isSameDay } from "date-fns";
import clsx from "clsx";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemAvatar from "@material-ui/core/ListItemAvatar";
import Typography from "@material-ui/core/Typography";
import Avatar from "@material-ui/core/Avatar";
import Divider from "@material-ui/core/Divider";
import Badge from "@material-ui/core/Badge";

import { i18n } from "../../translate/i18n";

import api from "../../services/api";
import ButtonWithSpinner from "../ButtonWithSpinner";
import MarkdownWrapper from "../MarkdownWrapper";
import { Tooltip } from "@material-ui/core";
import { AuthContext } from "../../context/Auth/AuthContext";
import { useThemeContext } from "../../context/DarkMode";
import toastError from "../../errors/toastError";
import { getBackendUrl } from "../../helpers/urlUtils";

const useStyles = makeStyles(theme => ({
	ticket: {
		position: "relative",
		margin: "0 12px 8px 12px",
		padding: "12px 16px",
		borderRadius: 12,
		backgroundColor: "#ffffff",
		border: "1px solid #f1f5f9",
		transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
		cursor: "pointer",
		display: "flex",
		gap: 12,
		"&:hover": {
			borderColor: "#e2e8f0",
			boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)",
			transform: "translateY(-1px)",
		},
	},

	selectedTicket: {
		borderColor: "#3b82f6",
		backgroundColor: "rgba(59, 130, 246, 0.02)",
		boxShadow: "0 0 0 1px #3b82f6",
		"&:hover": {
			borderColor: "#3b82f6",
			boxShadow: "0 0 0 1px #3b82f6",
		}
	},

	avatarWrapper: {
		position: "relative",
	},

	avatar: {
		width: 44,
		height: 44,
		borderRadius: 10, // Squircle-ish
	},

	contentWrapper: {
		flex: 1,
		minWidth: 0,
		display: "flex",
		flexDirection: "column",
		justifyContent: "center",
		gap: 2,
	},

	headerWrapper: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "baseline",
	},

	contactName: {
		fontSize: "0.9375rem",
		fontWeight: 600,
		color: "#111827",
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	},

	lastMessage: {
		fontSize: "0.8125rem",
		color: "#64748b",
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		lineHeight: "1.25rem",
	},

	time: {
		fontSize: "0.75rem",
		color: "#94a3b8",
		fontWeight: 500,
		whiteSpace: "nowrap",
	},

	badgeWrapper: {
		display: "flex",
		alignItems: "center",
		gap: 4,
		marginLeft: "auto",
	},

	unreadBadge: {
		backgroundColor: "#3b82f6",
		color: "#ffffff",
		fontSize: "0.7rem",
		fontWeight: 700,
		padding: "2px 6px",
		borderRadius: 6,
		minWidth: 18,
		textAlign: "center",
	},

	queueIndicator: {
		width: 3,
		height: 24,
		borderRadius: 2,
		position: "absolute",
		left: 0,
		top: "50%",
		transform: "translateY(-50%)",
	},

	connectionTag: {
		fontSize: "0.6875rem",
		fontWeight: 600,
		color: "#64748b",
		backgroundColor: "#f1f5f9",
		padding: "1px 6px",
		borderRadius: 4,
		marginTop: 4,
		alignSelf: "flex-start",
	},

	acceptButton: {
		backgroundColor: "#111827",
		color: "#ffffff",
		fontSize: "0.75rem",
		fontWeight: 600,
		textTransform: "none",
		padding: "4px 12px",
		borderRadius: 6,
		"&:hover": {
			backgroundColor: "#1f2937",
		}
	},
}));

const TicketListItem = ({ ticket }) => {
	const classes = useStyles();
	const history = useHistory();
	const [loading, setLoading] = useState(false);
	const { ticketId } = useParams();
	const isMounted = useRef(true);
	const { user } = useContext(AuthContext);

	useEffect(() => {
		return () => {
			isMounted.current = false;
		};
	}, []);

	const handleAcepptTicket = async id => {
		setLoading(true);
		try {
			await api.put(`/tickets/${id}`, {
				status: "open",
				userId: user?.id,
			});
		} catch (err) {
			setLoading(false);
			toastError(err);
		}
		if (isMounted.current) {
			setLoading(false);
		}
		history.push(`/tickets/${id}`);
	};

	const handleSelectTicket = id => {
		history.push(`/tickets/${id}`);
	};

	return (
		<div
			key={ticket.id}
			onClick={e => {
				if (ticket.status === "pending" && !ticket?.isGroup && !ticket?.contact?.isGroup) return;
				handleSelectTicket(ticket.id);
			}}
			className={clsx(classes.ticket, {
				[classes.selectedTicket]: ticketId && +ticketId === ticket.id,
			})}
		>
			<div 
				className={classes.queueIndicator} 
				style={{ backgroundColor: ticket.queue?.color || "#e2e8f0" }}
			/>
			
			<div className={classes.avatarWrapper}>
				<Avatar 
					src={getBackendUrl(ticket?.contact?.profilePicUrl)} 
					className={classes.avatar}
				/>
			</div>

			<div className={classes.contentWrapper}>
				<div className={classes.headerWrapper}>
					<span className={classes.contactName}>
						{ticket.contact.name}
					</span>
					
					{(ticket.lastMessage || ticket.isGroup || ticket.contact?.isGroup) && (
						<span className={classes.time}>
							{isSameDay(parseISO(ticket.updatedAt), new Date()) ? (
								<>{format(parseISO(ticket.updatedAt), "HH:mm")}</>
							) : (
								<>{format(parseISO(ticket.updatedAt), "dd/MM")}</>
							)}
						</span>
					)}
				</div>

				<div className={classes.headerWrapper}>
					<span className={classes.lastMessage}>
						{ticket.lastMessage ? (
							<MarkdownWrapper>{ticket.lastMessage}</MarkdownWrapper>
						) : (
							<span>Sem mensagens</span>
						)}
					</span>

					{ticket.unreadMessages > 0 && (
						<span className={classes.unreadBadge}>
							{ticket.unreadMessages}
						</span>
					)}
				</div>

				{ticket.whatsappId && (
					<div className={classes.connectionTag}>
						{ticket.whatsapp?.name}
					</div>
				)}

				{ticket.status === "pending" && !ticket.isGroup && !ticket.contact?.isGroup && (
					<div style={{ marginTop: 8 }}>
						<ButtonWithSpinner
							className={classes.acceptButton}
							size="small"
							loading={loading}
							onClick={e => {
								e.stopPropagation();
								handleAcepptTicket(ticket.id);
							}}
						>
							{i18n.t("ticketsList.buttons.accept")}
						</ButtonWithSpinner>
					</div>
				)}
			</div>
		</div>
	);
};

export default TicketListItem;
