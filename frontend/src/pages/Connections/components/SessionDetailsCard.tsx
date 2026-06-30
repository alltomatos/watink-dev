import React from "react";
import { Hash, MessageSquare, Calendar, ShieldCheck, Star, Clock, Network } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { Switch } from "../../../components/ui/switch";
import { Badge } from "../../../components/ui/badge";
import DetailItem from "./DetailItem";
import { formatPhone } from "../connectionConfigUtils";
import type { WhatsApp } from "../connectionConfigTypes";

const proxyDisplay = (whatsapp: WhatsApp): { text: string; healthy?: boolean } => {
  const p = whatsapp.proxy;
  if (!p) return { text: "Direto (sem proxy)" };
  const loc = [p.city, p.countryCode].filter(Boolean).join(", ");
  if (p.mode === "single") {
    return { text: `${p.label ? `${p.label} — ` : ""}${p.endpoint}${loc ? ` (${loc})` : ""}`, healthy: p.healthy };
  }
  // group
  const current = p.current;
  const tail = current ? `${current.endpoint}${current.city ? ` (${current.city}, ${current.countryCode ?? ""})` : ""}` : "aguardando próxima conexão";
  return { text: `Grupo "${p.name}" (${p.rotationStrategy === "rotate" ? "rotação" : "fixo"}) — ${tail}` };
};

interface SessionDetailsCardProps {
  whatsapp: WhatsApp;
  status: string;
  keepAliveSaving: boolean;
  onToggleKeepAlive: (next: boolean) => Promise<void>;
}

const SessionDetailsCard: React.FC<SessionDetailsCardProps> = ({
  whatsapp,
  status,
  keepAliveSaving,
  onToggleKeepAlive,
}) => {
  const proxy = proxyDisplay(whatsapp);
  return (
  <Card>
    <CardHeader>
      <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Detalhes da Sessão
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <DetailItem icon={<Hash className="h-4 w-4" />} label="Nome da Sessão" value={whatsapp.name} />
        <DetailItem
          icon={<MessageSquare className="h-4 w-4" />}
          label="Número Conectado"
          value={formatPhone(whatsapp.number) || "—"}
        />
        <DetailItem
          icon={<Calendar className="h-4 w-4" />}
          label="Data da 1ª Conexão"
          value={
            whatsapp.firstConnection
              ? new Date(whatsapp.firstConnection).toLocaleDateString()
              : whatsapp.createdAt
              ? new Date(whatsapp.createdAt).toLocaleDateString()
              : "—"
          }
        />
        <DetailItem icon={<ShieldCheck className="h-4 w-4" />} label="Status Oficial" value={status} />
        <DetailItem icon={<Star className="h-4 w-4" />} label="Padrão" value={whatsapp.isDefault ? "Sim" : "Não"} />
        <div className="flex items-start gap-2">
          <span className="mt-0.5 text-muted-foreground">
            <Network className="h-4 w-4" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground">Proxy</p>
            <div className="mt-1 flex items-center gap-1.5">
              <span className="text-sm font-mono truncate" title={proxy.text}>{proxy.text}</span>
              {proxy.healthy === true && <Badge variant="default" className="shrink-0">OK</Badge>}
              {proxy.healthy === false && <Badge variant="destructive" className="shrink-0">instável</Badge>}
            </div>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <span className="mt-0.5 text-muted-foreground">
            <Clock className="h-4 w-4" />
          </span>
          <div className="flex-1">
            <p className="text-xs font-medium text-muted-foreground">Reconexão Automática</p>
            <div className="mt-1 flex items-center gap-2">
              <Switch
                checked={!!whatsapp.keepAlive}
                disabled={keepAliveSaving}
                onCheckedChange={onToggleKeepAlive}
              />
              <span className="text-sm">{whatsapp.keepAlive ? "Ativado" : "Desativado"}</span>
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
  );
};

export default SessionDetailsCard;
