import React, { useState, useEffect, useCallback } from "react";
import {
    Container,
    Paper,
    Typography,
    Button,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    TextField,
    InputAdornment,
    Box,
    Chip,
    CircularProgress,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
} from "@material-ui/core";
import {
    Add as AddIcon,
    Search as SearchIcon,
    Visibility as VisibilityIcon,
} from "@material-ui/icons";
import { makeStyles } from "@material-ui/core/styles";
import { toast } from "react-toastify";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import api from "../../services/api";
import ProtocolModal from "./ProtocolModal";

const useStyles = makeStyles((theme) => ({
    root: {
        padding: theme.spacing(3),
    },
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: theme.spacing(3),
    },
    filters: {
        marginBottom: theme.spacing(2),
    },
    tableContainer: {
        marginTop: theme.spacing(2),
    },
    loader: {
        display: "flex",
        justifyContent: "center",
        padding: theme.spacing(4),
    },
    statusOpen: { backgroundColor: theme.palette.info.main, color: "#fff" },
    statusInProgress: { backgroundColor: theme.palette.warning.main, color: "#fff" },
    statusPending: { backgroundColor: theme.palette.grey[500], color: "#fff" },
    statusResolved: { backgroundColor: theme.palette.success.main, color: "#fff" },
    statusClosed: { backgroundColor: theme.palette.grey[700], color: "#fff" },
    priorityLow: { backgroundColor: theme.palette.grey[400], color: "#fff" },
    priorityMedium: { backgroundColor: theme.palette.info.main, color: "#fff" },
    priorityHigh: { backgroundColor: theme.palette.warning.main, color: "#fff" },
    priorityUrgent: { backgroundColor: theme.palette.error.main, color: "#fff" },
}));

const statusLabels = {
    open: "Aberto",
    in_progress: "Em Andamento",
    pending: "Pendente",
    resolved: "Resolvido",
    closed: "Fechado",
};

const priorityLabels = {
    low: "Baixa",
    medium: "Média",
    high: "Alta",
    urgent: "Urgente",
};

const Helpdesk = () => {
    const classes = useStyles();
    const [protocols, setProtocols] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchParam, setSearchParam] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [priorityFilter, setPriorityFilter] = useState("");
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedProtocol, setSelectedProtocol] = useState(null);

    const loadProtocols = useCallback(async () => {
        try {
            setLoading(true);
            const { data } = await api.get("/protocols", {
                params: {
                    searchParam,
                    status: statusFilter || undefined,
                    priority: priorityFilter || undefined
                },
            });
            setProtocols(data.protocols);
        } catch (err) {
            toast.error("Erro ao carregar protocolos");
        } finally {
            setLoading(false);
        }
    }, [searchParam, statusFilter, priorityFilter]);

    useEffect(() => {
        loadProtocols();
    }, [loadProtocols]);

    const handleOpenModal = (protocol = null) => {
        setSelectedProtocol(protocol);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setSelectedProtocol(null);
        setModalOpen(false);
        loadProtocols();
    };

    const getStatusClass = (status) => {
        const classMap = {
            open: classes.statusOpen,
            in_progress: classes.statusInProgress,
            pending: classes.statusPending,
            resolved: classes.statusResolved,
            closed: classes.statusClosed,
        };
        return classMap[status] || classes.statusOpen;
    };

    const getPriorityClass = (priority) => {
        const classMap = {
            low: classes.priorityLow,
            medium: classes.priorityMedium,
            high: classes.priorityHigh,
            urgent: classes.priorityUrgent,
        };
        return classMap[priority] || classes.priorityMedium;
    };

    return (
        <Container maxWidth="lg" className={classes.root}>
            <Paper elevation={0} style={{ padding: 24 }}>
                <Box className={classes.header}>
                    <Typography variant="h4">🎫 Helpdesk - Protocolos</Typography>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenModal()}
                    >
                        Novo Protocolo
                    </Button>
                </Box>

                <Grid container spacing={2} className={classes.filters}>
                    <Grid item xs={12} sm={4}>
                        <TextField
                            variant="outlined"
                            size="small"
                            placeholder="Buscar por número ou assunto..."
                            fullWidth
                            value={searchParam}
                            onChange={(e) => setSearchParam(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Grid>
                    <Grid item xs={6} sm={4}>
                        <FormControl variant="outlined" size="small" fullWidth>
                            <InputLabel>Status</InputLabel>
                            <Select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                label="Status"
                            >
                                <MenuItem value="">Todos</MenuItem>
                                <MenuItem value="open">Aberto</MenuItem>
                                <MenuItem value="in_progress">Em Andamento</MenuItem>
                                <MenuItem value="pending">Pendente</MenuItem>
                                <MenuItem value="resolved">Resolvido</MenuItem>
                                <MenuItem value="closed">Fechado</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                        <FormControl variant="outlined" size="small" fullWidth>
                            <InputLabel>Prioridade</InputLabel>
                            <Select
                                value={priorityFilter}
                                onChange={(e) => setPriorityFilter(e.target.value)}
                                label="Prioridade"
                            >
                                <MenuItem value="">Todas</MenuItem>
                                <MenuItem value="low">Baixa</MenuItem>
                                <MenuItem value="medium">Média</MenuItem>
                                <MenuItem value="high">Alta</MenuItem>
                                <MenuItem value="urgent">Urgente</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>

                {loading ? (
                    <Box className={classes.loader}>
                        <CircularProgress />
                    </Box>
                ) : (
                    <TableContainer component={Paper} className={classes.tableContainer}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Protocolo</TableCell>
                                    <TableCell>Assunto</TableCell>
                                    <TableCell>Contato</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Prioridade</TableCell>
                                    <TableCell>Criado em</TableCell>
                                    <TableCell align="right">Ações</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {protocols.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} align="center">
                                            Nenhum protocolo encontrado
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    protocols.map((protocol) => (
                                        <TableRow key={protocol.id} hover>
                                            <TableCell>
                                                <Typography variant="body2" style={{ fontWeight: 600 }}>
                                                    #{protocol.protocolNumber}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>{protocol.subject}</TableCell>
                                            <TableCell>{protocol.contact?.name || "-"}</TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={statusLabels[protocol.status] || protocol.status}
                                                    size="small"
                                                    className={getStatusClass(protocol.status)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={priorityLabels[protocol.priority] || protocol.priority}
                                                    size="small"
                                                    className={getPriorityClass(protocol.priority)}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                {format(new Date(protocol.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                            </TableCell>
                                            <TableCell align="right">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleOpenModal(protocol)}
                                                >
                                                    <VisibilityIcon />
                                                </IconButton>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            <ProtocolModal
                open={modalOpen}
                onClose={handleCloseModal}
                protocol={selectedProtocol}
            />
        </Container>
    );
};

export default Helpdesk;
