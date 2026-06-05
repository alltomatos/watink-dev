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
        backgroundColor: "var(--bg-surface-alt)",
        height: "100%",
    },
	logItem: {
		padding: "12px",
		borderRadius: "12px",
		backgroundColor: "var(--bg-surface)",
		border: "1px solid var(--border-default)",
		position: "relative",
		"&::before": {
            content: '""',
            position: "absolute",
            left: "-11px",
            top: "20px",
            width: "10px",
            height: "1px",
            backgroundColor: "var(--border-default)",
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
            backgroundColor: "var(--border-default)",
            }
            },
            iconWrapper: {
        position: "absolute",
        left: "-20px",
        top: "16px",
        width: "24px",
        height: "24px",
        borderRadius: "50%",
        backgroundColor: "var(--bg-surface)",
        border: "2px solid var(--border-default)",
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
        color: "var(--text-primary)",
        textTransform: "capitalize",
    },
    logDate: {
        fontSize: "0.75rem",
        color: "var(--text-muted)",
    },
    logBody: {
        fontSize: "0.8rem",
        color: "var(--text-secondary)",
    },
    userBadge: {
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        marginTop: "8px",
        padding: "2px 8px",
        borderRadius: "6px",
        backgroundColor: "var(--bg-surface-alt)",
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
        case "transfer": return <TransferIcon style={{ fontSize: 14, color: "var(--status-info)" }} />;
        case "status": return <StatusIcon style={{ fontSize: 14, color: "var(--status-success)" }} />;
        case "assign": return <AssignIcon style={{ fontSize: 14, color: "var(--status-warning)" }} />;
        default: return <MessageIcon style={{ fontSize: 14, color: "var(--text-muted)" }} />;
    }
};

const formatLogMessage = (log) => {
    let payload = {};
    try {
        payload = JSON.parse(log.payload);
    } catch (e) {
        console.error("Error parsing log payload:", e);
    }

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
