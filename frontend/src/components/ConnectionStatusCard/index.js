/* @jsxImportSource react */
import React from "react";
import { Paper, Typography, makeStyles } from "@material-ui/core";
import { green, red, orange, blue } from "@material-ui/core/colors";

const useStyles = makeStyles((theme) => ({
    statusCard: {
        padding: theme.spacing(3),
        borderRadius: theme.shape.borderRadius * 2,
        textAlign: "center",
        marginBottom: theme.spacing(3),
        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
    },
    statusTitle: {
        fontWeight: 600,
        marginBottom: theme.spacing(1),
    },
    statusSub: {
        color: theme.palette.text.secondary,
    }
}));

const statusColors = {
    DISCONNECTED: { bg: "#FFEBEE", color: red[600], title: "Desconectado" },
    OPENING: { bg: "#E3F2FD", color: blue[600], title: "Iniciando conexão..." },
    QRCODE: { bg: "#FFF8E1", color: orange[700], title: "Aguardando leitura do QR Code" },
    CONNECTED: { bg: "#E8F5E9", color: green[700], title: "Dispositivo conectado" },
    TIMEOUT: { bg: "#FFEBEE", color: red[600], title: "Sessão expirada" },
    default: { bg: "#F5F5F5", color: "#616161", title: "Conectar ao WhatsApp" }
};

const ConnectionStatusCard = ({ status }) => {
    const classes = useStyles();
    const style = statusColors[status] || statusColors.default;

    return (
        <Paper className={classes.statusCard} style={{ backgroundColor: style.bg }}>
            <Typography variant="h5" className={classes.statusTitle} style={{ color: style.color }}>
                {style.title}
            </Typography>
            <Typography variant="body2" className={classes.statusSub}>
                {status === "QRCODE" ? "Escaneie com o WhatsApp para vincular" : "Gerencie sua conexão abaixo"}
            </Typography>
        </Paper>
    );
};

export default ConnectionStatusCard;
