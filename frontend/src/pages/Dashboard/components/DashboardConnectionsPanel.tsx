import React from "react";
import { Smartphone } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../../../components/ui/card";
import { StatusChip } from "../../../components/ui/status-chip";

interface WhatsAppItem {
  id: number;
  status: string;
  [key: string]: unknown;
}

interface DashboardConnectionsPanelProps {
  whatsApps: WhatsAppItem[];
  connectedCount: number;
}

const DashboardConnectionsPanel: React.FC<DashboardConnectionsPanelProps> = ({
  whatsApps,
  connectedCount,
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-success-bg)]">
            <Smartphone className="h-6 w-6 text-[var(--color-success)]" />
          </div>
          <div>
            <CardTitle>Conexões</CardTitle>
            <CardDescription>
              {connectedCount} de {whatsApps.length} ativas
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col divide-y divide-border">
          {whatsApps.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              Nenhuma conexão configurada
            </p>
          ) : (
            whatsApps.map((wa) => {
              const connected = wa.status === "CONNECTED";
              return (
                <div
                  key={wa.id}
                  className="flex items-center justify-between py-2.5"
                >
                  <span className="text-sm font-medium text-foreground">
                    {String(wa.name ?? "")}
                  </span>
                  <StatusChip
                    status={connected ? "success" : "error"}
                    label={connected ? "Conectado" : "Offline"}
                    size="sm"
                  />
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default DashboardConnectionsPanel;
