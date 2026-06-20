import { useState, useEffect } from "react";
import { toast } from "react-toastify";

import api from "../../../services/api";
import type { Tenant, Plan, TenantForm, PlanForm } from "../saasTypes";

const DEFAULT_TENANT_FORM: TenantForm = {
    planName: "Start",
    pluginQuota: 4,
    status: "active",
    expiresAt: "",
};

const DEFAULT_PLAN_FORM: PlanForm = {
    name: "",
    pluginQuota: 4,
    price: 0,
    active: true,
};

export function useSaaS() {
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
    const [tenantForm, setTenantForm] = useState<TenantForm>(DEFAULT_TENANT_FORM);
    const [planForm, setPlanForm] = useState<PlanForm>(DEFAULT_PLAN_FORM);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);
            const [tenantsRes, plansRes] = await Promise.all([
                api.get("/saas/tenants"),
                api.get("/saas/plans"),
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
                expiresAt: data.expiresAt ? data.expiresAt.split("T")[0] : "",
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
            active: plan.active,
        });
        setOpenPlanModal(true);
    };

    const handleAddPlan = () => {
        setSelectedPlan(null);
        setPlanForm(DEFAULT_PLAN_FORM);
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

    return {
        tenants,
        plans,
        loading,
        openTenantModal,
        setOpenTenantModal,
        openPlanModal,
        setOpenPlanModal,
        selectedTenant,
        selectedPlan,
        tenantForm,
        setTenantForm,
        planForm,
        setPlanForm,
        handleEditTenant,
        handleSaveTenant,
        handleEditPlan,
        handleAddPlan,
        handleSavePlan,
        handleDeletePlan,
    };
}
