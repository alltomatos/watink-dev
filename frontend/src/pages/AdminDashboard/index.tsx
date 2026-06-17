import React from "react";
import { PageLayout } from "../../components/ui/page-layout";

const AdminDashboard: React.FC = () => {
  return (
    <PageLayout title="Super Admin Dashboard">
      <div className="p-4">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">
          Bem-vindo ao Painel do Super Admin
        </h2>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          Gerenciamento de Tenants e Métricas do SaaS.
        </p>
      </div>
    </PageLayout>
  );
};

export default AdminDashboard;
