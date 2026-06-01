/* @jsxImportSource react */
import React, { useState, useCallback, useContext, useEffect } from "react";
import { useParams, useHistory } from "react-router-dom";
import { makeStyles } from "@material-ui/core/styles";
import {
    Paper,
    Typography,
    Button,
    Grid,
    CircularProgress,
    Box,
    Divider,
    IconButton,
    Card,
    CardContent,
    Avatar,
    Tooltip,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions
} from "@material-ui/core";
import {
    ArrowBack,
    SignalCellular4Bar,
    CropFree,
    PowerSettingsNew,
    PhoneIphone,
    Edit,
    CheckCircle
} from "@material-ui/icons";
import { green, red, orange } from "@material-ui/core/colors";
import QRCode from "qrcode.react";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import ConnectionStatusCard from "../../components/ConnectionStatusCard";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { i18n } from "../../translate/i18n";
import PairingCodeModal from "../../components/PairingCodeModal";
import WhatsAppModal from "../../components/WhatsAppModal";
import openSocket from "../../services/socket-io";
import ConfirmationModal from "../../components/ConfirmationModal";
import { WhatsAppsContext } from "../../context/WhatsApp/WhatsAppsContext";
import { getBackendUrl } from "../../helpers/urlUtils";

const useStyles = makeStyles(theme => ({
    root: {
        padding: theme.spacing(3),
    },
    header: {
        marginBottom: theme.spacing(3),
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
    },
    card: {
        height: "100%",
        display: "flex",
        flexDirection: "column",
        borderRadius: theme.shape.borderRadius,
        boxShadow: "0 4px 20px 0 rgba(0,0,0,0.05)",
        transition: "transform 0.2s",
        "&:hover": {
            transform: "translateY(-2px)",
        }
    },
    statusContainer: {
        display: "flex",
        alignItems: "center",
        padding: theme.spacing(2),
        backgroundColor: theme.palette.background.default,
        borderRadius: theme.shape.borderRadius,
        marginBottom: theme.spacing(2),
    },
    statusText: {
        marginLeft: theme.spacing(2),
        fontWeight: 600,
    },
    actionButton: {
        marginRight: theme.spacing(1),
        marginBottom: theme.spacing(1),
    },
    iconLarge: {
        fontSize: 40,
        marginRight: theme.spacing(2),
    },
    gridContainer: {
        marginTop: theme.spacing(2),
    },
    qrCodeContainer: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: theme.spacing(2),
        marginTop: theme.spacing(2),
    }
}));

const ConnectionConfig = () => {
    const classes = useStyles();
    const history = useHistory();
    const { whatsappId } = useParams();
    const { reloadWhatsApps } = useContext(WhatsAppsContext);
    const [whatsapp, setWhatsapp] = useState(null);
    const [loading, setLoading] = useState(true);
    const [pairingModalOpen, setPairingModalOpen] = useState(false);
    const [whatsappModalOpen, setWhatsAppModalOpen] = useState(false);
    const [confirmationOpen, setConfirmationOpen] = useState(false);
    const [confirmationAction, setConfirmationAction] = useState(null);
    // Inline pairing code states
    const [phoneNumber, setPhoneNumber] = useState("");
    const [pairingCode, setPairingCode] = useState("");
    const [pairingLoading, setPairingLoading] = useState(false);
    const [showPairingInput, setShowPairingInput] = useState(false);
    const [showQrCode, setShowQrCode] = useState(false);
    const [inputPairingModalOpen, setInputPairingModalOpen] = useState(false);
    const [connecting, setConnecting] = useState(false);

    const fetchWhatsapp = useCallback(async () => {
        try {
            const { data } = await api.get(`/whatsapp/${whatsappId}`);
            setWhatsapp(data);
            setLoading(false);
        } catch (err) {
            toastError(err);
        }
    }, [whatsappId]);

    useEffect(() => {
        fetchWhatsapp();
    }, [fetchWhatsapp]);

    useEffect(() => {
        const socket = openSocket();

        socket.on("whatsappSession", (data) => {
            if (data.action === "update" && data.session.id === parseInt(whatsappId)) {
                setWhatsapp(prev => ({ ...prev, ...data.session }));

                if (data.session.status === "QRCODE") {
                    setShowQrCode(true);
                    setShowPairingInput(false);
                    setConnecting(false);

                    if (!data.session.qrcode) {
                        fetchWhatsapp();
                    }
                }

                // Handle pairing code received
                if (data.session.pairingCode) {
                    setPairingCode(data.session.pairingCode);
                    setPairingLoading(false);
                }
                // Any terminal/interactive status means the initial start request finished.
                if (["CONNECTED", "QRCODE", "PAIRING", "DISCONNECTED", "TIMEOUT"].includes(data.session.status)) {
                    setConnecting(false);
                }
                // Handle connection success - reset pairing state and reload persisted session data
                if (data.session.status === "CONNECTED") {
                    setShowPairingInput(false);
                    setShowQrCode(false);
                    setPairingCode("");
                    setPhoneNumber("");
                    setPairingLoading(false);
                    window.location.reload();
                }
                // Handle disconnection
                if (data.session.status === "DISCONNECTED" || data.session.status === "TIMEOUT") {
                    setShowQrCode(false);
                    setShowPairingInput(false);
                    setPairingLoading(false);
                }
            }
        });

        socket.on("whatsapp", (data) => {
            if (data.action === "update" && data.whatsapp.id === parseInt(whatsappId)) {
                setWhatsapp(prev => ({ ...prev, ...data.whatsapp }));
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [whatsappId, fetchWhatsapp]);

    useEffect(() => {
        if (whatsapp?.status && whatsapp.status === "QRCODE") {
            setShowQrCode(true);
            setShowPairingInput(false);
            setConnecting(false);
        } else if (whatsapp?.status === "CONNECTED") {
            setShowQrCode(false);
            setShowPairingInput(false);
            setConnecting(false);
        } else if (whatsapp?.status === "DISCONNECTED" || whatsapp?.status === "TIMEOUT") {
            setShowQrCode(false);
            setShowPairingInput(false);
            setConnecting(false);
        } else if (whatsapp?.status === "PAIRING") {
            setConnecting(false);
        }
        // For OPENING, connecting is already true from the button click
    }, [whatsapp?.status]);

    const handleStartSessionQr = async () => {
        try {
            if (whatsapp.status === "QRCODE") {
                setShowQrCode(true);
                setShowPairingInput(false);
                return;
            }

            setConnecting(true);
            setShowPairingInput(false);
            await api.post(`/whatsappsession/${whatsappId}`, { usePairingCode: false });

            // Aguarda o QR code estar disponível via socket/estado antes de recarregar
            const checkQrCode = setInterval(() => {
                if (whatsapp.qrcode) {
                    clearInterval(checkQrCode);
                    window.location.reload();
                }
            }, 1000);

            // Timeout de segurança após 15 segundos caso o socket falhe
            setTimeout(() => clearInterval(checkQrCode), 15000);

        } catch (err) {
            toastError(err);
            setConnecting(false);
        }
    };


    const handleShowPairing = () => {
        setInputPairingModalOpen(true);
    };

    const handleRequestPairingCode = async () => {
        if (!phoneNumber || phoneNumber.length < 10) {
            toastError({ response: { data: { message: "Número de telefone inválido" } } });
            return;
        }
        setPairingLoading(true);
        setPairingCode("");
        try {
            await api.post(`/whatsappsession/${whatsappId}`, {
                usePairingCode: true,
                phoneNumber: phoneNumber.replace(/\D/g, "")
            });
            window.location.reload();
        } catch (err) {
            toastError(err);
            setPairingLoading(false);
        }
    };

    const handleDisconnect = async () => {
        try {
            await api.delete(`/whatsappsession/${whatsappId}`);
            window.location.reload();
        } catch (err) {
            toastError(err);
        }
        setConfirmationOpen(false);
    };

    const handleDelete = async () => {
        try {
            await api.delete(`/whatsapp/${whatsappId}`);
            await reloadWhatsApps();
            history.push("/connections");
        } catch (err) {
            toastError(err);
        }
        setConfirmationOpen(false);
    };

    const renderStatus = () => {
        const statusMap = {
            CONNECTED: { text: "Conectado", color: "#10b981", icon: <CheckCircle fontSize="large" style={{ color: "#10b981" }} /> },
            DISCONNECTED: { text: "Desconectado", color: "#ef4444", icon: <PowerSettingsNew fontSize="large" style={{ color: "#ef4444" }} /> },
            QRCODE: { text: "Aguardando QR Code", color: "#f59e0b", icon: <CropFree fontSize="large" style={{ color: "#f59e0b" }} /> },
            PAIRING: { text: "Aguardando Pareamento", color: "#8b5cf6", icon: <PhoneIphone fontSize="large" style={{ color: "#8b5cf6" }} /> },
            OPENING: { text: "Iniciando...", color: "#3b82f6", icon: <CircularProgress size={30} style={{ color: "#3b82f6" }} /> },
            TIMEOUT: { text: "Tempo Esgotado", color: "#6b7280", icon: <PowerSettingsNew fontSize="large" style={{ color: "#6b7280" }} /> },
        };

        const current = statusMap[whatsapp?.status] || statusMap["DISCONNECTED"];

        return (
            <Paper className={classes.statusContainer} elevation={0} style={{ backgroundColor: current.color + "10", border: `1px solid ${current.color}30` }}>
                {current.icon}
                <Box ml={2}>
                    <Typography variant="h5" style={{ color: current.color, fontWeight: 700 }}>
                        {current.text}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                        Última atualização: {whatsapp?.updatedAt ? new Date(whatsapp.updatedAt).toLocaleString() : "N/A"}
                    </Typography>

                    {whatsapp?.status === "CONNECTED" && whatsapp?.number && (
                        <Box display="flex" alignItems="center" mt={2}>
                            <Avatar
                                src={getBackendUrl(whatsapp.profilePicUrl)}
                                alt={whatsapp.name}
                                style={{ width: 50, height: 50, marginRight: 15, borderRadius: 12 }}
                            />
                            <Box>
                                <Typography variant="subtitle1" style={{ fontWeight: 600 }}>
                                    {whatsapp.name}
                                </Typography>
                                <Typography variant="body1" color="textSecondary">
                                    +{whatsapp.number}
                                </Typography>
                            </Box>
                        </Box>
                    )}
                </Box>
            </Paper>
        );
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <MainContainer>
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

            <PairingCodeModal
                open={pairingModalOpen}
                onClose={() => setPairingModalOpen(false)}
                whatsAppId={parseInt(whatsappId)}
            />

            <Dialog open={inputPairingModalOpen} onClose={() => setInputPairingModalOpen(false)}>
                <DialogTitle>Número para Pareamento</DialogTitle>
                <DialogContent>
                    <Typography variant="body1" gutterBottom>
                        Digite o número do telefone com DDD (Ex: 5585999999999):
                    </Typography>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Número do Telefone"
                        placeholder="5585999999999"
                        fullWidth
                        variant="outlined"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setInputPairingModalOpen(false)} color="secondary">
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleRequestPairingCode}
                        color="primary"
                        variant="contained"
                        disabled={!phoneNumber || phoneNumber.length < 10}
                    >
                        Gerar Código
                    </Button>
                </DialogActions>
            </Dialog>

            <div className={classes.header}>
                <Box display="flex" alignItems="center">
                    <IconButton onClick={() => history.push("/connections")}>
                        <ArrowBack />
                    </IconButton>
                    <Title>{whatsapp.name}</Title>
                    <Tooltip title="Editar Nome/Fila">
                        <IconButton size="small" onClick={() => setWhatsAppModalOpen(true)} style={{ marginLeft: 10 }}>
                            <Edit />
                        </IconButton>
                    </Tooltip>
                </Box>
            </div>

            <Grid container spacing={3} className={classes.gridContainer}>
                <Grid item xs={12} md={8}>
                    <ConnectionStatusCard status={whatsapp.status} />

                    <Paper variant="outlined" style={{ padding: 20 }}>
                        <Typography variant="h6" gutterBottom>
                            Ações da Sessão
                        </Typography>
                        <Divider style={{ marginBottom: 20 }} />

                        <Box display="flex" flexWrap="wrap" alignItems="center" justifyContent="center">
                            {/* Actions for DISCONNECTED, TIMEOUT, or invalid status */}
                            {(!whatsapp.status || whatsapp.status === "DISCONNECTED" || whatsapp.status === "TIMEOUT") && !showQrCode && !showPairingInput && (
                                <>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        className={classes.actionButton}
                                        onClick={handleStartSessionQr}
                                        disabled={connecting}
                                        startIcon={connecting ? <CircularProgress size={20} color="inherit" /> : <CropFree />}
                                    >
                                        {connecting ? "Iniciando Conexão..." : "CONECTAR COM QR CODE"}
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        className={classes.actionButton}
                                        style={{ color: red[500], borderColor: red[500] }}
                                        onClick={() => { setConfirmationAction("delete"); setConfirmationOpen(true); }}
                                    >
                                        EXCLUIR
                                    </Button>
                                </>
                            )}

                            {/* Inline Pairing Code Input - Now just displays the code */}
                            {showPairingInput && (!whatsapp.status || whatsapp.status === "DISCONNECTED" || whatsapp.status === "TIMEOUT" || whatsapp.status === "OPENING" || whatsapp.status === "PAIRING") && (
                                <Box className={classes.qrCodeContainer} style={{ width: "100%" }}>
                                    {!pairingCode && (
                                        <Box display="flex" flexDirection="column" alignItems="center">
                                            <CircularProgress size={40} />
                                            <Typography variant="body1" style={{ marginTop: 20 }}>
                                                Solicitando código de pareamento...
                                            </Typography>
                                        </Box>
                                    )}
                                    {pairingCode && (
                                        <Box textAlign="center" mt={2}>
                                            <Typography variant="h4" style={{ fontFamily: "monospace", letterSpacing: 4 }}>
                                                {pairingCode}
                                            </Typography>
                                            <Typography variant="body2" color="textSecondary" style={{ marginTop: 8 }}>
                                                Insira este código no seu WhatsApp: Configurações → Dispositivos Conectados → Vincular Dispositivo → Vincular com código de 8 dígitos
                                            </Typography>
                                        </Box>
                                    )}
                                    <Button
                                        variant="outlined"
                                        color="secondary"
                                        className={classes.actionButton}
                                        style={{ marginTop: 20 }}
                                        onClick={() => {
                                            setShowPairingInput(false);
                                            setPairingCode("");
                                            setPhoneNumber("");
                                            setPairingLoading(false);
                                            if (whatsapp.status === "OPENING") {
                                                setConfirmationAction("disconnect");
                                                setConfirmationOpen(true);
                                            }
                                        }}
                                    >
                                        CANCELAR
                                    </Button>
                                </Box>
                            )}

                            {/* Actions for OPENING (only show if not in pairing mode) */}
                            {whatsapp.status === "OPENING" && !showPairingInput && (
                                <Box display="flex" alignItems="center" mt={2}>
                                    <CircularProgress size={20} style={{ marginRight: 10 }} />
                                    <Typography variant="body1">
                                        Iniciando sessão... aguarde alguns segundos.
                                    </Typography>
                                </Box>
                            )}

                            {/* Actions for QRCODE */}
                            {whatsapp.status === "QRCODE" && showQrCode && (
                                <Box className={classes.qrCodeContainer}>
                                    <Typography variant="body1" gutterBottom>
                                        Escaneie o QR Code abaixo com seu celular:
                                    </Typography>
                                    {whatsapp.qrcode ? (
                                        <QRCode value={whatsapp.qrcode} size={256} />
                                    ) : (
                                        <CircularProgress />
                                    )}
                                    <Button
                                        variant="outlined"
                                        color="secondary"
                                        className={classes.actionButton}
                                        style={{ marginTop: 20 }}
                                        onClick={() => { setConfirmationAction("disconnect"); setConfirmationOpen(true); }}
                                    >
                                        CANCELAR / DESCONECTAR
                                    </Button>
                                </Box>
                            )}

                            {/* Actions for PAIRING */}
                            {whatsapp.status === "PAIRING" && !showPairingInput && (
                                <>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        className={classes.actionButton}
                                        onClick={() => setPairingModalOpen(true)}
                                    >
                                        MOSTRAR CÓDIGO
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        color="secondary"
                                        className={classes.actionButton}
                                        onClick={() => { setConfirmationAction("disconnect"); setConfirmationOpen(true); }}
                                    >
                                        CANCELAR
                                    </Button>
                                </>
                            )}

                            {/* Actions for CONNECTED */}
                            {whatsapp.status === "CONNECTED" && (
                                <Button
                                    variant="outlined"
                                    color="secondary"
                                    className={classes.actionButton}
                                    onClick={() => { setConfirmationAction("disconnect"); setConfirmationOpen(true); }}
                                >
                                    DESCONECTAR
                                </Button>
                            )}
                        </Box>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Card className={classes.card} variant="outlined">
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Detalhes
                            </Typography>
                            <Divider style={{ marginBottom: 10 }} />
                                                        <Box mb={2} display="flex" alignItems="center">
                                <Avatar src={whatsapp.profilePicUrl} style={{ width: 60, height: 60, marginRight: 15 }} />
                                <Box>
                                    <Typography variant="subtitle2" color="textSecondary">Nome da Sessão</Typography>
                                    <Typography variant="body1">{whatsapp.name}</Typography>
                                </Box>
                            </Box>
                            <Box mb={2}>
                                <Typography variant="subtitle2" color="textSecondary">Número Conectado</Typography>
                                <Typography variant="body1">{whatsapp.number || "Não disponível"}</Typography>
                            </Box>
                            <Box mb={2}>
                                <Typography variant="subtitle2" color="textSecondary">Data da 1ª Conexão</Typography>
                                <Typography variant="body1">
                                    {whatsapp.createdAt ? new Date(whatsapp.createdAt).toLocaleDateString() : "N/A"}
                                </Typography>
                            </Box>
                            <Box mb={2}>
                                <Typography variant="subtitle2" color="textSecondary">Status Oficial</Typography>
                                <Typography variant="body1">{whatsapp.status}</Typography>
                            </Box>
                            <Box mb={2}>
                                <Typography variant="subtitle2" color="textSecondary">Padrão</Typography>
                                <Typography variant="body1">{whatsapp.isDefault ? "Sim" : "Não"}</Typography>
                            </Box>
                            <Box mb={2}>
                                <Typography variant="subtitle2" color="textSecondary">Reconexão Automática (Keep Alive)</Typography>
                                <Typography variant="body1">{whatsapp.keepAlive ? "Ativado" : "Desativado"}</Typography>
                            </Box>
                            <Box mb={2}>
                                <Typography variant="subtitle2" color="textSecondary">Sincronizar Histórico</Typography>
                                <Typography variant="body1">{whatsapp.syncHistory ? "Ativado" : "Desativado"}</Typography>
                                {whatsapp.syncHistory && whatsapp.syncPeriod && (
                                    <Typography variant="body2" color="textSecondary">
                                        Data Inicial: {new Date(whatsapp.syncPeriod).toLocaleDateString()}
                                    </Typography>
                                )}
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </MainContainer>
    );
};

export default ConnectionConfig;
