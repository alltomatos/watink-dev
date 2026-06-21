import React from "react";
import { WifiOff, Copy } from "lucide-react";
import { Button } from "../../../components/ui/button";
import type { MarketplaceEntitlements } from "../marketplaceTypes";

interface OfflineBannerProps {
  offline: boolean;
}

export function OfflineBanner({ offline }: OfflineBannerProps) {
  if (!offline) return null;
  return (
    <div className="mb-4 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-700">
      <WifiOff size={16} />
      Catálogo carregado em modo offline (cache local). Algumas informações podem estar desatualizadas.
    </div>
  );
}

interface InstanceIdBannerProps {
  instanceId: string;
  entitlements: MarketplaceEntitlements | null;
  onCopy: () => void;
}

export function InstanceIdBanner({ instanceId, entitlements, onCopy }: InstanceIdBannerProps) {
  if (!instanceId) return null;
  return (
    <div className="mb-4 flex items-center justify-between gap-2 rounded-md border bg-muted/40 px-4 py-3 text-sm">
      <div className="min-w-0">
        <span className="text-muted-foreground">ID da Instância: </span>
        <code className="font-mono">{instanceId}</code>
        {entitlements?.plan_name && (
          <span className="ml-3 text-muted-foreground">
            Plano: <strong>{entitlements.plan_name}</strong>
          </span>
        )}
      </div>
      <Button variant="outline" size="sm" onClick={onCopy}>
        <Copy size={14} className="mr-1" /> Copiar ID
      </Button>
    </div>
  );
}
