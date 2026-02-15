/* @jsxImportSource react */
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
    CircularProgress,
    Tabs,
    Tab,
    Grid,
    Switch,
    FormControlLabel
} from "@material-ui/core";
import { Edit as EditIcon, Add as AddIcon, Delete as DeleteIcon } from "@material-ui/icons";
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
    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: theme.spacing(2),
    },
}));

const SaaSAdmin = () => {
    const classes = useStyles();
    const [tab, setTab] = useState(0);
    const [tenants, setTenants] = useState([]);
    const [plans, setPlans] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Modals
    const [openTenantModal, setOpenTenantModal] = useState(false);
    const [openPlanModal, setOpenPlanModal] = useState(false);
    
    // Selections
    const [selectedTenant, setSelectedTenant] = useState(null);
    const [selectedPlan, setSelectedPlan] = useState(null);

    // Forms
    const [tenantForm, setTenantForm] = useState({
        planName: "Start",
        pluginQuota: 4,
        status: "active",
        expiresAt: ""
    });

    const [planForm, setPlanForm] = useState({
        name: "",
        pluginQuota: 4,
        price: 0,
        active: true
    });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [tenantsRes, plansRes] = await Promise.all([
                api.get("/saas/tenants"),
                api.get("/saas/plans")
            ]);
            setTenants(tenantsRes.data);
            setPlans(plansRes.data);
        } catch (err) {
            toast.error("Erro ao carregar dados");
        } finally {
            setLoading(false);
        }
    };

    const handleEditTenant = async (tenant) => {
        setSelectedTenant(tenant);
        try {
            const { data } = await api.get(`/saas/tenants/${tenant.id}/plan`);
            setTenantForm({
                planName: data.planName || "Start",
                pluginQuota: data.pluginQuota || 4,
                status: data.status || "active",
                expiresAt: data.expiresAt ? data.expiresAt.split("T")[0] : ""
            });
            setOpenTenantModal(true);
        } catch (err) {
            toast.error("Erro ao carregar plano do tenant");
        }
    };

    const handleSaveTenant = async () => {
        try {
            await api.post(`/saas/tenants/${selectedTenant.id}/plan`, tenantForm);
            toast.success("Plano do tenant atualizado");
            setOpenTenantModal(false);
            loadData();
        } catch (err) {
            toast.error("Erro ao salvar plano do tenant");
        }
    };

    const handleEditPlan = (plan) => {
        setSelectedPlan(plan);
        setPlanForm({
            name: plan.name,
            pluginQuota: plan.pluginQuota,
            price: plan.price,
            active: plan.active
        });
        setOpenPlanModal(true);
    };

    const handleAddPlan = () => {
        setSelectedPlan(null);
        setPlanForm({
            name: "",
            pluginQuota: 4,
            price: 0,
            active: true
        });
        setOpenPlanModal(true);
    };

    const handleSavePlan = async () => {
        try {
            if (selectedPlan) {
                await api.put(`/saas/plans/${selectedPlan.id}`, planForm);
                toast.success("Plano atualizado");
            } else {
                await api.post("/saas/plans", planForm);
                toast.success("Plano criado");
            }
            setOpenPlanModal(false);
            loadData();
        } catch (err) {
            toast.error("Erro ao salvar plano");
        }
    };

    const handleDeletePlan = async (planId) => {
        if (!window.confirm("Deseja realmente excluir este plano?")) return;
        try {
            await api.delete(`/saas/plans/${planId}`);
            toast.success("Plano excluído");
            loadData();
        } catch (err) {
            toast.error("Erro ao excluir plano");
        }
    };

    const renderTenants = () => (
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
                                <IconButton onClick={() => handleEditTenant(tenant)}>
                                    <EditIcon />
                                </IconButton>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>
    );

    const renderPlans = () => (
        <Box>
            <Box className={classes.header}>
                <Typography variant="h6">Configuração de Planos</Typography>
                <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={handleAddPlan}>
                    Novo Plano
                </Button>
            </Box>
            <TableContainer>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Nome</TableCell>
                            <TableCell>Plugins</TableCell>
                            <TableCell>Preço</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Ações</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {plans.map((plan) => (
                            <TableRow key={plan.id}>
                                <TableCell>{plan.name}</TableCell>
                                <TableCell>{plan.pluginQuota}</TableCell>
                                <TableCell>R$ {plan.price}</TableCell>
                                <TableCell>{plan.active ? "Ativo" : "Inativo"}</TableCell>
                                <TableCell>
                                    <IconButton onClick={() => handleEditPlan(plan)}>
                                        <EditIcon />
                                    </IconButton>
                                    <IconButton onClick={() => handleDeletePlan(plan.id)}>
                                        <DeleteIcon />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );

    return (
        <Container className={classes.container}>
            <Paper className={classes.paper}>
                <Typography variant="h4" gutterBottom>🚀 Gestão SaaS</Typography>
                
                <Tabs value={tab} onChange={(e, v) => setTab(v)} indicatorColor="primary" textColor="primary">
                    <Tab label="Tenants" />
                    <Tab label="Planos" />
                </Tabs>

                <Box mt={3}>
                    {loading ? (
                        <Box display="flex" justifyContent="center"><CircularProgress /></Box>
                    ) : (
                        tab === 0 ? renderTenants() : renderPlans()
                    )}
                </Box>
            </Paper>

            {/* Tenant Modal */}
            <Dialog open={openTenantModal} onClose={() => setOpenTenantModal(false)}>
                <DialogTitle>Editar Plano - {selectedTenant?.name}</DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        <TextField
                            select
                            label="Plano"
                            fullWidth
                            variant="outlined"
                            value={tenantForm.planName}
                            onChange={(e) => setTenantForm({ ...tenantForm, planName: e.target.value })}
                        >
                            {plans.map(p => (
                                <MenuItem key={p.id} value={p.name}>{p.name}</MenuItem>
                            ))}
                            <MenuItem value="Start">Start (Default)</MenuItem>
                            <MenuItem value="Pro">Pro (Default)</MenuItem>
                        </TextField>
                        <TextField
                            label="Quota de Plugins"
                            type="number"
                            fullWidth
                            variant="outlined"
                            value={tenantForm.pluginQuota}
                            onChange={(e) => setTenantForm({ ...tenantForm, pluginQuota: parseInt(e.target.value) })}
                        />
                        <TextField
                            select
                            label="Status da Assinatura"
                            fullWidth
                            variant="outlined"
                            value={tenantForm.status}
                            onChange={(e) => setTenantForm({ ...tenantForm, status: e.target.value })}
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
                            value={tenantForm.expiresAt}
                            onChange={(e) => setTenantForm({ ...tenantForm, expiresAt: e.target.value })}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenTenantModal(false)}>Cancelar</Button>
                    <Button onClick={handleSaveTenant} color="primary" variant="contained">Salvar</Button>
                </DialogActions>
            </Dialog>

            {/* Plan Modal */}
            <Dialog open={openPlanModal} onClose={() => setOpenPlanModal(false)}>
                <DialogTitle>{selectedPlan ? "Editar Plano" : "Novo Plano"}</DialogTitle>
                <DialogContent>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                label="Nome do Plano"
                                fullWidth
                                variant="outlined"
                                value={planForm.name}
                                onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                label="Quota de Plugins"
                                type="number"
                                fullWidth
                                variant="outlined"
                                value={planForm.pluginQuota}
                                onChange={(e) => setPlanForm({ ...planForm, pluginQuota: parseInt(e.target.value) })}
                            />
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                label="Preço"
                                type="number"
                                fullWidth
                                variant="outlined"
                                value={planForm.price}
                                onChange={(e) => setPlanForm({ ...planForm, price: parseFloat(e.target.value) })}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={planForm.active}
                                        onChange={(e) => setPlanForm({ ...planForm, active: e.target.checked })}
                                        color="primary"
                                    />
                                }
                                label="Plano Ativo"
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenPlanModal(false)}>Cancelar</Button>
                    <Button onClick={handleSavePlan} color="primary" variant="contained">Salvar</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default SaaSAdmin;
