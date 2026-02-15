import React, { useState, useEffect } from "react";
import {
    Container,
    Paper,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    IconButton,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    MenuItem,
    Box,
    CircularProgress
} from "@material-ui/core";
import { Edit as EditIcon } from "@material-ui/icons";
import { makeStyles } from "@material-ui/core/styles";
import api from "../../services/api";
import { toast } from "react-toastify";

const useStyles = makeStyles((theme) => ({
    container: {
        padding: theme.spacing(4),
    },
    paper: {
        padding: theme.spacing(2),
    },
}));

const SaaSAdmin = () => {
    const classes = useStyles();
    const [tenants, setTenants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [openModal, setOpenModal] = useState(false);
    const [selectedTenant, setSelectedTenant] = useState(null);
    const [form, setForm] = useState({
        planName: "Start",
        pluginQuota: 4,
        status: "active",
        expiresAt: ""
    });

    useEffect(() => {
        loadTenants();
    }, []);

    const loadTenants = async () => {
        try {
            setLoading(true);
            const { data } = await api.get("/saas/tenants");
            setTenants(data);
        } catch (err) {
            toast.error("Erro ao carregar tenants");
        } finally {
            setLoading(false);
        }
    };

    const handleEditPlan = async (tenant) => {
        setSelectedTenant(tenant);
        try {
            const { data } = await api.get(`/saas/tenants/${tenant.id}/plan`);
            setForm({
                planName: data.planName || "Start",
                pluginQuota: data.pluginQuota || 4,
                status: data.status || "active",
                expiresAt: data.expiresAt ? data.expiresAt.split("T")[0] : ""
            });
            setOpenModal(true);
        } catch (err) {
            toast.error("Erro ao carregar plano");
        }
    };

    const handleSave = async () => {
        try {
            await api.post(`/saas/tenants/${selectedTenant.id}/plan`, form);
            toast.success("Plano atualizado");
            setOpenModal(false);
            loadTenants();
        } catch (err) {
            toast.error("Erro ao salvar plano");
        }
    };

    return (
        <Container className={classes.container}>
            <Paper className={classes.paper}>
                <Typography variant="h4" gutterBottom>🚀 Gestão SaaS</Typography>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Tenant</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Ações</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {tenants.map((tenant) => (
                                <TableRow key={tenant.id}>
                                    <TableCell>{tenant.name}</TableCell>
                                    <TableCell>{tenant.status}</TableCell>
                                    <TableCell>
                                        <IconButton onClick={() => handleEditPlan(tenant)}>
                                            <EditIcon />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <Dialog open={openModal} onClose={() => setOpenModal(false)}>
                <DialogTitle>Editar Plano - {selectedTenant?.name}</DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        <TextField
                            select
                            label="Plano"
                            fullWidth
                            variant="outlined"
                            value={form.planName}
                            onChange={(e) => setForm({ ...form, planName: e.target.value })}
                        >
                            <MenuItem value="Start">Start</MenuItem>
                            <MenuItem value="Pro">Pro</MenuItem>
                        </TextField>
                        <TextField
                            label="Quota de Plugins"
                            type="number"
                            fullWidth
                            variant="outlined"
                            value={form.pluginQuota}
                            onChange={(e) => setForm({ ...form, pluginQuota: parseInt(e.target.value) })}
                        />
                        <TextField
                            select
                            label="Status da Assinatura"
                            fullWidth
                            variant="outlined"
                            value={form.status}
                            onChange={(e) => setForm({ ...form, status: e.target.value })}
                        >
                            <MenuItem value="active">Ativo</MenuItem>
                            <MenuItem value="overdue">Inadimplente</MenuItem>
                        </TextField>
                        <TextField
                            label="Expira em"
                            type="date"
                            fullWidth
                            variant="outlined"
                            InputLabelProps={{ shrink: true }}
                            value={form.expiresAt}
                            onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenModal(false)}>Cancelar</Button>
                    <Button onClick={handleSave} color="primary" variant="contained">Salvar</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default SaaSAdmin;
