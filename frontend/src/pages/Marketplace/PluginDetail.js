/* @jsxImportSource react */
import React, { useState, useEffect } from "react";
import {
    Container,
    Paper,
    Typography,
    Box,
    Button,
    Chip,
    Divider,
    CircularProgress,
} from "@material-ui/core";
import {
    ArrowBack as ArrowBackIcon,
    Extension as ExtensionIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
} from "@material-ui/icons";
import { makeStyles } from "@material-ui/core/styles";
import { useParams, useHistory, useLocation } from "react-router-dom";
import { useContext } from "react";
import { AuthContext } from "../../context/Auth/AuthContext";
import { Can } from "../../components/Can";
import pluginApi from "../../services/pluginApi";
import { toast } from "react-toastify";
import { getBackendUrl } from "../../helpers/urlUtils";

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
    chipBusiness: {
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

const longDescriptionBySlug = (slug) => {
    if (slug === "clientes") {
        return `O Plugin de Clientes adiciona ao Watink uma gestão completa de clientes, permitindo:\n\n• Cadastro detalhado de clientes (pessoa física e jurídica)\n• Múltiplos contatos vinculados ao mesmo cliente\n• Múltiplos endereços por cliente\n• Integração automática com API ViaCEP para autocompletar endereços\n• Vinculação de contatos do WhatsApp a clientes cadastrados\n• Histórico de interações por cliente`;
    }

    if (slug === "helpdesk") {
        return `O Plugin de Helpdesk transforma seu atendimento em um sistema de suporte profissional:\n\n• Criação de protocolos de atendimento\n• Vinculação de protocolos a tickets\n• Gestão de status, prioridade e SLA\n• Histórico completo de interações no protocolo\n• Relatórios de atendimento`;
    }

    return "Plugin profissional para expandir recursos do Watink no seu ambiente.";
};

const PluginDetail = () => {
    const classes = useStyles();
    const { slug } = useParams();
    const history = useHistory();
    const location = useLocation();
    const { user } = useContext(AuthContext);
    const [plugin, setPlugin] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activating, setActivating] = useState(false);
    const [waitingPayment, setWaitingPayment] = useState(false);

    useEffect(() => {
        loadPlugin();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug]);

    useEffect(() => {
        const search = new URLSearchParams(location.search);
        const status = search.get("checkout") || search.get("status");
        if (status === "approved" || status === "success") {
            toast.success("Pagamento aprovado. Atualizando licenças...");
            setWaitingPayment(true);
            loadPlugin();
        } else if (status === "pending") {
            toast.info("Pagamento pendente. Vamos atualizar automaticamente.");
            setWaitingPayment(true);
        } else if (status === "failure" || status === "rejected") {
            toast.error("Pagamento não concluído. Tente novamente.");
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.search]);

    useEffect(() => {
        if (!waitingPayment) return undefined;

        const intervalId = setInterval(() => {
            loadPlugin();
        }, 15000);

        const timeoutId = setTimeout(() => {
            setWaitingPayment(false);
        }, 10 * 60 * 1000);

        return () => {
            clearInterval(intervalId);
            clearTimeout(timeoutId);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [waitingPayment]);

    const loadPlugin = async () => {
        try {
            setLoading(true);
            const [{ data: catalogRes }, { data: installedRes }] = await Promise.all([
                pluginApi.get("/plugins/catalog"),
                pluginApi.get("/plugins/installed"),
            ]);

            const all = Array.isArray(catalogRes?.plugins) ? catalogRes.plugins : [];
            const active = new Set(Array.isArray(installedRes?.active) ? installedRes.active : []);
            const p = all.find((x) => x.slug === slug);

            if (!p) {
                setPlugin(null);
                return;
            }

            const isLicensed = active.has(p.slug);
            setPlugin({
                ...p,
                installed: isLicensed,
                active: isLicensed,
                iconUrl: `/public/plugins/${p.slug}.png`,
                longDescription: longDescriptionBySlug(p.slug),
            });

            if (isLicensed) {
                setWaitingPayment(false);
            }
        } catch (err) {
            toast.error("Erro ao carregar plugin");
        } finally {
            setLoading(false);
        }
    };

    const handleActivate = async () => {
        try {
            setActivating(true);
            await pluginApi.post(`/plugins/${plugin.slug}/activate`);
            toast.success(`Plugin ${plugin.name} ativado com sucesso!`);
            setPlugin({ ...plugin, installed: true, active: true });
            setTimeout(() => window.location.reload(), 1000);
        } catch (err) {
            toast.error("Erro ao ativar plugin");
        } finally {
            setActivating(false);
        }
    };

    const handleSubscribe = async () => {
        try {
            setActivating(true);
            const { data } = await pluginApi.post("/plugins/checkout", { slug: plugin.slug });
            if (!data?.checkoutUrl) {
                throw new Error("checkoutUrl ausente");
            }
            setWaitingPayment(true);
            window.open(data.checkoutUrl, "_blank", "noopener,noreferrer");
            toast.info("Checkout aberto. Vamos atualizar a licença automaticamente.");
        } catch (err) {
            const apiError = err?.response?.data?.error;
            toast.error(apiError || "Não foi possível iniciar checkout");
        } finally {
            setActivating(false);
        }
    };

    const handleDeactivate = async () => {
        try {
            setActivating(true);
            await pluginApi.post(`/plugins/${plugin.slug}/deactivate`);
            toast.success(`Plugin ${plugin.name} desativado.`);
            setPlugin({ ...plugin, active: false });
            setTimeout(() => window.location.reload(), 1000);
        } catch (err) {
            toast.error("Erro ao desativar plugin");
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
        <Can
            user={user}
            perform="view_marketplace"
            yes={() => (
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
                                {plugin.iconUrl ? (
                                    <img src={getBackendUrl(plugin.iconUrl)} alt={plugin.name} style={{ width: 80, height: 80 }} />
                                ) : (
                                    <ExtensionIcon className={classes.icon} />
                                )}
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
                                        className={plugin.type === "free" ? classes.chipFree : classes.chipBusiness}
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
                            ) : plugin.type !== "free" && !plugin.installed ? (
                                <>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        startIcon={<CheckCircleIcon />}
                                        onClick={handleSubscribe}
                                        disabled={activating}
                                    >
                                        {activating ? <CircularProgress size={20} /> : "Assinar Plugin"}
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        onClick={loadPlugin}
                                        disabled={activating}
                                    >
                                        {waitingPayment ? "Atualizando licença..." : "Atualizar licença"}
                                    </Button>
                                </>
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
                </Container>
            )}
            no={() => (
                <Container maxWidth="lg" className={classes.root}>
                    <Typography variant="h5">Sem permissão</Typography>
                    <Typography variant="body2" color="textSecondary">
                        Apenas o Admin pode acessar o Marketplace.
                    </Typography>
                </Container>
            )}
        />
    );
};

export default PluginDetail;
