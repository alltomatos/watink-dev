import React, { useState, useCallback, useContext } from "react";
import { format, parseISO } from "date-fns";
import { useHistory } from "react-router-dom";

import { makeStyles } from "@material-ui/core/styles";
import { green, red, orange } from "@material-ui/core/colors";
import {
	Button,
	Typography,
	CircularProgress,
	Grid,
	Box,
	Chip,
	IconButton,
	Menu,
	MenuItem,
	ListItemIcon,
	Avatar
} from "@material-ui/core";
import {
	CheckCircle,
	SignalCellularConnectedNoInternet0Bar,
	SignalCellular4Bar,
	CropFree,
	SignalCellularConnectedNoInternet2Bar,
	Add,
	MoreVert,
	Edit,
	FiberManualRecord
} from "@material-ui/icons";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import MainHeaderButtonsWrapper from "../../components/MainHeaderButtonsWrapper";
import Title from "../../components/Title";
import BaseCard from "../../components/BaseCard";

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
	customCard: {
		cursor: "pointer",
		height: "100%",
	},
	pulsingDot: {
		width: 10,
		height: 10,
		borderRadius: "50%",
		marginRight: 8,
		position: "relative",
		"&::before": {
			content: '""',
			position: "absolute",
			top: -1,
			left: -1,
			width: "100%",
			height: "100%",
			borderRadius: "50%",
			border: "1px solid currentColor",
			animation: "$pulse 2s infinite",
			opacity: 0.5,
			padding: 1,
		},
	},
	"@keyframes pulse": {
		"0%": {
			transform: "scale(1)",
			opacity: 1,
		},
		"100%": {
			transform: "scale(2.5)",
			opacity: 0,
		},
	},
	chipRoot: {
		fontWeight: 600,
		borderRadius: 8,
		height: 28,
		padding: "4px 0",
		"& .MuiChip-label": {
			paddingLeft: 8,
			paddingRight: 8,
			display: 'flex',
			alignItems: 'center',
			width: "100%"
		}
	}
}));

const Connections = () => {
	const classes = useStyles();
	const history = useHistory();

	const { whatsApps, loading } = useContext(WhatsAppsContext);
	const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
	const [selectedWhatsApp, setSelectedWhatsApp] = useState(null);
	const [anchorEl, setAnchorEl] = useState(null);
	const [menuTargetId, setMenuTargetId] = useState(null);

	const handleOpenWhatsAppModal = () => {
		setSelectedWhatsApp(null);
		setWhatsAppModalOpen(true);
	};

	const handleCloseWhatsAppModal = useCallback(() => {
		setWhatsAppModalOpen(false);
		setSelectedWhatsApp(null);
	}, [setSelectedWhatsApp, setWhatsAppModalOpen]);

	const handleMenuOpen = (event, whatsappId) => {
		event.stopPropagation();
		setAnchorEl(event.currentTarget);
		setMenuTargetId(whatsappId);
	};

	const handleMenuClose = () => {
		setAnchorEl(null);
		setMenuTargetId(null);
	};

	const getStatusColor = (status) => {
		switch (status) {
			case "CONNECTED": return green[600];
			case "DISCONNECTED": return red[600];
			case "qrcode": return orange[600];
			case "PAIRING": return orange[400];
			default: return "#9ca3af";
		}
	};

	const getStatusBackgroundColor = (status) => {
		switch (status) {
			case "CONNECTED": return "#E8F5E9";
			case "DISCONNECTED": return "#FFEBEE";
			case "qrcode": return "#FFF3E0";
			default: return "#F3F4F6";
		}
	};

	const renderStatusIcon = status => {
		return <SignalCellular4Bar fontSize="default" />;
	};

	const renderStatusLabel = status => {
		switch (status) {
			case "DISCONNECTED": return "Desconectado";
			case "OPENING": return "Iniciando...";
			case "qrcode": return "Escanear QR Code";
			case "CONNECTED": return "Conectado";
			case "TIMEOUT": return "Tempo Esgotado";
			case "PAIRING": return "Pareando";
			default: return "Desconhecido";
		}
	}

	const handleCardClick = (whatsappId) => {
		if (!anchorEl) {
			history.push(`/connections/${whatsappId}`);
		}
	};

	const handleEditWhatsApp = () => {
		const whatsapp = whatsApps.find(w => w.id === menuTargetId);
		if (whatsapp) {
			setSelectedWhatsApp(whatsapp);
			setWhatsAppModalOpen(true);
		}
		handleMenuClose();
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
					<Grid container spacing={3}>
						{whatsApps?.length > 0 &&
							whatsApps.map(whatsApp => {
								const statusColor = getStatusColor(whatsApp.status);
								const bgColor = getStatusBackgroundColor(whatsApp.status);

								return (
									<Grid item xs={12} sm={6} md={4} lg={3} key={whatsApp.id}>
										<BaseCard
											className={classes.customCard}
											title={whatsApp.name}
											subtitle={
												<Box>
													<span style={{ fontSize: 13, fontWeight: 400, color: '#8e8e8e', display: 'flex', gap: 4 }}>
														Atualizado em {whatsApp.updatedAt
															? format(parseISO(whatsApp.updatedAt), "dd/MM")
															: "N/A"
														}
													</span>
													{whatsApp.status === "CONNECTED" && whatsApp.number && (
														<Typography variant="body2" color="textSecondary" style={{ marginTop: 4 }}>
															+{whatsApp.number}
														</Typography>
													)}
												</Box>
											}
											iconColor={bgColor}
											icon={
												whatsApp.status === "CONNECTED" && whatsApp.profilePicUrl ? (
													<Avatar
														src={whatsApp.profilePicUrl}
														alt={whatsApp.name}
														style={{ width: 56, height: 56 }}
													/>
												) : (
													React.cloneElement(renderStatusIcon(whatsApp.status), { style: { color: statusColor, fontSize: 24 } })
												)
											}

											actions={
												<IconButton
													size="small"
													onClick={(e) => handleMenuOpen(e, whatsApp.id)}
												>
													<MoreVert fontSize="small" style={{ color: '#94a3b8' }} />
												</IconButton>
											}
											hoverEffect={true}
											onClick={() => handleCardClick(whatsApp.id)}
										>

											<Box mt={2} display="flex" alignItems="center">
												<Chip
													classes={{ root: classes.chipRoot }}
													style={{
														backgroundColor: bgColor,
														color: statusColor,
														width: "100%",
													}}
													label={
														<Box display="flex" alignItems="center" width="100%">
															<Box
																className={classes.pulsingDot}
																style={{
																	backgroundColor: statusColor,
																	color: statusColor
																}}
															/>
															<Typography variant="body2" style={{ fontWeight: 600, fontSize: '0.8125rem' }}>
																{renderStatusLabel(whatsApp.status)}
															</Typography>

															{whatsApp.isDefault && (
																<Box ml="auto">
																	<CheckCircle style={{ fontSize: 16 }} />
																</Box>
															)}
														</Box>
													}
												/>
											</Box>
										</BaseCard>
									</Grid>
								)
							})}
					</Grid>
				)}
			</Box>

			<Menu
				anchorEl={anchorEl}
				keepMounted
				open={Boolean(anchorEl)}
				onClose={handleMenuClose}
				elevation={2}
				getContentAnchorEl={null}
				anchorOrigin={{
					vertical: 'bottom',
					horizontal: 'right',
				}}
				transformOrigin={{
					vertical: 'top',
					horizontal: 'right',
				}}
			>
				<MenuItem onClick={handleEditWhatsApp}>
					<ListItemIcon style={{ minWidth: 32 }}>
						<Edit fontSize="small" />
					</ListItemIcon>
					<Typography variant="body2">Editar</Typography>
				</MenuItem>
			</Menu>
		</MainContainer>
	);
};

export default Connections;
