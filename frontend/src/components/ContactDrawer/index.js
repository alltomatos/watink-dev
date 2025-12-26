import React, { useState, useEffect } from "react";

import { makeStyles } from "@material-ui/core/styles";
import Typography from "@material-ui/core/Typography";
import IconButton from "@material-ui/core/IconButton";
import CloseIcon from "@material-ui/icons/Close";
import Drawer from "@material-ui/core/Drawer";
import Link from "@material-ui/core/Link";
import InputLabel from "@material-ui/core/InputLabel";
import Avatar from "@material-ui/core/Avatar";
import Button from "@material-ui/core/Button";
import Paper from "@material-ui/core/Paper";
import DeleteOutlineIcon from "@material-ui/icons/DeleteOutline";
import AddIcon from "@material-ui/icons/Add";
import Select from "@material-ui/core/Select";
import MenuItem from "@material-ui/core/MenuItem";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import FormControl from "@material-ui/core/FormControl";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import { toast } from "react-toastify";

import ContactModal from "../ContactModal";
import ContactDrawerSkeleton from "../ContactDrawerSkeleton";
import MarkdownWrapper from "../MarkdownWrapper";

const drawerWidth = 320;

const useStyles = makeStyles(theme => ({
	drawer: {
		width: drawerWidth,
		flexShrink: 0,
	},
	drawerPaper: {
		width: drawerWidth,
		display: "flex",
		borderTop: "1px solid rgba(0, 0, 0, 0.12)",
		borderRight: "1px solid rgba(0, 0, 0, 0.12)",
		borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
		borderTopRightRadius: 4,
		borderBottomRightRadius: 4,
	},
	header: {
		display: "flex",
		borderBottom: "1px solid rgba(0, 0, 0, 0.12)",
		backgroundColor: "#eee",
		alignItems: "center",
		padding: theme.spacing(0, 1),
		minHeight: "73px",
		justifyContent: "flex-start",
	},
	content: {
		display: "flex",
		backgroundColor: "#eee",
		flexDirection: "column",
		padding: "8px 0px 8px 8px",
		height: "100%",
		overflowY: "scroll",
		...theme.scrollbarStyles,
	},

	contactAvatar: {
		margin: 15,
		width: 160,
		height: 160,
	},

	contactHeader: {
		display: "flex",
		padding: 8,
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
		"& > *": {
			margin: 4,
		},
	},

	contactDetails: {
		marginTop: 8,
		padding: 8,
		display: "flex",
		flexDirection: "column",
	},
	contactExtraInfo: {
		marginTop: 4,
		padding: 6,
	},
	pipelineCard: {
		marginTop: 8,
		padding: 8,
		display: 'flex',
		flexDirection: 'column',
		position: 'relative'
	},
	dealInfo: {
		display: 'flex',
		alignItems: 'center',
		justifyContent: 'space-between',
		marginTop: 5
	}
}));

// Paleta de cores (mesma do PipelineBoard para consistência)
const stageColors = [
	{ bg: '#e3f2fd', header: '#1976d2', light: '#bbdefb' }, // Azul
	{ bg: '#fff3e0', header: '#f57c00', light: '#ffe0b2' }, // Laranja
	{ bg: '#e8f5e9', header: '#388e3c', light: '#c8e6c9' }, // Verde
	{ bg: '#fce4ec', header: '#c2185b', light: '#f8bbd9' }, // Rosa
	{ bg: '#ede7f6', header: '#7b1fa2', light: '#d1c4e9' }, // Roxo
	{ bg: '#e0f7fa', header: '#0097a7', light: '#b2ebf2' }, // Ciano
	{ bg: '#fff8e1', header: '#ffa000', light: '#ffecb3' }, // Âmbar
	{ bg: '#f3e5f5', header: '#8e24aa', light: '#e1bee7' }, // Violeta
	{ bg: '#e8eaf6', header: '#3f51b5', light: '#c5cae9' }, // Índigo
	{ bg: '#ffebee', header: '#d32f2f', light: '#ffcdd2' }, // Vermelho
];

const getStageColor = (index) => stageColors[index % stageColors.length];

const ContactDrawer = ({ open, handleDrawerClose, contact, ticketId, loading }) => {
	const classes = useStyles();

	const [modalOpen, setModalOpen] = useState(false);
	const [deals, setDeals] = useState([]);
	const [pipelines, setPipelines] = useState([]);
	const [pipelineModalOpen, setPipelineModalOpen] = useState(false);
	const [selectedPipeline, setSelectedPipeline] = useState("");
	const [selectedStage, setSelectedStage] = useState("");
	const [stages, setStages] = useState([]);

	useEffect(() => {
		if (open && ticketId) {
			fetchDeals();
			fetchPipelines();
		}
	}, [open, ticketId]);

	const fetchDeals = async () => {
		try {
			const { data } = await api.get("/deals", { params: { ticketId } });
			setDeals(data.deals);
		} catch (err) {
			console.error(err);
		}
	};

	const fetchPipelines = async () => {
		try {
			const { data } = await api.get("/pipelines");
			setPipelines(data);
		} catch (err) {
			console.error(err);
		}
	};

	const handlePipelineChange = (pipelineId) => {
		setSelectedPipeline(pipelineId);
		const pipeline = pipelines.find(p => p.id === pipelineId);
		if (pipeline) {
			setStages(pipeline.stages);
			if (pipeline.stages.length > 0) {
				setSelectedStage(pipeline.stages[0].id);
			}
		}
	};

	const handleSaveDeal = async () => {
		if (!selectedPipeline || !selectedStage) return;

		try {
			// Title default: Contact Name
			const dealData = {
				title: `Ticket #${ticketId} - ${contact.name}`,
				value: 0,
				pipelineId: selectedPipeline,
				stageId: selectedStage,
				contactId: contact.id,
				ticketId: ticketId
			};
			await api.post("/deals", dealData);
			toast.success("Deal criado com sucesso!");
			setPipelineModalOpen(false);
			fetchDeals();
		} catch (err) {
			toast.error("Erro ao criar deal");
		}
	};

	const handleDeleteDeal = async (dealId) => {
		try {
			await api.delete(`/deals/${dealId}`);
			toast.success("Deal removido do fluxo");
			fetchDeals();
		} catch (err) {
			toast.error("Erro ao remover deal");
		}
	};

	return (
		<Drawer
			className={classes.drawer}
			variant="persistent"
			anchor="right"
			open={open}
			PaperProps={{ style: { position: "absolute" } }}
			BackdropProps={{ style: { position: "absolute" } }}
			ModalProps={{
				container: document.getElementById("drawer-container"),
				style: { position: "absolute" },
			}}
			classes={{
				paper: classes.drawerPaper,
			}}
		>
			<div className={classes.header}>
				<IconButton onClick={handleDrawerClose}>
					<CloseIcon />
				</IconButton>
				<Typography style={{ justifySelf: "center" }}>
					{i18n.t("contactDrawer.header")}
				</Typography>
			</div>
			{loading ? (
				<ContactDrawerSkeleton classes={classes} />
			) : (
				<div className={classes.content}>
					<Paper square variant="outlined" className={classes.contactHeader}>
						<Avatar
							alt={contact.name}
							src={contact.profilePicUrl}
							className={classes.contactAvatar}
						></Avatar>

						<Typography>{contact.name}</Typography>
						<Typography>
							{contact.number ? (
								<Link href={`tel:${contact.number}`}>{contact.number}</Link>
							) : (
								<Typography variant="body2" color="textSecondary">{contact.lid}</Typography>
							)}
						</Typography>
						<Button
							variant="outlined"
							color="primary"
							onClick={() => setModalOpen(true)}
						>
							{i18n.t("contactDrawer.buttons.edit")}
						</Button>
						<Button
							variant="outlined"
							color="primary"
							onClick={async () => {
								try {
									await api.post(`/contacts/${contact.id}/sync`);
								} catch (e) { console.error(e); }
							}}
							style={{ marginLeft: 8 }}
						>
							Atualizar
						</Button>
					</Paper>
					<Paper square variant="outlined" className={classes.contactDetails}>
						<ContactModal
							open={modalOpen}
							onClose={() => setModalOpen(false)}
							contactId={contact.id}
						></ContactModal>
						<Typography variant="subtitle1">
							{i18n.t("contactDrawer.extraInfo")}
						</Typography>
						{contact?.extraInfo?.map(info => (
							<Paper
								key={info.id}
								square
								variant="outlined"
								className={classes.contactExtraInfo}
							>
								<InputLabel>{info.name}</InputLabel>
								<Typography component="div" noWrap style={{ paddingTop: 2 }}>
									<MarkdownWrapper>{info.value}</MarkdownWrapper>
								</Typography>
							</Paper>
						))}
					</Paper>

					<Paper square variant="outlined" className={classes.contactDetails}>
						<Typography variant="subtitle1" style={{ marginBottom: 8 }}>
							Fluxos (Pipelines)
						</Typography>

						{deals.map(deal => {
							// Determine stage index if possible, otherwise use random or default
							// We don't have full pipeline here, so maybe just use hash of stage ID
							const color = deal.stage ? getStageColor(deal.stage.id) : { bg: '#f5f5f5', header: '#ccc' };

							return (
								<Paper
									key={deal.id}
									className={classes.pipelineCard}
									style={{ borderLeft: `4px solid ${color.header}` }}
								>
									<Typography variant="body2" style={{ fontWeight: 'bold' }}>
										{deal.pipeline?.name}
									</Typography>
									<div className={classes.dealInfo}>
										<div
											style={{
												backgroundColor: color.bg,
												padding: '2px 8px',
												borderRadius: 4,
												fontSize: '0.8rem',
												color: '#333'
											}}
										>
											{deal.stage?.name}
										</div>
										<IconButton
											size="small"
											onClick={() => handleDeleteDeal(deal.id)}
										>
											<DeleteOutlineIcon fontSize="small" />
										</IconButton>
									</div>
								</Paper>
							);
						})}

						<Button
							variant="outlined"
							color="primary"
							startIcon={<AddIcon />}
							onClick={() => setPipelineModalOpen(true)}
							style={{ marginTop: 8 }}
							fullWidth
						>
							Adicionar ao Fluxo
						</Button>
					</Paper>

					<Dialog open={pipelineModalOpen} onClose={() => setPipelineModalOpen(false)}>
						<DialogTitle>Novo Deal</DialogTitle>
						<DialogContent>
							<FormControl fullWidth margin="dense">
								<InputLabel>Pipeline</InputLabel>
								<Select
									value={selectedPipeline}
									onChange={(e) => handlePipelineChange(e.target.value)}
								>
									{pipelines.map(p => (
										<MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
									))}
								</Select>
							</FormControl>
							{selectedPipeline && (
								<FormControl fullWidth margin="dense">
									<InputLabel>Etapa</InputLabel>
									<Select
										value={selectedStage}
										onChange={(e) => setSelectedStage(e.target.value)}
									>
										{stages.map(s => (
											<MenuItem key={s.id} value={s.id}>{s.name}</MenuItem>
										))}
									</Select>
								</FormControl>
							)}
						</DialogContent>
						<DialogActions>
							<Button onClick={() => setPipelineModalOpen(false)} color="secondary">
								Cancelar
							</Button>
							<Button
								onClick={handleSaveDeal}
								color="primary"
								disabled={!selectedPipeline || !selectedStage}
							>
								Salvar
							</Button>
						</DialogActions>
					</Dialog>

				</div>
			)}
		</Drawer>
	);
};

export default ContactDrawer;
