import React, { useState, useEffect } from "react";
import {
    Container,
    Paper,
    Typography,
    Box,
    Button,
    Chip,
    Grid,
    Divider,
    CircularProgress,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
} from "@material-ui/core";
import {
    ArrowBack as ArrowBackIcon,
    Extension as ExtensionIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
} from "@material-ui/icons";
import { makeStyles } from "@material-ui/core/styles";
import { useParams, useHistory } from "react-router-dom";
import { toast } from "react-toastify";

const useStyles = makeStyles((theme) => ({
    root: {
        padding: theme.spacing(3),
    },
    backButton: {
        marginBottom: theme.spacing(2),
    },
    header: {
        display: "flex",
        alignItems: "flex-start",
        gap: theme.spacing(3),
        marginBottom: theme.spacing(3),
    },
    iconBox: {
        width: 120,
        height: 120,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.palette.grey[100],
        borderRadius: theme.shape.borderRadius,
    },
    icon: {
        fontSize: 64,
        color: theme.palette.primary.main,
    },
    chipFree: {
        backgroundColor: theme.palette.success.main,
        color: "#fff",
    },
    chipPremium: {
        backgroundColor: theme.palette.warning.main,
        color: "#fff",
    },
    section: {
        marginTop: theme.spacing(3),
    },
    actionButtons: {
        display: "flex",
        gap: theme.spacing(2),
        marginTop: theme.spacing(3),
    },
    loader: {
        display: "flex",
        justifyContent: "center",
        padding: theme.spacing(4),
    },
}));

const PluginDetail = () => {
    const classes = useStyles();
    const { slug } = useParams();
    const history = useHistory();
    const [plugin, setPlugin] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activating, setActivating] = useState(false);
    const [licenseDialogOpen, setLicenseDialogOpen] = useState(false);
    const [licenseKey, setLicenseKey] = useState("");

    useEffect(() => {
        loadPlugin();
    }, [slug]);

    const loadPlugin = async () => {
        try {
            setLoading(true);
            // TODO: Replace with actual API call
            const mockPlugins = {
                clientes: {
                    id: "550e8400-e29b-41d4-a716-446655440001",
                    slug: "clientes",
                    name: "Plugin de Clientes",
                    description: "Gestão completa de clientes com múltiplos contatos e endereços. Integração ViaCEP.",
                    longDescription: `
O Plugin de Clientes adiciona ao Watink uma gestão completa de clientes, permitindo:

• Cadastro detalhado de clientes (pessoa física e jurídica)
• Múltiplos contatos vinculados ao mesmo cliente
• Múltiplos endereços por cliente
• Integração automática com API ViaCEP para autocompletar endereços
• Vinculação de contatos do WhatsApp a clientes cadastrados
• Histórico de interações por cliente
          `,
                    version: "1.0.0",
                    type: "free",
                    category: "gestao",
                    installed: false,
                    active: false,
                },
                helpdesk: {
                    id: "550e8400-e29b-41d4-a716-446655440002",
                    slug: "helpdesk",
                    name: "Plugin de Helpdesk",
                    description: "Sistema de protocolos de atendimento vinculados a tickets.",
                    longDescription: `
O Plugin de Helpdesk transforma seu atendimento em um sistema de suporte profissional:

• Criação de protocolos de atendimento
• Botão integrado no drawer do contato para criar protocolos
• Vinculação de protocolos a tickets
• Gestão de status, prioridade e SLA
• Histórico completo de interações no protocolo
• Relatórios de atendimento
          `,
                    version: "1.0.0",
                    type: "free",
                    category: "suporte",
                    installed: false,
                    active: false,
                },
                whatsmeow: {
                    id: "550e8400-e29b-41d4-a716-446655440003",
                    slug: "whatsmeow",
                    name: "Motor WhatsMeow",
                    description: "Engine de alta performance em Go para conexões WhatsApp.",
                    longDescription: `
O Motor WhatsMeow é uma engine de alta performance desenvolvida em Go:

• Performance 10x superior ao motor padrão
• Menor consumo de memória
• Conexões mais estáveis
• Ideal para alto volume de mensagens
• Suporte a múltiplas conexões simultâneas
          `,
                    version: "1.0.0",
                    type: "premium",
                    price: 199.90,
                    category: "engine",
                    installed: false,
                    active: false,
                },
            };
            setPlugin(mockPlugins[slug] || null);
        } catch (err) {
            toast.error("Erro ao carregar plugin");
        } finally {
            setLoading(false);
        }
    };

    const handleActivate = async () => {
        if (plugin.type === "premium" && !plugin.installed) {
            setLicenseDialogOpen(true);
            return;
        }

        try {
            setActivating(true);
            // TODO: Call API to activate plugin
            await new Promise((resolve) => setTimeout(resolve, 1000));
            toast.success(`Plugin ${plugin.name} ativado com sucesso!`);
            setPlugin({ ...plugin, installed: true, active: true });
        } catch (err) {
            toast.error("Erro ao ativar plugin");
        } finally {
            setActivating(false);
        }
    };

    const handleDeactivate = async () => {
        try {
            setActivating(true);
            // TODO: Call API to deactivate plugin
            await new Promise((resolve) => setTimeout(resolve, 1000));
            toast.success(`Plugin ${plugin.name} desativado.`);
            setPlugin({ ...plugin, active: false });
        } catch (err) {
            toast.error("Erro ao desativar plugin");
        } finally {
            setActivating(false);
        }
    };

    const handleLicenseSubmit = async () => {
        if (!licenseKey.trim()) {
            toast.error("Informe a chave de licença");
            return;
        }

        try {
            setActivating(true);
            // TODO: Call API to validate license and activate
            await new Promise((resolve) => setTimeout(resolve, 1000));
            toast.success(`Plugin ${plugin.name} ativado com sucesso!`);
            setPlugin({ ...plugin, installed: true, active: true });
            setLicenseDialogOpen(false);
            setLicenseKey("");
        } catch (err) {
            toast.error("Chave de licença inválida");
        } finally {
            setActivating(false);
        }
    };

    if (loading) {
        return (
            <Container maxWidth="lg" className={classes.root}>
                <Box className={classes.loader}>
                    <CircularProgress />
                </Box>
            </Container>
        );
    }

    if (!plugin) {
        return (
            <Container maxWidth="lg" className={classes.root}>
                <Typography>Plugin não encontrado</Typography>
            </Container>
        );
    }

    return (
        <Container maxWidth="lg" className={classes.root}>
            <Button
                startIcon={<ArrowBackIcon />}
                className={classes.backButton}
                onClick={() => history.push("/admin/settings/marketplace")}
            >
                Voltar ao Marketplace
            </Button>

            <Paper elevation={0} style={{ padding: 24 }}>
                <Box className={classes.header}>
                    <Box className={classes.iconBox}>
                        <ExtensionIcon className={classes.icon} />
                    </Box>
                    <Box flex={1}>
                        <Box display="flex" alignItems="center" gap={2}>
                            <Typography variant="h4">{plugin.name}</Typography>
                            {plugin.active && (
                                <CheckCircleIcon style={{ color: "green", marginLeft: 8 }} />
                            )}
                        </Box>
                        <Box mt={1} display="flex" gap={1}>
                            <Chip
                                label={plugin.type === "free" ? "Gratuito" : `R$ ${plugin.price}`}
                                className={plugin.type === "free" ? classes.chipFree : classes.chipPremium}
                            />
                            <Chip label={`v${plugin.version}`} variant="outlined" />
                            <Chip label={plugin.category} variant="outlined" />
                        </Box>
                        <Typography variant="body1" color="textSecondary" style={{ marginTop: 8 }}>
                            {plugin.description}
                        </Typography>
                    </Box>
                </Box>

                <Divider />

                <Box className={classes.section}>
                    <Typography variant="h6" gutterBottom>
                        Sobre este plugin
                    </Typography>
                    <Typography variant="body1" style={{ whiteSpace: "pre-line" }}>
                        {plugin.longDescription}
                    </Typography>
                </Box>

                <Box className={classes.actionButtons}>
                    {plugin.active ? (
                        <Button
                            variant="outlined"
                            color="secondary"
                            startIcon={<CancelIcon />}
                            onClick={handleDeactivate}
                            disabled={activating}
                        >
                            {activating ? <CircularProgress size={20} /> : "Desativar Plugin"}
                        </Button>
                    ) : (
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<CheckCircleIcon />}
                            onClick={handleActivate}
                            disabled={activating}
                        >
                            {activating ? <CircularProgress size={20} /> : "Ativar Plugin"}
                        </Button>
                    )}
                </Box>
            </Paper>

            {/* License Key Dialog */}
            <Dialog open={licenseDialogOpen} onClose={() => setLicenseDialogOpen(false)}>
                <DialogTitle>Ativar Plugin Premium</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" gutterBottom>
                        Este é um plugin premium. Insira sua chave de licença para ativar.
                    </Typography>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Chave de Licença"
                        fullWidth
                        variant="outlined"
                        value={licenseKey}
                        onChange={(e) => setLicenseKey(e.target.value)}
                        placeholder="XXXX-XXXX-XXXX-XXXX"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setLicenseDialogOpen(false)}>Cancelar</Button>
                    <Button
                        onClick={handleLicenseSubmit}
                        color="primary"
                        variant="contained"
                        disabled={activating}
                    >
                        {activating ? <CircularProgress size={20} /> : "Ativar"}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default PluginDetail;
