/* @jsxImportSource react */
import React, { useState, useEffect, useRef, useContext } from "react";

import { useNavigate, useParams } from "react-router-dom";
import { parseISO, format, isSameDay } from "date-fns";
import clsx from "clsx";

import { makeStyles } from "@material-ui/core/styles";
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
		backgroundColor: "var(--bg-surface)",
		border: "1px solid var(--border-subtle)",
		transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
		cursor: "pointer",
		display: "flex",
		gap: 12,
		"&:hover": {
			borderColor: "var(--border-default)",
			boxShadow: "0 4px 6px -1px var(--border-subtle), 0 2px 4px -1px var(--border-weak)",
			transform: "translateY(-1px)",
		},
	},

	selectedTicket: {
		borderColor: "var(--action-primary)",
		backgroundColor: "var(--action-primary-bg)",
		boxShadow: "0 0 0 1px var(--action-primary)",
		"&:hover": {
			borderColor: "var(--action-primary)",
			boxShadow: "0 0 0 1px var(--action-primary)",
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
		color: "var(--text-primary)",
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
	},

	lastMessage: {
		fontSize: "0.8125rem",
		color: "var(--text-secondary)",
		overflow: "hidden",
		textOverflow: "ellipsis",
		whiteSpace: "nowrap",
		lineHeight: "1.25rem",
	},

	time: {
		fontSize: "0.75rem",
		color: "var(--text-muted)",
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
		backgroundColor: "var(--action-primary)",
		color: "var(--bg-surface)",
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
		color: "var(--text-secondary)",
		backgroundColor: "var(--bg-surface-alt)",
		padding: "1px 6px",
		borderRadius: 4,
		marginTop: 4,
		alignSelf: "flex-start",
	},

	acceptButton: {
		backgroundColor: "var(--text-primary)",
		color: "var(--bg-surface)",
		fontSize: "0.75rem",
		fontWeight: 600,
		textTransform: "none",
		padding: "4px 12px",
		borderRadius: 6,
		"&:hover": {
			backgroundColor: "var(--text-secondary)",
		}
	},
}));

const TicketListItem = ({ ticket }) => {
	const classes = useStyles();
	const navigate = useNavigate();
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
		navigate(`/tickets/${id}`);
	};

	const handleSelectTicket = id => {
		navigate(`/tickets/${id}`);
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
				style={{ backgroundColor: ticket.queue?.color || "var(--border-default)" }}
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
