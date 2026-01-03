import React, { useState, useEffect } from "react";
import {
    Container,
    Paper,
    Typography,
    Grid,
    Card,
    CardContent,
    CardMedia,
    CardActions,
    Button,
    Chip,
    IconButton,
    ToggleButton,
    ToggleButtonGroup,
    Box,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
    TextField,
    InputAdornment,
} from "@material-ui/core";
import {
    ViewModule as ViewModuleIcon,
    ViewList as ViewListIcon,
    Search as SearchIcon,
    Extension as ExtensionIcon,
    CheckCircle as CheckCircleIcon,
} from "@material-ui/icons";
import { makeStyles } from "@material-ui/core/styles";
import { useHistory } from "react-router-dom";
import api from "../../services/api";
import { toast } from "react-toastify";

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
    title: {
        fontWeight: 600,
    },
    searchBox: {
        marginBottom: theme.spacing(3),
        maxWidth: 400,
    },
    card: {
        height: "100%",
        display: "flex",
        flexDirection: "column",
        transition: "transform 0.2s, box-shadow 0.2s",
        cursor: "pointer",
        "&:hover": {
            transform: "translateY(-4px)",
            boxShadow: theme.shadows[8],
        },
    },
    cardMedia: {
        height: 140,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: theme.palette.grey[100],
    },
    cardIcon: {
        fontSize: 64,
        color: theme.palette.primary.main,
    },
    cardContent: {
        flexGrow: 1,
    },
    chipFree: {
        backgroundColor: theme.palette.success.main,
        color: "#fff",
    },
    chipPremium: {
        backgroundColor: theme.palette.warning.main,
        color: "#fff",
    },
    chipInstalled: {
        backgroundColor: theme.palette.info.main,
        color: "#fff",
        marginLeft: theme.spacing(1),
    },
    tableContainer: {
        marginTop: theme.spacing(2),
    },
    statusActive: {
        color: theme.palette.success.main,
    },
    statusInactive: {
        color: theme.palette.grey[500],
    },
    loader: {
        display: "flex",
        justifyContent: "center",
        padding: theme.spacing(4),
    },
}));

const Marketplace = () => {
    const classes = useStyles();
    const history = useHistory();
    const [viewMode, setViewMode] = useState("cards");
    const [plugins, setPlugins] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        loadPlugins();
    }, []);

    const loadPlugins = async () => {
        try {
            setLoading(true);
            // TODO: Replace with actual API call to plugin-manager
            const mockPlugins = [
                {
                    id: "550e8400-e29b-41d4-a716-446655440001",
                    slug: "clientes",
                    name: "Plugin de Clientes",
                    description: "Gestão completa de clientes com múltiplos contatos e endereços. Integração ViaCEP.",
                    version: "1.0.0",
                    type: "free",
                    category: "gestao",
                    installed: false,
                    active: false,
                },
                {
                    id: "550e8400-e29b-41d4-a716-446655440002",
                    slug: "helpdesk",
                    name: "Plugin de Helpdesk",
                    description: "Sistema de protocolos de atendimento vinculados a tickets.",
                    version: "1.0.0",
                    type: "free",
                    category: "suporte",
                    installed: false,
                    active: false,
                },
                {
                    id: "550e8400-e29b-41d4-a716-446655440003",
                    slug: "whatsmeow",
                    name: "Motor WhatsMeow",
                    description: "Engine de alta performance em Go para conexões WhatsApp.",
                    version: "1.0.0",
                    type: "premium",
                    price: 199.90,
                    category: "engine",
                    installed: false,
                    active: false,
                },
            ];
            setPlugins(mockPlugins);
        } catch (err) {
            toast.error("Erro ao carregar plugins");
        } finally {
            setLoading(false);
        }
    };

    const handleViewChange = (event, newView) => {
        if (newView !== null) {
            setViewMode(newView);
        }
    };

    const handlePluginClick = (plugin) => {
        history.push(`/admin/settings/marketplace/${plugin.slug}`);
    };

    const filteredPlugins = plugins.filter(
        (plugin) =>
            plugin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            plugin.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const renderCards = () => (
        <Grid container spacing={3}>
            {filteredPlugins.map((plugin) => (
                <Grid item xs={12} sm={6} md={4} key={plugin.id}>
                    <Card className={classes.card} onClick={() => handlePluginClick(plugin)}>
                        <Box className={classes.cardMedia}>
                            <ExtensionIcon className={classes.cardIcon} />
                        </Box>
                        <CardContent className={classes.cardContent}>
                            <Box display="flex" alignItems="center" mb={1}>
                                <Typography variant="h6" component="h2">
                                    {plugin.name}
                                </Typography>
                                {plugin.active && (
                                    <CheckCircleIcon className={classes.statusActive} style={{ marginLeft: 8 }} />
                                )}
                            </Box>
                            <Box mb={1}>
                                <Chip
                                    label={plugin.type === "free" ? "Gratuito" : `R$ ${plugin.price}`}
                                    size="small"
                                    className={plugin.type === "free" ? classes.chipFree : classes.chipPremium}
                                />
                                {plugin.installed && (
                                    <Chip label="Instalado" size="small" className={classes.chipInstalled} />
                                )}
                            </Box>
                            <Typography variant="body2" color="textSecondary">
                                {plugin.description}
                            </Typography>
                        </CardContent>
                        <CardActions>
                            <Button size="small" color="primary">
                                Ver Detalhes
                            </Button>
                        </CardActions>
                    </Card>
                </Grid>
            ))}
        </Grid>
    );

    const renderTable = () => (
        <TableContainer component={Paper} className={classes.tableContainer}>
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Plugin</TableCell>
                        <TableCell>Categoria</TableCell>
                        <TableCell>Tipo</TableCell>
                        <TableCell>Versão</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Ações</TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {filteredPlugins.map((plugin) => (
                        <TableRow
                            key={plugin.id}
                            hover
                            style={{ cursor: "pointer" }}
                            onClick={() => handlePluginClick(plugin)}
                        >
                            <TableCell>
                                <Box display="flex" alignItems="center">
                                    <ExtensionIcon style={{ marginRight: 8 }} />
                                    <Box>
                                        <Typography variant="subtitle2">{plugin.name}</Typography>
                                        <Typography variant="caption" color="textSecondary">
                                            {plugin.description.substring(0, 50)}...
                                        </Typography>
                                    </Box>
                                </Box>
                            </TableCell>
                            <TableCell>{plugin.category}</TableCell>
                            <TableCell>
                                <Chip
                                    label={plugin.type === "free" ? "Gratuito" : `R$ ${plugin.price}`}
                                    size="small"
                                    className={plugin.type === "free" ? classes.chipFree : classes.chipPremium}
                                />
                            </TableCell>
                            <TableCell>{plugin.version}</TableCell>
                            <TableCell>
                                {plugin.active ? (
                                    <Chip label="Ativo" size="small" className={classes.chipFree} />
                                ) : plugin.installed ? (
                                    <Chip label="Instalado" size="small" />
                                ) : (
                                    <Chip label="Não instalado" size="small" variant="outlined" />
                                )}
                            </TableCell>
                            <TableCell>
                                <Button size="small" color="primary">
                                    Detalhes
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );

    return (
        <Container maxWidth="lg" className={classes.root}>
            <Paper elevation={0} style={{ padding: 24 }}>
                <Box className={classes.header}>
                    <Typography variant="h4" className={classes.title}>
                        🧩 Marketplace de Plugins
                    </Typography>
                    <ToggleButtonGroup
                        value={viewMode}
                        exclusive
                        onChange={handleViewChange}
                        size="small"
                    >
                        <ToggleButton value="cards">
                            <ViewModuleIcon />
                        </ToggleButton>
                        <ToggleButton value="table">
                            <ViewListIcon />
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Box>

                <TextField
                    className={classes.searchBox}
                    variant="outlined"
                    size="small"
                    placeholder="Buscar plugins..."
                    fullWidth
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon />
                            </InputAdornment>
                        ),
                    }}
                />

                {loading ? (
                    <Box className={classes.loader}>
                        <CircularProgress />
                    </Box>
                ) : viewMode === "cards" ? (
                    renderCards()
                ) : (
                    renderTable()
                )}
            </Paper>
        </Container>
    );
};

export default Marketplace;
