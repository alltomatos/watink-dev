import React, { useState, useEffect } from "react";
import {
    Edit2,
    Plus,
    Trash2,
    Loader2
} from "lucide-react";
import { toast } from "react-toastify";

import api from "../../services/api";
import { PageContainer, PageHeader, PageContent } from "../../components/ui/page-layout";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "../../components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "../../components/ui/dialog";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "../../components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../../components/ui/select";
import { Card, CardContent } from "../../components/ui/card";

interface Tenant {
    id: number | string;
    name: string;
    status: string;
}

interface Plan {
    id: number | string;
    name: string;
    pluginQuota: number;
    price: number;
    active: boolean;
}

const SaaSAdmin = () => {
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [plans, setPlans] = useState<Plan[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Modals
    const [openTenantModal, setOpenTenantModal] = useState(false);
    const [openPlanModal, setOpenPlanModal] = useState(false);
    
    // Selections
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

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
        } catch {
            toast.error("Erro ao carregar dados");
        } finally {
            setLoading(false);
        }
    };

    const handleEditTenant = async (tenant: Tenant) => {
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
        } catch {
            toast.error("Erro ao carregar plano do tenant");
        }
    };

    const handleSaveTenant = async () => {
        if (!selectedTenant) return;
        try {
            await api.post(`/saas/tenants/${selectedTenant.id}/plan`, tenantForm);
            toast.success("Plano do tenant atualizado");
            setOpenTenantModal(false);
            loadData();
        } catch {
            toast.error("Erro ao salvar plano do tenant");
        }
    };

    const handleEditPlan = (plan: Plan) => {
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
        } catch {
            toast.error("Erro ao salvar plano");
        }
    };

    const handleDeletePlan = async (planId: number | string) => {
        if (!window.confirm("Deseja realmente excluir este plano?")) return;
        try {
            await api.delete(`/saas/plans/${planId}`);
            toast.success("Plano excluído");
            loadData();
        } catch {
            toast.error("Erro ao excluir plano");
        }
    };

    return (
        <PageContainer>
            <PageHeader title="🚀 Gestão SaaS" description="Gerencie tenants e planos da plataforma" />
            <PageContent>
            <Card>
                <CardContent className="pt-6">
                    <Tabs defaultValue="tenants" className="w-full">
                        <TabsList className="mb-6">
                            <TabsTrigger value="tenants">Tenants</TabsTrigger>
                            <TabsTrigger value="plans">Planos</TabsTrigger>
                        </TabsList>

                        {loading ? (
                            <div className="flex h-40 items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            </div>
                        ) : (
                            <>
                                <TabsContent value="tenants" className="space-y-4">
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Tenant</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className="w-[100px] text-right">Ações</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {tenants.map((tenant) => (
                                                    <TableRow key={tenant.id}>
                                                        <TableCell className="font-medium">{tenant.name}</TableCell>
                                                        <TableCell>{tenant.status}</TableCell>
                                                        <TableCell className="text-right">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleEditTenant(tenant)}
                                                            >
                                                                <Edit2 className="h-4 w-4" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {tenants.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={3} className="h-24 text-center">
                                                            Nenhum tenant encontrado.
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </TabsContent>

                                <TabsContent value="plans" className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-medium">Configuração de Planos</h3>
                                        <Button onClick={handleAddPlan}>
                                            <Plus className="mr-2 h-4 w-4" /> Novo Plano
                                        </Button>
                                    </div>
                                    <div className="rounded-md border">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Nome</TableHead>
                                                    <TableHead>Plugins</TableHead>
                                                    <TableHead>Preço</TableHead>
                                                    <TableHead>Status</TableHead>
                                                    <TableHead className="w-[120px] text-right">Ações</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {plans.map((plan) => (
                                                    <TableRow key={plan.id}>
                                                        <TableCell className="font-medium">{plan.name}</TableCell>
                                                        <TableCell>{plan.pluginQuota}</TableCell>
                                                        <TableCell>R$ {plan.price.toFixed(2)}</TableCell>
                                                        <TableCell>
                                                            <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                                                                plan.active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                                                            }`}>
                                                                {plan.active ? "Ativo" : "Inativo"}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleEditPlan(plan)}
                                                            >
                                                                <Edit2 className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleDeletePlan(plan.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                                {plans.length === 0 && (
                                                    <TableRow>
                                                        <TableCell colSpan={5} className="h-24 text-center">
                                                            Nenhum plano encontrado.
                                                        </TableCell>
                                                    </TableRow>
                                                )}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </TabsContent>
                            </>
                        )}
                    </Tabs>
                </CardContent>
            </Card>

            {/* Tenant Modal */}
            <Dialog open={openTenantModal} onOpenChange={setOpenTenantModal}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Editar Plano - {selectedTenant?.name}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="planName">Plano</Label>
                            <Select
                                value={tenantForm.planName}
                                onValueChange={(value) => setTenantForm({ ...tenantForm, planName: value })}
                            >
                                <SelectTrigger id="planName">
                                    <SelectValue placeholder="Selecione um plano" />
                                </SelectTrigger>
                                <SelectContent>
                                    {plans.map(p => (
                                        <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                                    ))}
                                    <SelectItem value="Start">Start (Default)</SelectItem>
                                    <SelectItem value="Pro">Pro (Default)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="grid gap-2">
                            <Label htmlFor="pluginQuota">Quota de Plugins</Label>
                            <Input
                                id="pluginQuota"
                                type="number"
                                value={tenantForm.pluginQuota}
                                onChange={(e) => setTenantForm({ ...tenantForm, pluginQuota: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                        
                        <div className="grid gap-2">
                            <Label htmlFor="tenantStatus">Status da Assinatura</Label>
                            <Select
                                value={tenantForm.status}
                                onValueChange={(value) => setTenantForm({ ...tenantForm, status: value })}
                            >
                                <SelectTrigger id="tenantStatus">
                                    <SelectValue placeholder="Selecione o status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Ativo</SelectItem>
                                    <SelectItem value="overdue">Inadimplente</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="grid gap-2">
                            <Label htmlFor="expiresAt">Expira em</Label>
                            <Input
                                id="expiresAt"
                                type="date"
                                value={tenantForm.expiresAt}
                                onChange={(e) => setTenantForm({ ...tenantForm, expiresAt: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenTenantModal(false)}>Cancelar</Button>
                        <Button onClick={handleSaveTenant}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Plan Modal */}
            <Dialog open={openPlanModal} onOpenChange={setOpenPlanModal}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{selectedPlan ? "Editar Plano" : "Novo Plano"}</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="planNameInput">Nome do Plano</Label>
                            <Input
                                id="planNameInput"
                                value={planForm.name}
                                onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                            />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label htmlFor="planPluginQuota">Quota de Plugins</Label>
                                <Input
                                    id="planPluginQuota"
                                    type="number"
                                    value={planForm.pluginQuota}
                                    onChange={(e) => setPlanForm({ ...planForm, pluginQuota: parseInt(e.target.value) || 0 })}
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="planPrice">Preço (R$)</Label>
                                <Input
                                    id="planPrice"
                                    type="number"
                                    step="0.01"
                                    value={planForm.price}
                                    onChange={(e) => setPlanForm({ ...planForm, price: parseFloat(e.target.value) || 0 })}
                                />
                            </div>
                        </div>
                        
                        <div className="flex items-center space-x-2 pt-2">
                            <Switch
                                id="planActive"
                                checked={planForm.active}
                                onCheckedChange={(checked) => setPlanForm({ ...planForm, active: checked })}
                            />
                            <Label htmlFor="planActive">Plano Ativo</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setOpenPlanModal(false)}>Cancelar</Button>
                        <Button onClick={handleSavePlan}>Salvar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            </PageContent>
        </PageContainer>
    );
};

export default SaaSAdmin;
