import React, { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useHistory } from "react-router-dom";
import { makeStyles } from "@material-ui/core/styles";
import {
    Paper,
    Typography,
    Button,
    Grid,
    CircularProgress,
    Box,
    IconButton,
    Avatar,
    Tooltip,
    LinearProgress
} from "@material-ui/core";
import {
    ArrowBack,
    Edit,
    CheckCircle,
    ErrorOutline,
} from "@material-ui/icons";
import QRCode from "qrcode.react";
import { format, parseISO } from "date-fns";
import ptBR from "date-fns/locale/pt-BR";

import api from "../../services/api";
import toastError from "../../errors/toastError";
import WhatsAppModal from "../../components/WhatsAppModal";
import openSocket from "../../services/socket-io";
import ConfirmationModal from "../../components/ConfirmationModal";
import { i18n } from "../../translate/i18n";
import { toast } from "react-toastify";

const useStyles = makeStyles(theme => ({
    root: {
        padding: theme.spacing(0),
        background: "linear-gradient(180deg, #F5F5F7 0%, #FFFFFF 100%)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
    },
    mainContainer: {
        padding: theme.spacing(3),
        maxWidth: 1200,
        margin: "0 auto",
        width: "100%",
    },
    header: {
        padding: theme.spacing(2, 4),
        background: "rgba(255, 255, 255, 0.8)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(0, 0, 0, 0.1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        position: "sticky",
        top: 0,
        zIndex: 1000,
    },
    title: {
        fontWeight: 700,
        fontSize: "1.25rem",
        color: "#1d1d1f",
        letterSpacing: "-0.02em",
    },
    // Apple Glassmorphism Card Style
    glassCard: {
        background: "rgba(255, 255, 255, 0.7)",
        backdropFilter: "blur(20px)",
        borderRadius: "24px",
        border: "1px solid rgba(0, 0, 0, 0.05)",
        boxShadow: "0 10px 40px rgba(0, 0, 0, 0.04)",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        padding: theme.spacing(4),
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    },
    statusContainer: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: theme.spacing(2),
        [theme.breakpoints.down('sm')]: {
            flexDirection: "column",
            alignItems: "flex-start",
        }
    },
    statusBadge: {
        padding: "6px 14px",
        borderRadius: "100px",
        fontWeight: 600,
        fontSize: "0.85rem",
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
    },
    actionButton: {
        borderRadius: "12px",
        padding: "10px 20px",
        fontWeight: 600,
        textTransform: "none",
        fontSize: "0.95rem",
        boxShadow: "none",
        transition: "all 0.2s ease",
        "&:hover": {
            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }
    },
    primaryButton: {
        backgroundColor: "#007AFF",
        color: "#fff",
        "&:hover": {
            backgroundColor: "#0062CC",
        }
    },
    secondaryButton: {
        backgroundColor: "rgba(0, 0, 0, 0.05)",
        color: "#1d1d1f",
        "&:hover": {
            backgroundColor: "rgba(0, 0, 0, 0.1)",
        }
    },
    dangerButton: {
        backgroundColor: "#FF3B30",
        color: "#fff",
        "&:hover": {
            backgroundColor: "#E03126",
        }
    },
    qrCodeContainer: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: theme.spacing(4),
        background: "#fff",
        borderRadius: "24px",
        boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
        marginTop: theme.spacing(2),
    },
    detailItem: {
        display: "flex",
        alignItems: "center",
        padding: theme.spacing(2),
        borderRadius: "16px",
        background: "rgba(0, 0, 0, 0.02)",
        marginBottom: theme.spacing(1.5),
        border: "1px solid rgba(0, 0, 0, 0.03)",
        "& svg": {
            color: "#8e8e93",
            marginRight: theme.spacing(2),
        }
    },
    statsValue: {
        fontWeight: 600,
        color: "#1d1d1f",
    },
    statsLabel: {
        color: "#8e8e93",
        fontSize: "0.75rem",
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        fontWeight: 600,
    },
    avatarGlow: {
        position: 'relative',
        '&::after': {
            content: '""',
            position: 'absolute',
            top: -4,
            left: -4,
            right: -4,
            bottom: -4,
            borderRadius: '50%',
            border: '2px solid transparent',
            animation: '$pulse 2s infinite',
        }
    },
    '@keyframes pulse': {
        '0%': { transform: 'scale(1)', opacity: 1 },
        '70%': { transform: 'scale(1.1)', opacity: 0 },
        '100%': { transform: 'scale(1.1)', opacity: 0 },
    },
    connectedPulse: {
        '&::after': { borderColor: '#34C759' }
    },
    disconnectedPulse: {
        '&::after': { borderColor: '#FF3B30' }
    },
    waitingPulse: {
        '&::after': { borderColor: '#007AFF' }
    }
}));

const QR_AUTO_REFRESH_INTERVAL_MS = 18000;
const QR_AUTO_REFRESH_MAX_WINDOW_MS = 2 * 60 * 1000;

const ConnectionConfig = () => {
    const classes = useStyles();
    const history = useHistory();
    const { whatsappId } = useParams();

    const [whatsapp, setWhatsapp] = useState(null);
    const [loading, setLoading] = useState(true);
    const [whatsappModalOpen, setWhatsAppModalOpen] = useState(false);
    const [confirmationOpen, setConfirmationOpen] = useState(false);
    const [confirmationAction, setConfirmationAction] = useState(null);
    const [connecting, setConnecting] = useState(false);
    const [showQrCode, setShowQrCode] = useState(false);
    const [autoRefreshActive, setAutoRefreshActive] = useState(false);
    const [autoRefreshAttempts, setAutoRefreshAttempts] = useState(0);
    const [autoRefreshError, setAutoRefreshError] = useState("");

    const autoRefreshTimerRef = useRef(null);
    const autoRefreshDeadlineRef = useRef(null);
    const requestInFlightRef = useRef(false);
    const statusRef = useRef("");

    const fetchWhatsapp = useCallback(async () => {
        try {
            const { data } = await api.get(`/whatsapp/${whatsappId}`);
            setWhatsapp(data);
            setLoading(false);
        } catch (err) {
            toastError(err);
            setLoading(false);
        }
    }, [whatsappId]);

    const normalizedStatus = (whatsapp?.status || "").toUpperCase();
    const isWaitingForQr = normalizedStatus === "QRCODE" || normalizedStatus === "OPENING";

    const clearAutoRefreshCycle = useCallback(() => {
        if (autoRefreshTimerRef.current) {
            clearTimeout(autoRefreshTimerRef.current);
            autoRefreshTimerRef.current = null;
        }
        autoRefreshDeadlineRef.current = null;
        setAutoRefreshActive(false);
    }, []);

    const requestQrRestart = useCallback(async ({ silent = false } = {}) => {
        if (requestInFlightRef.current) return false;

        requestInFlightRef.current = true;
        if (!silent) {
            setConnecting(true);
        }

        try {
            await api.post(`/whatsappsession/${whatsappId}`, { usePairingCode: false });
            setAutoRefreshError("");
            return true;
        } catch (err) {
            setAutoRefreshError("Não foi possível renovar o QR agora. Vamos tentar novamente em instantes.");
            if (!silent) {
                toast.warning("Não foi possível reiniciar o QR Code agora. Tente novamente em alguns segundos.");
            }
            return false;
        } finally {
            requestInFlightRef.current = false;
            if (!silent) {
                setConnecting(false);
            }
        }
    }, [whatsappId]);

    useEffect(() => {
        fetchWhatsapp();
    }, [fetchWhatsapp]);

    useEffect(() => {
        const socket = openSocket();

        if (!socket) return;

        socket.on("whatsappSession", (data) => {
            if (data.action === "update" && data.session.id === parseInt(whatsappId)) {
                setWhatsapp(prev => ({ ...(prev || {}), ...data.session }));

                if (data.session.status === "CONNECTED") {
                    setShowQrCode(false);
                    setConnecting(false);
                }

                if (data.session.status === "DISCONNECTED" || data.session.status === "SESSION_EXPIRED") {
                    setShowQrCode(false);
                    setConnecting(false);
                }
            }
        });

        socket.on("whatsapp", (data) => {
            if (data.action === "update" && data.whatsapp.id === parseInt(whatsappId)) {
                setWhatsapp(prev => ({ ...(prev || {}), ...data.whatsapp }));
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [whatsappId]);

    useEffect(() => {
        statusRef.current = normalizedStatus;

        if (isWaitingForQr) {
            setShowQrCode(true);
        }

        if (normalizedStatus === "CONNECTED") {
            clearAutoRefreshCycle();
            setConnecting(false);
            setAutoRefreshAttempts(0);
            setAutoRefreshError("");
        }
    }, [normalizedStatus, isWaitingForQr, clearAutoRefreshCycle]);

    useEffect(() => {
        if (!isWaitingForQr) {
            clearAutoRefreshCycle();
            return;
        }

        if (!autoRefreshDeadlineRef.current) {
            autoRefreshDeadlineRef.current = Date.now() + QR_AUTO_REFRESH_MAX_WINDOW_MS;
            setAutoRefreshActive(true);
            setAutoRefreshAttempts(0);
            setAutoRefreshError("");
        }

        const scheduleNext = () => {
            const deadline = autoRefreshDeadlineRef.current;
            if (!deadline) return;

            const remaining = deadline - Date.now();
            if (remaining <= 0) {
                clearAutoRefreshCycle();
                return;
            }

            autoRefreshTimerRef.current = setTimeout(async () => {
                if (statusRef.current !== "QRCODE" && statusRef.current !== "OPENING") {
                    clearAutoRefreshCycle();
                    return;
                }

                await requestQrRestart({ silent: true });
                setAutoRefreshAttempts(prev => prev + 1);
                scheduleNext();
            }, Math.min(QR_AUTO_REFRESH_INTERVAL_MS, remaining));
        };

        if (!autoRefreshTimerRef.current) {
            scheduleNext();
        }

        return () => {
            if (autoRefreshTimerRef.current) {
                clearTimeout(autoRefreshTimerRef.current);
                autoRefreshTimerRef.current = null;
            }
        };
    }, [isWaitingForQr, clearAutoRefreshCycle, requestQrRestart]);

    const handleStartSession = async () => {
        setShowQrCode(true);
        await requestQrRestart({ silent: false });
    };

    const handleDisconnect = async () => {
        try {
            await api.delete(`/whatsappsession/${whatsappId}`);
        } catch (err) {
            toastError(err);
        }
        setConfirmationOpen(false);
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/whatsapp/${whatsappId}`);
            history.push("/connections");
        } catch (err) {
            toastError(err);
        }
        setConfirmationOpen(false);
    };

    useEffect(() => {
        return () => clearAutoRefreshCycle();
    }, [clearAutoRefreshCycle]);

    const getStatusColor = (status) => {
        switch (status) {
            case "CONNECTED": return "#34C759"; // Apple Green
            case "DISCONNECTED": return "#FF3B30"; // Apple Red
            case "SESSION_EXPIRED": return "#FF3B30"; 
            case "QRCODE": return "#007AFF"; // Apple Blue
            case "OPENING": return "#007AFF";
            case "TIMEOUT": return "#FF9500"; // Apple Orange
            default: return "#8E8E93"; // Apple Gray
        }
    };

    const getStatusText = (status) => {
        const map = {
            CONNECTED: "Conectado",
            DISCONNECTED: "Desconectado",
            SESSION_EXPIRED: "Sessão Expirada",
            QRCODE: "Aguardando Leitura",
            OPENING: "Iniciando...",
            TIMEOUT: "Tempo Esgotado"
        };
        return map[status] || status;
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
                <CircularProgress />
            </Box>
        );
    }

    if (!whatsapp) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
                <Typography variant="body1" style={{ color: "#8e8e93" }}>
                    Conexão não encontrada.
                </Typography>
            </Box>
        );
    }

    return (
        <div className={classes.root}>
            <ConfirmationModal
                title={confirmationAction === "disconnect" ? i18n.t("connections.confirmationModal.disconnectTitle") : i18n.t("connections.confirmationModal.deleteTitle")}
                open={confirmationOpen}
                onClose={() => setConfirmationOpen(false)}
                onConfirm={confirmationAction === "disconnect" ? handleDisconnect : handleDelete}
            >
                {confirmationAction === "disconnect" ? i18n.t("connections.confirmationModal.disconnectMessage") : i18n.t("connections.confirmationModal.deleteMessage")}
            </ConfirmationModal>

            <WhatsAppModal
                open={whatsappModalOpen}
                onClose={() => { setWhatsAppModalOpen(false); fetchWhatsapp(); }}
                whatsAppId={whatsappId}
            />

            <header className={classes.header}>
                <Box display="flex" alignItems="center">
                    <IconButton onClick={() => history.push("/connections")} style={{ marginRight: 16 }}>
                        <ArrowBack style={{ color: "#1d1d1f" }} />
                    </IconButton>
                    <Typography className={classes.title}>
                        {whatsapp.name}
                    </Typography>
                    <Tooltip title="Ajustes de Conexão">
                        <IconButton size="small" onClick={() => setWhatsAppModalOpen(true)} style={{ marginLeft: 12, backgroundColor: "rgba(0,0,0,0.05)" }}>
                            <Edit fontSize="small" style={{ color: "#1d1d1f" }} />
                        </IconButton>
                    </Tooltip>
                </Box>
                <Box display="flex" gap={1}>
                    {whatsapp.status === "CONNECTED" && (
                        <Button
                            variant="contained"
                            className={`${classes.actionButton} ${classes.dangerButton}`}
                            onClick={() => { setConfirmationAction("disconnect"); setConfirmationOpen(true); }}
                        >
                            Desconectar
                        </Button>
                    )}
                </Box>
            </header>

            <div className={classes.mainContainer}>
                <Grid container spacing={4}>
                    {/* Main Status Area */}
                    <Grid item xs={12} md={7}>
                        <Paper className={classes.glassCard} elevation={0}>
                            <Box className={classes.statusContainer}>
                                <Box display="flex" alignItems="center">
                                    <div className={`${classes.avatarGlow} ${normalizedStatus === 'CONNECTED' ? classes.connectedPulse : (isWaitingForQr ? classes.waitingPulse : classes.disconnectedPulse)}`}>
                                        <Avatar
                                            src={whatsapp.profilePicUrl}
                                            style={{ width: 80, height: 80, border: '4px solid #fff', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                        />
                                    </div>
                                    <Box ml={3}>
                                        <Typography variant="h5" style={{ fontWeight: 700, color: "#1d1d1f" }}>
                                            {whatsapp.name}
                                        </Typography>
                                        <Typography variant="body2" style={{ color: "#8e8e93", marginTop: 4 }}>
                                            {whatsapp.number ? `+${whatsapp.number}` : "Aguardando vinculação..."}
                                        </Typography>
                                        <Box mt={1.5}>
                                            <span 
                                                className={classes.statusBadge} 
                                                style={{ 
                                                    backgroundColor: getStatusColor(whatsapp.status) + '15', 
                                                    color: getStatusColor(whatsapp.status) 
                                                }}
                                            >
                                                {whatsapp.status === "CONNECTED" ? <CheckCircle style={{ fontSize: 16 }} /> : <ErrorOutline style={{ fontSize: 16 }} />}
                                                {getStatusText(whatsapp.status)}
                                            </span>
                                        </Box>
                                    </Box>
                                </Box>
                            </Box>

                            <Box mt={6} flexGrow={1} display="flex" flexDirection="column" alignItems="center" justifyContent="center">
                                {whatsapp.status === "CONNECTED" ? (
                                    <Box textAlign="center">
                                        <div style={{ position: 'relative', display: 'inline-block' }}>
                                            <CheckCircle style={{ fontSize: 100, color: '#34C759' }} />
                                            <div style={{ 
                                                position: 'absolute', 
                                                top: 0, 
                                                left: 0, 
                                                right: 0, 
                                                bottom: 0, 
                                                borderRadius: '50%', 
                                                boxShadow: '0 0 40px rgba(52, 199, 89, 0.3)',
                                                zIndex: -1 
                                            }} />
                                        </div>
                                        <Typography variant="h6" style={{ fontWeight: 700, marginTop: 32, color: "#1d1d1f" }}>
                                            Conexão Ativa
                                        </Typography>
                                        <Typography variant="body1" style={{ color: "#8e8e93", maxWidth: 400, margin: '12px auto' }}>
                                            Sua instância está operacional e pronta para enviar/receber mensagens.
                                        </Typography>
                                    </Box>
                                ) : isWaitingForQr && showQrCode ? (
                                    <Box className={classes.qrCodeContainer}>
                                        <Typography variant="body1" style={{ fontWeight: 600, color: "#1d1d1f", marginBottom: 20 }}>
                                            Escaneie o QR Code abaixo
                                        </Typography>
                                        <Box p={2} style={{ background: '#fff', borderRadius: 16 }}>
                                            {whatsapp.qrcode ? (
                                                <QRCode value={whatsapp.qrcode} size={240} renderAs="svg" />
                                            ) : (
                                                <CircularProgress size={40} />
                                            )}
                                        </Box>
                                        <Box mt={3} textAlign="center">
                                            <Typography variant="caption" style={{ color: "#8e8e93" }}>
                                                {"Abra o WhatsApp > Configurações > Dispositivos Conectados"}
                                            </Typography>
                                        </Box>

                                        <Box mt={2} width="100%" textAlign="center">
                                            <Button
                                                variant="outlined"
                                                className={classes.actionButton}
                                                onClick={handleStartSession}
                                                disabled={connecting}
                                            >
                                                {connecting ? "Reiniciando..." : "Reiniciar QR Code"}
                                            </Button>
                                        </Box>

                                        {autoRefreshActive && (
                                            <Box mt={2} width="100%" maxWidth={340}>
                                                <LinearProgress />
                                                <Typography variant="caption" style={{ color: "#8e8e93", display: "block", marginTop: 8 }}>
                                                    Atualização automática ativa por até 2 minutos ({autoRefreshAttempts} tentativa{autoRefreshAttempts === 1 ? "" : "s"}).
                                                </Typography>
                                            </Box>
                                        )}

                                        {autoRefreshError && (
                                            <Typography variant="caption" style={{ color: "#FF3B30", marginTop: 10, textAlign: "center" }}>
                                                {autoRefreshError}
                                            </Typography>
                                        )}
                                    </Box>
                                ) : (
                                    <Box textAlign="center">
                                        <ErrorOutline style={{ fontSize: 80, color: '#FF3B30', opacity: 0.5 }} />
                                        {whatsapp.status === "SESSION_EXPIRED" && (
                                            <Typography variant="h6" style={{ fontWeight: 600, color: "#FF3B30", marginTop: 24 }}>
                                                Sessão Expirada
                                            </Typography>
                                        )}
                                        <Typography variant="body1" style={{ color: "#8e8e93", marginTop: 12, maxWidth: 300 }}>
                                            Clique no botão abaixo para iniciar uma nova conexão segura.
                                        </Typography>
                                        
                                        <Box mt={4}>
                                            <Button
                                                variant="contained"
                                                className={`${classes.actionButton} ${classes.primaryButton}`}
                                                onClick={handleStartSession}
                                                disabled={connecting}
                                                startIcon={connecting ? <CircularProgress size={16} color="inherit" /> : null}
                                            >
                                                {connecting ? "Iniciando..." : "Conectar WhatsApp"}
                                            </Button>
                                        </Box>
                                    </Box>
                                )}
                            </Box>

                            {whatsapp.status !== "CONNECTED" && !connecting && (
                                <Box mt={4} display="flex" justifyContent="center">
                                    <Button
                                        variant="text"
                                        style={{ color: "#FF3B30", fontWeight: 600 }}
                                        onClick={() => { setConfirmationAction("delete"); setConfirmationOpen(true); }}
                                    >
                                        Remover Instância
                                    </Button>
                                </Box>
                            )}
                        </Paper>
                    </Grid>

                    {/* Info & Stats Sidebar */}
                    <Grid item xs={12} md={5}>
                        <Box display="flex" flexDirection="column" gap={3}>
                            <Paper className={classes.glassCard} elevation={0} style={{ padding: '24px' }}>
                                <Typography variant="subtitle2" className={classes.statsLabel} gutterBottom>
                                    Estatísticas de Uso
                                </Typography>
                                
                                <Grid container spacing={2} style={{ marginTop: 8 }}>
                                    <Grid item xs={6}>
                                        <Box className={classes.detailItem} style={{ marginBottom: 0, flexDirection: 'column', alignItems: 'flex-start' }}>
                                            <Typography className={classes.statsLabel}>Enviadas</Typography>
                                            <Typography variant="h6" className={classes.statsValue}>
                                                {whatsapp.messagesSent || 0}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                    <Grid item xs={6}>
                                        <Box className={classes.detailItem} style={{ marginBottom: 0, flexDirection: 'column', alignItems: 'flex-start' }}>
                                            <Typography className={classes.statsLabel}>Recebidas</Typography>
                                            <Typography variant="h6" className={classes.statsValue}>
                                                {whatsapp.messagesReceived || 0}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                </Grid>
                            </Paper>

                            <Paper className={classes.glassCard} elevation={0} style={{ padding: '24px' }}>
                                <Typography variant="subtitle2" className={classes.statsLabel} gutterBottom>
                                    Configurações Ativas
                                </Typography>
                                
                                <Box mt={2}>
                                    <Box className={classes.detailItem}>
                                        <Box flexGrow={1}>
                                            <Typography variant="body2" style={{ fontWeight: 600 }}>Padrão do Sistema</Typography>
                                            <Typography variant="caption" style={{ color: '#8e8e93' }}>Usar para envios automáticos</Typography>
                                        </Box>
                                        <Typography variant="body2" className={classes.statsValue}>
                                            {whatsapp.isDefault ? "Sim" : "Não"}
                                        </Typography>
                                    </Box>

                                    <Box className={classes.detailItem}>
                                        <Box flexGrow={1}>
                                            <Typography variant="body2" style={{ fontWeight: 600 }}>Keep Alive</Typography>
                                            <Typography variant="caption" style={{ color: '#8e8e93' }}>Reconexão automática</Typography>
                                        </Box>
                                        <Typography variant="body2" className={classes.statsValue}>
                                            {whatsapp.keepAlive ? "Ativo" : "Inativo"}
                                        </Typography>
                                    </Box>

                                    <Box className={classes.detailItem}>
                                        <Box flexGrow={1}>
                                            <Typography variant="body2" style={{ fontWeight: 600 }}>Último Check-in</Typography>
                                            <Typography variant="caption" style={{ color: '#8e8e93' }}>Sincronização</Typography>
                                        </Box>
                                        <Typography variant="body2" className={classes.statsValue}>
                                            {whatsapp.updatedAt ? format(parseISO(whatsapp.updatedAt), "HH:mm", { locale: ptBR }) : "--:--"}
                                        </Typography>
                                    </Box>
                                </Box>

                                <Box mt={2}>
                                    <Button 
                                        fullWidth 
                                        className={classes.secondaryButton} 
                                        style={{ borderRadius: 12, textTransform: 'none', fontWeight: 600 }}
                                        onClick={() => setWhatsAppModalOpen(true)}
                                    >
                                        Ver todas as configurações
                                    </Button>
                                </Box>
                            </Paper>
                        </Box>
                    </Grid>
                </Grid>
            </div>
        </div>
    );
};

export default ConnectionConfig;
