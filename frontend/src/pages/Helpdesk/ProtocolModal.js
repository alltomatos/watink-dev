import React, { useState, useEffect } from "react";
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography,
    Box,
    Divider,
    CircularProgress,
    Tabs,
    Tab,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Chip,
} from "@material-ui/core";
import {
    Timeline,
    Create as CreateIcon,
    Update as UpdateIcon,
    Comment as CommentIcon,
    CheckCircle as CheckCircleIcon,
} from "@material-ui/icons";
import { makeStyles } from "@material-ui/core/styles";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "react-toastify";
import api from "../../services/api";

const useStyles = makeStyles((theme) => ({
    form: {
        minWidth: 600,
    },
    section: {
        marginTop: theme.spacing(2),
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
    commentBox: {
        marginTop: theme.spacing(2),
    },
}));

const ProtocolModal = ({ open, onClose, protocol }) => {
    const classes = useStyles();
    const [loading, setLoading] = useState(false);
    const [tab, setTab] = useState(0);
    const [formData, setFormData] = useState({
        subject: "",
        description: "",
        status: "open",
        priority: "medium",
        category: "",
        comment: "",
    });
    const [history, setHistory] = useState([]);

    useEffect(() => {
        if (protocol) {
            setFormData({
                subject: protocol.subject || "",
                description: protocol.description || "",
                status: protocol.status || "open",
                priority: protocol.priority || "medium",
                category: protocol.category || "",
                comment: "",
            });
            setHistory(protocol.history || []);
            loadFullProtocol();
        } else {
            setFormData({
                subject: "",
                description: "",
                status: "open",
                priority: "medium",
                category: "",
                comment: "",
            });
            setHistory([]);
        }
        setTab(0);
    }, [protocol, open]);

    const loadFullProtocol = async () => {
        if (!protocol?.id) return;
        try {
            const { data } = await api.get(`/protocols/${protocol.id}`);
            setHistory(data.history || []);
        } catch (err) {
            console.error("Error loading protocol history:", err);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async () => {
        if (!formData.subject.trim()) {
            toast.error("Assunto é obrigatório");
            return;
        }

        try {
            setLoading(true);
            if (protocol) {
                await api.put(`/protocols/${protocol.id}`, formData);
                toast.success("Protocolo atualizado com sucesso");
            } else {
                await api.post("/protocols", formData);
                toast.success("Protocolo criado com sucesso");
            }
            onClose();
        } catch (err) {
            toast.error("Erro ao salvar protocolo");
        } finally {
            setLoading(false);
        }
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

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                {protocol ? `Protocolo #${protocol.protocolNumber}` : "Novo Protocolo"}
            </DialogTitle>
            <DialogContent className={classes.form}>
                <Tabs value={tab} onChange={(e, v) => setTab(v)} indicatorColor="primary">
                    <Tab label="Dados" />
                    {protocol && <Tab label={`Histórico (${history.length})`} />}
                </Tabs>

                {tab === 0 && (
                    <Box mt={2}>
                        <Grid container spacing={2}>
                            <Grid item xs={12}>
                                <TextField
                                    name="subject"
                                    label="Assunto"
                                    value={formData.subject}
                                    onChange={handleChange}
                                    variant="outlined"
                                    size="small"
                                    fullWidth
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} sm={4}>
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
                            <Grid item xs={12} sm={4}>
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
                            <Grid item xs={12} sm={4}>
                                <TextField
                                    name="category"
                                    label="Categoria"
                                    value={formData.category}
                                    onChange={handleChange}
                                    variant="outlined"
                                    size="small"
                                    fullWidth
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    name="description"
                                    label="Descrição"
                                    value={formData.description}
                                    onChange={handleChange}
                                    variant="outlined"
                                    size="small"
                                    fullWidth
                                    multiline
                                    rows={4}
                                />
                            </Grid>
                            {protocol && (
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
                                        rows={2}
                                        placeholder="Opcional: adicione um comentário à atualização"
                                    />
                                </Grid>
                            )}
                        </Grid>
                    </Box>
                )}

                {tab === 1 && protocol && (
                    <Box mt={2}>
                        <Typography variant="subtitle1" gutterBottom>
                            Histórico de Atividades
                        </Typography>
                        {history.length === 0 ? (
                            <Typography variant="body2" color="textSecondary">
                                Nenhuma atividade registrada
                            </Typography>
                        ) : (
                            <List dense>
                                {history.map((item, index) => (
                                    <ListItem key={index} className={classes.historyItem}>
                                        <ListItemIcon className={classes.historyIcon}>
                                            {getActionIcon(item.action)}
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <Chip
                                                        label={getActionLabel(item.action)}
                                                        size="small"
                                                        variant="outlined"
                                                    />
                                                    {item.previousValue && item.newValue && (
                                                        <Typography variant="caption">
                                                            {item.previousValue} → {item.newValue}
                                                        </Typography>
                                                    )}
                                                </Box>
                                            }
                                            secondary={
                                                <>
                                                    {item.comment && (
                                                        <Typography variant="body2" style={{ marginTop: 4 }}>
                                                            {item.comment}
                                                        </Typography>
                                                    )}
                                                    <Typography variant="caption" color="textSecondary">
                                                        {item.user?.name || "Sistema"} -{" "}
                                                        {format(new Date(item.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                                    </Typography>
                                                </>
                                            }
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        )}
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancelar</Button>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSubmit}
                    disabled={loading}
                >
                    {loading ? <CircularProgress size={20} /> : "Salvar"}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ProtocolModal;
