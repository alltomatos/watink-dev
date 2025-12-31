import React, { useState, useEffect } from "react";
import openSocket from "../../services/socket-io";
import MemoryIcon from "@material-ui/icons/Memory";

import { makeStyles } from "@material-ui/core/styles";
import Paper from "@material-ui/core/Paper";
import Typography from "@material-ui/core/Typography";
import Box from "@material-ui/core/Box";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemIcon from "@material-ui/core/ListItemIcon";
import ListItemText from "@material-ui/core/ListItemText";
import Select from "@material-ui/core/Select";
import TextField from "@material-ui/core/TextField";
import Button from "@material-ui/core/Button";
import Divider from "@material-ui/core/Divider";
import SettingsIcon from "@material-ui/icons/Settings";
import PaletteIcon from "@material-ui/icons/Palette";
import CloudUploadIcon from "@material-ui/icons/CloudUpload";
import DeleteIcon from "@material-ui/icons/Delete";
import Switch from "@material-ui/core/Switch";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import { toast } from "react-toastify";

import api from "../../services/api";
import { i18n } from "../../translate/i18n.js";
import toastError from "../../errors/toastError";
import { useThemeContext } from "../../context/DarkMode";
import { getBackendUrl } from "../../config";

const AI_MODELS = {
	openai: [
		{ value: "gpt-4o-mini", name: "GPT-4o Mini", price: "$0.15 / 1M tokens (Recomendado)" },
		{ value: "gpt-4o", name: "GPT-4o", price: "$2.50 / 1M tokens" },
		{ value: "gpt-4-turbo", name: "GPT-4 Turbo", price: "$10.00 / 1M tokens" },
		{ value: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", price: "$0.50 / 1M tokens" },
		{ value: "o1-mini", name: "o1-mini", price: "$3.00 / 1M tokens" },
		{ value: "o1-preview", name: "o1-preview", price: "$15.00 / 1M tokens" }
	],
	grok: [
		{ value: "grok-beta", name: "Grok Beta", price: "Gratuito (Beta)" },
		{ value: "grok-2", name: "Grok 2", price: "Preço a definir" }
	]
};

const useStyles = makeStyles((theme) => ({
	root: {
		display: "flex",
		height: "calc(100vh - 64px)",
		backgroundColor: theme.palette.background.default,
	},
	sidebar: {
		width: 240,
		minWidth: 240,
		backgroundColor: theme.palette.background.paper,
		borderRight: `1px solid ${theme.palette.divider}`,
		padding: theme.spacing(2, 0),
	},
	sidebarTitle: {
		padding: theme.spacing(0, 2, 2, 2),
		fontWeight: 600,
	},
	menuItem: {
		borderRadius: 8,
		margin: theme.spacing(0.5, 1),
		color: theme.palette.text.primary,
		"& .MuiListItemIcon-root": {
			color: theme.palette.text.secondary,
		},
		"&:hover": {
			backgroundColor: theme.palette.action.hover,
		},
		"&.Mui-selected": {
			backgroundColor: theme.palette.primary.main,
			color: "#ffffff",
			"& .MuiListItemIcon-root": {
				color: "#ffffff",
			},
			"&:hover": {
				backgroundColor: theme.palette.primary.dark,
			},
		},
	},
	content: {
		flex: 1,
		padding: theme.spacing(4),
		overflow: "auto",
	},
	sectionTitle: {
		marginBottom: theme.spacing(3),
		fontWeight: 600,
	},
	paper: {
		padding: theme.spacing(2),
		display: "flex",
		alignItems: "center",
		marginBottom: theme.spacing(2),
		borderRadius: 12,
	},
	settingOption: {
		marginLeft: "auto",
	},
	uploadBox: {
		display: "flex",
		flexDirection: "column",
		alignItems: "center",
		justifyContent: "center",
		border: `2px dashed ${theme.palette.divider}`,
		borderRadius: 12,
		padding: theme.spacing(4),
		marginTop: theme.spacing(2),
		cursor: "pointer",
		transition: "all 0.2s ease",
		"&:hover": {
			borderColor: theme.palette.primary.main,
			backgroundColor: theme.palette.action.hover,
		},
	},
	logoPreview: {
		maxWidth: 200,
		maxHeight: 80,
		objectFit: "contain",
		marginBottom: theme.spacing(2),
	},
	hiddenInput: {
		display: "none",
	},
}));

const Settings = () => {
	const classes = useStyles();
	const { appTheme, setAppTheme } = useThemeContext();

	const [activeSection, setActiveSection] = useState("general");
	const [settings, setSettings] = useState([]);
	const [systemTitle, setSystemTitle] = useState("");
	const [logoPreview, setLogoPreview] = useState(null);
	const [logoEnabled, setLogoEnabled] = useState(true);
	const [faviconPreview, setFaviconPreview] = useState(null);

	const [loginImagePreview, setLoginImagePreview] = useState(null);
	const [loginLayout, setLoginLayout] = useState("split_left");

	// AI Settings
	const [aiProvider, setAiProvider] = useState("openai");
	const [aiApiKey, setAiApiKey] = useState("");
	const [aiModel, setAiModel] = useState("");
	const [aiGuidePrompt, setAiGuidePrompt] = useState("");
	const [aiEnabled, setAiEnabled] = useState(false);

	useEffect(() => {
		const fetchSession = async () => {
			try {
				const { data } = await api.get("/settings");
				setSettings(data);

				const titleSetting = data.find(s => s.key === "systemTitle");
				if (titleSetting) setSystemTitle(titleSetting.value);

				const logoSetting = data.find(s => s.key === "systemLogo");
				if (logoSetting && logoSetting.value) setLogoPreview(logoSetting.value);

				const logoEnabledSetting = data.find(s => s.key === "systemLogoEnabled");
				if (logoEnabledSetting) setLogoEnabled(logoEnabledSetting.value === "true");

				const faviconSetting = data.find(s => s.key === "systemFavicon");
				if (faviconSetting && faviconSetting.value) setFaviconPreview(faviconSetting.value);

				// Login Settings
				const loginImageSetting = data.find(s => s.key === "login_backgroundImage");
				if (loginImageSetting && loginImageSetting.value) setLoginImagePreview(loginImageSetting.value);

				const loginLayoutSetting = data.find(s => s.key === "login_layout");
				if (loginLayoutSetting) setLoginLayout(loginLayoutSetting.value || "split_left");

				// AI Settings Load
				const aiProviderSetting = data.find(s => s.key === "aiProvider");
				if (aiProviderSetting) setAiProvider(aiProviderSetting.value);

				const aiApiKeySetting = data.find(s => s.key === "aiApiKey");
				if (aiApiKeySetting) setAiApiKey(aiApiKeySetting.value);

				const aiModelSetting = data.find(s => s.key === "aiModel");
				if (aiModelSetting) setAiModel(aiModelSetting.value);

				const aiGuidePromptSetting = data.find(s => s.key === "aiGuidePrompt");
				if (aiGuidePromptSetting) setAiGuidePrompt(aiGuidePromptSetting.value);

				const aiEnabledSetting = data.find(s => s.key === "aiEnabled");
				if (aiEnabledSetting) setAiEnabled(aiEnabledSetting.value === "true");

			} catch (err) {
				toastError(err);
			}
		};
		fetchSession();
	}, []);

	useEffect(() => {
		const socket = openSocket();

		socket.on("settings", (data) => {
			if (data.action === "update") {
				setSettings((prevState) => {
					const aux = [...prevState];
					const settingIndex = aux.findIndex((s) => s.key === data.setting.key);
					if (settingIndex >= 0) {
						aux[settingIndex].value = data.setting.value;
					}
					return aux;
				});
			}
		});

		return () => {
			socket.disconnect();
		};
	}, []);

	const handleChangeSetting = async (e) => {
		const selectedValue = e.target.value;
		const settingKey = e.target.name;

		try {
			await api.put(`/settings/${settingKey}`, {
				value: selectedValue,
			});
			toast.success(i18n.t("settings.success"));
		} catch (err) {
			toastError(err);
		}
	};

	const handleSaveTitle = async () => {
		try {
			await api.put("/settings/systemTitle", { value: systemTitle });
			toast.success("Título atualizado com sucesso!");
		} catch (err) {
			toastError(err);
		}
	};

	const handleLogoUpload = async (e) => {
		const file = e.target.files[0];
		if (!file) return;

		const formData = new FormData();
		formData.append("logo", file);

		try {
			const { data } = await api.post("/settings/logo", formData, {
				headers: { "Content-Type": "multipart/form-data" },
			});
			setLogoPreview(data.logoUrl);
			toast.success("Logo atualizada com sucesso!");
		} catch (err) {
			toastError(err);
		}
	};

	const handleToggleLogo = async () => {
		const newValue = !logoEnabled;
		setLogoEnabled(newValue);
		try {
			await api.put("/settings/systemLogoEnabled", { value: newValue ? "true" : "false" });
			toast.success(newValue ? "Logo ativada!" : "Logo desativada!");
		} catch (err) {
			toastError(err);
		}
	};

	const handleRemoveLogo = async () => {
		try {
			await api.put("/settings/systemLogo", { value: "" });
			setLogoPreview(null);
			toast.success("Logo removida com sucesso!");
		} catch (err) {
			toastError(err);
		}
	};

	const handleFaviconUpload = async (e) => {
		const file = e.target.files[0];
		if (!file) return;

		const formData = new FormData();
		formData.append("favicon", file);

		try {
			const { data } = await api.post("/settings/favicon", formData, {
				headers: { "Content-Type": "multipart/form-data" },
			});
			setFaviconPreview(data.faviconUrl);
			toast.success("Favicon atualizado com sucesso!");
			const link = document.querySelector("link[rel~='icon']") || document.createElement('link');
			link.rel = 'icon';
			link.href = `${getBackendUrl()}${data.faviconUrl}`;
			document.head.appendChild(link);
		} catch (err) {
			toastError(err);
		}
	};

	const handleRemoveFavicon = async () => {
		try {
			await api.put("/settings/systemFavicon", { value: "" });
			setFaviconPreview(null);
			toast.success("Favicon removido com sucesso!");
		} catch (err) {
			toastError(err);
		}
	};

	// New Handlers for Login Settings
	const handleLoginImageUpload = async (e) => {
		const file = e.target.files[0];
		if (!file) return;

		const formData = new FormData();
		formData.append("loginImage", file);

		try {
			const { data } = await api.post("/settings/loginImage", formData, {
				headers: { "Content-Type": "multipart/form-data" },
			});
			setLoginImagePreview(data.imageUrl);
			toast.success("Imagem de fundo atualizada com sucesso!");
		} catch (err) {
			toastError(err);
		}
	};

	const handleRemoveLoginImage = async () => {
		try {
			await api.put("/settings/login_backgroundImage", { value: "" });
			setLoginImagePreview(null);
			toast.success("Imagem de fundo removida!");
		} catch (err) {
			toastError(err);
		}
	};

	const handleLoginLayoutChange = async (e) => {
		const layout = e.target.value;
		setLoginLayout(layout);
		try {
			await api.put("/settings/login_layout", { value: layout });
			toast.success("Layout de login atualizado!");
		} catch (err) {
			toastError(err);
		}
	};

	const getSettingValue = (key) => {
		const setting = settings.find((s) => s.key === key);
		return setting ? setting.value : "";
	};

	const renderGeneralSection = () => (
		<>
			<Typography variant="h5" className={classes.sectionTitle}>
				Configurações Gerais
			</Typography>

			<Paper className={classes.paper}>
				<Typography variant="body1">
					{i18n.t("settings.settings.userCreation.name")}
				</Typography>
				<Select
					margin="dense"
					variant="outlined"
					native
					id="userCreation-setting"
					name="userCreation"
					value={settings && settings.length > 0 && getSettingValue("userCreation")}
					className={classes.settingOption}
					onChange={handleChangeSetting}
				>
					<option value="enabled">
						{i18n.t("settings.settings.userCreation.options.enabled")}
					</option>
					<option value="disabled">
						{i18n.t("settings.settings.userCreation.options.disabled")}
					</option>
				</Select>
			</Paper>

			<Paper className={classes.paper}>
				<Typography variant="body1">Tema</Typography>
				<Select
					margin="dense"
					variant="outlined"
					native
					id="theme-setting"
					name="theme"
					value={appTheme}
					className={classes.settingOption}
					onChange={(e) => setAppTheme(e.target.value)}
				>
					<option value="whaticket">Whaticket (Padrão)</option>
					<option value="saas">SaaS Premium</option>
					<option value="corporate">Corporate Theme</option>
					<option value="whatsapp">WhatsApp Theme</option>
					<option value="google">Google Like Theme</option>
					<option value="dark">Dark Mode Theme</option>
				</Select>
			</Paper>

			<Paper className={classes.paper}>
				<TextField
					id="api-token-setting"
					InputProps={{ readOnly: true }}
					label="Token Api"
					margin="dense"
					variant="outlined"
					fullWidth
					value={settings && settings.length > 0 && getSettingValue("userApiToken")}
				/>
			</Paper>
		</>
	);

	const renderCustomizeSection = () => (
		<>
			<Typography variant="h5" className={classes.sectionTitle}>
				Personalização
			</Typography>

			{/* System Title */}
			<Paper className={classes.paper} style={{ flexDirection: "column", alignItems: "stretch" }}>
				<Typography variant="body1" gutterBottom>
					Título do Sistema
				</Typography>
				<Box display="flex" alignItems="center" gap={2}>
					<TextField
						id="system-title"
						variant="outlined"
						margin="dense"
						fullWidth
						placeholder="Ex: Minha Empresa"
						value={systemTitle}
						onChange={(e) => setSystemTitle(e.target.value)}
					/>
					<Button
						variant="contained"
						color="primary"
						onClick={handleSaveTitle}
						style={{ marginLeft: 16, whiteSpace: "nowrap" }}
					>
						Salvar
					</Button>
				</Box>
			</Paper>

			{/* Logo and Favicon */}
			<Box display="flex" gap={2} flexWrap="wrap">
				<Paper className={classes.paper} style={{ flexDirection: "column", alignItems: "stretch", flex: 1, minWidth: 280 }}>
					<Box display="flex" justifyContent="space-between" alignItems="center">
						<Box>
							<Typography variant="body1" gutterBottom>
								Logo do Sistema
							</Typography>
							<Typography variant="body2" color="textSecondary">
								Exibida no topo do menu lateral
							</Typography>
						</Box>
						<FormControlLabel
							control={
								<Switch
									checked={logoEnabled}
									onChange={handleToggleLogo}
									color="primary"
									disabled={!logoPreview}
								/>
							}
							label={logoEnabled ? "Ativa" : "Inativa"}
						/>
					</Box>
					<input
						accept="image/*"
						className={classes.hiddenInput}
						id="logo-upload"
						type="file"
						onChange={handleLogoUpload}
					/>
					<label htmlFor="logo-upload">
						<Box className={classes.uploadBox}>
							{logoPreview ? (
								<img
									src={`${getBackendUrl()}${logoPreview.startsWith('/') ? logoPreview.slice(1) : logoPreview}`}
									alt="Logo"
									className={classes.logoPreview}
								/>
							) : (
								<CloudUploadIcon style={{ fontSize: 48, color: "#9ca3af" }} />
							)}
							<Typography variant="body2" color="textSecondary">
								{logoPreview ? "Clique para alterar" : "Clique para upload"}
							</Typography>
						</Box>
					</label>
					{logoPreview && (
						<Box mt={2} display="flex" justifyContent="center">
							<Button variant="outlined" color="secondary" startIcon={<DeleteIcon />} onClick={handleRemoveLogo}>
								Remover Logo
							</Button>
						</Box>
					)}
				</Paper>

				<Paper className={classes.paper} style={{ flexDirection: "column", alignItems: "stretch", flex: 1, minWidth: 280 }}>
					<Typography variant="body1" gutterBottom>
						Favicon do Sistema
					</Typography>
					<Typography variant="body2" color="textSecondary">
						Ícone da aba do navegador
					</Typography>
					<input
						accept="image/*"
						className={classes.hiddenInput}
						id="favicon-upload"
						type="file"
						onChange={handleFaviconUpload}
					/>
					<label htmlFor="favicon-upload">
						<Box className={classes.uploadBox}>
							{faviconPreview ? (
								<img
									src={`${getBackendUrl()}${faviconPreview.startsWith('/') ? faviconPreview.slice(1) : faviconPreview}`}
									alt="Favicon"
									style={{ maxWidth: 64, maxHeight: 64, objectFit: 'contain' }}
								/>
							) : (
								<CloudUploadIcon style={{ fontSize: 48, color: "#9ca3af" }} />
							)}
							<Typography variant="body2" color="textSecondary">
								{faviconPreview ? "Clique para alterar" : "Clique para upload"}
							</Typography>
						</Box>
					</label>
					{faviconPreview && (
						<Box mt={2} display="flex" justifyContent="center">
							<Button variant="outlined" color="secondary" startIcon={<DeleteIcon />} onClick={handleRemoveFavicon}>
								Remover Favicon
							</Button>
						</Box>
					)}
				</Paper>
			</Box>

			{/* Login Customization Card */}
			<Typography variant="h5" className={classes.sectionTitle} style={{ marginTop: 24 }}>
				Tela de Login
			</Typography>
			<Paper className={classes.paper} style={{ flexDirection: "column", alignItems: "stretch" }}>
				<Box display="flex" flexDirection="column" gap={2}>

					{/* Layout Selector */}
					<Box mb={2}>
						<Typography variant="body1" gutterBottom style={{ fontWeight: 600 }}>
							Posição do Formulário
						</Typography>
						<Select
							margin="dense"
							variant="outlined"
							native
							id="login-layout-setting"
							value={loginLayout}
							onChange={handleLoginLayoutChange}
							fullWidth
						>
							<option value="split_left">Formulário à Esquerda / Imagem à Direita</option>
							<option value="split_right">Formulário à Direita / Imagem à Esquerda</option>
							<option value="centered">Formulário Centralizado / Fundo Completo</option>
						</Select>
					</Box>

					<Divider />

					{/* Image Upload */}
					<Box mt={2}>
						<Typography variant="body1" gutterBottom style={{ fontWeight: 600 }}>
							Imagem de Destaque / Fundo
						</Typography>
						<Typography variant="body2" color="textSecondary">
							Escolha uma imagem para ser o destaque da tela de login.
							<br />
							<strong>Recomendado:</strong> 1920x1080px (Full HD), máximo 2MB.
						</Typography>

						<input
							accept="image/*"
							className={classes.hiddenInput}
							id="login-image-upload"
							type="file"
							onChange={handleLoginImageUpload}
						/>
						<label htmlFor="login-image-upload">
							<Box className={classes.uploadBox}>
								{loginImagePreview ? (
									<img
										src={`${getBackendUrl()}${loginImagePreview.startsWith('/') ? loginImagePreview.slice(1) : loginImagePreview}`}
										alt="Login Background"
										style={{ maxWidth: '100%', maxHeight: 300, objectFit: 'contain' }}
									/>
								) : (
									<CloudUploadIcon style={{ fontSize: 48, color: "#9ca3af" }} />
								)}
								<Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
									{loginImagePreview ? "Clique para trocar a imagem" : "Clique para fazer upload da imagem de fundo"}
								</Typography>
							</Box>
						</label>
						{loginImagePreview && (
							<Box mt={2} display="flex" justifyContent="center">
								<Button variant="outlined" color="secondary" startIcon={<DeleteIcon />} onClick={handleRemoveLoginImage}>
									Remover Imagem
								</Button>
							</Box>
						)}
					</Box>
				</Box>
			</Paper>
		</>
	);

	return (
		<Box className={classes.root}>
			<Box className={classes.sidebar}>
				<Typography variant="h6" className={classes.sidebarTitle}>
					Configurações
				</Typography>
				<Divider />
				<List>
					<ListItem
						button
						selected={activeSection === "general"}
						onClick={() => setActiveSection("general")}
						className={classes.menuItem}
					>
						<ListItemIcon>
							<SettingsIcon />
						</ListItemIcon>
						<ListItemText primary="Geral" />
					</ListItem>
					<ListItem
						button
						selected={activeSection === "customize"}
						onClick={() => setActiveSection("customize")}
						className={classes.menuItem}
					>
						<ListItemIcon>
							<PaletteIcon />
						</ListItemIcon>
						<ListItemText primary="Personalizar" />
					</ListItem>
					<ListItem
						button
						selected={activeSection === "ai"}
						onClick={() => setActiveSection("ai")}
						className={classes.menuItem}
					>
						<ListItemIcon>
							<MemoryIcon />
						</ListItemIcon>
						<ListItemText primary="Inteligência Artificial" />
					</ListItem>
				</List>
			</Box>
			<Box className={classes.content}>
				{activeSection === "general" && renderGeneralSection()}
				{activeSection === "customize" && renderCustomizeSection()}
				{activeSection === "ai" && (
					<>
						<Typography variant="h5" className={classes.sectionTitle}>
							Inteligência Artificial (IA)
						</Typography>
						<Paper className={classes.paper} style={{ display: 'block' }}>
							<Box mb={2}>
								<div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
									<div>
										<Typography variant="body1">Habilitar Uso de IA</Typography>
										<Typography variant="caption" color="textSecondary">
											Ative para disponibilizar recursos de IA em todo o sistema (Pipelines, Flow Builder, etc).
										</Typography>
									</div>
									<Switch
										checked={aiEnabled}
										onChange={async (e) => {
											const newValue = e.target.checked;
											setAiEnabled(newValue);
											await api.put("/settings/aiEnabled", { value: newValue ? "true" : "false" });
											toast.success(`IA ${newValue ? "ativada" : "desativada"} com sucesso!`);
										}}
										color="primary"
									/>
								</div>
								<Divider />
							</Box>
							<Box mb={2} style={{ opacity: aiEnabled ? 1 : 0.5, pointerEvents: aiEnabled ? 'auto' : 'none', transition: 'opacity 0.3s' }}>
								<Typography variant="body1">Provedor de IA</Typography>
								<Select
									margin="dense"
									variant="outlined"
									native
									fullWidth
									value={aiProvider}
									onChange={async (e) => {
										const newProvider = e.target.value;
										setAiProvider(newProvider);
										await api.put("/settings/aiProvider", { value: newProvider });

										// Auto-select first model available for the new provider
										const defaultModel = AI_MODELS[newProvider]?.[0]?.value || "";
										setAiModel(defaultModel);
										await api.put("/settings/aiModel", { value: defaultModel });

										toast.success("Provedor atualizado!");
									}}
								>
									<option value="openai">OpenAI (ChatGPT)</option>
									<option value="grok">xAI (Grok)</option>
								</Select>
							</Box>
							<Box mb={2}>
								<Typography variant="body1">API Key</Typography>
								<TextField
									fullWidth
									variant="outlined"
									margin="dense"
									type="password"
									value={aiApiKey}
									onChange={(e) => setAiApiKey(e.target.value)}
									onBlur={async () => {
										await api.put("/settings/aiApiKey", { value: aiApiKey });
										toast.success("API Key salva!");
									}}
									helperText="Sua chave será armazenada com segurança."
								/>
							</Box>


							<Box mb={2}>
								<Typography variant="body1">Modelo de IA</Typography>
								<Select
									margin="dense"
									variant="outlined"
									native
									fullWidth
									value={aiModel}
									onChange={async (e) => {
										setAiModel(e.target.value);
										await api.put("/settings/aiModel", { value: e.target.value });
										toast.success("Modelo atualizado!");
									}}
								>
									<option value="" disabled>Selecione um modelo</option>
									{AI_MODELS[aiProvider]?.map((model) => (
										<option key={model.value} value={model.value}>
											{model.name} — {model.price}
										</option>
									))}
								</Select>
								<Typography variant="caption" color="textSecondary">
									Selecione o modelo desejado. Os preços são estimativas para tokens de entrada.
								</Typography>
							</Box>
							<Box mb={2}>
								<Typography variant="body1">Prompt Guia (Contexto do Negócio)</Typography>
								<TextField
									fullWidth
									variant="outlined"
									margin="dense"
									multiline
									rows={4}
									placeholder="Ex: Somos uma imobiliária de alto padrão. Sempre use linguagem formal e foque em etapas de qualificação de leads."
									value={aiGuidePrompt}
									onChange={(e) => setAiGuidePrompt(e.target.value)}
									onBlur={async () => {
										await api.put("/settings/aiGuidePrompt", { value: aiGuidePrompt });
										toast.success("Prompt guia atualizado!");
									}}
									helperText="Esse texto será enviado para a IA como contexto global para entender melhor o seu negócio."
								/>
							</Box>
						</Paper>
					</>
				)}
			</Box>
		</Box>
	);
};

export default Settings;
