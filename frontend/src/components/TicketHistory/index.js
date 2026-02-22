/* @jsxImportSource react */
import React, { useState, useEffect } from "react";
import { makeStyles } from "@material-ui/core/styles";
import {
    Typography,
    Paper,
    Avatar,
    Box,
    CircularProgress
} from "@material-ui/core";
import {
    History as HistoryIcon,
    SwapHoriz as TransferIcon,
    CheckCircleOutline as CloseIcon,
    ChatBubbleOutline as MessageIcon,
    Person as AssignIcon,
    FiberManualRecord as StatusIcon
} from "@material-ui/icons";
import { format, parseISO } from "date-fns";
import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
    root: {
        display: "flex",
        flexDirection: "column",
        padding: "16px",
        gap: "16px",
        backgroundColor: "#f9fafb",
        height: "100%",
    },
    logItem: {
        padding: "12px",
        borderRadius: "12px",
        backgroundColor: "#ffffff",
        border: "1px solid #e5e7eb",
        position: "relative",
        "&::before": {
            content: '""',
            position: "absolute",
            left: "-11px",
            top: "20px",
            width: "10px",
            height: "1px",
            backgroundColor: "#e5e7eb",
        }
    },
    timeline: {
        position: "relative",
        paddingLeft: "20px",
        "&::before": {
            content: '""',
            position: "absolute",
            left: "8px",
            top: "0",
            bottom: "0",
            width: "2px",
            backgroundColor: "#e5e7eb",
        }
    },
    iconWrapper: {
        position: "absolute",
        left: "-20px",
        top: "16px",
        width: "24px",
        height: "24px",
        borderRadius: "50%",
        backgroundColor: "#ffffff",
        border: "2px solid #e5e7eb",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1,
    },
    logHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: "4px",
    },
    logType: {
        fontWeight: 600,
        fontSize: "0.85rem",
        color: "#374151",
        textTransform: "capitalize",
    },
    logDate: {
        fontSize: "0.75rem",
        color: "#9ca3af",
    },
    logBody: {
        fontSize: "0.8rem",
        color: "#4b5563",
    },
    userBadge: {
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        marginTop: "8px",
        padding: "2px 8px",
        borderRadius: "6px",
        backgroundColor: "#f3f4f6",
    },
    userAvatar: {
        width: "16px",
        height: "16px",
        fontSize: "0.6rem",
    },
    userName: {
        fontSize: "0.7rem",
        fontWeight: 500,
    }
}));

const getLogIcon = (type) => {
    switch (type) {
        case "transfer": return <TransferIcon style={{ fontSize: 14, color: "#3b82f6" }} />;
        case "status": return <StatusIcon style={{ fontSize: 14, color: "#10b981" }} />;
        case "assign": return <AssignIcon style={{ fontSize: 14, color: "#f59e0b" }} />;
        default: return <MessageIcon style={{ fontSize: 14, color: "#6b7280" }} />;
    }
};

const formatLogMessage = (log) => {
    let payload = {};
    try {
        payload = JSON.parse(log.payload);
    } catch (e) { }

    switch (log.type) {
        case "transfer":
            return `Transferido para a fila #${payload.newQueueId || 'desconhecida'}`;
        case "status":
            return `Status alterado de "${payload.old}" para "${payload.new}"`;
        case "assign":
            return `Atribuído ao usuário #${payload.newUserId || 'desconhecido'}`;
        default:
            return log.payload || "Ação registrada";
    }
};

const TicketHistory = ({ ticketId }) => {
    const classes = useStyles();
    const [loading, setLoading] = useState(true);
    const [logs, setLogs] = useState([]);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const { data } = await api.get(`/tickets/${ticketId}/logs`);
                setLogs(data);
            } catch (err) {
                console.error("Error fetching ticket logs", err);
            } finally {
                setLoading(false);
            }
        };
        if (ticketId) fetchLogs();
    }, [ticketId]);

    if (loading) return <Box display="flex" justifyContent="center" p={4}><CircularProgress size={24} /></Box>;

    return (
        <div className={classes.root}>
            <Typography variant="subtitle1" style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <HistoryIcon /> Linha do Tempo
            </Typography>

            <div className={classes.timeline}>
                {logs.length === 0 ? (
                    <Typography variant="body2" color="textSecondary">Nenhum evento registrado ainda.</Typography>
                ) : (
                    logs.map((log) => (
                        <div key={log.id} style={{ position: 'relative', marginBottom: 16 }}>
                            <div className={classes.iconWrapper}>
                                {getLogIcon(log.type)}
                            </div>
                            <div className={classes.logItem}>
                                <div className={classes.logHeader}>
                                    <span className={classes.logType}>{log.type}</span>
                                    <span className={classes.logDate}>
                                        {format(parseISO(log.createdAt), "dd/MM HH:mm")}
                                    </span>
                                </div>
                                <Typography className={classes.logBody}>
                                    {formatLogMessage(log)}
                                </Typography>
                                {log.user && (
                                    <div className={classes.userBadge}>
                                        <Avatar className={classes.userAvatar}>{log.user.name[0]}</Avatar>
                                        <span className={classes.userName}>{log.user.name}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default TicketHistory;
