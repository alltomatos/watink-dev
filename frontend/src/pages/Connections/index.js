import React, { useState, useCallback, useContext } from "react";
import { toast } from "react-toastify";
import { format, parseISO } from "date-fns";
import { useHistory } from "react-router-dom";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import {
	Button,
	IconButton,
	Paper,
	Typography,
	CircularProgress,
	Grid,
	Card,
	CardContent,
	CardActions,
	CardActionArea,
	Box
} from "@material-ui/core";
import {
	Edit,
	CheckCircle,
	SignalCellularConnectedNoInternet2Bar,
	SignalCellularConnectedNoInternet0Bar,
	SignalCellular4Bar,
	CropFree,
	DeleteOutline,
} from "@material-ui/icons";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";

import api from "../../services/api";
import WhatsAppModal from "../../components/WhatsAppModal";
import ConfirmationModal from "../../components/ConfirmationModal";
import { i18n } from "../../translate/i18n";
import { WhatsAppsContext } from "../../context/WhatsApp/WhatsAppsContext";
import toastError from "../../errors/toastError";

const useStyles = makeStyles(theme => ({
	mainPaper: {
		flex: 1,
		padding: theme.spacing(1),
		overflowY: "scroll",
		...theme.scrollbarStyles,
	},
	card: {
		height: '100%',
		display: 'flex',
		flexDirection: 'column',
		position: 'relative'
	},
	cardContent: {
		flexGrow: 1,
	},
	statusIcon: {
		position: 'absolute',
		top: theme.spacing(1),
		right: theme.spacing(1),
	},
	cardActions: {
		justifyContent: 'flex-end',
	}
}));

const Connections = () => {
	const classes = useStyles();
	const history = useHistory();

	const { whatsApps, loading } = useContext(WhatsAppsContext);
	const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
	const [selectedWhatsApp, setSelectedWhatsApp] = useState(null);
	const [confirmModalOpen, setConfirmModalOpen] = useState(false);
	const confirmationModalInitialState = {
		action: "",
		title: "",
		message: "",
		whatsAppId: "",
		open: false,
	};
	const [confirmModalInfo, setConfirmModalInfo] = useState(
		confirmationModalInitialState
	);

	const handleOpenWhatsAppModal = () => {
		setSelectedWhatsApp(null);
		setWhatsAppModalOpen(true);
	};

	const handleCloseWhatsAppModal = useCallback(() => {
		setWhatsAppModalOpen(false);
		setSelectedWhatsApp(null);
	}, [setSelectedWhatsApp, setWhatsAppModalOpen]);

	const handleEditWhatsApp = (e, whatsApp) => {
		e.stopPropagation();
		setSelectedWhatsApp(whatsApp);
		setWhatsAppModalOpen(true);
	};

	const handleOpenConfirmationModal = (e, action, whatsAppId) => {
		e.stopPropagation();
		if (action === "disconnect") {
			setConfirmModalInfo({
				action: action,
				title: i18n.t("connections.confirmationModal.disconnectTitle"),
				message: i18n.t("connections.confirmationModal.disconnectMessage"),
				whatsAppId: whatsAppId,
			});
		}

		if (action === "delete") {
			setConfirmModalInfo({
				action: action,
				title: i18n.t("connections.confirmationModal.deleteTitle"),
				message: i18n.t("connections.confirmationModal.deleteMessage"),
				whatsAppId: whatsAppId,
			});
		}
		setConfirmModalOpen(true);
	};

	const handleSubmitConfirmationModal = async () => {
		if (confirmModalInfo.action === "disconnect") {
			try {
				await api.delete(`/whatsappsession/${confirmModalInfo.whatsAppId}`);
			} catch (err) {
				toastError(err);
			}
		}

		if (confirmModalInfo.action === "delete") {
			try {
				await api.delete(`/whatsapp/${confirmModalInfo.whatsAppId}`);
				toast.success(i18n.t("connections.toasts.deleted"));
			} catch (err) {
				toastError(err);
			}
		}

		setConfirmModalInfo(confirmationModalInitialState);
	};

	const renderStatusIcon = status => {
		switch (status) {
			case "DISCONNECTED":
				return <SignalCellularConnectedNoInternet0Bar color="secondary" />;
			case "OPENING":
				return <CircularProgress size={24} />;
			case "qrcode":
				return <CropFree />;
			case "CONNECTED":
				return <SignalCellular4Bar style={{ color: green[500] }} />;
			case "TIMEOUT":
			case "PAIRING":
				return <SignalCellularConnectedNoInternet2Bar color="secondary" />;
			default:
				return null;
		}
	};

	const handleCardClick = (whatsappId) => {
		history.push(`/connections/${whatsappId}`);
	};

	return (
		<MainContainer>
			<ConfirmationModal
				title={confirmModalInfo.title}
				open={confirmModalOpen}
				onClose={setConfirmModalOpen}
				onConfirm={handleSubmitConfirmationModal}
			>
				{confirmModalInfo.message}
			</ConfirmationModal>

			<WhatsAppModal
				open={whatsAppModalOpen}
				onClose={handleCloseWhatsAppModal}
				whatsAppId={selectedWhatsApp?.id}
			/>

			<MainHeader>
				<Title>{i18n.t("connections.title")}</Title>
				<MainHeaderButtonsWrapper>
					<Button
						variant="contained"
						color="primary"
						onClick={handleOpenWhatsAppModal}
					>
						{i18n.t("connections.buttons.add")}
					</Button>
				</MainHeaderButtonsWrapper>
			</MainHeader>

			<Box className={classes.mainPaper}>
				{loading ? (
					<Box display="flex" justifyContent="center" mt={4}>
						<CircularProgress />
					</Box>
				) : (
					<Grid container spacing={3}>
						{whatsApps?.length > 0 &&
							whatsApps.map(whatsApp => (
								<Grid item xs={12} sm={6} md={4} key={whatsApp.id}>
									<Card className={classes.card} variant="outlined">
										<CardActionArea onClick={() => handleCardClick(whatsApp.id)}>
											<Box className={classes.statusIcon}>
												{renderStatusIcon(whatsApp.status)}
											</Box>
											<CardContent className={classes.cardContent}>
												<Typography variant="h6" component="h2" gutterBottom>
													{whatsApp.name}
												</Typography>
												<Typography variant="body2" color="textSecondary">
													Status: {whatsApp.status}
												</Typography>
												<Typography variant="body2" color="textSecondary">
													{i18n.t("connections.table.lastUpdate")}: {whatsApp.updatedAt ? format(parseISO(whatsApp.updatedAt), "dd/MM/yy HH:mm") : "N/A"}
												</Typography>
												{whatsApp.isDefault && (
													<Box display="flex" alignItems="center" mt={1}>
														<CheckCircle style={{ color: green[500], fontSize: 16, marginRight: 4 }} />
														<Typography variant="caption">{i18n.t("connections.table.default")}</Typography>
													</Box>
												)}
											</CardContent>
										</CardActionArea>
										<CardActions className={classes.cardActions}>
											<IconButton
												size="small"
												onClick={(e) => handleEditWhatsApp(e, whatsApp)}
											>
												<Edit />
											</IconButton>
											<IconButton
												size="small"
												onClick={(e) => handleOpenConfirmationModal(e, "delete", whatsApp.id)}
											>
												<DeleteOutline />
											</IconButton>
										</CardActions>
									</Card>
								</Grid>
							))}
					</Grid>
				)}
			</Box>
		</MainContainer>
	);
};

export default Connections;
