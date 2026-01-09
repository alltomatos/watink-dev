import React, { useState, useEffect, useCallback } from "react";
import { useParams, useHistory } from "react-router-dom";
import {
    Container,
    Paper,
    Typography,
    Button,
    Grid,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Box,
    CircularProgress,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Chip,
    Divider,
} from "@material-ui/core";
import {
    Create as CreateIcon,
    Update as UpdateIcon,
    Comment as CommentIcon,
    CheckCircle as CheckCircleIcon,
    ArrowBack as ArrowBackIcon,
    Save as SaveIcon,
} from "@material-ui/icons";
import { makeStyles } from "@material-ui/core/styles";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "react-toastify";
import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
    root: {
        padding: theme.spacing(3),
    },
    paper: {
        padding: theme.spacing(3),
        marginBottom: theme.spacing(3),
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: theme.spacing(3),
    },
    historyItem: {
        borderLeft: `2px solid ${theme.palette.primary.main}`,
        marginLeft: theme.spacing(2),
        paddingLeft: theme.spacing(2),
        marginBottom: theme.spacing(1),
    },
    historyIcon: {
        minWidth: 36,
    },
}));

const ProtocolDetails = () => {
    const classes = useStyles();
    const { protocolId } = useParams();
    const historyRoute = useHistory();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [protocol, setProtocol] = useState(null);
    const [history, setHistory] = useState([]);
    const [formData, setFormData] = useState({
        status: "",
        priority: "",
        comment: "",
    });

    const loadProtocol = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await api.get(`/protocols/${protocolId}`);
            setProtocol(data);
            setHistory(data.history || []);
            setFormData({
                status: data.status,
                priority: data.priority,
                comment: "",
            });
        } catch (err) {
            toast.error("Erro ao carregar protocolo");
            historyRoute.push("/helpdesk");
        } finally {
            setLoading(false);
        }
    }, [protocolId, historyRoute]);

    useEffect(() => {
        loadProtocol();
    }, [loadProtocol]);

    const handleSubmit = async () => {
        try {
            setSaving(true);
            const payload = {
                status: formData.status,
                priority: formData.priority,
                comment: formData.comment,
            };

            // We only send subject/description if we wanted to edit them, but typically 
            // the main workflow handles status/priority updates. 
            // For now, let's include subject/description from original protocol to avoid validation errors if backend requires them,
            // though usually updates are partial. Based on ProtocolModal, it sent everything.
            // Let's check update controller... it updates what's sent.
            // So we can just send the changes.

            await api.put(`/protocols/${protocolId}`, {
                ...payload,
                subject: protocol.subject, // Send these to keep existing values just in case
                description: protocol.description,
                category: protocol.category
            });

            toast.success("Protocolo atualizado com sucesso");
            setFormData(prev => ({ ...prev, comment: "" }));
            loadProtocol(); // Reload to get new history
        } catch (err) {
            toast.error("Erro ao atualizar protocolo");
        } finally {
            setSaving(false);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const getActionIcon = (action) => {
        const iconMap = {
            created: <CreateIcon fontSize="small" />,
            status_changed: <UpdateIcon fontSize="small" />,
            priority_changed: <UpdateIcon fontSize="small" />,
            commented: <CommentIcon fontSize="small" />,
            resolved: <CheckCircleIcon fontSize="small" />,
        };
        return iconMap[action] || <UpdateIcon fontSize="small" />;
    };

    const getActionLabel = (action) => {
        const labelMap = {
            created: "Criado",
            status_changed: "Status alterado",
            priority_changed: "Prioridade alterada",
            commented: "Comentário",
            resolved: "Resolvido",
            closed: "Fechado",
        };
        return labelMap[action] || action;
    };

    if (loading) {
        return (
            <Box className={classes.root} display="flex" justifyContent="center">
                <CircularProgress />
            </Box>
        );
    }

    if (!protocol) return null;

    return (
        <Container maxWidth="lg" className={classes.root}>
            <Box className={classes.header}>
                <Box display="flex" alignItems="center">
                    <Button
                        startIcon={<ArrowBackIcon />}
                        onClick={() => historyRoute.push("/helpdesk")}
                        style={{ marginRight: 16 }}
                    >
                        Voltar
                    </Button>
                    <Typography variant="h4">
                        Protocolo #{protocol.protocolNumber}
                    </Typography>
                </Box>
            </Box>

            <Grid container spacing={3}>
                <Grid item xs={12} md={8}>
                    <Paper className={classes.paper}>
                        <Typography variant="h6" gutterBottom>
                            Detalhes
                        </Typography>
                        <Box mb={2}>
                            <Typography variant="subtitle2" color="textSecondary">
                                Assunto
                            </Typography>
                            <Typography variant="body1">{protocol.subject}</Typography>
                        </Box>
                        <Box mb={2}>
                            <Typography variant="subtitle2" color="textSecondary">
                                Descrição
                            </Typography>
                            <Typography variant="body1" style={{ whiteSpace: "pre-wrap" }}>
                                {protocol.description}
                            </Typography>
                        </Box>
                        <Box mb={2}>
                            <Typography variant="subtitle2" color="textSecondary">
                                Categoria
                            </Typography>
                            <Typography variant="body1">
                                {protocol.category || "-"}
                            </Typography>
                        </Box>
                        <Box mb={2}>
                            <Typography variant="subtitle2" color="textSecondary">
                                Contato
                            </Typography>
                            <Typography variant="body1">
                                {protocol.contact ? protocol.contact.name : "-"}
                            </Typography>
                        </Box>
                    </Paper>

                    <Paper className={classes.paper}>
                        <Typography variant="h6" gutterBottom>
                            Atualizar
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <FormControl variant="outlined" fullWidth size="small">
                                    <InputLabel>Status</InputLabel>
                                    <Select
                                        name="status"
                                        value={formData.status}
                                        onChange={handleChange}
                                        label="Status"
                                    >
                                        <MenuItem value="open">Aberto</MenuItem>
                                        <MenuItem value="in_progress">Em Andamento</MenuItem>
                                        <MenuItem value="pending">Pendente</MenuItem>
                                        <MenuItem value="resolved">Resolvido</MenuItem>
                                        <MenuItem value="closed">Fechado</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <FormControl variant="outlined" fullWidth size="small">
                                    <InputLabel>Prioridade</InputLabel>
                                    <Select
                                        name="priority"
                                        value={formData.priority}
                                        onChange={handleChange}
                                        label="Prioridade"
                                    >
                                        <MenuItem value="low">Baixa</MenuItem>
                                        <MenuItem value="medium">Média</MenuItem>
                                        <MenuItem value="high">Alta</MenuItem>
                                        <MenuItem value="urgent">Urgente</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    name="comment"
                                    label="Adicionar Comentário"
                                    value={formData.comment}
                                    onChange={handleChange}
                                    variant="outlined"
                                    size="small"
                                    fullWidth
                                    multiline
                                    rows={3}
                                    placeholder="Descreva a ação realizada ou adicione uma nota..."
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                                    onClick={handleSubmit}
                                    disabled={saving}
                                >
                                    Atualizar Protocolo
                                </Button>
                            </Grid>
                        </Grid>
                    </Paper>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Paper className={classes.paper}>
                        <Typography variant="h6" gutterBottom>
                            Histórico
                        </Typography>
                        <List dense>
                            {history.map((item, index) => (
                                <ListItem key={index} className={classes.historyItem}>
                                    <ListItemIcon className={classes.historyIcon}>
                                        {getActionIcon(item.action)}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={
                                            <Box display="flex" flexDirection="column">
                                                <Typography variant="body2" style={{ fontWeight: 600 }}>
                                                    {getActionLabel(item.action)}
                                                </Typography>
                                                {item.previousValue && item.newValue && (
                                                    <Typography variant="caption" display="block">
                                                        {item.previousValue} → {item.newValue}
                                                    </Typography>
                                                )}
                                            </Box>
                                        }
                                        secondary={
                                            <>
                                                {item.comment && (
                                                    <Typography variant="body2" style={{ marginTop: 4, fontStyle: "italic" }}>
                                                        "{item.comment}"
                                                    </Typography>
                                                )}
                                                <Box mt={1}>
                                                    <Typography variant="caption" color="textSecondary" display="block">
                                                        {item.user?.name || "Sistema"}
                                                    </Typography>
                                                    <Typography variant="caption" color="textSecondary" display="block">
                                                        {format(new Date(item.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                                    </Typography>
                                                </Box>
                                            </>
                                        }
                                    />
                                </ListItem>
                            ))}
                            {history.length === 0 && (
                                <Typography variant="body2" color="textSecondary" align="center">
                                    Sem histórico registrado.
                                </Typography>
                            )}
                        </List>
                    </Paper>
                </Grid>
            </Grid>
        </Container>
    );
};

export default ProtocolDetails;
