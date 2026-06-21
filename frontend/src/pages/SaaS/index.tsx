import React from "react";
import { Loader2 } from "lucide-react";

import { PageContainer, PageHeader, PageContent } from "@/components/ui/page-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useSaaS } from "./hooks/useSaaS";
import { TenantsTab } from "./components/TenantsTab";
import { PlansTab } from "./components/PlansTab";
import { TenantModal } from "./components/TenantModal";
import { PlanModal } from "./components/PlanModal";

const SaaSAdmin = () => {
    const {
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
    } = useSaaS();

    return (
        <PageContainer>
            <PageHeader title="Gestão SaaS" description="Gerencie tenants e planos da plataforma" />
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
                                        <TenantsTab tenants={tenants} onEdit={handleEditTenant} />
                                    </TabsContent>

                                    <TabsContent value="plans" className="space-y-4">
                                        <PlansTab
                                            plans={plans}
                                            onAdd={handleAddPlan}
                                            onEdit={handleEditPlan}
                                            onDelete={handleDeletePlan}
                                        />
                                    </TabsContent>
                                </>
                            )}
                        </Tabs>
                    </CardContent>
                </Card>

                <TenantModal
                    open={openTenantModal}
                    onOpenChange={setOpenTenantModal}
                    selectedTenant={selectedTenant}
                    plans={plans}
                    form={tenantForm}
                    onFormChange={setTenantForm}
                    onSave={handleSaveTenant}
                />

                <PlanModal
                    open={openPlanModal}
                    onOpenChange={setOpenPlanModal}
                    selectedPlan={selectedPlan}
                    form={planForm}
                    onFormChange={setPlanForm}
                    onSave={handleSavePlan}
                />
            </PageContent>
        </PageContainer>
    );
};

export default SaaSAdmin;
