/* @jsxImportSource react */
import React from "react";
import { Paper, Typography, makeStyles } from "@material-ui/core";

const useStyles = makeStyles((theme) => ({
    statusCard: {
    padding: theme.spacing(3),
    borderRadius: "var(--card-border-radius)",
    textAlign: "center",
    marginBottom: theme.spacing(3),
    boxShadow: "var(--shadow-md)",
    },
    statusTitle: {
        fontWeight: 600,
        marginBottom: theme.spacing(1),
    },
    statusSub: {
    color: "var(--text-secondary)",
    }
    }));

    // Semantic mapping: status key → DS variant + localized label.
    // Visual resolution is handled by CSS vars (--status-{variant}-bg / --status-{variant}-text).
    const connectionStatusMeta = {
    DISCONNECTED: { variant: "error",   title: "Desconectado" },
    OPENING:      { variant: "info",    title: "Iniciando conexão..." },
    QRCODE:       { variant: "warning", title: "Aguardando leitura do QR Code" },
    CONNECTED:    { variant: "success", title: "Dispositivo conectado" },
    TIMEOUT:      { variant: "error",   title: "Sessão expirada" },
    default:      { variant: "default", title: "Conectar ao WhatsApp" },
    };

    const statusTokenKey = (variant, prop) =>
    `var(--status-${variant}-${prop})`;

const ConnectionStatusCard = ({ status }) => {
 const meta = connectionStatusMeta[status] || connectionStatusMeta.default;
 const classes = useStyles();

 return (
 <Paper
 className={classes.statusCard}
 style={{ backgroundColor: statusTokenKey(meta.variant, 'bg') }}
 >
 <Typography
 variant="h5"
 className={classes.statusTitle}
 style={{ color: statusTokenKey(meta.variant, 'text') }}
 >
 {meta.title}
 </Typography>
 <Typography variant="body2" className={classes.statusSub}>
 {status === "QRCODE" ? "Escaneie com o WhatsApp para vincular" : "Gerencie sua conexão abaixo"}
 </Typography>
 </Paper>
 );
};

export default ConnectionStatusCard;
