import React from "react";
import { SystemStats } from "../types";

interface TenantConsumptionTableProps {
  stats: SystemStats | null;
}

const HEADERS = ["Tenant", "Usuários", "Contatos", "Tickets", "Abertos", "WhatsApps"];

const TenantConsumptionTable: React.FC<TenantConsumptionTableProps> = ({ stats }) => (
  <div className="rounded-xl border border-border bg-card shadow-sm">
    <div className="border-b border-border px-4 py-3">
      <h2 className="font-semibold">Consumo por Tenant</h2>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            {HEADERS.map((h) => (
              <th
                key={h}
                className="px-4 py-2 text-left font-medium text-muted-foreground last:text-right [&:not(:first-child)]:text-right"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {(stats?.tenantConsumption || []).slice(0, 20).map((t) => (
            <tr
              key={t.tenantId}
              className="border-t border-border hover:bg-accent/50"
            >
              <td className="px-4 py-2">{t.tenantName}</td>
              <td className="px-4 py-2 text-right">{t.users}</td>
              <td className="px-4 py-2 text-right">{t.contacts}</td>
              <td className="px-4 py-2 text-right">{t.tickets}</td>
              <td className="px-4 py-2 text-right">{t.openTickets}</td>
              <td className="px-4 py-2 text-right">{t.whatsapps}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default TenantConsumptionTable;
