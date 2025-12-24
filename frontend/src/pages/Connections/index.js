import React, { useState, useCallback, useContext } from "react";
import { toast } from "react-toastify";
import { format, parseISO } from "date-fns";
import { useHistory } from "react-router-dom";

import { makeStyles } from "@material-ui/core/styles";
import { green } from "@material-ui/core/colors";
import {
	Button,
	Paper,
	Typography,
	CircularProgress,
	Grid,
	Card,
	CardContent,
	CardActionArea,
	Box,
	Chip
} from "@material-ui/core";
import {
	CheckCircle,
	SignalCellularConnectedNoInternet0Bar,
	SignalCellular4Bar,
	CropFree,
	SignalCellularConnectedNoInternet2Bar,
	Add
} from "@material-ui/icons";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";

import WhatsAppModal from "../../components/WhatsAppModal";
import { i18n } from "../../translate/i18n";
import { WhatsAppsContext } from "../../context/WhatsApp/WhatsAppsContext";

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
		position: 'relative',
		borderRadius: 12, // More rounded for premium feel
		transition: "all 0.3s cubic-bezier(.25,.8,.25,1)",
		"&:hover": {
			boxShadow: "0 14px 28px rgba(0,0,0,0.25), 0 10px 10px rgba(0,0,0,0.22)",
			transform: "translateY(-5px)"
		}
	},
	cardContent: {
		flexGrow: 1,
		display: "flex", // Centered content
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
		textAlign: "center",
		padding: theme.spacing(3)
	},
	statusIcon: {
		marginBottom: theme.spacing(2),
		padding: theme.spacing(2),
		borderRadius: "50%",
		backgroundColor: theme.palette.action.hover
	},
}));

const Connections = () => {
	const classes = useStyles();
	const history = useHistory();

	const { whatsApps, loading } = useContext(WhatsAppsContext);
	const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
	const [selectedWhatsApp, setSelectedWhatsApp] = useState(null);

	const handleOpenWhatsAppModal = () => {
		setSelectedWhatsApp(null);
		setWhatsAppModalOpen(true);
	};

	const handleCloseWhatsAppModal = useCallback(() => {
		setWhatsAppModalOpen(false);
		setSelectedWhatsApp(null);
	}, [setSelectedWhatsApp, setWhatsAppModalOpen]);

	const renderStatusIcon = status => {
		switch (status) {
			case "DISCONNECTED":
				return <SignalCellularConnectedNoInternet0Bar fontSize="large" color="error" />;
			case "OPENING":
				return <CircularProgress size={36} />;
			case "qrcode":
				return <CropFree fontSize="large" style={{ color: "#f57c00" }} />;
			case "CONNECTED":
				return <SignalCellular4Bar fontSize="large" style={{ color: green[500] }} />;
			case "TIMEOUT":
			case "PAIRING":
				return <SignalCellularConnectedNoInternet2Bar fontSize="large" style={{ color: "#f57c00" }} />;
			default:
				return <SignalCellularConnectedNoInternet0Bar fontSize="large" color="error" />;
		}
	};

	const renderStatusLabel = status => {
		switch (status) {
			case "DISCONNECTED": return "Desconectado";
			case "OPENING": return "Iniciando...";
			case "qrcode": return "Aguardando QR Code";
			case "CONNECTED": return "Conectado";
			case "TIMEOUT": return "Tempo Esgotado";
			case "PAIRING": return "Pareando";
			default: return "Desconectado";
		}
	}

	const handleCardClick = (whatsappId) => {
		history.push(`/connections/${whatsappId}`);
	};

	return (
		<MainContainer>
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
						startIcon={<Add />}
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
					<Grid container spacing={4}>
						{whatsApps?.length > 0 &&
							whatsApps.map(whatsApp => (
								<Grid item xs={12} sm={6} md={4} lg={3} key={whatsApp.id}>
									<Card className={classes.card} variant="outlined">
										<CardActionArea
											onClick={() => handleCardClick(whatsApp.id)}
											style={{ height: '100%' }}
										>
											<CardContent className={classes.cardContent}>
												<Box className={classes.statusIcon}>
													{renderStatusIcon(whatsApp.status)}
												</Box>

												<Typography variant="h6" component="h2" gutterBottom>
													{whatsApp.name}
												</Typography>

												<Chip
													label={renderStatusLabel(whatsApp.status)}
													size="small"
													style={{
														backgroundColor: whatsApp.status === 'CONNECTED' ? green[50] : 'rgba(0,0,0,0.08)',
														color: whatsApp.status === 'CONNECTED' ? green[800] : 'inherit',
														marginBottom: 16
													}}
												/>

												<Typography variant="caption" color="textSecondary" display="block">
													{i18n.t("connections.table.lastUpdate")}:
													<br />
													{whatsApp.updatedAt ? format(parseISO(whatsApp.updatedAt), "dd/MM/yy HH:mm") : "N/A"}
												</Typography>

												{whatsApp.isDefault && (
													<Box display="flex" alignItems="center" mt={2}>
														<CheckCircle style={{ color: green[500], fontSize: 16, marginRight: 4 }} />
														<Typography variant="caption">{i18n.t("connections.table.default")}</Typography>
													</Box>
												)}
											</CardContent>
										</CardActionArea>
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
