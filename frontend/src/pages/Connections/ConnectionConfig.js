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
    IconButton
} from "@material-ui/core";
import { ArrowBack, CheckCircle, SignalCellular4Bar, CropFree, SyncAlt } from "@material-ui/icons";
import { green, red } from "@material-ui/core/colors";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { i18n } from "../../translate/i18n";
import QrcodeModal from "../../components/QrcodeModal";
import PairingCodeModal from "../../components/PairingCodeModal";
import WhatsAppModal from "../../components/WhatsAppModal"; // [NEW] Import Modal
import openSocket from "../../services/socket-io";
import { Edit } from "@material-ui/icons"; // [NEW] Import Edit icon

const useStyles = makeStyles(theme => ({
    root: {
        padding: theme.spacing(3),
    },
    paper: {
        padding: theme.spacing(3),
        display: "flex",
        flexDirection: "column",
    },
    header: {
        display: "flex",
        alignItems: "center",
        marginBottom: theme.spacing(3),
    },
    statusIcon: {
        marginRight: theme.spacing(1),
    },
    actionButtons: {
        marginTop: theme.spacing(4),
        display: "flex",
        gap: theme.spacing(2),
    }
}));

const ConnectionConfig = () => {
    const classes = useStyles();
    const history = useHistory();
    const { whatsappId } = useParams();
    const [whatsapp, setWhatsapp] = useState(null);
    const [loading, setLoading] = useState(true);
    const [qrModalOpen, setQrModalOpen] = useState(false);
    const [pairingModalOpen, setPairingModalOpen] = useState(false);
    const [whatsappModalOpen, setWhatsAppModalOpen] = useState(false); // [NEW] State for Edit Modal

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
            }
        });

        return () => {
            socket.disconnect();
        };
    }, [whatsappId]);

    const handleStartSession = async (usePairingCode = false) => {
        try {
            await api.post(`/whatsappsession/${whatsappId}`, { usePairingCode });
            if (!usePairingCode) setQrModalOpen(true);
        } catch (err) {
            toastError(err);
        }
    };

    // [NEW] Handle closing modal and refreshing data
    const handleCloseWhatsAppModal = useCallback(() => {
        setWhatsAppModalOpen(false);
        fetchWhatsapp();
    }, [fetchWhatsapp]);

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <MainContainer>
            <MainHeader>
                <Box display="flex" alignItems="center">
                    <IconButton onClick={() => history.goBack()}>
                        <ArrowBack />
                    </IconButton>
                    <Title>{whatsapp.name}</Title>
                    <IconButton onClick={() => setWhatsAppModalOpen(true)}>
                        <Edit />
                    </IconButton>
                </Box>
            </MainHeader>

            <Paper className={classes.paper} variant="outlined">
                <Grid container spacing={3}>
                    <Grid item xs={12} md={4}>
                        <Typography variant="h6" gutterBottom>
                            Status da Conexão
                        </Typography>
                        <Box display="flex" alignItems="center" mb={2}>
                            {whatsapp.status === "CONNECTED" ? (
                                <SignalCellular4Bar style={{ color: green[500], marginRight: 8 }} />
                            ) : (
                                <SyncAlt color="secondary" style={{ marginRight: 8 }} />
                            )}
                            <Typography variant="body1">
                                {whatsapp.status}
                            </Typography>
                        </Box>
                        <Typography variant="body2" color="textSecondary">
                            Última atualização: {whatsapp.updatedAt ? new Date(whatsapp.updatedAt).toLocaleString() : "N/A"}
                        </Typography>
                    </Grid>

                    <Divider orientation="vertical" flexItem />

                    <Grid item xs={12} md={4}>
                        <Typography variant="h6" gutterBottom>
                            Configurações
                        </Typography>
                        <Typography variant="body1">
                            Sincronizar Histórico: <b>{whatsapp.syncHistory ? "Sim" : "Não"}</b>
                        </Typography>
                        {whatsapp.syncHistory && (
                            <Typography variant="body1">
                                Período: <b>{whatsapp.syncPeriod || "Padrão"}</b>
                            </Typography>
                        )}
                    </Grid>

                    <Divider orientation="vertical" flexItem />

                    <Divider orientation="vertical" flexItem />

                    <Grid item xs={12} md={3}>
                        <Typography variant="h6" gutterBottom>
                            Ações de Sessão
                        </Typography>
                        <Box className={classes.actionButtons}>
                            {whatsapp.status !== "CONNECTED" && (
                                <>
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        startIcon={<CropFree />}
                                        onClick={() => handleStartSession(false)}
                                    >
                                        Conectar via QR CODE
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        color="primary"
                                        onClick={() => setPairingModalOpen(true)}
                                    >
                                        Código de Pareamento
                                    </Button>
                                </>
                            )}
                            {whatsapp.status === "CONNECTED" && (
                                <Button
                                    variant="outlined"
                                    color="secondary"
                                    onClick={async () => {
                                        try {
                                            await api.delete(`/whatsappsession/${whatsappId}`);
                                        } catch (err) {
                                            toastError(err);
                                        }
                                    }}
                                >
                                    Desconectar
                                </Button>
                            )}
                        </Box>
                    </Grid>
                </Grid>
            </Paper>

            <QrcodeModal
                open={qrModalOpen}
                onClose={() => setQrModalOpen(false)}
                whatsAppId={whatsappId}
            />
            <PairingCodeModal
                open={pairingModalOpen}
                onClose={() => setPairingModalOpen(false)}
                whatsAppId={parseInt(whatsappId)}
            />
            <WhatsAppModal
                open={whatsappModalOpen}
                onClose={handleCloseWhatsAppModal}
                whatsAppId={whatsappId}
            />
        </MainContainer >
    );
};

export default ConnectionConfig;
