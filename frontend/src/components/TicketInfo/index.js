import React, { useState } from "react";
import clsx from "clsx";

import { Avatar, CardHeader, Box, makeStyles, Typography } from "@material-ui/core";
import { blue } from "@material-ui/core/colors";

import { i18n } from "../../translate/i18n";
import { getBackendUrl } from "../../helpers/urlUtils";
import WalletButton from "../WalletButton";
import { useThemeContext } from "../../context/DarkMode";

const useStyles = makeStyles((theme) => ({
	cardHeader: {
		cursor: "pointer",
		transition: "background-color 0.2s ease",
		"&:hover": {
			backgroundColor: "rgba(0, 0, 0, 0.02)",
		},
	},
	avatar: {
		width: 40,
		height: 40,
	},
	avatarWhatsapp: {
		border: "none",
		boxShadow: "none",
	},
	avatarOthers: {
		border: `2px solid ${theme.palette.primary.main}`,
		boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
	},
	titleContainer: {
		display: "flex",
		alignItems: "center",
		gap: 8,
	},
	ticketId: {
		fontSize: "0.75rem",
		color: theme.palette.text.secondary,
		fontWeight: 500,
		backgroundColor: theme.palette.type === 'dark' ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.05)",
		padding: "1px 5px",
		borderRadius: "4px",
	},
	contactName: {
		fontWeight: 500,
		fontSize: "1rem",
		color: theme.palette.text.primary,
	},
}));

const TicketInfo = ({ contact, ticket, onClick }) => {
	const classes = useStyles();
	const { appTheme } = useThemeContext();
	const [localContact, setLocalContact] = useState(contact);

	// Handle wallet update to avoid full page refresh
	const handleWalletUpdate = (updatedContact) => {
		setLocalContact(updatedContact);
	};

	// Use local state if available, otherwise use prop
	const displayContact = localContact || contact;

	return (
		<CardHeader
			onClick={onClick}
			className={classes.cardHeader}
			titleTypographyProps={{ noWrap: true }}
			subheaderTypographyProps={{ noWrap: true }}
			avatar={
				<Avatar
					src={getBackendUrl(displayContact.profilePicUrl)}
					alt="contact_image"
					className={clsx(classes.avatar, appTheme === "whatsapp" ? classes.avatarWhatsapp : classes.avatarOthers)}
				/>
			}
			title={
				<Box className={classes.titleContainer}>
					<Typography variant="body1" component="span" className={classes.contactName}>
						{displayContact.name}
					</Typography>
					<Typography variant="body2" component="span" className={classes.ticketId}>
						#{ticket.id}
					</Typography>
					<WalletButton
						contact={displayContact}
						onWalletUpdate={handleWalletUpdate}
					/>
				</Box>
			}
			subheader={
				ticket.user &&
				`${i18n.t("messagesList.header.assignedTo")} ${ticket.user.name}`
			}
		/>
	);
};

export default TicketInfo;

